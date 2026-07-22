"use client";

import React, { useState } from "react";
import { MenuItem } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { Heart, Clock, Star, Flame, Eye, Plus, Minus, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

interface FoodCardProps {
  menuItem: MenuItem;
  onQuickView: (item: MenuItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ menuItem, onQuickView }) => {
  const { cartItems, addToCart, updateQuantity, favorites, toggleFavorite } = useCart();
  const [selectedSpice, setSelectedSpice] = useState(menuItem.spiceLevel);

  const isFavorited = favorites.includes(menuItem.id);

  // Check if this item is in the cart with the selected spice level
  const existingCartItem = cartItems.find(
    (c) => c.menuItem.id === menuItem.id && c.spiceLevel === selectedSpice
  );
  const cartQty = existingCartItem ? existingCartItem.quantity : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    addToCart(menuItem, 1, selectedSpice);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(menuItem.id);
  };

  const spiceLabels = ["Mild", "Medium", "Spicy", "Extra Spicy"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative flex flex-col bg-[#181818]/60 backdrop-blur-md border border-white/5 rounded-[24px] overflow-hidden hover:border-[#C5A880]/30 transition-all duration-500 shadow-xl"
    >
      {/* Badges Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        {menuItem.isChefSpecial && (
          <span className="bg-[#C5A880] text-black text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-black" /> Chef Special
          </span>
        )}
        {menuItem.isBestSeller && (
          <span className="bg-black/80 text-[#C5A880] border border-[#C5A880]/30 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
            Best Seller
          </span>
        )}
        {menuItem.isTodaysSpecial && (
          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
            Today's Special
          </span>
        )}
      </div>

      {/* Favorite Button */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/5 text-gray-400 hover:text-red-500 transition-all duration-300 cursor-pointer shadow-lg"
        aria-label="Add to Favorites"
      >
        <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
      </button>

      {/* Image Section */}
      <div
        className="relative aspect-video w-full overflow-hidden cursor-pointer"
        onClick={() => onQuickView(menuItem)}
      >
        <img
          src={menuItem.image}
          alt={menuItem.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        {/* Soft shadow gradients over image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-80" />
        
        {/* Hover Quick View Trigger */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="bg-black/85 text-white border border-white/10 rounded-full p-3 shadow-2xl flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
            <Eye className="w-4 h-4 text-[#C5A880]" /> Quick View
          </span>
        </div>

        {/* Veg / Non-Veg Indicator Capsule */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm border border-white/5 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
          <span className={`w-2 h-2 rounded-full ${menuItem.isVeg ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
          <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold">
            {menuItem.isVeg ? "Veg" : "Non-Veg"}
          </span>
        </div>

        {/* Prep Time Capsule */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm border border-white/5 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-lg text-[9px] font-bold text-gray-300 uppercase tracking-wider">
          <Clock className="w-3 h-3 text-[#C5A880]" />
          <span>{menuItem.prepTime} mins</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Title and Rating */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onQuickView(menuItem)}
              className="text-base font-serif font-bold text-white group-hover:text-[#C5A880] transition-colors cursor-pointer line-clamp-1"
            >
              {menuItem.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0 bg-white/5 border border-white/5 rounded-full px-2 py-0.5 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-[#C5A880] text-[#C5A880]" />
              <span className="text-[10px] font-bold text-white">
                {menuItem.rating}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[32px] leading-relaxed">
            {menuItem.description}
          </p>
        </div>

        {/* Customization (Spice Level) */}
        {menuItem.spiceLevel > 0 && (
          <div className="flex items-center justify-between py-1 border-t border-b border-white/5 text-[10px]">
            <span className="text-gray-400 font-medium">Select Spice:</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((level) => (
                <button
                  key={level}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSpice(level);
                  }}
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold cursor-pointer transition-all ${
                    selectedSpice === level
                      ? "border-[#C5A880] bg-[#C5A880]/10 text-[#C5A880]"
                      : "border-white/5 bg-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {spiceLabels[level]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price & Action Row */}
        <div className="flex items-center justify-between mt-auto pt-2">
          {/* Price */}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Price</span>
            <span className="text-lg font-serif font-bold text-[#C5A880]">
              ₹{menuItem.price}
            </span>
          </div>

          {/* Add actions */}
          <div className="flex items-center">
            {cartQty > 0 ? (
              /* Pill style Quantity adjustment inside cart */
              <div className="flex items-center bg-black/40 border border-[#C5A880]/30 rounded-full p-0.5 shadow-inner">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(menuItem.id, selectedSpice, cartQty - 1);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white cursor-pointer hover:bg-white/5 active:scale-[0.88] transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-serif font-black text-white min-w-[24px] text-center">
                  {cartQty}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(menuItem.id, selectedSpice, cartQty + 1);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#C5A880] cursor-pointer hover:bg-white/5 active:scale-[0.88] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Zomato/Swiggy style ADD button */
              <button
                onClick={handleAddToCart}
                className="bg-[#C5A880] hover:bg-[#D4AF37] text-black px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg cursor-pointer flex items-center gap-1.5 active:scale-[0.95]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
