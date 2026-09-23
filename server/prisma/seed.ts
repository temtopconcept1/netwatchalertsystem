import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "System Administrator";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "operator@example.com" },
    update: {},
    create: {
      fullName: "Network Operator",
      email: "operator@example.com",
      passwordHash: await bcrypt.hash("Operator123!", 12),
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  await prisma.systemSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      systemName: "Cloud Network Alert",
      organizationName: "Department of Computer Science",
      notifyRecipients: adminEmail,
      emailEnabled: false,
    },
  });

  const devices = [
    { name: "Router-Main", ipAddress: "10.0.0.1", type: "ROUTER" as const, location: "Server Room A", simProfile: "stable" },
    { name: "Server-Web", ipAddress: "10.0.0.10", type: "SERVER" as const, location: "Server Room A", simProfile: "stable", monitorMode: "HTTP" as const, checkUrl: "https://example.com" },
    { name: "Server-Database", ipAddress: "10.0.0.20", type: "DATABASE_SERVER" as const, location: "Server Room B", simProfile: "degraded" },
    { name: "Office-Switch", ipAddress: "10.0.1.1", type: "SWITCH" as const, location: "Office Floor 2", simProfile: "flaky" },
    { name: "AccessPoint-01", ipAddress: "10.0.1.50", type: "ACCESS_POINT" as const, location: "Office Floor 2", simProfile: "stable" },
  ];

  for (const d of devices) {
    const existing = await prisma.device.findFirst({ where: { name: d.name } });
    if (!existing) {
      await prisma.device.create({
        data: {
          name: d.name,
          ipAddress: d.ipAddress,
          type: d.type,
          location: d.location,
          monitorMode: d.monitorMode ?? "SIMULATED",
          checkUrl: d.checkUrl,
          simProfile: d.simProfile,
          monitoringInterval: 30,
          status: "UNKNOWN",
        },
      });
    }
  }

  const defaultRules: Array<{ name: string; type: "DEVICE_OFFLINE" | "HIGH_LATENCY" | "REPEATED_FAILURE" | "RECOVERY"; severity: "INFO" | "WARNING" | "CRITICAL" }> = [
    { name: "Device Offline", type: "DEVICE_OFFLINE", severity: "CRITICAL" },
    { name: "High Latency", type: "HIGH_LATENCY", severity: "WARNING" },
    { name: "Repeated Failure (2+ checks)", type: "REPEATED_FAILURE", severity: "CRITICAL" },
    { name: "Recovery Notification", type: "RECOVERY", severity: "INFO" },
  ];
  for (const r of defaultRules) {
    const existing = await prisma.alertRule.findFirst({ where: { type: r.type } });
    if (!existing) {
      await prisma.alertRule.create({ data: { name: r.name, type: r.type, severity: r.severity } });
    }
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Admin login -> email: ${adminEmail} / password: ${adminPassword} (from env — change after first login)`);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
