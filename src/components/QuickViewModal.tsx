"use client";

import React, { useState, useEffect } from "react";
import { MenuItem } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { X, Clock, Star, Heart, ShoppingBag, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickViewModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ item, isOpen, onClose }) => {
  const { addToCart, favorites, toggleFavorite } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSpice, setSelectedSpice] = useState(0);

  // Sync state when active item changes
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setSelectedSpice(item.spiceLevel);
    }
  }, [item]);

  if (!item) return null;

  const isFavorited = favorites.includes(item.id);
  const spiceLabels = ["Mild", "Medium", "Spicy", "Extra Spicy"];

  const handleAddToCart = () => {
    addToCart(item, quantity, selectedSpice);
    onClose();
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
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Favorite Button */}
              <button
                onClick={() => toggleFavorite(item.id)}
                className="absolute top-4 left-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
              </button>

              {/* Main Image */}
              <div className="relative aspect-video w-full">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-90" />
                
                {/* Badges */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full self-center ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                    {item.isVeg ? "Veg" : "Non-Veg"}
                  </span>
                </div>
              </div>

              {/* Content Panel */}
              <div className="p-6 md:p-8 flex flex-col gap-5">
                {/* Header Information */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-white leading-tight">
                      {item.name}
                    </h2>
                    <span className="text-xl font-serif font-bold text-[#C5A880] shrink-0">
                      ₹{item.price}
                    </span>
                  </div>

                  {/* Meta items */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-[#C5A880] text-[#C5A880]" />
                      <span className="font-bold text-white">{item.rating}</span>
                      <span>({item.reviewsCount} reviews)</span>
                    </div>
                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{item.prepTime} mins preparation</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-light">
                  {item.description}
                </p>

                {/* Customizations (Spice) */}
                {item.spiceLevel > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Spiciness Level
                    </span>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3].map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedSpice(level)}
                          className={`flex-1 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            selectedSpice === level
                              ? "border-[#C5A880] bg-[#C5A880]/15 text-[#C5A880]"
                              : "border-white/5 bg-white/5 text-gray-400 hover:text-white"
                          }`}
                        >
                          {spiceLabels[level]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between gap-6 pt-3 border-t border-white/5">
                  {/* Quantity */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Quantity</span>
                    <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 mt-0.5">
                      <button
                        onClick={() => { if (quantity > 1) setQuantity(quantity - 1); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-white min-w-[20px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-[#C5A880] hover:bg-[#D4AF37] text-black font-semibold py-3.5 rounded-full text-xs uppercase tracking-widest transition-transform duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-4"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Order • ₹{item.price * quantity}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
