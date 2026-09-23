import { useEffect, useState, useCallback } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Card, Spinner, EmptyState, SeverityBadge } from "../components/ui";
import { useToast } from "../hooks/useToast";
import type { AlertRule } from "../types";

export default function AlertRules() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get("/alert-rules");
    setRules(data.rules);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (rule: AlertRule, field: "enabled" | "notifyEmail" | "notifyBrowser") => {
    try {
      const { data } = await api.put(`/alert-rules/${rule.id}`, { [field]: !rule[field] });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? data.rule : r)));
      showToast("Rule updated.");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  if (loading) return <Spinner label="Loading alert rules..." />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Alert Rules</h1>
        <p className="text-sm text-slate-500">Configure when and how the system raises alerts. Per-device thresholds can be fine-tuned on each device's settings.</p>
      </div>

      <Card className="overflow-hidden">
        {rules.length === 0 ? (
          <EmptyState title="No alert rules configured." />
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-navy-900">{r.name}</p>
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {r.type === "REPEATED_FAILURE" ? "Notify after repeated consecutive failures on a device." :
                     r.type === "DEVICE_OFFLINE" ? "Notify immediately when a device fails its health check." :
                     r.type === "HIGH_LATENCY" ? "Notify when response time exceeds the device's warning threshold." :
                     "Notify when a previously-alerting device recovers."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <Toggle label="Enabled" checked={r.enabled} onChange={() => toggle(r, "enabled")} />
                  <Toggle label="Email" checked={r.notifyEmail} onChange={() => toggle(r, "notifyEmail")} />
                  <Toggle label="Browser" checked={r.notifyBrowser} onChange={() => toggle(r, "notifyBrowser")} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-slate-600">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
