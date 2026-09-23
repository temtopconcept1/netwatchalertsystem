import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { setIO } from "./services/realtime";
import { startMonitoringEngine } from "./services/monitoringEngine";
import { prisma } from "./lib/prisma";

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });
  setIO(io);

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  // Verify DB connectivity before accepting traffic.
  try {
    await prisma.$queryRaw`SELECT 1`;
    // eslint-disable-next-line no-console
    console.log("Database connection established.");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to the database on startup:", err);
  }

  await startMonitoringEngine();

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Cloud Network Alert server listening on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async () => {
    // eslint-disable-next-line no-console
    console.log("Shutting down gracefully...");
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
