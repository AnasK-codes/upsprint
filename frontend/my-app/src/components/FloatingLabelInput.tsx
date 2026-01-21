"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  errorMessage?: string;
}

export function FloatingLabelInput({
  label,
  icon,
  errorMessage,
  className,
  ...props
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value);

  // Sync hasValue with props.value updates
  React.useEffect(() => {
    setHasValue(!!props.value);
  }, [props.value]);

  return (
    <div className={clsx("relative group", className)}>
      <div
        className={clsx(
          "flex items-center w-full rounded-xl border bg-white/50 backdrop-blur-sm transition-all duration-200",
          errorMessage
            ? "border-red-300 ring-4 ring-red-500/10"
            : isFocused
              ? "border-indigo-500 ring-4 ring-indigo-500/10"
              : "border-gray-200 hover:border-gray-300",
        )}
      >
        {icon && (
          <div
            className={clsx(
              "pl-4 transition-colors",
              isFocused ? "text-indigo-500" : "text-gray-400",
            )}
          >
            {icon}
          </div>
        )}
        <div className="relative flex-1 h-14">
          <input
            {...props}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onChange={(e) => {
              setHasValue(!!e.target.value);
              props.onChange?.(e);
            }}
            className="w-full h-full bg-transparent px-4 pt-4 pb-1 text-gray-900 outline-none placeholder-transparent"
            placeholder={label} // Needed for some browser behaviors
          />
          <motion.label
            initial={false}
            animate={{
              y: isFocused || hasValue ? 8 : 16,
              scale: isFocused || hasValue ? 0.75 : 1,
              x: isFocused || hasValue ? 0 : 0,
            }}
            className={clsx(
              "absolute left-4 top-0 pointer-events-none origin-top-left font-medium transition-colors duration-200",
              isFocused ? "text-indigo-600" : "text-gray-500",
            )}
          >
            {label}
          </motion.label>
        </div>
      </div>
      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="mt-1 ml-1 text-xs font-medium text-red-500"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
