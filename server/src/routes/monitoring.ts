import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const { deviceId, from, to, page = "1", pageSize = "25" } = req.query as Record<string, string>;
    const take = Math.min(parseInt(pageSize, 10) || 25, 200);
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const where = {
      ...(deviceId ? { deviceId } : {}),
      ...(from || to
        ? {
            checkedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [results, total] = await Promise.all([
      prisma.monitoringResult.findMany({
        where,
        include: { device: { select: { name: true } } },
        orderBy: { checkedAt: "desc" },
        take,
        skip,
      }),
      prisma.monitoringResult.count({ where }),
    ]);

    res.json({ results, total, page: parseInt(page, 10) || 1, pageSize: take });
  })
);

router.get(
  "/:deviceId",
  asyncHandler(async (req, res) => {
    const results = await prisma.monitoringResult.findMany({
      where: { deviceId: req.params.deviceId },
      orderBy: { checkedAt: "desc" },
      take: 200,
    });
    res.json({ results });
  })
);

export default router;
