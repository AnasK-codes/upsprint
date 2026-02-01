"use client";

import { clsx } from "clsx";
import { memo } from "react";

interface AuroraBackgroundProps {
  className?: string;
  children: React.ReactNode;
}

export const AuroraBackground = memo(function AuroraBackground({
  className,
  children,
}: AuroraBackgroundProps) {
  return (
    <div
      className={clsx(
        "relative flex flex-col items-center justify-center min-h-screen bg-white transition-colors bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]",
        className,
      )}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[50vh] bg-indigo-300/30 rounded-[100%] blur-[80px] md:blur-[120px] mix-blend-multiply animate-pulse will-change-transform motion-reduce:animate-none" />
        <div className="absolute bottom-0 right-0 w-[80vw] h-[60vh] bg-blue-400/20 rounded-[100%] blur-[80px] md:blur-[120px] mix-blend-multiply will-change-transform motion-reduce:animate-none" />
        <div className="absolute top-1/2 left-0 w-[60vw] h-[40vh] bg-slate-200/40 rounded-[100%] blur-[70px] md:blur-[100px] mix-blend-multiply will-change-transform motion-reduce:animate-none" />
      </div>
      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
});
