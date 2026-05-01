import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "customer" | "admin";
  phone?: string | null;
  address?: string | null;
  points?: number | null;
  interests?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  register: (data: { email: string; password: string; name: string; phone?: string; role?: string; address?: string; adminSecret?: string }) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (data: { name?: string; phone?: string; address?: string; interests?: string }) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>("/auth/me");
      setUser(me);
    } catch {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password });
    localStorage.setItem("auth_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/google", { credential });
    localStorage.setItem("auth_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: { email: string; password: string; name: string; phone?: string; role?: string; address?: string; adminSecret?: string }) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/register", data);
    localStorage.setItem("auth_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  const updateUser = async (data: { name?: string; phone?: string; address?: string; interests?: string }) => {
    const updated = await api.patch<AuthUser>("/auth/profile", data);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
