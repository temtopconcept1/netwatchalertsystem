import { useEffect, useState, FormEvent } from "react";
import { Send } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { Card, Button, Input, Spinner, EmptyState } from "../components/ui";
import { useToast } from "../hooks/useToast";

export default function Notifications() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await api.get("/notifications");
    setNotifications(data.notifications);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleTest = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post("/notifications/test", { recipient });
      showToast(data.message, data.ok ? "success" : "error");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Notifications</h1>
        <p className="text-sm text-slate-500">History of alert notifications and a way to verify your email setup.</p>
      </div>

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold text-navy-900">Send Test Notification</p>
        <p className="mb-3 text-xs text-slate-500">
          This attempts a real send using the SMTP settings configured in your environment. If SMTP is not configured, you'll get a clear message instead of a false "sent" confirmation.
        </p>
        <form onSubmit={handleTest} className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" required placeholder="you@example.com" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="sm:max-w-xs" />
          <Button type="submit" disabled={sending}>
            <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Test"}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-900">Notification Log</p>
        {loading ? (
          <Spinner label="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications sent yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-navy-900">{n.alert?.device?.name ?? "—"} — {n.channel}</p>
                  <p className="text-xs text-slate-500">{n.detail}</p>
                  <p className="text-xs text-slate-400">{new Date(n.sentAt).toLocaleString()}</p>
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
