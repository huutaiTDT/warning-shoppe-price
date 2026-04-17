/** @format */

import {
  clearStoredAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
  setStoredAuthSession,
  type AuthUser,
} from "@/lib/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setAuthSession: (user: AuthUser) => void;
  clearAuthSession: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredAuthUser();
    const storedToken = getStoredAuthToken();

    setUser(storedUser);
    setToken(storedToken);
    setLoading(false);
  }, []);

  const setAuthSession = (nextUser: AuthUser) => {
    setStoredAuthSession(nextUser);
    setUser(nextUser);
    setToken(nextUser.token);
  };

  const clearAuthSession = () => {
    clearStoredAuthSession();
    setUser(null);
    setToken(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      loading,
      setAuthSession,
      clearAuthSession,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
