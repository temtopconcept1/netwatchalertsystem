import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";
import type { Role } from "../types";

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner label="Loading session..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
