import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { recordAudit } from "../services/auditService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.systemSetting.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    res.json({ settings });
  })
);

const settingsSchema = z.object({
  systemName: z.string().min(1).optional(),
  organizationName: z.string().min(1).optional(),
  timezone: z.string().optional(),
  defaultCheckInterval: z.number().int().min(5).optional(),
  defaultTimeout: z.number().int().min(500).optional(),
  defaultWarningMs: z.number().int().optional(),
  defaultCriticalMs: z.number().int().optional(),
  emailEnabled: z.boolean().optional(),
  notifyRecipients: z.string().optional(),
  notifySeverity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  sessionMinutes: z.number().int().min(5).optional(),
  passwordMinLength: z.number().int().min(6).optional(),
});

router.put(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid settings.");

    const settings = await prisma.systemSetting.upsert({
      where: { id: "singleton" },
      update: parsed.data,
      create: { id: "singleton", ...parsed.data },
    });
    await recordAudit({ userId: req.user!.userId, action: "SETTINGS_UPDATED", description: "System settings updated.", ipAddress: req.ip });
    res.json({ settings });
  })
);

export default router;
