import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Check, CheckCheck } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { Card, Input, Select, SeverityBadge, AlertStatusBadge, Spinner, EmptyState } from "../components/ui";
import { useToast } from "../hooks/useToast";
import { useRealtime } from "../hooks/useRealtime";
import type { Alert } from "../types";

export default function Alerts() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (severity) params.severity = severity;
    if (status) params.status = status;
    const { data } = await api.get("/alerts", { params });
    setAlerts(data.alerts);
    setLoading(false);
  }, [search, severity, status]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useRealtime({ onAlertsChanged: load });

  const act = async (id: string, action: "acknowledge" | "resolve") => {
    try {
      await api.patch(`/alerts/${id}/${action}`);
      showToast(`Alert ${action === "acknowledge" ? "acknowledged" : "resolved"}.`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Alerts</h1>
        <p className="text-sm text-slate-500">Active and historical network alerts.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search alerts or devices" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="sm:w-40">
            <option value="">All severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading alerts..." />
        ) : alerts.length === 0 ? (
          <EmptyState title="No active alerts." />
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to={`/alerts/${a.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-navy-900">{a.device?.name}</p>
                    <SeverityBadge severity={a.severity} />
                    <AlertStatusBadge status={a.status} />
                  </div>
                  <p className="truncate text-sm text-slate-500">{a.message}</p>
                  <p className="text-xs text-slate-400">{new Date(a.triggeredAt).toLocaleString()}</p>
                </Link>
                {a.status !== "RESOLVED" && (
                  <div className="flex shrink-0 gap-2">
                    {a.status === "ACTIVE" && (
                      <button onClick={() => act(a.id, "acknowledge")} className="flex items-center gap-1 rounded-lg bg-yellow-50 px-2.5 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100">
                        <Check className="h-3.5 w-3.5" /> Acknowledge
                      </button>
                    )}
                    <button onClick={() => act(a.id, "resolve")} className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                      <CheckCheck className="h-3.5 w-3.5" /> Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
