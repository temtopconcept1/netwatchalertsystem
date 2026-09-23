export type Role = "ADMIN" | "OPERATOR";
export type DeviceStatus = "ONLINE" | "WARNING" | "OFFLINE" | "UNKNOWN";
export type DeviceType = "ROUTER" | "SWITCH" | "SERVER" | "FIREWALL" | "ACCESS_POINT" | "DATABASE_SERVER" | "OTHER";
export type MonitorMode = "HTTP" | "TCP" | "SIMULATED";
export type Severity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type AlertType = "DEVICE_OFFLINE" | "HIGH_LATENCY" | "REPEATED_FAILURE" | "RECOVERY";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status?: "ACTIVE" | "DISABLED";
  lastLogin?: string | null;
  createdAt?: string;
}

export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  hostname?: string | null;
  type: DeviceType;
  location?: string | null;
  description?: string | null;
  monitorMode: MonitorMode;
  checkUrl?: string | null;
  port?: number | null;
  monitoringInterval: number;
  timeout: number;
  warningThreshold: number;
  criticalThreshold: number;
  failuresBeforeAlert: number;
  monitoringEnabled: boolean;
  simProfile: string;
  status: DeviceStatus;
  consecutiveFailures: number;
  lastChecked?: string | null;
  lastResponseTime?: number | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  deviceId: string;
  device?: { name: string; ipAddress?: string };
  type: AlertType;
  severity: Severity;
  message: string;
  status: AlertStatus;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

export interface MonitoringResult {
  id: string;
  deviceId: string;
  device?: { name: string };
  status: DeviceStatus;
  responseTime: number | null;
  checkType: string;
  errorMessage: string | null;
  checkedAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  warningThresholdMs?: number | null;
  criticalThresholdMs?: number | null;
  failuresBeforeAlert?: number | null;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  severity: Severity;
}

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  user?: { fullName: string; email: string } | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface SystemSettings {
  systemName: string;
  organizationName: string;
  timezone: string;
  defaultCheckInterval: number;
  defaultTimeout: number;
  defaultWarningMs: number;
  defaultCriticalMs: number;
  emailEnabled: boolean;
  notifyRecipients: string;
  notifySeverity: Severity;
  sessionMinutes: number;
  passwordMinLength: number;
}

export interface DashboardStats {
  summary: {
    totalDevices: number;
    online: number;
    offline: number;
    warning: number;
    activeAlerts: number;
    alertsToday: number;
  };
  charts: {
    responseTimeTrend: { time: string; avgResponseTime: number }[];
    alertsOverTime: { date: string; count: number }[];
    statusBreakdown: { status: string; count: number }[];
  };
  recentAlerts: Array<{
    id: string;
    device: string;
    type: string;
    severity: Severity;
    message: string;
    triggeredAt: string;
    status: AlertStatus;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    user: string;
    createdAt: string;
  }>;
}
