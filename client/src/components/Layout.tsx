import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  Activity,
  Bell,
  ShieldAlert,
  Mail,
  FileBarChart,
  Users,
  ScrollText,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { requestBrowserNotificationPermission } from "../hooks/useRealtime";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "OPERATOR"] },
  { to: "/devices", label: "Devices", icon: Server, roles: ["ADMIN", "OPERATOR"] },
  { to: "/monitoring", label: "Monitoring", icon: Activity, roles: ["ADMIN", "OPERATOR"] },
  { to: "/alerts", label: "Alerts", icon: Bell, roles: ["ADMIN", "OPERATOR"] },
  { to: "/alert-rules", label: "Alert Rules", icon: ShieldAlert, roles: ["ADMIN"] },
  { to: "/notifications", label: "Notifications", icon: Mail, roles: ["ADMIN", "OPERATOR"] },
  { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["ADMIN", "OPERATOR"] },
  { to: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["ADMIN"] },
  { to: "/settings", label: "Settings", icon: SettingsIcon, roles: ["ADMIN"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const items = NAV.filter((n) => !user || n.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col bg-navy-900 text-slate-200">
        <SidebarContent items={items} user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-navy-900 text-slate-200 flex flex-col">
            <div className="flex justify-end p-2">
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent items={items} user={user} onLogout={handleLogout} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setDrawerOpen(true)} className="p-1 text-slate-600">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold text-navy-900">Cloud Network Alert</span>
          <div className="w-6" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  user,
  onLogout,
  onNavigate,
}: {
  items: typeof NAV;
  user: ReturnType<typeof useAuth>["user"];
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Cloud Network Alert</p>
          <p className="text-xs text-slate-400">Monitoring Platform</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
        <p className="truncate text-xs text-slate-400">{user?.role}</p>
        <button onClick={onLogout} className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </>
  );
}
