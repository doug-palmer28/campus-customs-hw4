// Authentication state shared across the app.
// Holds the logged-in user and session token, persisted to localStorage so a
// refresh keeps you signed in. The token is validated against the backend on
// startup; if it's expired or invalid, we quietly sign out.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  loginRequest,
  registerAccount,
  type RegisterInput,
} from "../api";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "campus-customs-auth";

interface StoredAuth {
  token: string;
  user: AuthUser;
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null);
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [loading, setLoading] = useState<boolean>(!!stored?.token);

  const persist = useCallback((next: StoredAuth | null) => {
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setToken(next.token);
      setUser(next.user);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  // On startup, confirm a stored token is still valid.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchCurrentUser(token)
      .then((fresh) => {
        if (active) {
          persist({ token, user: fresh });
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          persist(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // Only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await loginRequest(email, password);
      persist({ token: res.token, user: res.user });
    },
    [persist],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await registerAccount(input);
      persist({ token: res.token, user: res.user });
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
