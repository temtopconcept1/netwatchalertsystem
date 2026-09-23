import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.[env.cookieName] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Account is not active." });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

export function requireRole(...roles: Array<"ADMIN" | "OPERATOR">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}
