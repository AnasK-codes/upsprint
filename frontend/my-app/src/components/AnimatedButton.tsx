"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode, memo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
}

const AnimatedButton = memo(function AnimatedButton({
  children,
  className,
  variant = "primary",
  isLoading,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const variants = {
    primary:
      "bg-[#1E3A8A] text-white hover:bg-[#3B82F6] shadow-lg hover:shadow-indigo-500/20",
    secondary:
      "bg-white text-[#1E3A8A] border border-cyan-500 hover:bg-cyan-50 shadow-sm hover:shadow-cyan-500/10",
    ghost: "bg-transparent text-[#475569] hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={isLoading || disabled}
      className={cn(
        "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
});

export default AnimatedButton;
