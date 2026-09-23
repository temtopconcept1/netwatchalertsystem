import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { recordAudit } from "../services/auditService";
import { authRateLimiter } from "../middleware/rateLimiter";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

router.post(
  "/login",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please provide a valid email and password." });
    }
    const { email, password, rememberMe } = parsed.data;
    const ip = req.ip;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || user.status !== "ACTIVE") {
      await recordAudit({
        action: "LOGIN_FAILED",
        description: `Failed login attempt for ${email}`,
        ipAddress: ip,
      });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        description: `Failed login attempt for ${email}`,
        ipAddress: ip,
      });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken({ userId: user.id, role: user.role as "ADMIN" | "OPERATOR" });

    res.cookie(env.cookieName, token, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await recordAudit({ userId: user.id, action: "LOGIN", description: `${user.fullName} logged in`, ipAddress: ip });

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.clearCookie(env.cookieName);
    await recordAudit({ userId: req.user!.userId, action: "LOGOUT", description: "User logged out", ipAddress: req.ip });
    res.json({ success: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  })
);

export default router;
