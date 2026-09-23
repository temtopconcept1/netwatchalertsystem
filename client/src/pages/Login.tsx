import { useState, FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Activity, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-navy-950 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/30 via-navy-900 to-navy-950" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <Activity className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold">Cloud Network Alert</span>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-3xl font-bold leading-tight">
            Real-time network monitoring &amp; alerting, built for the cloud.
          </h1>
          <p className="max-w-md text-slate-300">
            Track device health, detect failures the moment they happen, and get notified before small
            problems become outages.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield className="h-4 w-4" /> Secure, role-based access for administrators and network operators.
          </div>
        </div>
        <p className="relative z-10 text-xs text-slate-500">
          Final-Year Project — Design and Implementation of a Cloud-Based Network Alert Notification System
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-navy-900">Cloud Network Alert</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="username" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <button type="button" className="text-brand-600 hover:underline" onClick={() => alert("Contact your system administrator to reset your password.")}>
                Forgot password?
              </button>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-slate-400">
            Demo credentials are seeded via environment variables — see your project README.
          </p>
        </div>
      </div>
    </div>
  );
}
