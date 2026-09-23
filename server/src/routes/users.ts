import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { recordAudit } from "../services/auditService";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["ADMIN", "OPERATOR"]).default("OPERATOR"),
});

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "OPERATOR"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, role: true, status: true, lastLogin: true, createdAt: true },
    });
    res.json({ users });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid user data.");

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) throw new ApiError(409, "A user with this email already exists.");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        passwordHash,
      },
    });
    await recordAudit({ userId: req.user!.userId, action: "USER_CREATED", description: `User "${user.email}" created.`, ipAddress: req.ip });
    res.status(201).json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid user data.");
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "User not found.");

    const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
    await recordAudit({
      userId: req.user!.userId,
      action: "USER_UPDATED",
      description: `User "${user.email}" updated (${JSON.stringify(parsed.data)}).`,
      ipAddress: req.ip,
    });
    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status } });
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const schema = z.object({ newPassword: z.string().min(8) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "New password must be at least 8 characters.");

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "User not found.");

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    await recordAudit({
      userId: req.user!.userId,
      action: "USER_PASSWORD_RESET",
      description: `Password reset for "${existing.email}".`,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  })
);

export default router;
