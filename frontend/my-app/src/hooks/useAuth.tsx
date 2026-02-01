"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserProfile, api } from "@/services/api";
import { useToast } from "./useToast";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (user?: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { error } = useToast();

  const publicRoutes = ["/login", "/signup", "/"]; // Add public paths here

  const fetchUser = async () => {
    try {
      // With cookies, we just try to fetch the profile.
      // If unauthorized, api throws and we catch it.
      const userData = await api.getProfile();
      setUser(userData);
    } catch (err) {
      // Expected if not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Middleware handles server-side protection.
    // Client-side checks are for UX/fallback.

    // Routes that authenticated users should NOT see
    const authRoutes = ["/login", "/signup"];
    // Routes that REQUIRE authentication
    const protectedRoutes = ["/profile", "/leaderboard"];

    const isAuthRoute = authRoutes.includes(pathname);
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route),
    );

    // Redirect authenticated users away from login/signup
    if (user && isAuthRoute) {
      router.push("/");
    }

    // Redirect unauthenticated users away from protected routes
    if (!user && isProtectedRoute) {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  const login = async (userData?: UserProfile) => {
    if (userData) {
      setUser(userData);
    } else {
      await fetchUser();
    }
    router.push("/");
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
