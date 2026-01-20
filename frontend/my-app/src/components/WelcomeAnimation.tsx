import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface WelcomeAnimationProps {
  username?: string;
  onComplete: () => void;
}

export default function WelcomeAnimation({
  username,
  onComplete,
}: WelcomeAnimationProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1: Intro
    const t1 = setTimeout(() => {
      setStage(1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 500);

    // Stage 2: Exit
    const t2 = setTimeout(() => {
      setStage(2);
      setTimeout(onComplete, 800); // Wait for exit anim
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 2 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-6xl mb-4"
            >
              👋
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Welcome Back{username ? `, ${username}` : ""}!
            </h1>
            <p className="text-xl text-gray-500 mt-4">
              Ready to sprint to the top?
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
