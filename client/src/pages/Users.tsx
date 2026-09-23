import { useEffect, useState, FormEvent } from "react";
import { Plus, KeyRound, X } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { Card, Button, Input, Select, Spinner, EmptyState } from "../components/ui";
import { useToast } from "../hooks/useToast";
import type { User } from "../types";

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "OPERATOR" as "ADMIN" | "OPERATOR" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/users");
    setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      showToast("User created.");
      setModalOpen(false);
      setForm({ fullName: "", email: "", password: "", role: "OPERATOR" });
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: User) => {
    try {
      await api.put(`/users/${u.id}`, { status: u.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      showToast(`User ${u.status === "ACTIVE" ? "disabled" : "enabled"}.`);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const changeRole = async (u: User, role: "ADMIN" | "OPERATOR") => {
    try {
      await api.put(`/users/${u.id}`, { role });
      showToast("Role updated.");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, { newPassword });
      showToast("Password reset.");
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Users</h1>
          <p className="text-sm text-slate-500">Manage administrator and operator accounts.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading users..." />
        ) : users.length === 0 ? (
          <EmptyState title="No users found." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-navy-900">{u.fullName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <Select value={u.role} onChange={(e) => changeRole(u, e.target.value as "ADMIN" | "OPERATOR")} className="w-32 py-1">
                        <option value="ADMIN">Admin</option>
                        <option value="OPERATOR">Operator</option>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleStatus(u)} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.status}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setResetTarget(u)} title="Reset password" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
                        <KeyRound className="h-4 w-4" />
                      </button>
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
          <div className="w-full max-w-sm rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy-900">Add User</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input required type="password" minLength={8} placeholder="Temporary password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "OPERATOR" })}>
                <option value="OPERATOR">Network Operator</option>
                <option value="ADMIN">Administrator</option>
              </Select>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy-900">Reset Password — {resetTarget.fullName}</h2>
              <button onClick={() => setResetTarget(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleReset} className="space-y-3">
              <Input required type="password" minLength={8} placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
                <Button type="submit">Reset Password</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
