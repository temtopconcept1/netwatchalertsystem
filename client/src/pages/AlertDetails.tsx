import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { Card, SeverityBadge, AlertStatusBadge, Spinner, Button } from "../components/ui";
import { useToast } from "../hooks/useToast";

export default function AlertDetails() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [alert, setAlert] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await api.get(`/alerts/${id}`);
    setAlert(data.alert);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: "acknowledge" | "resolve") => {
    if (!id) return;
    try {
      await api.patch(`/alerts/${id}/${action}`);
      showToast(`Alert ${action === "acknowledge" ? "acknowledged" : "resolved"}.`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  if (loading || !alert) return <Spinner label="Loading alert..." />;

  return (
    <div className="space-y-4">
      <Link to="/alerts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Back to Alerts
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-navy-900">{alert.device?.name}</h1>
          <SeverityBadge severity={alert.severity} />
          <AlertStatusBadge status={alert.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{alert.message}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-slate-400">Type</p><p className="text-navy-900">{alert.type.replace(/_/g, " ")}</p></div>
          <div><p className="text-xs text-slate-400">Triggered</p><p className="text-navy-900">{new Date(alert.triggeredAt).toLocaleString()}</p></div>
          <div><p className="text-xs text-slate-400">Acknowledged</p><p className="text-navy-900">{alert.acknowledgedAt ? `${new Date(alert.acknowledgedAt).toLocaleString()} by ${alert.acknowledgedBy?.fullName ?? "—"}` : "—"}</p></div>
          <div><p className="text-xs text-slate-400">Resolved</p><p className="text-navy-900">{alert.resolvedAt ? `${new Date(alert.resolvedAt).toLocaleString()} by ${alert.resolvedBy?.fullName ?? "—"}` : "—"}</p></div>
        </div>

        {alert.status !== "RESOLVED" && (
          <div className="mt-4 flex gap-2">
            {alert.status === "ACTIVE" && (
              <Button variant="secondary" onClick={() => act("acknowledge")}><Check className="h-4 w-4" /> Acknowledge</Button>
            )}
            <Button onClick={() => act("resolve")}><CheckCheck className="h-4 w-4" /> Resolve</Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-navy-900">Notification Log</p>
        {alert.notifications.length === 0 ? (
          <p className="text-sm text-slate-400">No notifications were generated for this alert.</p>
        ) : (
          <div className="space-y-2">
            {alert.notifications.map((n: any) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-sm">
                <div>
                  <p className="text-navy-900">{n.channel} — {n.recipient ?? "Dashboard"}</p>
                  <p className="text-xs text-slate-500">{n.detail}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${n.status === "SENT" ? "bg-green-100 text-green-700" : n.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                  {n.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
