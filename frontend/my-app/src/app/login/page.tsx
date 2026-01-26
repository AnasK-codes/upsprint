"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnimatedButton from "@/components/AnimatedButton";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Mail, Lock, LogIn, ChevronRight, AlertCircle } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const { login } = useAuth();
  const { success } = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(""); // Clear error on typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    try {
      const response = await api.login({
        email: formData.email,
        password: formData.password,
      });

      if (response.token) {
        // useAuth login: sets cookie, updates state, redirects
        await login(response.user);
        success("Login successful!");
      } else {
        throw new Error("No token received");
      }
    } catch (err: any) {
      setFormError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground className="pt-20 sm:pt-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-4"
      >
        <div className="glass-panel overflow-hidden rounded-3xl p-8 shadow-2xl border border-white/50 bg-white/60 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30"
            >
              <LogIn className="h-8 w-8" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Enter your credentials to access your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <FloatingLabelInput
                label="Email address"
                type="email"
                name="email"
                icon={<Mail className="w-5 h-5" />}
                value={formData.email}
                onChange={handleChange}
                required
              />
              <FloatingLabelInput
                label="Password"
                type="password"
                name="password"
                icon={<Lock className="w-5 h-5" />}
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{formError}</p>
              </motion.div>
            )}

            <div className="pt-2">
              <AnimatedButton
                type="submit"
                isLoading={loading}
                className="w-full h-12 text-base"
              >
                Log In <ChevronRight className="h-4 w-4 ml-1" />
              </AnimatedButton>
            </div>
          </form>

          <div className="my-8 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-transparent px-2 text-slate-400 font-bold backdrop-blur-xl">
                Or continue with
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              window.location.href = "http://localhost:4000/auth/google";
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-cyan-500 bg-white py-3 font-semibold text-[#1E3A8A] shadow-sm transition-all hover:bg-cyan-50 hover:shadow-cyan-500/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </motion.button>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline transition-all"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
