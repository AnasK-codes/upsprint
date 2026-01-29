"use client";

import Link from "next/link";
import {
  motion,
  Variants,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import {
  ArrowRight,
  Trophy,
  Zap,
  Globe,
  Code,
  MousePointer2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { CometCard } from "@/components/ui/comet-card";
import { Cover } from "@/components/ui/cover";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [socialProof, setSocialProof] = useState("");
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  useEffect(() => {
    const proofs = [
      "Your batchmates are already competing.",
      "Someone in your group solved a problem today.",
      "7 friends pushed code in the last hour.",
      "The leaderboard is shifting right now.",
      "Don't let your streak break today.",
    ];
    setSocialProof(proofs[Math.floor(Math.random() * proofs.length)]);
  }, []);

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
    <AuroraBackground className="pt-36 px-4 overflow-hidden text-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-12 z-10"
      >
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-8 pt-12 sm:pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-indigo-200/60 shadow-sm backdrop-blur-md mb-4 hover:shadow-md transition-shadow cursor-default"
          >
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
              {socialProof || "Join 500+ Students Competing Daily"}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900"
          >
            Stop Coding in{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">
              Silence.
            </span>
            <br />
            Start{" "}
            <Cover className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900">
              Competing.
            </Cover>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 mt-6 leading-relaxed"
          >
            Connect{" "}
            <span className="font-semibold text-slate-800">LeetCode</span> &{" "}
            <span className="font-semibold text-slate-800">Codeforces</span> to
            see exactly where you stand.
            <br className="hidden sm:block" />
            Turn daily coding into a sport and let consistency be your unfair
            advantage.
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/leaderboard"
              className="group relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-50"
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950/90 px-8 py-1 text-sm font-medium text-white backdrop-blur-3xl transition-all group-hover:bg-slate-950/80 gap-2">
                See Who's Ahead
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            {!isAuthenticated && (
              <Link
                href={
                  process.env.NEXT_PUBLIC_API_BASE_URL
                    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`
                    : "http://localhost:4000/auth/google"
                }
                className="group relative px-8 py-5 bg-[#1E3A8A] text-white font-bold rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-indigo-500/20"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
              </Link>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 text-left"
        >
          {[
            {
              icon: <Zap className="text-[#06B6D4]" />,
              title: "Consistency Beats Talent",
              desc: "Visualize your daily grind and refuse to break your hard-earned streak.",
            },
            {
              icon: <Code className="text-[#3B82F6]" />,
              title: "No More Hiding",
              desc: "Your friends will know if you skipped today. Don't slack off.",
            },
            {
              icon: <Trophy className="text-[#1E3A8A]" />,
              title: "Win Bragging Rights",
              desc: "Turn peer pressure into fuel by outscoring your batchmates every day.",
            },
          ].map((f, i) => (
            <CometCard key={i} className="h-full">
              <div className="relative p-8 h-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg flex flex-col items-start justify-start">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-2xl">
                  {f.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] text-lg mb-2 relative z-10">
                  {f.title}
                </h3>
                <p className="text-[#475569] leading-relaxed relative z-10">
                  {f.desc}
                </p>
              </div>
            </CometCard>
          ))}
        </motion.div>

        {/* Why UpSprint Section */}
        <motion.div
          variants={item}
          className="pt-32 pb-20 max-w-6xl mx-auto text-center space-y-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A]">
            Why UpSprint?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <CometCard className="h-full">
              <div className="relative p-8 h-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg flex flex-col items-start justify-start space-y-4">
                <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-[#1E3A8A]">
                  <MousePointer2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xl text-[#0F172A]">
                  Stop "Tab-Switching"
                </h3>
                <p className="text-[#475569] leading-relaxed">
                  Checking 10 different profiles on 3 sites is exhausting. Save
                  your energy for the actual problems.
                </p>
              </div>
            </CometCard>

            <CometCard className="h-full">
              <div className="relative p-8 h-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg flex flex-col items-start justify-start space-y-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xl text-slate-900">
                  Isolation Kills Growth
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Without accountability, streaks die. When you see your friends
                  grinding, you'll grind too.
                </p>
              </div>
            </CometCard>

            <CometCard className="h-full">
              <div className="relative p-8 h-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg flex flex-col items-start justify-start space-y-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xl text-slate-900">
                  Make Effort Visible
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Don't let your late-night debugging sessions go unnoticed.
                  Prove your dedication daily.
                </p>
              </div>
            </CometCard>
          </div>

          <div className="pt-12">
            <p className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">
              Daily habits. Social stakes. <br className="hidden sm:block" />
              Built strictly for those who code to win.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AuroraBackground>
  );
}
