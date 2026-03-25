"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { User, AuthResponse } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    type: "HOST" | "CLIENT",
    estimatedProduction?: number
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "gridshare_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  const setAuth = (user: User, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setState({ user, token, loading: false });
  };

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>("/users/me");
      setState((prev) => ({ ...prev, user: data }));
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    setState((prev) => ({ ...prev, token }));
    api
      .get<User>("/users/me")
      .then(({ data }) => setState({ user: data, token, loading: false }))
      .catch(() => {
        clearAuth();
      });
  }, [clearAuth]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setAuth(data.user, data.token);
    router.push("/dashboard");
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    type: "HOST" | "CLIENT",
    estimatedProduction?: number
  ) => {
    const { data } = await api.post<AuthResponse>("/auth/register", {
      email,
      password,
      name,
      type,
      estimatedProduction,
    });
    setAuth(data.user, data.token);
    router.push("/dashboard");
  };

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
