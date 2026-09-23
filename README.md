# Cloud-Based Network Alert Notification System

A final-year project: a full-stack, cloud-deployable network monitoring and alert
notification platform. It is a **real, database-backed application** — every
button is wired to a working API endpoint and a PostgreSQL database. Nothing is
hardcoded or faked.

## A. Project Structure

```
/
├── render.yaml              # Render deployment blueprint (web service + Postgres)
├── package.json             # Root orchestration scripts
├── server/                  # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma    # Full relational schema
│   │   └── seed.ts          # Demo admin + sample devices + rules
│   └── src/
│       ├── config/env.ts
│       ├── middleware/      # auth, error handling, rate limiting
│       ├── lib/prisma.ts
│       ├── routes/          # auth, dashboard, devices, monitoring, alerts,
│       │                    # alert-rules, notifications, reports, users,
│       │                    # audit-logs, settings, health
│       ├── services/
│       │   ├── monitoringEngine.ts   # real HTTP/TCP checks + simulation mode
│       │   ├── alertEngine.ts        # incident dedup, resolution
│       │   ├── notificationService.ts# real email via Nodemailer
│       │   ├── realtime.ts           # Socket.IO broadcast
│       │   └── auditService.ts
│       ├── app.ts
│       └── index.ts
└── client/                  # React + TypeScript + Vite + Tailwind SPA
    └── src/
        ├── api/client.ts
        ├── context/AuthContext.tsx
        ├── hooks/useRealtime.ts, useToast.tsx
        ├── components/Layout.tsx, ProtectedRoute.tsx, ui.tsx
        ├── pages/            # Login, Dashboard, Devices, DeviceDetails,
        │                     # Monitoring, Alerts, AlertDetails, AlertRules,
        │                     # Notifications, Reports, Users, AuditLogs, Settings
        └── types/index.ts
```

## Architecture

```
User
  ↓
React Frontend (Vite, TypeScript, Tailwind, Recharts)
  ↓  REST (axios) + Socket.IO (real-time)
Express API (TypeScript, JWT auth, RBAC)
  ↓
Monitoring Engine (per-device scheduler: HTTP / TCP / Simulation checks)
  ↓
PostgreSQL (Prisma ORM)
  ↓
Alert Engine (incident creation, deduplication, auto-resolve on recovery)
  ↓
Notification Service (Nodemailer email + Socket.IO browser notifications)
```

## Key design decisions

- **Simulation mode is explicit, not a lie.** Render's free tier cannot do
  ICMP ping. Devices can be set to `HTTP` (real fetch-based health check),
  `TCP` (real socket connection test), or `SIMULATED` — clearly labeled in the
  UI with a purple "Simulation" tag — which uses a configurable random
  profile (`stable`, `flaky`, `degraded`, `down`) so the whole alert/recovery
  lifecycle can be demonstrated without physical hardware.
- **No duplicate alerts.** `alertEngine.ts` checks for an existing
  ACTIVE/ACKNOWLEDGED alert on a device before creating a new one — a
  continuous outage produces exactly one incident, which is resolved
  automatically the moment the device recovers.
- **Honest notifications.** If SMTP isn't configured, or there are no
  recipients, the system records the notification as `SKIPPED`/`FAILED` with
  a clear reason — it never claims to have sent an email it didn't.
- **Soft deletes.** Deleting a device deactivates it (and stops its
  scheduler) rather than destroying its monitoring history.

---

## B. Installation (local development)

Prerequisites: Node.js 18+, a PostgreSQL database (local or hosted).

```bash
git clone <this-repo>
cd cloud-network-alert-notification-system

# Install all dependencies (root, server, client)
npm install

# Configure environment
cp server/.env.example server/.env
# then edit server/.env — at minimum set DATABASE_URL and JWT_SECRET
```

Run the backend and frontend in two terminals:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173 (proxies /api to :4000)
```

Visit `http://localhost:5173`.

## C. Database Setup

```bash
# Create the database schema
npm run prisma:migrate:dev --workspace=server 2>/dev/null || \
  (cd server && npx prisma migrate dev --name init)

# Seed demo data (admin user, sample devices, default alert rules)
npm run seed
```

`DATABASE_URL` in `server/.env` should point at your PostgreSQL instance, e.g.:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/network_alert
```

## D. Demo Login

The seed script creates the administrator account from environment
variables — **never** a hardcoded password:

```
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

Set these in `server/.env` before running `npm run seed`, then log in with
those credentials (change the password immediately in production — the seed
script is meant for demo/setup only). A `Network Operator` demo account is
also created: `operator@example.com` / `Operator123!`.

## E. Render Deployment

This repo includes `render.yaml` for a one-click **Blueprint** deploy
(single web service + a managed PostgreSQL database):

1. Push this repository to GitHub.
2. In the Render dashboard: **New → Blueprint**, point it at your repo.
   Render will read `render.yaml` and provision:
   - a **Web Service** (`cloud-network-alert`) that runs
     `npm install && npm run build` then `npm start`
   - a **PostgreSQL** database (`cloud-network-alert-db`), auto-wired into
     `DATABASE_URL`
3. Render will prompt for the `sync: false` variables — fill in:
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (used only if you run the seed)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL_FROM` (optional —
     leave blank to run without real email; the UI will say so honestly)
   - `CLIENT_URL` — after the first deploy, set this to your live URL
     (e.g. `https://cloud-network-alert.onrender.com`) and redeploy.
4. `npm start` runs `prisma migrate deploy` automatically before booting the
   server, so the database schema is created on first deploy with no manual
   step. You still need to **seed** demo data once — either from the Render
   Shell (Dashboard → your service → Shell) or locally with `DATABASE_URL`
   pointed at the Render DB:
   ```bash
   npm run seed --prefix server
   ```
5. The backend serves the built React app directly (see `server/src/app.ts`),
   so a single Render web service hosts both frontend and API — visit the
   Render URL and log in.

`GET /api/health` is wired as the Render health check endpoint.

## F. Environment Variables

See `server/.env.example` for the full list:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for session tokens |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `8h`) |
| `COOKIE_NAME` | httpOnly auth cookie name |
| `NODE_ENV`, `PORT`, `CLIENT_URL` | Server/runtime config |
| `SMTP_HOST/PORT/USER/PASSWORD`, `ALERT_EMAIL_FROM` | Email notifications (optional) |
| `SIMULATION_MODE` | Documents that simulation devices are in use |
| `SEED_ADMIN_NAME/EMAIL/PASSWORD` | Used only by `npm run seed` |

## G. System Architecture

See the diagram above. In short: React talks to Express over REST for
CRUD/reads and Socket.IO for live updates; the monitoring engine runs
independent per-device timers that call real HTTP/TCP checks or the labeled
simulation, persist results, update device status, and hand off to the alert
engine, which deduplicates incidents and triggers the notification service.

## H. Project Demonstration Script

A suggested walkthrough for your supervisor/examiners:

1. **Login** as `admin@example.com` — point out the role-based sidebar.
2. **Dashboard** — show the live summary cards and charts (all backed by
   real DB queries, not hardcoded numbers).
3. **Devices** — open **Add Device**, create a new device with monitoring
   mode `Simulated`, profile `flaky`, interval `10s`. Point out the
   "Simulation" badge — explain this stands in for ICMP/physical hardware
   Render can't provide.
4. Click **Test Now** on the new device — show the immediate check result
   and the device status updating live (Socket.IO).
5. Wait ~30–60s (or repeatedly click Test Now) until the simulated profile
   produces a failure — show the **Alerts** page: a new CRITICAL alert
   appears automatically, and the dashboard's "Active Alerts" count updates
   in real time.
6. Show that repeated failing checks do **not** create duplicate alerts —
   open **Monitoring** history for the device to show multiple OFFLINE
   results tied to one alert.
7. Keep testing until the device reports ONLINE again — show the alert
   auto-resolves and a RECOVERY alert/notification is logged.
8. **Alert Details** — show the notification log entry (SENT/FAILED/SKIPPED
   depending on whether SMTP is configured) — explain the system never
   pretends an email was sent.
9. **Reports** — generate an Availability Report and an Alert Report for the
   device, export to CSV.
10. **Alert Rules** — show configurable notification channels per rule type.
11. **Users** — as admin, create an Operator account; log in as that account
    to show restricted access (no Users/Settings/Audit Logs in the sidebar).
12. **Audit Logs** — show the trail of everything just demonstrated (login,
    device created, alert acknowledged/resolved, settings changed).
13. **Settings** — show system-wide defaults and the email toggle.

## Troubleshooting

- **"Failed to connect to the database"** — check `DATABASE_URL`; make sure
  migrations have been run (`npx prisma migrate deploy` in `server/`).
- **CORS errors in the browser console** — make sure `CLIENT_URL` on the
  server matches the origin the frontend is actually served from.
- **Emails never send** — the Notifications page will tell you exactly why
  (`SMTP is not configured...`); fill in `SMTP_HOST/USER/PASSWORD` and
  redeploy.
- **No monitoring data appears** — confirm the device has
  `monitoringEnabled: true` and `isActive: true`, and that the server logs
  show `Monitoring engine started for N device(s)` on boot.

## Limitations (documented, not hidden)

- Render's free web services do not support raw ICMP; devices needing that
  should use `HTTP`/`TCP` mode where possible, or `SIMULATED` mode (clearly
  labeled) for demonstration purposes.
- The free Render Postgres tier has connection and storage limits suitable
  for an academic demo, not production scale.
