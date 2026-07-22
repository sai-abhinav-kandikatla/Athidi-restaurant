"use client";

import React, { useState } from "react";
import { useTable } from "@/context/TableContext";
import { useToast } from "@/context/ToastContext";
import { X, UserCheck, Droplet, Receipt, Phone, MessageSquare, ExternalLink, Bell, Utensils, Scroll } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose }) => {
  const { tableNumber, requestService, activeRequests } = useTable();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRequest = async (type: "waiter" | "water" | "bill" | "spoon" | "tissue") => {
    if (!tableNumber) {
      showToast("Please scan a table QR code first to call services.", "error");
      return;
    }
    
    setLoading(type);
    const success = await requestService(type);
    setLoading(null);
    if (success && type === "bill") {
      // Keep modal open, but toast does the notification
    }
  };

  const shareRestaurant = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Athidi Family Restaurant",
        text: "Join me at Athidi, ordering directly from the phone is amazing!",
        url: window.location.origin
      }).catch(() => {});
    } else {
      // Fallback
      if (typeof window !== "undefined") {
        navigator.clipboard.writeText(window.location.origin);
        showToast("Link copied to clipboard! Share with friends.", "success");
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#181818] border-t border-white/10 rounded-t-[32px] p-6 shadow-2xl flex flex-col gap-6"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#C5A880] animate-bounce" />
                <h2 className="text-xl font-serif font-bold text-white tracking-wide">
                  Table Services
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table context */}
            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-gray-400">Current Table</span>
              <span className="text-sm font-serif font-bold text-[#C5A880]">
                {tableNumber ? `Table ${tableNumber}` : "Not Assigned (Browse Only)"}
              </span>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Call Waiter */}
              <button
                onClick={() => handleRequest("waiter")}
                disabled={loading !== null}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all duration-300 gap-2 text-center group cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-6 h-6 text-[#C5A880] group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-semibold text-gray-200">Call Waiter</span>
                {activeRequests.some((r) => r.type === "waiter") && (
                  <span className="text-[8px] bg-[#C5A880] text-black px-1 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </button>

              {/* Request Water */}
              <button
                onClick={() => handleRequest("water")}
                disabled={loading !== null}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all duration-300 gap-2 text-center group cursor-pointer disabled:opacity-50"
              >
                <Droplet className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-semibold text-gray-200">Need Water</span>
                {activeRequests.some((r) => r.type === "water") && (
                  <span className="text-[8px] bg-blue-500 text-white px-1 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </button>

              {/* Request Bill */}
              <button
                onClick={() => handleRequest("bill")}
                disabled={loading !== null}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all duration-300 gap-2 text-center group cursor-pointer disabled:opacity-50"
              >
                <Receipt className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-semibold text-gray-200">Request Bill</span>
                {activeRequests.some((r) => r.type === "bill") && (
                  <span className="text-[8px] bg-green-500 text-black px-1 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </button>

              {/* Extra Spoon */}
              <button
                onClick={() => handleRequest("spoon")}
                disabled={loading !== null}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all duration-300 gap-2 text-center group cursor-pointer disabled:opacity-50"
              >
                <Utensils className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-semibold text-gray-200">Extra Spoon</span>
                {activeRequests.some((r) => r.type === "spoon") && (
                  <span className="text-[8px] bg-yellow-500 text-black px-1 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </button>

              {/* Extra Tissues */}
              <button
                onClick={() => handleRequest("tissue")}
                disabled={loading !== null}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all duration-300 gap-2 text-center group cursor-pointer disabled:opacity-50"
              >
                <Scroll className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-semibold text-gray-200">Need Tissue</span>
                {activeRequests.some((r) => r.type === "tissue") && (
                  <span className="text-[8px] bg-pink-500 text-black px-1 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* Active Requests List */}
            {activeRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Active Staff Requests
                </h3>
                <div className="flex flex-col gap-2">
                  {activeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs animate-pulse-slow"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#C5A880] rounded-full" />
                        <span className="text-gray-200 font-medium capitalize">
                          {req.type === "waiter" ? "Waiter Calling" : req.type === "water" ? "Water Request" : req.type === "bill" ? "Bill Request" : req.type === "spoon" ? "Spoon Request" : "Tissues Request"}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Staff responding...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Contacts & Actions */}
            <div className="flex flex-col gap-3 mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Contact & Support
              </h3>
              
              <div className="flex flex-col gap-2">
                {/* Phone Link */}
                <a
                  href="tel:+919876543210"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm text-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#C5A880]" />
                    <span>Call Restaurant Staff</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>

                {/* WhatsApp Link */}
                <a
                  href="https://wa.me/919876543210?text=I%20am%20at%20Table%20and%20need%20assistance."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm text-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    <span>WhatsApp Kitchen Assistant</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>

                {/* Share Link */}
                <button
                  onClick={shareRestaurant}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm text-gray-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                    <span>Share Restaurant Menu</span>
                  </div>
                  <span className="text-xs text-gray-400">Share Link</span>
                </button>
              </div>
            </div>

            {/* Note */}
            <p className="text-[10px] text-gray-500 text-center italic mt-2">
              Athidi Family Restaurant • Open 11:00 AM - 11:30 PM
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
