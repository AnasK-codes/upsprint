import { motion } from "framer-motion";

export default function BrandedLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 border-4 border-indigo-100 rounded-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        />
        <motion.div
          className="absolute inset-0 border-4 border-t-indigo-600 border-r-transparent border-b-purple-600 border-l-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center font-bold text-xl text-indigo-600"
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ⚡
        </motion.div>
      </div>
      <motion.p
        className="text-sm font-medium text-gray-400 uppercase tracking-widest"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading
      </motion.p>
    </div>
  );
}
