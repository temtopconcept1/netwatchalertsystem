import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, action, from, to } = req.query as Record<string, string>;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    res.json({ logs });
  })
);

export default router;
