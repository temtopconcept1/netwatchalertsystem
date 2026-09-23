import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { recordAudit } from "../services/auditService";

const router = Router();
router.use(requireAuth);

const ruleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["DEVICE_OFFLINE", "HIGH_LATENCY", "REPEATED_FAILURE", "RECOVERY"]),
  enabled: z.boolean().default(true),
  warningThresholdMs: z.number().int().optional().nullable(),
  criticalThresholdMs: z.number().int().optional().nullable(),
  failuresBeforeAlert: z.number().int().optional().nullable(),
  notifyEmail: z.boolean().default(true),
  notifyBrowser: z.boolean().default(true),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("WARNING"),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rules = await prisma.alertRule.findMany({ orderBy: { createdAt: "asc" } });
    res.json({ rules });
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = ruleSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid rule.");
    const rule = await prisma.alertRule.create({ data: parsed.data });
    await recordAudit({ userId: req.user!.userId, action: "ALERT_RULE_CREATED", description: `Rule "${rule.name}" created.`, ipAddress: req.ip });
    res.status(201).json({ rule });
  })
);

router.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = ruleSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid rule.");
    const existing = await prisma.alertRule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Rule not found.");
    const rule = await prisma.alertRule.update({ where: { id: req.params.id }, data: parsed.data });
    await recordAudit({ userId: req.user!.userId, action: "ALERT_RULE_UPDATED", description: `Rule "${rule.name}" updated.`, ipAddress: req.ip });
    res.json({ rule });
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.alertRule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Rule not found.");
    await prisma.alertRule.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.userId, action: "ALERT_RULE_DELETED", description: `Rule "${existing.name}" deleted.`, ipAddress: req.ip });
    res.json({ success: true });
  })
);

export default router;
