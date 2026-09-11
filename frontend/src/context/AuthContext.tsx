import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { AuthenticatedUser } from "../types/auth";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  token: string | null;
  setSession: (user: AuthenticatedUser, token: string, persist: boolean) => void;
  signOut: () => void;
}

const STORAGE_KEY = "trimidal.session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): { user: AuthenticatedUser; token: string } | null {
  const raw =
    localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStoredSession();
  const [user, setUser] = useState<AuthenticatedUser | null>(stored?.user ?? null);
  const [token, setToken] = useState<string | null>(stored?.token ?? null);

  const setSession = (nextUser: AuthenticatedUser, nextToken: string, persist: boolean) => {
    setUser(nextUser);
    setToken(nextToken);
    const payload = JSON.stringify({ user: nextUser, token: nextToken });
    if (persist) {
      localStorage.setItem(STORAGE_KEY, payload);
    } else {
      sessionStorage.setItem(STORAGE_KEY, payload);
    }
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ user, token, setSession, signOut }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
