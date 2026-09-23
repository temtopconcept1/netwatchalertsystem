import net from "node:net";
import { prisma } from "../lib/prisma";
import type { Device, DeviceStatus, CheckType } from "@prisma/client";
import { evaluateDeviceForAlerts } from "./alertEngine";
import { broadcast } from "./realtime";

interface CheckResult {
  status: DeviceStatus;
  responseTime: number | null;
  checkType: CheckType;
  errorMessage: string | null;
}

/** Real HTTP/HTTPS health check using the built-in fetch (Node 18+). */
async function checkHttp(device: Device): Promise<CheckResult> {
  const url = device.checkUrl || `http://${device.ipAddress}`;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), device.timeout);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    const responseTime = Date.now() - start;
    if (!res.ok) {
      return {
        status: "OFFLINE",
        responseTime,
        checkType: "HTTP",
        errorMessage: `HTTP ${res.status} ${res.statusText}`,
      };
    }
    return { status: classifyByLatency(device, responseTime), responseTime, checkType: "HTTP", errorMessage: null };
  } catch (err: any) {
    return {
      status: "OFFLINE",
      responseTime: null,
      checkType: "HTTP",
      errorMessage: err?.name === "AbortError" ? "Request timed out" : err?.message ?? "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Real TCP port connectivity check. */
async function checkTcp(device: Device): Promise<CheckResult> {
  const port = device.port ?? 80;
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: CheckResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(device.timeout);
    socket.once("connect", () => {
      const responseTime = Date.now() - start;
      finish({
        status: classifyByLatency(device, responseTime),
        responseTime,
        checkType: "TCP",
        errorMessage: null,
      });
    });
    socket.once("timeout", () => finish({ status: "OFFLINE", responseTime: null, checkType: "TCP", errorMessage: "Connection timed out" }));
    socket.once("error", (err) => finish({ status: "OFFLINE", responseTime: null, checkType: "TCP", errorMessage: err.message }));

    socket.connect(port, device.ipAddress);
  });
}

/** Deterministic-ish simulation used when real network checks aren't available (e.g. on Render without ICMP). */
function checkSimulated(device: Device): CheckResult {
  const profiles: Record<string, { onlineP: number; warnP: number; offlineP: number; latencyRange: [number, number] }> = {
    stable: { onlineP: 0.94, warnP: 0.05, offlineP: 0.01, latencyRange: [10, 120] },
    flaky: { onlineP: 0.6, warnP: 0.2, offlineP: 0.2, latencyRange: [50, 500] },
    degraded: { onlineP: 0.3, warnP: 0.5, offlineP: 0.2, latencyRange: [250, 900] },
    down: { onlineP: 0.05, warnP: 0.05, offlineP: 0.9, latencyRange: [200, 1200] },
  };
  const profile = profiles[device.simProfile] ?? profiles.stable;
  const roll = Math.random();

  if (roll < profile.offlineP) {
    return {
      status: "OFFLINE",
      responseTime: null,
      checkType: "SIMULATED",
      errorMessage: "Simulated timeout — no response received.",
    };
  }

  const [min, max] = profile.latencyRange;
  const responseTime = Math.round(min + Math.random() * (max - min));

  if (roll < profile.offlineP + profile.warnP) {
    // force a latency at/above the warning threshold to justify WARNING
    const forced = Math.max(responseTime, device.warningThreshold + 20);
    return { status: classifyByLatency(device, forced), responseTime: forced, checkType: "SIMULATED", errorMessage: null };
  }

  return { status: classifyByLatency(device, responseTime), responseTime, checkType: "SIMULATED", errorMessage: null };
}

function classifyByLatency(device: Device, responseTimeMs: number): DeviceStatus {
  if (responseTimeMs >= device.criticalThreshold) return "WARNING"; // responds, but slow -> warning per spec (offline is reserved for failed checks)
  if (responseTimeMs >= device.warningThreshold) return "WARNING";
  return "ONLINE";
}

async function runCheck(device: Device): Promise<CheckResult> {
  switch (device.monitorMode) {
    case "HTTP":
      return checkHttp(device);
    case "TCP":
      return checkTcp(device);
    case "SIMULATED":
    default:
      return checkSimulated(device);
  }
}

/** Executes one monitoring pass for a single device: check, persist, alert. */
export async function monitorDevice(deviceId: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device || !device.isActive || !device.monitoringEnabled) return null;

  const result = await runCheck(device);

  await prisma.monitoringResult.create({
    data: {
      deviceId: device.id,
      status: result.status,
      responseTime: result.responseTime,
      checkType: result.checkType,
      errorMessage: result.errorMessage,
    },
  });

  const consecutiveFailures =
    result.status === "OFFLINE" ? device.consecutiveFailures + 1 : 0;

  const updatedDevice = await prisma.device.update({
    where: { id: device.id },
    data: {
      status: result.status,
      lastChecked: new Date(),
      lastResponseTime: result.responseTime,
      consecutiveFailures,
    },
  });

  await evaluateDeviceForAlerts(updatedDevice, result.status, result.responseTime, result.errorMessage);

  broadcast("device:updated", {
    id: updatedDevice.id,
    status: updatedDevice.status,
    lastResponseTime: updatedDevice.lastResponseTime,
    lastChecked: updatedDevice.lastChecked,
  });

  return { device: updatedDevice, result };
}

// --- Scheduler: one timer per active, monitored device, honoring its own interval ---
const timers = new Map<string, NodeJS.Timeout>();

function scheduleDevice(device: Device) {
  clearTimer(device.id);
  if (!device.isActive || !device.monitoringEnabled) return;
  const intervalMs = Math.max(5, device.monitoringInterval) * 1000;
  const timer = setInterval(() => {
    monitorDevice(device.id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`Monitoring error for device ${device.id}:`, err);
    });
  }, intervalMs);
  timers.set(device.id, timer);
}

function clearTimer(deviceId: string) {
  const existing = timers.get(deviceId);
  if (existing) {
    clearInterval(existing);
    timers.delete(deviceId);
  }
}

/** Call after creating/updating a device so its schedule reflects the latest config. */
export async function reschedule(deviceId: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    clearTimer(deviceId);
    return;
  }
  scheduleDevice(device);
}

export function unschedule(deviceId: string) {
  clearTimer(deviceId);
}

/** Boots the scheduler for every active device at server startup. */
export async function startMonitoringEngine() {
  const devices = await prisma.device.findMany({ where: { isActive: true, monitoringEnabled: true } });
  devices.forEach(scheduleDevice);
  // eslint-disable-next-line no-console
  console.log(`Monitoring engine started for ${devices.length} device(s).`);
}
