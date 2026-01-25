"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnimatedButton from "@/components/AnimatedButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { api } from "@/services/api";
import {
  Mail,
  Lock,
  User,
  Briefcase,
  ChevronRight,
  AlertCircle,
  Building2,
} from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    batch: "",
    branch: "",
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const { success } = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(""); // Clear error on typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await api.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        batch: formData.batch,
        branch: formData.branch,
      });

      success("Account created! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "Something went wrong. Please try again.");
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
        className="w-full max-w-lg p-4 py-8"
      >
        <div className="glass-panel overflow-hidden rounded-3xl p-8 shadow-2xl border border-white/50 bg-white/60 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
            >
              <User className="h-8 w-8" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Create Account
            </h1>
            <p className="mt-2 text-sm text-gray-500 font-medium">
              Join the community and start your journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FloatingLabelInput
              label="Full Name"
              type="text"
              name="name"
              icon={<User className="w-5 h-5" />}
              value={formData.name}
              onChange={handleChange}
              required
            />

            <FloatingLabelInput
              label="Email address"
              type="email"
              name="email"
              icon={<Mail className="w-5 h-5" />}
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FloatingLabelInput
                label="Batch (e.g. 2025)"
                type="text"
                name="batch"
                icon={<Briefcase className="w-5 h-5" />}
                value={formData.batch}
                onChange={handleChange}
              />
              <FloatingLabelInput
                label="Branch (optional)"
                type="text"
                name="branch"
                icon={<Building2 className="w-5 h-5" />}
                value={formData.branch}
                onChange={handleChange}
              />
            </div>

            <FloatingLabelInput
              label="Password"
              type="password"
              name="password"
              icon={<Lock className="w-5 h-5" />}
              value={formData.password}
              onChange={handleChange}
              required
            />

            <FloatingLabelInput
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              icon={<Lock className="w-5 h-5 checked:text-green-500" />}
              value={formData.confirmPassword}
              onChange={handleChange}
              errorMessage={
                formData.confirmPassword &&
                formData.password !== formData.confirmPassword
                  ? "Passwords do not match"
                  : ""
              }
              required
            />

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
                className="w-full h-12 text-base shadow-purple-500/25 bg-gray-900 hover:bg-gray-800"
              >
                Create Account <ChevronRight className="h-4 w-4 ml-1" />
              </AnimatedButton>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-purple-600 hover:text-purple-500 hover:underline transition-all"
            >
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
