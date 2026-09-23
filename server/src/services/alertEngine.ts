import { prisma } from "../lib/prisma";
import type { Device, DeviceStatus } from "@prisma/client";
import { dispatchAlertNotifications } from "./notificationService";
import { broadcast } from "./realtime";
import { recordAudit } from "./auditService";

/**
 * Called after every monitoring check with the device's *new* status.
 * Implements incident deduplication: a continuous outage produces exactly
 * one ACTIVE alert, which is left alone on repeated failures and resolved
 * automatically on recovery.
 */
export async function evaluateDeviceForAlerts(
  device: Device,
  newStatus: DeviceStatus,
  responseTime: number | null,
  errorMessage: string | null
) {
  const existingActiveAlert = await prisma.alert.findFirst({
    where: { deviceId: device.id, status: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
    orderBy: { triggeredAt: "desc" },
  });

  // Device recovered
  if (newStatus === "ONLINE" && existingActiveAlert) {
    const resolved = await prisma.alert.update({
      where: { id: existingActiveAlert.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    const recoveryAlert = await prisma.alert.create({
      data: {
        deviceId: device.id,
        type: "RECOVERY",
        severity: "INFO",
        message: `${device.name} has recovered and is back online.`,
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    await dispatchAlertNotifications(recoveryAlert, device);
    await recordAudit({
      action: "ALERT_RESOLVED",
      description: `Incident on ${device.name} auto-resolved after recovery.`,
    });
    broadcast("alerts:changed", { deviceId: device.id });
    return { alert: resolved };
  }

  // Device offline
  if (newStatus === "OFFLINE") {
    if (existingActiveAlert && existingActiveAlert.type !== "RECOVERY") {
      // Same continuous incident — do not duplicate, just leave it ACTIVE.
      broadcast("alerts:changed", { deviceId: device.id });
      return { alert: existingActiveAlert, deduped: true };
    }
    const type = device.consecutiveFailures >= device.failuresBeforeAlert ? "REPEATED_FAILURE" : "DEVICE_OFFLINE";
    const alert = await prisma.alert.create({
      data: {
        deviceId: device.id,
        type,
        severity: "CRITICAL",
        message: errorMessage
          ? `${device.name} is offline: ${errorMessage}`
          : `${device.name} is offline.`,
        status: "ACTIVE",
      },
    });
    await dispatchAlertNotifications(alert, device);
    broadcast("alerts:changed", { deviceId: device.id });
    return { alert };
  }

  // High latency (device responds, but above critical threshold => WARNING)
  if (newStatus === "WARNING" && responseTime !== null) {
    if (existingActiveAlert && existingActiveAlert.type === "HIGH_LATENCY") {
      broadcast("alerts:changed", { deviceId: device.id });
      return { alert: existingActiveAlert, deduped: true };
    }
    const alert = await prisma.alert.create({
      data: {
        deviceId: device.id,
        type: "HIGH_LATENCY",
        severity: "WARNING",
        message: `${device.name} response time (${responseTime}ms) exceeded the warning threshold (${device.warningThreshold}ms).`,
        status: "ACTIVE",
      },
    });
    await dispatchAlertNotifications(alert, device);
    broadcast("alerts:changed", { deviceId: device.id });
    return { alert };
  }

  return { alert: null };
}
