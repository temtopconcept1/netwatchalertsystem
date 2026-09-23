import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalDevices, online, offline, warning, activeAlerts, alertsToday, recentAlerts, recentActivity] =
      await Promise.all([
        prisma.device.count({ where: { isActive: true } }),
        prisma.device.count({ where: { isActive: true, status: "ONLINE" } }),
        prisma.device.count({ where: { isActive: true, status: "OFFLINE" } }),
        prisma.device.count({ where: { isActive: true, status: "WARNING" } }),
        prisma.alert.count({ where: { status: { in: ["ACTIVE", "ACKNOWLEDGED"] } } }),
        prisma.alert.count({ where: { triggeredAt: { gte: startOfDay } } }),
        prisma.alert.findMany({
          take: 8,
          orderBy: { triggeredAt: "desc" },
          include: { device: { select: { name: true } } },
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { fullName: true } } },
        }),
      ]);

    // Response-time trend: last 24 hourly buckets' average response time
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const results = await prisma.monitoringResult.findMany({
      where: { checkedAt: { gte: since }, responseTime: { not: null } },
      select: { checkedAt: true, responseTime: true },
    });
    const buckets: Record<string, { sum: number; count: number }> = {};
    for (const r of results) {
      const hour = new Date(r.checkedAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      buckets[key] = buckets[key] || { sum: 0, count: 0 };
      buckets[key].sum += r.responseTime ?? 0;
      buckets[key].count += 1;
    }
    const responseTimeTrend = Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([time, { sum, count }]) => ({ time, avgResponseTime: Math.round(sum / count) }));

    // Alerts over time (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAlertRows = await prisma.alert.findMany({
      where: { triggeredAt: { gte: sevenDaysAgo } },
      select: { triggeredAt: true, severity: true },
    });
    const dayBuckets: Record<string, number> = {};
    for (const a of recentAlertRows) {
      const day = a.triggeredAt.toISOString().slice(0, 10);
      dayBuckets[day] = (dayBuckets[day] ?? 0) + 1;
    }
    const alertsOverTime = Object.entries(dayBuckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    res.json({
      summary: {
        totalDevices,
        online,
        offline,
        warning,
        activeAlerts,
        alertsToday,
      },
      charts: {
        responseTimeTrend,
        alertsOverTime,
        statusBreakdown: [
          { status: "ONLINE", count: online },
          { status: "WARNING", count: warning },
          { status: "OFFLINE", count: offline },
        ],
      },
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        device: a.device.name,
        type: a.type,
        severity: a.severity,
        message: a.message,
        triggeredAt: a.triggeredAt,
        status: a.status,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        description: a.description,
        user: a.user?.fullName ?? "System",
        createdAt: a.createdAt,
      })),
    });
  })
);

export default router;
