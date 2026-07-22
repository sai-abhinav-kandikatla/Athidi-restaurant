"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useTable } from "@/context/TableContext";
import { Home, Compass, ShoppingBag, ClipboardList, BellRing } from "lucide-react";
import { ServiceModal } from "./ServiceModal";
import { motion } from "framer-motion";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { cartItems, setIsCartOpen } = useCart();
  const { tableNumber } = useTable();
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Count items in cart
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Check if there is an active order (status !== 'Delivered') to show tracking pulse
  useEffect(() => {
    const checkActiveOrders = () => {
      if (typeof window === "undefined") return;
      const recents = localStorage.getItem("athidi_recent_orders");
      const storedOrders = localStorage.getItem("athidi_orders");
      
      if (recents && storedOrders) {
        const orderIds = JSON.parse(recents);
        const orders = JSON.parse(storedOrders);
        
        // Find if any order is not delivered
        const active = orders.find(
          (o: any) => orderIds.includes(o.id) && o.status !== "Delivered"
        );
        
        if (active) {
          setActiveOrderId(active.id);
        } else {
          setActiveOrderId(null);
        }
      }
    };

    checkActiveOrders();
    // Check every 5 seconds or on orderStatusUpdate events
    const interval = setInterval(checkActiveOrders, 5000);
    window.addEventListener("orderStatusUpdate", checkActiveOrders);

    return () => {
      clearInterval(interval);
      window.removeEventListener("orderStatusUpdate", checkActiveOrders);
    };
  }, []);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0F0F0F]/80 backdrop-blur-xl border-t border-white/5 pb-5 pt-3 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Home */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
              pathname === "/" ? "text-[#C5A880]" : "text-gray-400 hover:text-white"
            }`}
          >
            <Home className="w-5.5 h-5.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
          </Link>

          {/* Menu */}
          <Link
            href="/menu"
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
              pathname === "/menu" ? "text-[#C5A880]" : "text-gray-400 hover:text-white"
            }`}
          >
            <Compass className="w-5.5 h-5.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Menu</span>
          </Link>

          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 py-1 text-gray-400 hover:text-white transition-colors relative cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="w-5.5 h-5.5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-2 bg-[#C5A880] text-black font-bold text-[9px] rounded-full w-4 h-4 flex items-center justify-center border border-black"
                >
                  {cartCount}
                </motion.span>
              )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">Cart</span>
          </button>

          {/* Live Order Tracker */}
          {activeOrderId ? (
            <Link
              href={`/order-tracker/${activeOrderId}`}
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors relative ${
                pathname.startsWith("/order-tracker") ? "text-[#C5A880]" : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="relative">
                <ClipboardList className="w-5.5 h-5.5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-black animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-black" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">Track</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  const recents = localStorage.getItem("athidi_recent_orders");
                  if (recents) {
                    const ids = JSON.parse(recents);
                    if (ids.length > 0) {
                      window.location.href = `/order-tracker/${ids[0]}`;
                      return;
                    }
                  }
                  // Fallback if no order exists
                  alert("You have no active orders. Scan a table QR code and order from Menu!");
                }
              }}
              className="flex flex-col items-center gap-1 flex-1 py-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ClipboardList className="w-5.5 h-5.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Track</span>
            </button>
          )}

          {/* Waiter Service Trigger */}
          <button
            onClick={() => setIsServiceOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 py-1 text-gray-400 hover:text-[#C5A880] transition-colors cursor-pointer"
          >
            <BellRing className="w-5.5 h-5.5 text-[#C5A880] drop-shadow-[0_0_8px_rgba(197,168,128,0.3)] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#C5A880]">Service</span>
          </button>
        </div>
      </nav>

      {/* Render Service Modal */}
      <ServiceModal isOpen={isServiceOpen} onClose={() => setIsServiceOpen(false)} />
    </>
  );
};
