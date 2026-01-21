"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import AnimatedButton from "./AnimatedButton";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Leaderboard", href: "/leaderboard" },
  ];

  if (isAuthenticated) {
    navLinks.push({ name: "Profile", href: "/profile" });
  }

  return (
    <div className="fixed top-4 sm:top-6 left-0 right-0 z-50 flex justify-center px-2 sm:px-4 pointer-events-none">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-lg rounded-full pointer-events-auto max-w-full sm:max-w-fit overflow-x-auto no-scrollbar"
      >
        {/* Logo Icon (Small) */}
        {/* Logo Text */}
        <Link
          href="/"
          className="flex-shrink-0 flex items-center justify-center ml-2 no-underline"
        >
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            UpSprint
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={clsx(
                  "relative px-5 py-2 text-sm font-medium rounded-full transition-colors no-underline",
                  isActive
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="pill-nav"
                    className="absolute inset-0 bg-white shadow-sm border border-gray-100 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Auth Section */}
        <div className="flex-shrink-0 pr-1">
          {mounted && !loading ? (
            isAuthenticated ? (
              <div className="flex items-center gap-2">
                <AnimatedButton
                  variant="ghost"
                  onClick={logout}
                  className="px-3 py-1.5 text-xs h-auto min-h-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Logout
                </AnimatedButton>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gray-800 transition-colors shadow-sm no-underline"
              >
                Login
              </Link>
            )
          ) : (
            <div className="w-16 h-8 bg-gray-100 rounded-full animate-pulse" />
          )}
        </div>
      </motion.nav>
    </div>
  );
}
