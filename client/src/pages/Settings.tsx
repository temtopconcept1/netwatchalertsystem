import { useEffect, useState, FormEvent } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Card, Button, Input, Select, Spinner } from "../components/ui";
import { useToast } from "../hooks/useToast";
import type { SystemSettings } from "../types";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => {
      setSettings(data.settings);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const { data } = await api.put("/settings", settings);
      setSettings(data.settings);
      showToast("Settings saved.");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <Spinner label="Loading settings..." />;

  const set = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => setSettings({ ...settings, [key]: value });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Settings</h1>
        <p className="text-sm text-slate-500">System-wide configuration for monitoring and notifications.</p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-navy-900">General</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="System Name"><Input value={settings.systemName} onChange={(e) => set("systemName", e.target.value)} /></Field>
          <Field label="Organization Name"><Input value={settings.organizationName} onChange={(e) => set("organizationName", e.target.value)} /></Field>
          <Field label="Timezone"><Input value={settings.timezone} onChange={(e) => set("timezone", e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-navy-900">Monitoring Defaults</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Default Check Interval (s)"><Input type="number" value={settings.defaultCheckInterval} onChange={(e) => set("defaultCheckInterval", Number(e.target.value))} /></Field>
          <Field label="Default Timeout (ms)"><Input type="number" value={settings.defaultTimeout} onChange={(e) => set("defaultTimeout", Number(e.target.value))} /></Field>
          <Field label="Default Warning Threshold (ms)"><Input type="number" value={settings.defaultWarningMs} onChange={(e) => set("defaultWarningMs", Number(e.target.value))} /></Field>
          <Field label="Default Critical Threshold (ms)"><Input type="number" value={settings.defaultCriticalMs} onChange={(e) => set("defaultCriticalMs", Number(e.target.value))} /></Field>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-navy-900">Notifications</p>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={settings.emailEnabled} onChange={(e) => set("emailEnabled", e.target.checked)} />
          Enable email notifications (requires SMTP_HOST/SMTP_USER/SMTP_PASSWORD in server environment)
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Recipient Emails (comma-separated)"><Input value={settings.notifyRecipients} onChange={(e) => set("notifyRecipients", e.target.value)} /></Field>
          <Field label="Minimum Severity to Notify">
            <Select value={settings.notifySeverity} onChange={(e) => set("notifySeverity", e.target.value as any)}>
              <option value="INFO">Info and above</option>
              <option value="WARNING">Warning and above</option>
              <option value="CRITICAL">Critical only</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-navy-900">Security</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Session Length (minutes)"><Input type="number" value={settings.sessionMinutes} onChange={(e) => set("sessionMinutes", Number(e.target.value))} /></Field>
          <Field label="Minimum Password Length"><Input type="number" value={settings.passwordMinLength} onChange={(e) => set("passwordMinLength", Number(e.target.value))} /></Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
      </div>
    </form>
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
