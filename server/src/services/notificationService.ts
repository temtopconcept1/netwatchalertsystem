import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import type { Alert, Device } from "@prisma/client";
import { getIO } from "./realtime";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtpConfigured) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.password },
  });
  return transporter;
}

function buildAlertText(alert: Alert, device: Device): string {
  const prefix =
    alert.severity === "CRITICAL" ? "CRITICAL" : alert.severity === "WARNING" ? "WARNING" : "INFO";
  return `${prefix}: ${device.name} (${device.ipAddress}) — ${alert.message}`;
}

/**
 * Sends (or records skipped/failed) notifications for a given alert to all
 * configured recipients, and emits a browser notification event over the
 * socket for connected dashboards. Always writes a Notification row so the
 * outcome is auditable — never silently "pretends" to send.
 */
export async function dispatchAlertNotifications(alert: Alert, device: Device) {
  const settings = await prisma.systemSetting.findUnique({ where: { id: "singleton" } });
  const text = buildAlertText(alert, device);

  // Browser notification — always emitted; the client decides whether the
  // user has granted permission.
  try {
    getIO()?.emit("notification:browser", {
      id: alert.id,
      title: `${alert.severity} — ${device.name}`,
      body: alert.message,
      severity: alert.severity,
      deviceId: device.id,
      alertId: alert.id,
    });
  } catch {
    // realtime layer may not be initialized (e.g. during seed scripts) — ignore
  }

  if (!settings?.emailEnabled) {
    await prisma.notification.create({
      data: {
        alertId: alert.id,
        channel: "EMAIL",
        status: "SKIPPED",
        detail: "Email notifications are disabled in Settings.",
      },
    });
    return;
  }

  const recipients = (settings.notifyRecipients ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    await prisma.notification.create({
      data: {
        alertId: alert.id,
        channel: "EMAIL",
        status: "SKIPPED",
        detail: "No notification recipients configured.",
      },
    });
    return;
  }

  const mailer = getTransporter();
  if (!mailer) {
    await prisma.notification.create({
      data: {
        alertId: alert.id,
        channel: "EMAIL",
        recipient: recipients.join(", "),
        status: "FAILED",
        detail: "SMTP is not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD).",
      },
    });
    return;
  }

  try {
    await mailer.sendMail({
      from: env.smtp.from,
      to: recipients.join(", "),
      subject: `[Cloud Network Alert] ${alert.severity} — ${device.name}`,
      text,
    });
    await prisma.notification.create({
      data: {
        alertId: alert.id,
        channel: "EMAIL",
        recipient: recipients.join(", "),
        status: "SENT",
        detail: text,
      },
    });
  } catch (err: any) {
    await prisma.notification.create({
      data: {
        alertId: alert.id,
        channel: "EMAIL",
        recipient: recipients.join(", "),
        status: "FAILED",
        detail: `SMTP send failed: ${err?.message ?? "unknown error"}`,
      },
    });
  }
}

/**
 * Sends a one-off test email to verify SMTP configuration. Returns a result
 * object rather than throwing, so the API can report success/failure clearly.
 */
export async function sendTestNotification(recipient: string) {
  const mailer = getTransporter();
  if (!mailer) {
    return {
      ok: false,
      message:
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in your environment to enable email.",
    };
  }
  try {
    await mailer.sendMail({
      from: env.smtp.from,
      to: recipient,
      subject: "[Cloud Network Alert] Test Notification",
      text: "This is a test notification from your Cloud Network Alert Notification System. If you received this, email alerts are configured correctly.",
    });
    return { ok: true, message: `Test email sent to ${recipient}.` };
  } catch (err: any) {
    return { ok: false, message: `Failed to send test email: ${err?.message ?? "unknown error"}` };
  }
}
