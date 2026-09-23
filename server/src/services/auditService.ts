import { prisma } from "../lib/prisma";

export async function recordAudit(params: {
  userId?: string | null;
  action: string;
  description: string;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      description: params.description,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
