
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiRequest } from "@/lib/api";
import type {
  LoginResponse,
  ProfileResponse,
} from "@/interface/auth";

const STORAGE_KEY = "brewlite_access_token";

// ==========================================
// AUTH CONTEXT INTERFACE
// ==========================================

interface AuthContextValue {
  user: ProfileResponse | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

// ==========================================
// AUTH PROVIDER
// ==========================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<ProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  

  // ==========================================
  // RESTORE SESSION
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const stored = sessionStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return {
          profile: null,
          accessToken: null,
        };
      }

      try {
        const profile = await apiRequest<ProfileResponse>(
          "/auth/profile",
          {},
          stored,
        );

        return {
          profile,
          accessToken: stored,
        };
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);

        return {
          profile: null,
          accessToken: null,
        };
      }
    };

    void restoreSession().then((result) => {
      if (cancelled) return;

      setUser(result.profile);
      setToken(result.accessToken);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================
  
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await apiRequest<LoginResponse>(
        "auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      if (!result.access_token) {
        throw new Error(
          "Backend không trả về access_token.",
        );
      }

      const profile = await apiRequest<ProfileResponse>(
        "/auth/profile",
        {},
        result.access_token,
      );

      sessionStorage.setItem(
        STORAGE_KEY,
        result.access_token,
      );

      setToken(result.access_token);
      setUser(profile);
      setLoading(false);
    },
    [],
  );

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);

    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
    }),
    [user, token, loading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================
// CUSTOM HOOK
// ==========================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth phải được gọi bên trong AuthProvider",
    );
  }

  return context;
}