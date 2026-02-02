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
    // Check for token cookie first to avoid 401 spam
    // This relies on the client-side fallback cookie we verify in api.ts
    const hasToken = document.cookie
      .split("; ")
      .some((row) => row.startsWith("token="));

    if (!hasToken) {
      setUser(null);
      setLoading(false);
      return;
    }

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
    // Check for token in URL (from OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      const isProd = process.env.NODE_ENV === "production";
      document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax; ${isProd ? "Secure" : ""}`;
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Fetch user with new token
      fetchUser();
    } else {
      fetchUser();
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    console.log("Auth Guard Check:", { user, pathname, loading });

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
      console.log("Redirecting to / (Auth Route with User)");
      router.push("/");
    }

    // Redirect unauthenticated users away from protected routes
    if (!user && isProtectedRoute) {
      console.log("Redirecting to /login (Protected Route without User)");
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
