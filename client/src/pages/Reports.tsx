import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "../api/client";
import { Card, Button, Input, Select, Spinner } from "../components/ui";
import type { Device } from "../types";

export default function Reports() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [availability, setAvailability] = useState<any[]>([]);
  const [alertSummary, setAlertSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/devices").then(({ data }) => setDevices(data.devices));
  }, []);

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (deviceId) params.deviceId = deviceId;
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    const [a, b] = await Promise.all([
      api.get("/reports/availability", { params }),
      api.get("/reports/alerts", { params }),
    ]);
    setAvailability(a.data.rows);
    setAlertSummary(b.data.summary);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = (type: "availability" | "alerts") => {
    const params = new URLSearchParams({ format: "csv" });
    if (deviceId) params.set("deviceId", deviceId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    window.open(`/api/reports/${type}?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Reports</h1>
        <p className="text-sm text-slate-500">Network availability and alert summaries.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="sm:w-56">
            <option value="">All devices</option>
            {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-56" />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-56" />
          <Button variant="secondary" onClick={load}>Apply</Button>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Generating reports..." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-navy-900">Network Availability Report</p>
              <Button variant="secondary" onClick={() => download("availability")}><Download className="h-4 w-4" /> Export CSV</Button>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Total Checks</th>
                    <th className="px-4 py-3">Successful</th>
                    <th className="px-4 py-3">Failed</th>
                    <th className="px-4 py-3">Availability</th>
                    <th className="px-4 py-3">Avg Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availability.map((r) => (
                    <tr key={r.device}>
                      <td className="px-4 py-2.5 font-medium text-navy-900">{r.device}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.totalChecks}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.successfulChecks}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.failedChecks}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.availabilityPercent}%</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.avgResponseTimeMs != null ? `${r.avgResponseTimeMs}ms` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Alert Report</p>
              <Button variant="secondary" onClick={() => download("alerts")}><Download className="h-4 w-4" /> Export CSV</Button>
            </div>
            {alertSummary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Stat label="Total" value={alertSummary.total} />
                <Stat label="Critical" value={alertSummary.critical} />
                <Stat label="Warning" value={alertSummary.warning} />
                <Stat label="Resolved" value={alertSummary.resolved} />
                <Stat label="Active" value={alertSummary.active} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold text-navy-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
