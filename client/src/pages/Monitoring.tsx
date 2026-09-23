import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { Card, StatusBadge, Spinner, EmptyState, Select, Input } from "../components/ui";
import type { Device, MonitoringResult } from "../types";

export default function Monitoring() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [results, setResults] = useState<MonitoringResult[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/devices").then(({ data }) => setDevices(data.devices));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (deviceId) params.deviceId = deviceId;
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    const { data } = await api.get("/monitoring/history", { params });
    setResults(data.results);
    setLoading(false);
  }, [deviceId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Monitoring History</h1>
        <p className="text-sm text-slate-500">Every check performed across your network.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="sm:w-56">
            <option value="">All devices</option>
            {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-56" />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-56" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading history..." />
        ) : results.length === 0 ? (
          <EmptyState title="No monitoring data available." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Response Time</th>
                  <th className="px-4 py-3">Check Type</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-navy-900">{r.device?.name ?? "—"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-slate-600">{r.responseTime != null ? `${r.responseTime}ms` : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.checkType}</td>
                    <td className="px-4 py-2.5 text-red-500">{r.errorMessage ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(r.checkedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
