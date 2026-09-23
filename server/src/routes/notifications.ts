import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { sendTestNotification } from "../services/notificationService";
import { recordAudit } from "../services/auditService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const notifications = await prisma.notification.findMany({
      include: { alert: { include: { device: { select: { name: true } } } } },
      orderBy: { sentAt: "desc" },
      take: 100,
    });
    res.json({ notifications });
  })
);

const testSchema = z.object({ recipient: z.string().email() });

router.post(
  "/test",
  asyncHandler(async (req, res) => {
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "A valid recipient email is required.");

    const result = await sendTestNotification(parsed.data.recipient);
    await recordAudit({
      userId: req.user!.userId,
      action: "TEST_NOTIFICATION",
      description: `Test notification ${result.ok ? "sent" : "attempted"} to ${parsed.data.recipient}: ${result.message}`,
      ipAddress: req.ip,
    });
    res.status(result.ok ? 200 : 502).json(result);
  })
);

export default router;
