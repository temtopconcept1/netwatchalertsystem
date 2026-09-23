import { useEffect, useState, useCallback, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, Pencil, PlayCircle, X } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { Card, Button, Input, Select, StatusBadge, Spinner, EmptyState } from "../components/ui";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../hooks/useRealtime";
import type { Device, DeviceType, MonitorMode } from "../types";

const DEVICE_TYPES: DeviceType[] = ["ROUTER", "SWITCH", "SERVER", "FIREWALL", "ACCESS_POINT", "DATABASE_SERVER", "OTHER"];

const emptyForm = {
  name: "",
  ipAddress: "",
  hostname: "",
  type: "SERVER" as DeviceType,
  location: "",
  description: "",
  monitorMode: "SIMULATED" as MonitorMode,
  checkUrl: "",
  port: 80,
  monitoringInterval: 60,
  timeout: 5000,
  warningThreshold: 300,
  criticalThreshold: 1000,
  failuresBeforeAlert: 2,
  monitoringEnabled: true,
  simProfile: "stable",
};

export default function Devices() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "status" | "lastResponseTime">("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const canManage = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const canDelete = user?.role === "ADMIN";

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    const { data } = await api.get("/devices", { params });
    setDevices(data.devices);
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useRealtime({ onDeviceUpdated: load, onAlertsChanged: load });

  const sorted = [...devices].sort((a, b) => {
    if (sortKey === "name") return a.name.localeCompare(b.name);
    if (sortKey === "status") return a.status.localeCompare(b.status);
    return (b.lastResponseTime ?? 0) - (a.lastResponseTime ?? 0);
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (d: Device) => {
    setEditing(d);
    setForm({
      name: d.name,
      ipAddress: d.ipAddress,
      hostname: d.hostname ?? "",
      type: d.type,
      location: d.location ?? "",
      description: d.description ?? "",
      monitorMode: d.monitorMode,
      checkUrl: d.checkUrl ?? "",
      port: d.port ?? 80,
      monitoringInterval: d.monitoringInterval,
      timeout: d.timeout,
      warningThreshold: d.warningThreshold,
      criticalThreshold: d.criticalThreshold,
      failuresBeforeAlert: d.failuresBeforeAlert,
      monitoringEnabled: d.monitoringEnabled,
      simProfile: d.simProfile,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, hostname: form.hostname || null, location: form.location || null, description: form.description || null, checkUrl: form.checkUrl || null };
      if (editing) {
        await api.put(`/devices/${editing.id}`, payload);
        showToast("Device updated.");
      } else {
        await api.post("/devices", payload);
        showToast("Device added.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Device) => {
    if (!confirm(`Remove "${d.name}" from monitoring?`)) return;
    try {
      await api.delete(`/devices/${d.id}`);
      showToast("Device removed.");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleTest = async (d: Device) => {
    setTestingId(d.id);
    try {
      const { data } = await api.post(`/devices/${d.id}/test`);
      showToast(`Test complete: ${data.result.status}${data.result.responseTime ? ` (${data.result.responseTime}ms)` : ""}`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Devices</h1>
          <p className="text-sm text-slate-500">Manage and monitor your network devices.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Device
          </Button>
        )}
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name, IP, or location" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            <option value="ONLINE">Online</option>
            <option value="WARNING">Warning</option>
            <option value="OFFLINE">Offline</option>
            <option value="UNKNOWN">Unknown</option>
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-48">
            <option value="">All types</option>
            {DEVICE_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </Select>
          <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} className="sm:w-40">
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
            <option value="lastResponseTime">Sort: Latency</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading devices..." />
        ) : sorted.length === 0 ? (
          <EmptyState title="No devices configured yet." action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add your first device</Button>} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Last Checked</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/devices/${d.id}`} className="font-medium text-navy-900 hover:text-brand-600">{d.name}</Link>
                      <p className="text-xs text-slate-400">{d.location ?? "—"} {d.monitorMode === "SIMULATED" && <span className="ml-1 rounded bg-purple-50 px-1.5 py-0.5 text-purple-600">Simulation</span>}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.ipAddress}</td>
                    <td className="px-4 py-3 text-slate-600">{d.type.replace("_", " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{d.lastResponseTime != null ? `${d.lastResponseTime}ms` : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.lastChecked ? new Date(d.lastChecked).toLocaleString() : "Never"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Test now" onClick={() => handleTest(d)} disabled={testingId === d.id} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50">
                          <PlayCircle className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <button title="Edit" onClick={() => openEdit(d)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button title="Delete" onClick={() => handleDelete(d)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 scrollbar-thin">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy-900">{editing ? "Edit Device" : "Add Device"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Device Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="IP Address"><Input required value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hostname"><Input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} /></Field>
                <Field label="Device Type">
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DeviceType })}>
                    {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
                <Field label="Monitoring Mode">
                  <Select value={form.monitorMode} onChange={(e) => setForm({ ...form, monitorMode: e.target.value as MonitorMode })}>
                    <option value="SIMULATED">Simulated (demo)</option>
                    <option value="HTTP">HTTP/HTTPS</option>
                    <option value="TCP">TCP Port</option>
                  </Select>
                </Field>
              </div>

              {form.monitorMode === "HTTP" && (
                <Field label="Health Check URL"><Input placeholder="https://example.com" value={form.checkUrl} onChange={(e) => setForm({ ...form, checkUrl: e.target.value })} /></Field>
              )}
              {form.monitorMode === "TCP" && (
                <Field label="Port"><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} /></Field>
              )}
              {form.monitorMode === "SIMULATED" && (
                <Field label="Simulation Profile">
                  <Select value={form.simProfile} onChange={(e) => setForm({ ...form, simProfile: e.target.value })}>
                    <option value="stable">Stable</option>
                    <option value="flaky">Flaky</option>
                    <option value="degraded">Degraded</option>
                    <option value="down">Mostly Down</option>
                  </Select>
                </Field>
              )}

              <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Check Interval (s)"><Input type="number" min={5} value={form.monitoringInterval} onChange={(e) => setForm({ ...form, monitoringInterval: Number(e.target.value) })} /></Field>
                <Field label="Timeout (ms)"><Input type="number" min={500} value={form.timeout} onChange={(e) => setForm({ ...form, timeout: Number(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Warning Threshold (ms)"><Input type="number" value={form.warningThreshold} onChange={(e) => setForm({ ...form, warningThreshold: Number(e.target.value) })} /></Field>
                <Field label="Critical Threshold (ms)"><Input type="number" value={form.criticalThreshold} onChange={(e) => setForm({ ...form, criticalThreshold: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Failures Before Alert"><Input type="number" min={1} value={form.failuresBeforeAlert} onChange={(e) => setForm({ ...form, failuresBeforeAlert: Number(e.target.value) })} /></Field>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.monitoringEnabled} onChange={(e) => setForm({ ...form, monitoringEnabled: e.target.checked })} />
                Enable monitoring for this device
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Device"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
