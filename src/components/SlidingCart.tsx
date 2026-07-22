"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useTable } from "@/context/TableContext";
import { X, Trash2, Plus, Minus, ChefHat, Ticket, Info, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export const SlidingCart: React.FC = () => {
  const router = useRouter();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    taxes,
    discountAmount,
    grandTotal,
    specialInstructions,
    setSpecialInstructions,
    couponCode,
    applyCoupon,
    removeCoupon,
    estimatedPrepTime,
    checkout
  } = useCart();

  const { tableNumber } = useTable();
  const [couponInput, setCouponInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    const success = applyCoupon(couponInput);
    if (success) {
      setCouponInput("");
    }
  };

  const handleCheckout = async () => {
    if (!tableNumber) {
      alert("Please scan a table QR code first before placing an order!");
      return;
    }

    setIsSubmitting(true);
    const orderId = await checkout();
    setIsSubmitting(false);

    if (orderId) {
      // Trigger confetti celebration on successful order placement!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#C5A880", "#D4AF37", "#FFFFFF", "#181818"]
      });

      // Redirect to the tracker
      setTimeout(() => {
        router.push(`/order-tracker/${orderId}`);
      }, 1000);
    }
  };

  const spiceLabels = ["Mild", "Medium", "Spicy", "Extra Spicy"];

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Cart Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-[#0F0F0F] border-l border-white/5 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#181818]">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#C5A880]" />
                <h2 className="text-xl font-serif font-bold text-white tracking-wide">
                  Your Order Cart
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Cart Items Container */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {cartItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <ChefHat className="w-8 h-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-gray-300">
                      Your cart is empty
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Explore our premium menu selections and add signature dishes to get started.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-6 py-2.5 rounded-full bg-[#C5A880] text-black font-semibold text-xs transition-transform duration-300 hover:scale-[1.03] cursor-pointer"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Dishes Selected
                    </h3>
                    
                    <div className="flex flex-col gap-3">
                      {cartItems.map((item) => (
                        <div
                          key={`${item.menuItem.id}-${item.spiceLevel}`}
                          className="p-3 bg-[#181818]/65 border border-white/5 rounded-2xl flex items-center justify-between gap-4"
                        >
                          {/* Dish info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate pr-1">
                              {item.menuItem.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-gray-400">
                                ₹{item.menuItem.price}
                              </span>
                              <span className="w-1 h-1 bg-white/10 rounded-full" />
                              <span className="text-[9px] bg-white/5 text-[#C5A880] px-1.5 py-0.5 rounded-full font-medium">
                                {spiceLabels[item.spiceLevel]}
                              </span>
                            </div>
                          </div>

                          {/* Quantity modifiers */}
                          <div className="flex items-center gap-2.5 bg-black/40 rounded-full p-1 border border-white/5">
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItem.id, item.spiceLevel, item.quantity - 1)
                              }
                              className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-white min-w-[12px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItem.id, item.spiceLevel, item.quantity + 1)
                              }
                              className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Delete Item */}
                          <button
                            onClick={() => removeFromCart(item.menuItem.id, item.spiceLevel)}
                            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cooking Instructions */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Special Cooking Notes
                    </label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="E.g., No onions, extra spicy, gluten allergy, etc."
                      className="w-full bg-[#181818]/65 border border-white/5 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A880]/30 resize-none h-16"
                    />
                  </div>

                  {/* Coupons Section */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5 text-[#C5A880]" /> Promo Coupon
                    </label>
                    
                    {couponCode ? (
                      <div className="p-3 rounded-2xl bg-[#C5A880]/5 border border-[#C5A880]/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#C5A880] tracking-wider uppercase">
                            {couponCode}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            (Applied successfully)
                          </span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-red-400 hover:text-red-500 font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Try WELCOME10 or ATHIDI20"
                          className="flex-1 bg-[#181818]/65 border border-white/5 rounded-2xl px-3 py-2 text-xs text-white placeholder-gray-500 uppercase focus:outline-none focus:border-[#C5A880]/30"
                        />
                        <button
                          type="submit"
                          className="bg-[#181818] border border-white/5 text-[#C5A880] hover:bg-[#C5A880] hover:text-black transition-all px-4 rounded-2xl text-xs font-medium cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Estimation info */}
                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-2.5">
                    <Info className="w-4.5 h-4.5 text-[#C5A880] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-gray-200 block">
                        Estimated Preparation Time
                      </span>
                      <span className="text-[10px] text-[#C5A880] mt-0.5 block">
                        Ready in approximately {estimatedPrepTime} minutes.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary and Checkout */}
            {cartItems.length > 0 && (
              <div className="p-6 bg-[#181818] border-t border-white/5 flex flex-col gap-4">
                {/* Cost Breakdown */}
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400">
                    <span>Taxes (5% GST + 5% Service Charge)</span>
                    <span>₹{taxes.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between text-sm font-serif font-bold text-white">
                    <span>Grand Total</span>
                    <span className="text-[#C5A880]">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                {tableNumber ? (
                  <button
                    onClick={handleCheckout}
                    disabled={isSubmitting}
                    className="w-full bg-[#C5A880] hover:bg-[#D4AF37] text-black font-semibold py-3.5 rounded-full text-xs uppercase tracking-widest transition-transform duration-300 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isSubmitting ? "Placing Order..." : "Confirm & Send to Kitchen"}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[10px] text-yellow-500/80 text-center font-medium">
                      ⚠️ Scan a Table QR code to enable kitchen checkout
                    </p>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        window.location.href = "/menu";
                      }}
                      className="w-full bg-[#181818] border border-white/5 text-gray-300 font-semibold py-3 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:border-[#C5A880]/30 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4 text-[#C5A880]" />
                      Select Table to Order
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
