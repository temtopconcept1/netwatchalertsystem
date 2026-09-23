import { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";
import type { DeviceStatus, Severity, AlertStatus } from "../types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, string> = {
    ONLINE: "bg-green-100 text-green-700 border-green-200",
    WARNING: "bg-yellow-100 text-yellow-700 border-yellow-200",
    OFFLINE: "bg-red-100 text-red-700 border-red-200",
    UNKNOWN: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const dot: Record<DeviceStatus, string> = {
    ONLINE: "bg-status-online",
    WARNING: "bg-status-warning",
    OFFLINE: "bg-status-offline",
    UNKNOWN: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    INFO: "bg-blue-100 text-blue-700 border-blue-200",
    WARNING: "bg-yellow-100 text-yellow-700 border-yellow-200",
    CRITICAL: "bg-red-100 text-red-700 border-red-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[severity]}`}>{severity}</span>;
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const map: Record<AlertStatus, string> = {
    ACTIVE: "bg-red-100 text-red-700 border-red-200",
    ACKNOWLEDGED: "bg-yellow-100 text-yellow-700 border-yellow-200",
    RESOLVED: "bg-green-100 text-green-700 border-green-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
      <Inbox className="h-8 w-8" />
      <p className="text-sm">{title}</p>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "hover:bg-slate-100 text-slate-600",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${props.className ?? ""}`}
    />
  );
}

export function Toast({ message, type = "success", onClose }: { message: string; type?: "success" | "error"; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
        type === "success" ? "bg-slate-900" : "bg-red-600"
      }`}
      onClick={onClose}
    >
      {message}
    </div>
  );
}
