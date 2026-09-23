import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "4000", 10),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",

  databaseUrl: required("DATABASE_URL", "postgresql://user:password@localhost:5432/network_alert"),

  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  cookieName: process.env.COOKIE_NAME ?? "nas_token",

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    from: process.env.ALERT_EMAIL_FROM ?? "alerts@example.com",
  },
  get smtpConfigured() {
    return Boolean(this.smtp.host && this.smtp.user && this.smtp.password);
  },

  simulationMode: (process.env.SIMULATION_MODE ?? "true") === "true",

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME ?? "System Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
  },
};
