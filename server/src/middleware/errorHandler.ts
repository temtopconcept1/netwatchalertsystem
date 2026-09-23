import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/asyncHandler";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err instanceof ApiError ? err.status : err.status ?? 500;
  const message =
    status === 500 && env.isProd ? "An unexpected server error occurred." : err.message ?? "Server error";

  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    error: message,
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}
