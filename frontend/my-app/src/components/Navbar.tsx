"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Home, Trophy, User } from "lucide-react";
import AnimatedButton from "./AnimatedButton";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  ];

  if (isAuthenticated) {
    navLinks.push({ name: "Profile", href: "/profile", icon: User });
  }

  return (
    <div className="fixed top-4 sm:top-6 left-0 right-0 z-50 flex justify-center px-2 sm:px-4 pointer-events-none">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={clsx(
          "flex items-center gap-1 sm:gap-2 border shadow-lg shadow-black/5 rounded-full pointer-events-auto max-w-full sm:max-w-fit overflow-x-auto no-scrollbar transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isScrolled
            ? "p-2 bg-white/60 backdrop-blur-[40px] border-white/40 ring-1 ring-white/50"
            : "p-2.5 bg-white/40 backdrop-blur-[30px] border-white/30 ring-1 ring-white/40",
        )}
      >
        <Link
          href="/"
          className="flex-shrink-0 flex items-center justify-center ml-2 mr-1 no-underline group gap-2"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shadow-sm bg-white">
            <Image
              src="/icon-circle.png"
              alt="UpSprint Logo"
              fill
              className="object-cover scale-125"
            />
          </div>
          <span className="hidden sm:block text-xl font-bold tracking-tight text-indigo-900 group-hover:text-indigo-700 transition-colors">
            UpSprint
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-indigo-900/10 mx-2" />

        {/* Links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={clsx(
                  "relative px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium rounded-full transition-all duration-300 ease-out no-underline flex items-center justify-center",
                  isActive
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="pill-nav"
                    className="absolute inset-0 bg-white/50 backdrop-blur-xl border border-white/60 shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="block sm:hidden">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="hidden sm:block uppercase tracking-widest text-xs font-bold">
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-indigo-900/10 mx-2" />

        {/* Auth Section */}
        <div className="flex-shrink-0 pr-1">
          {mounted && !loading ? (
            isAuthenticated ? (
              <div className="flex items-center gap-2">
                <AnimatedButton
                  variant="ghost"
                  onClick={logout}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest h-auto min-h-0 text-red-500 hover:text-red-700 hover:bg-red-50/50 rounded-full"
                >
                  Logout
                </AnimatedButton>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 no-underline"
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
