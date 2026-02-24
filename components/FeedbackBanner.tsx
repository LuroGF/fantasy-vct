"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackBannerProps {
  status: { type: string; message: string } | null;
}

export function FeedbackBanner({ status }: FeedbackBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status?.message) {
      // Small delay to ensure the element is rendered and animated
      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [status]);

  return (
    <AnimatePresence>
      {status?.message && (
        <motion.div
          ref={bannerRef}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className={`v-panel p-4 my-2 text-[10px] font-black uppercase text-center tracking-[0.2em] border-l-4 shadow-xl z-50 ${
            status.type === 'error' 
              ? 'border-v-red bg-v-red/10 text-v-red shadow-v-red/10' 
              : status.type === 'success' 
              ? 'border-green-500 bg-green-500/10 text-green-500 shadow-green-500/10'
              : 'border-v-white/20 bg-v-white/5 text-v-white/50'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm">{status.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{status.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
