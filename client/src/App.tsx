import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import DeviceDetails from "./pages/DeviceDetails";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import AlertDetails from "./pages/AlertDetails";
import AlertRules from "./pages/AlertRules";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import UsersPage from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

function Protected({ children, roles }: { children: React.ReactNode; roles?: ("ADMIN" | "OPERATOR")[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/devices" element={<Protected><Devices /></Protected>} />
      <Route path="/devices/:id" element={<Protected><DeviceDetails /></Protected>} />
      <Route path="/monitoring" element={<Protected><Monitoring /></Protected>} />
      <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
      <Route path="/alerts/:id" element={<Protected><AlertDetails /></Protected>} />
      <Route path="/alert-rules" element={<Protected roles={["ADMIN"]}><AlertRules /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/users" element={<Protected roles={["ADMIN"]}><UsersPage /></Protected>} />
      <Route path="/audit-logs" element={<Protected roles={["ADMIN"]}><AuditLogs /></Protected>} />
      <Route path="/settings" element={<Protected roles={["ADMIN"]}><SettingsPage /></Protected>} />
      <Route path="*" element={<Protected><NotFound /></Protected>} />
    </Routes>
  );
}
