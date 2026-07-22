"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center justify-between w-full p-4 rounded-xl glass-panel shadow-2xl border border-white/5 relative overflow-hidden"
              style={{
                background: "rgba(15, 15, 15, 0.85)",
                borderLeft: `4px solid ${
                  toast.type === "success"
                    ? "#C5A880"
                    : toast.type === "error"
                    ? "#ef4444"
                    : "#3b82f6"
                }`
              }}
            >
              {/* Soft gold backdrop glow for success */}
              {toast.type === "success" && (
                <div className="absolute inset-0 bg-[#C5A880]/5 pointer-events-none" />
              )}
              
              <div className="flex items-center gap-3">
                {toast.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-[#C5A880] shrink-0" />
                )}
                {toast.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                {toast.type === "info" && (
                  <Info className="w-5 h-5 text-blue-400 shrink-0" />
                )}
                <span className="text-sm font-medium tracking-wide text-gray-100 pr-2">
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
