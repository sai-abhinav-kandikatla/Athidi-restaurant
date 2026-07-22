"use client";

import React, { useState } from "react";
import { useTable } from "@/context/TableContext";
import { useCart } from "@/context/CartContext";
import { Heart, QrCode, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export const TopHeader: React.FC = () => {
  const { tableNumber, clearTable } = useTable();
  const { favorites, toggleFavorite, cartItems } = useCart();
  const [showFavs, setShowFavs] = useState(false);

  // Filter menu items that are favorited
  // Since we don't have all menu items here, we will just display a clean popover listing names
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <img src="/athidi-logo.jpg" alt="Athidi" className="w-8 h-8 rounded-full object-cover border border-[#C5A880] shadow-lg" />
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-serif font-bold tracking-widest uppercase leading-none gold-text-gradient group-hover:scale-[1.02] transition-transform duration-300">
            Athidi
          </h1>
          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-medium leading-none mt-1">
            Family Restaurant
          </span>
        </div>
      </Link>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Favorite Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowFavs(!showFavs)}
            className="p-2.5 rounded-full bg-[#181818] border border-white/5 text-gray-400 hover:text-[#C5A880] hover:border-[#C5A880]/30 transition-all duration-300 cursor-pointer relative"
            aria-label="Favorites"
          >
            <Heart className={`w-5 h-5 ${favorites.length > 0 ? "fill-[#C5A880] text-[#C5A880]" : ""}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C5A880] text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>

          {/* Favorites Popover */}
          <AnimatePresence>
            {showFavs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFavs(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-72 rounded-2xl glass-panel p-4 shadow-2xl z-50 border border-white/5"
                  style={{ background: "rgba(15,15,15,0.95)" }}
                >
                  <h3 className="text-sm font-serif font-bold text-[#C5A880] mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Favorite Dishes
                  </h3>
                  {favorites.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">
                      Tap the heart icon on any food item to save it here for quick access.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      <p className="text-[10px] text-[#C5A880] mb-1">
                        Go to Menu to add favorites to your order.
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {favorites.map((id) => (
                          <li
                            key={id}
                            className="text-xs text-gray-300 hover:text-white flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5"
                          >
                            <span className="truncate pr-2 font-medium">
                              {id.replace("cs-", "Chef Special ").replace("b-", "Biryani ").replace("ap-", "Appetizer ").replace("c-", "Curry ").replace("br-", "Bread ").replace("d-", "Dessert ").replace("dr-", "Drink ")}
                            </span>
                            <button
                              onClick={() => toggleFavorite(id)}
                              className="text-red-400 hover:text-red-500 text-[10px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Table Badge */}
        {tableNumber ? (
          <div className="flex items-center gap-1 bg-[#C5A880]/10 border border-[#C5A880]/30 rounded-full px-3 py-1.5 shadow-[0_0_15px_rgba(197,168,128,0.1)]">
            <span className="w-1.5 h-1.5 bg-[#C5A880] rounded-full animate-pulse mr-1" />
            <span className="text-xs font-serif font-bold text-[#C5A880] tracking-wide">
              Table {tableNumber}
            </span>
            <button
              onClick={clearTable}
              className="text-gray-400 hover:text-red-400 transition-colors ml-1 p-0.5 cursor-pointer"
              title="Leave Table"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/menu"
            className="flex items-center gap-1.5 bg-[#181818] border border-white/5 text-gray-300 hover:text-white rounded-full px-3.5 py-1.5 text-xs transition-all duration-300 hover:border-[#C5A880]/30"
          >
            <QrCode className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Select Table</span>
          </Link>
        )}
      </div>
    </header>
  );
};
