"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Trophy, Zap, Globe, Code } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  // We don't need local mounted state as much if we trust loading from useAuth,
  // but for hydration mismatch avoidance, we can keep a simple mounted check if strictly needed.
  // However, useAuth loading is initially true, so it serves a similar purpose.
  // Let's use loading.

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative overflow-hidden pt-36">
      {/* Aurora Background - Optimized */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gray-50/50 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[50vh] bg-indigo-200/40 rounded-[100%] blur-[80px] md:blur-[120px] mix-blend-multiply animate-pulse will-change-transform motion-reduce:animate-none" />
        <div className="absolute bottom-0 right-0 w-[80vw] h-[60vh] bg-purple-200/40 rounded-[100%] blur-[80px] md:blur-[120px] mix-blend-multiply will-change-transform motion-reduce:animate-none" />
        <div className="absolute top-1/2 left-0 w-[60vw] h-[40vh] bg-cyan-200/40 rounded-[100%] blur-[70px] md:blur-[100px] mix-blend-multiply will-change-transform motion-reduce:animate-none" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-12 z-10"
      >
        {/* Badge */}
        <motion.div variants={item} className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-indigo-100 shadow-sm text-indigo-700 text-xs font-bold tracking-widest uppercase backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            The Ultimate Competitive Hub
          </span>
        </motion.div>

        {/* Hero Text */}
        <motion.div variants={item} className="space-y-6">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-gray-900 leading-[0.9]">
            Sprint to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
              Glory.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
            One profile for all your coding battles. Track Codeforces, LeetCode,
            and CodeChef in real-time.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Only show Login CTA if NOT logged in */}
          {!loading && !isAuthenticated && (
            <a
              href={
                process.env.NEXT_PUBLIC_API_BASE_URL
                  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`
                  : "http://localhost:4000/auth/google"
              }
              className="group relative px-8 py-5 bg-gray-900 text-white font-bold rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-indigo-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 text-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          )}

          <Link
            href="/leaderboard"
            className="px-8 py-5 bg-white text-gray-900 font-bold rounded-full border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm text-lg flex items-center gap-2"
          >
            {isAuthenticated ? "Go to Leaderboard" : "Explore Leaderboard"}
            <Globe className="w-5 h-5 text-gray-400" />
          </Link>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 text-left"
        >
          {[
            {
              icon: <Zap className="text-amber-500" />,
              title: "Instant Sync",
              desc: "Don't wait. Your solutions update within seconds.",
            },
            {
              icon: <Trophy className="text-purple-500" />,
              title: "Gamified Ranks",
              desc: "Earn badges, maintain streaks, and climb the tiers.",
            },
            {
              icon: <Code className="text-blue-500" />,
              title: "Unified Profile",
              desc: "Showcase LeetCode, CodeChef & CF in one link.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="group p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.1)] transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                {f.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
