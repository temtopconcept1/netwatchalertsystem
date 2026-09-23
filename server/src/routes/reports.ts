import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const { from, to, deviceId, format } = req.query as Record<string, string>;
    const dateFilter =
      from || to ? { checkedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {};

    const devices = await prisma.device.findMany({
      where: { isActive: true, ...(deviceId ? { id: deviceId } : {}) },
    });

    const rows = await Promise.all(
      devices.map(async (device) => {
        const [total, failed, avg] = await Promise.all([
          prisma.monitoringResult.count({ where: { deviceId: device.id, ...dateFilter } }),
          prisma.monitoringResult.count({ where: { deviceId: device.id, status: "OFFLINE", ...dateFilter } }),
          prisma.monitoringResult.aggregate({
            where: { deviceId: device.id, responseTime: { not: null }, ...dateFilter },
            _avg: { responseTime: true },
          }),
        ]);
        const successful = total - failed;
        const availability = total > 0 ? Number(((successful / total) * 100).toFixed(2)) : 100;
        return {
          device: device.name,
          ipAddress: device.ipAddress,
          totalChecks: total,
          successfulChecks: successful,
          failedChecks: failed,
          availabilityPercent: availability,
          avgResponseTimeMs: avg._avg.responseTime ? Math.round(avg._avg.responseTime) : null,
        };
      })
    );

    if (format === "csv") {
      res.header("Content-Type", "text/csv");
      res.header("Content-Disposition", "attachment; filename=availability-report.csv");
      return res.send(toCsv(rows));
    }
    res.json({ rows });
  })
);

router.get(
  "/alerts",
  asyncHandler(async (req, res) => {
    const { from, to, deviceId, format } = req.query as Record<string, string>;
    const where = {
      ...(deviceId ? { deviceId } : {}),
      ...(from || to
        ? { triggeredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    const [total, critical, warning, resolved, active, alerts] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, severity: "CRITICAL" } }),
      prisma.alert.count({ where: { ...where, severity: "WARNING" } }),
      prisma.alert.count({ where: { ...where, status: "RESOLVED" } }),
      prisma.alert.count({ where: { ...where, status: { in: ["ACTIVE", "ACKNOWLEDGED"] } } }),
      prisma.alert.findMany({ where, include: { device: { select: { name: true } } }, orderBy: { triggeredAt: "desc" } }),
    ]);

    if (format === "csv") {
      const rows = alerts.map((a) => ({
        device: a.device.name,
        type: a.type,
        severity: a.severity,
        status: a.status,
        message: a.message,
        triggeredAt: a.triggeredAt.toISOString(),
        resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : "",
      }));
      res.header("Content-Type", "text/csv");
      res.header("Content-Disposition", "attachment; filename=alert-report.csv");
      return res.send(toCsv(rows));
    }

    res.json({ summary: { total, critical, warning, resolved, active }, alerts });
  })
);

export default router;
