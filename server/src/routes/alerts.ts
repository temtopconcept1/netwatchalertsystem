import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { recordAudit } from "../services/auditService";
import { broadcast } from "../services/realtime";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, severity, status, deviceId, from, to } = req.query as Record<string, string>;
    const alerts = await prisma.alert.findMany({
      where: {
        ...(severity ? { severity: severity as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(deviceId ? { deviceId } : {}),
        ...(from || to
          ? { triggeredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
        ...(search
          ? {
              OR: [
                { message: { contains: search, mode: "insensitive" } },
                { device: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { device: { select: { name: true, ipAddress: true } } },
      orderBy: { triggeredAt: "desc" },
      take: 200,
    });
    res.json({ alerts });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: {
        device: true,
        notifications: { orderBy: { sentAt: "desc" } },
        acknowledgedBy: { select: { fullName: true } },
        resolvedBy: { select: { fullName: true } },
      },
    });
    if (!alert) throw new ApiError(404, "Alert not found.");
    res.json({ alert });
  })
);

router.patch(
  "/:id/acknowledge",
  asyncHandler(async (req, res) => {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!alert) throw new ApiError(404, "Alert not found.");
    if (alert.status !== "ACTIVE") throw new ApiError(400, "Only active alerts can be acknowledged.");

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedById: req.user!.userId },
    });
    await recordAudit({
      userId: req.user!.userId,
      action: "ALERT_ACKNOWLEDGED",
      description: `Alert ${alert.id} was acknowledged.`,
      ipAddress: req.ip,
    });
    broadcast("alerts:changed", { deviceId: alert.deviceId });
    res.json({ alert: updated });
  })
);

router.patch(
  "/:id/resolve",
  asyncHandler(async (req, res) => {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!alert) throw new ApiError(404, "Alert not found.");
    if (alert.status === "RESOLVED") throw new ApiError(400, "Alert is already resolved.");

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: req.user!.userId },
    });
    await recordAudit({
      userId: req.user!.userId,
      action: "ALERT_RESOLVED",
      description: `Alert ${alert.id} was manually resolved.`,
      ipAddress: req.ip,
    });
    broadcast("alerts:changed", { deviceId: alert.deviceId });
    res.json({ alert: updated });
  })
);

export default router;
