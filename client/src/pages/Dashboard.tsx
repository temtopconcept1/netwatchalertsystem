import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Server, Wifi, WifiOff, AlertTriangle, Bell, CalendarClock } from "lucide-react";
import { api } from "../api/client";
import { Card, Spinner, SeverityBadge, AlertStatusBadge } from "../components/ui";
import { useRealtime } from "../hooks/useRealtime";
import { useToast } from "../hooks/useToast";
import type { DashboardStats } from "../types";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = { ONLINE: "#22c55e", WARNING: "#eab308", OFFLINE: "#ef4444" };

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<DashboardStats>("/dashboard/stats");
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  useRealtime({
    onDeviceUpdated: load,
    onAlertsChanged: load,
    onBrowserNotification: (payload) => showToast(`${payload.title}: ${payload.body}`, payload.severity === "CRITICAL" ? "error" : "success"),
  });

  if (loading || !stats) return <Spinner label="Loading dashboard..." />;

  const { summary, charts, recentAlerts, recentActivity } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live overview of your network's health.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Server} label="Total Devices" value={summary.totalDevices} tone="bg-slate-100 text-slate-600" />
        <StatCard icon={Wifi} label="Online" value={summary.online} tone="bg-green-100 text-green-600" />
        <StatCard icon={WifiOff} label="Offline" value={summary.offline} tone="bg-red-100 text-red-600" />
        <StatCard icon={AlertTriangle} label="Warning" value={summary.warning} tone="bg-yellow-100 text-yellow-600" />
        <StatCard icon={Bell} label="Active Alerts" value={summary.activeAlerts} tone="bg-brand-500/10 text-brand-600" />
        <StatCard icon={CalendarClock} label="Alerts Today" value={summary.alertsToday} tone="bg-purple-100 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-navy-900">Response Time (last 24h)</p>
          {charts.responseTimeTrend.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No monitoring data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts.responseTimeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tickFormatter={(t) => new Date(t).getHours() + ":00"} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="ms" />
                <Tooltip labelFormatter={(t) => new Date(t as string).toLocaleString()} />
                <Line type="monotone" dataKey="avgResponseTime" stroke="#2563eb" strokeWidth={2} dot={false} name="Avg response time (ms)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-navy-900">Device Health</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={charts.statusBreakdown} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {charts.statusBreakdown.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-navy-900">Alerts Over Time (last 7 days)</p>
        {charts.alertsOverTime.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No alerts in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.alertsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Alerts" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-navy-900">Recent Alerts</p>
            <Link to="/alerts" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No active alerts.</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((a) => (
                <Link to={`/alerts/${a.id}`} key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-sm hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy-900">{a.device}</p>
                    <p className="truncate text-xs text-slate-500">{a.message}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <AlertStatusBadge status={a.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-navy-900">Recent Activity</p>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-navy-900">{a.description}</p>
                    <p className="text-xs text-slate-400">{a.user}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{new Date(a.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
