import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const { data } = await api.post("/auth/login", { email, password, rememberMe });
      setUser(data.user);
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Invalid email or password."));
    }
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
