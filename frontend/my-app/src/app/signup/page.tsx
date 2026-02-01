"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { api } from "@/services/api";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { AlertCircle } from "lucide-react";

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
      <div className="w-full max-w-md mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white">
        <h2 className="font-bold text-xl text-neutral-800">Create Account</h2>
        <p className="text-neutral-600 text-sm max-w-sm mt-2">
          Join the community and start your journey
        </p>

        <form className="my-8" onSubmit={handleSubmit}>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Your Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              placeholder="batman@gotham.com"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </LabelInputContainer>

          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
            <LabelInputContainer>
              <Label htmlFor="batch">Batch</Label>
              <Input
                id="batch"
                placeholder="2025"
                type="text"
                name="batch"
                value={formData.batch}
                onChange={handleChange}
              />
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="branch">Branch (optional)</Label>
              <Input
                id="branch"
                placeholder="IT"
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
              />
            </LabelInputContainer>
          </div>

          <LabelInputContainer className="mb-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-8">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              placeholder="••••••••"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </LabelInputContainer>

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{formError}</p>
            </motion.div>
          )}

          <button
            className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset]"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
            <BottomGradient />
          </button>

          <div className="bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-8 h-[1px] w-full" />

          <p className="text-center text-sm text-neutral-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-indigo-600 hover:underline"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </AuroraBackground>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
