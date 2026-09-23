import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { Card, Input, Spinner, EmptyState } from "../components/ui";
import type { AuditLog } from "../types";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (action) params.action = action;
    const { data } = await api.get("/audit-logs", { params });
    setLogs(data.logs);
    setLoading(false);
  }, [action]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">A record of security-relevant activity across the system.</p>
      </div>

      <Card className="p-3">
        <Input placeholder="Filter by action (e.g. LOGIN, DEVICE_CREATED)" value={action} onChange={(e) => setAction(e.target.value)} className="sm:max-w-sm" />
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading audit logs..." />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit activity found." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-navy-900">{l.user?.fullName ?? "System"}</td>
                    <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{l.action}</span></td>
                    <td className="px-4 py-2.5 text-slate-600">{l.description}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.ipAddress ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
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
