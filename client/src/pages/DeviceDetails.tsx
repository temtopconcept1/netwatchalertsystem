import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api, apiErrorMessage } from "../api/client";
import { Card, StatusBadge, SeverityBadge, AlertStatusBadge, Spinner, Button, EmptyState } from "../components/ui";
import { useToast } from "../hooks/useToast";
import { useRealtime } from "../hooks/useRealtime";
import type { Device, MonitoringResult, Alert } from "../types";

export default function DeviceDetails() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [device, setDevice] = useState<Device | null>(null);
  const [history, setHistory] = useState<MonitoringResult[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [availability, setAvailability] = useState(100);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await api.get(`/devices/${id}`);
    setDevice(data.device);
    setHistory(data.history);
    setAlerts(data.alerts);
    setAvailability(data.availability);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime({ onDeviceUpdated: load, onAlertsChanged: load });

  const handleTest = async () => {
    if (!id) return;
    setTesting(true);
    try {
      const { data } = await api.post(`/devices/${id}/test`);
      showToast(`Test complete: ${data.result.status}`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setTesting(false);
    }
  };

  if (loading || !device) return <Spinner label="Loading device..." />;

  const chartData = [...history].reverse().filter((h) => h.responseTime != null);

  return (
    <div className="space-y-4">
      <Link to="/devices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Back to Devices
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900">{device.name}</h1>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-sm text-slate-500">{device.ipAddress} · {device.type.replace("_", " ")} · {device.location ?? "No location set"}</p>
        </div>
        <Button onClick={handleTest} disabled={testing}>
          <PlayCircle className="h-4 w-4" /> {testing ? "Testing..." : "Test Now"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-slate-500">Availability</p><p className="mt-1 text-xl font-bold text-navy-900">{availability}%</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Last Response</p><p className="mt-1 text-xl font-bold text-navy-900">{device.lastResponseTime != null ? `${device.lastResponseTime}ms` : "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Last Checked</p><p className="mt-1 text-sm font-semibold text-navy-900">{device.lastChecked ? new Date(device.lastChecked).toLocaleString() : "Never"}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Monitoring Mode</p><p className="mt-1 text-sm font-semibold text-navy-900">{device.monitorMode}{device.monitorMode === "SIMULATED" ? ` (${device.simProfile})` : ""}</p></Card>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-navy-900">Response Time History</p>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No monitoring data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="checkedAt" tickFormatter={(t) => new Date(t).toLocaleTimeString()} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="ms" />
              <Tooltip labelFormatter={(t) => new Date(t as string).toLocaleString()} />
              <Line type="monotone" dataKey="responseTime" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-900">Recent Alerts</p>
          {alerts.length === 0 ? (
            <EmptyState title="No alerts recorded for this device." />
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <Link to={`/alerts/${a.id}`} key={a.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                  <div>
                    <p className="text-navy-900">{a.message}</p>
                    <p className="text-xs text-slate-400">{new Date(a.triggeredAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <AlertStatusBadge status={a.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-900">Monitoring History</p>
          {history.length === 0 ? (
            <EmptyState title="No monitoring history available." />
          ) : (
            <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto scrollbar-thin">
              {history.slice(0, 30).map((h) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <StatusBadge status={h.status} />
                    {h.errorMessage && <p className="mt-1 text-xs text-red-500">{h.errorMessage}</p>}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{h.responseTime != null ? `${h.responseTime}ms` : "—"}</p>
                    <p>{new Date(h.checkedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
