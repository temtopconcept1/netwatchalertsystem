import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import deviceRoutes from "./routes/devices";
import monitoringRoutes from "./routes/monitoring";
import alertRoutes from "./routes/alerts";
import alertRuleRoutes from "./routes/alertRules";
import notificationRoutes from "./routes/notifications";
import reportRoutes from "./routes/reports";
import userRoutes from "./routes/users";
import auditLogRoutes from "./routes/auditLogs";
import settingsRoutes from "./routes/settings";
import healthRoutes from "./routes/health";

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/devices", deviceRoutes);
  app.use("/api/monitoring", monitoringRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/alert-rules", alertRuleRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/audit-logs", auditLogRoutes);
  app.use("/api/settings", settingsRoutes);

  // Serve the built React frontend in production (single-service Render deploy)
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}
