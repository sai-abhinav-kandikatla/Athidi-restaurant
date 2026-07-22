"use client";

import React, { useEffect } from "react";
import { useTable } from "@/context/TableContext";
import { useRouter, useParams } from "next/navigation";
import { QrCode, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function TableLandingPage() {
  const { setTableNumber } = useTable();
  const router = useRouter();
  const params = useParams();

  const tableNumberStr = params.number as string;

  useEffect(() => {
    if (tableNumberStr) {
      const num = parseInt(tableNumberStr, 10);
      if (!isNaN(num)) {
        // Set table number in global context
        setTableNumber(num);
        
        // Wait 2.5 seconds to show the luxury assignment splash, then redirect to Menu
        const timer = setTimeout(() => {
          router.push("/menu");
        }, 2500);

        return () => clearTimeout(timer);
      } else {
        router.push("/");
      }
    }
  }, [tableNumberStr, setTableNumber, router]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Splash Animation Container */}
      <div className="flex flex-col items-center gap-6 max-w-sm text-center z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full border border-[#C5A880]/30 animate-ping opacity-40" />
          <div className="absolute inset-[-10px] rounded-full border border-[#C5A880]/10 animate-pulse-slow" />
          
          <div className="w-20 h-20 rounded-full bg-[#181818] border border-[#C5A880]/40 flex items-center justify-center shadow-2xl">
            <QrCode className="w-9 h-9 text-[#C5A880] drop-shadow-[0_0_10px_rgba(197,168,128,0.4)]" />
          </div>
        </motion.div>

        <div className="flex flex-col gap-2">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-serif font-bold text-white flex items-center justify-center gap-2"
          >
            Athidi <Sparkles className="w-4 h-4 text-[#C5A880]" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xs uppercase tracking-widest text-[#C5A880] font-bold"
          >
            Table {tableNumberStr} Identified
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xs text-gray-500 mt-2 max-w-[240px] mx-auto leading-relaxed"
          >
            Linking order session to your table. You will be redirected to the dining menu shortly...
          </motion.p>
        </div>

        {/* Linear gold loading progress bar */}
        <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden mt-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-[#BF953F] to-[#FCF6BA]"
          />
        </div>
      </div>

      {/* Decorative Brand Tag */}
      <span className="absolute bottom-10 text-[9px] uppercase tracking-[0.25em] text-gray-600 font-bold">
        Luxury Digital Dining System
      </span>
    </div>
  );
}
