import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { recordAudit } from "../services/auditService";
import { monitorDevice, reschedule, unschedule } from "../services/monitoringEngine";

const router = Router();
router.use(requireAuth);

const deviceSchema = z.object({
  name: z.string().min(1),
  ipAddress: z.string().min(1),
  hostname: z.string().optional().nullable(),
  type: z.enum(["ROUTER", "SWITCH", "SERVER", "FIREWALL", "ACCESS_POINT", "DATABASE_SERVER", "OTHER"]),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  monitorMode: z.enum(["HTTP", "TCP", "SIMULATED"]).default("SIMULATED"),
  checkUrl: z.string().optional().nullable(),
  port: z.number().int().optional().nullable(),
  monitoringInterval: z.number().int().min(5).default(60),
  timeout: z.number().int().min(500).default(5000),
  warningThreshold: z.number().int().min(1).default(300),
  criticalThreshold: z.number().int().min(1).default(1000),
  failuresBeforeAlert: z.number().int().min(1).default(2),
  monitoringEnabled: z.boolean().default(true),
  simProfile: z.enum(["stable", "flaky", "degraded", "down"]).default("stable"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, status, type } = req.query as Record<string, string | undefined>;
    const devices = await prisma.device.findMany({
      where: {
        isActive: true,
        ...(status ? { status: status as any } : {}),
        ...(type ? { type: type as any } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { ipAddress: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ devices });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) throw new ApiError(404, "Device not found.");

    const [history, alerts, total, failed] = await Promise.all([
      prisma.monitoringResult.findMany({
        where: { deviceId: device.id },
        orderBy: { checkedAt: "desc" },
        take: 100,
      }),
      prisma.alert.findMany({ where: { deviceId: device.id }, orderBy: { triggeredAt: "desc" }, take: 20 }),
      prisma.monitoringResult.count({ where: { deviceId: device.id } }),
      prisma.monitoringResult.count({ where: { deviceId: device.id, status: "OFFLINE" } }),
    ]);

    const availability = total > 0 ? Number((((total - failed) / total) * 100).toFixed(2)) : 100;

    res.json({ device, history, alerts, availability });
  })
);

router.post(
  "/",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const parsed = deviceSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid device data.");

    const device = await prisma.device.create({ data: parsed.data });
    await reschedule(device.id);
    await recordAudit({
      userId: req.user!.userId,
      action: "DEVICE_CREATED",
      description: `Device "${device.name}" (${device.ipAddress}) was added.`,
      ipAddress: req.ip,
    });
    res.status(201).json({ device });
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "OPERATOR"),
  asyncHandler(async (req, res) => {
    const parsed = deviceSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid device data.");

    const existing = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Device not found.");

    const device = await prisma.device.update({ where: { id: req.params.id }, data: parsed.data });
    await reschedule(device.id);
    await recordAudit({
      userId: req.user!.userId,
      action: "DEVICE_UPDATED",
      description: `Device "${device.name}" was updated.`,
      ipAddress: req.ip,
    });
    res.json({ device });
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Device not found.");

    // Soft-delete/deactivate rather than hard delete, to preserve history.
    const device = await prisma.device.update({ where: { id: req.params.id }, data: { isActive: false, monitoringEnabled: false } });
    unschedule(device.id);
    await recordAudit({
      userId: req.user!.userId,
      action: "DEVICE_DELETED",
      description: `Device "${device.name}" was deactivated/removed.`,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  })
);

router.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) throw new ApiError(404, "Device not found.");

    const outcome = await monitorDevice(device.id);
    await recordAudit({
      userId: req.user!.userId,
      action: "DEVICE_TESTED",
      description: `Manual test run for "${device.name}".`,
      ipAddress: req.ip,
    });
    res.json(outcome);
  })
);

export default router;
