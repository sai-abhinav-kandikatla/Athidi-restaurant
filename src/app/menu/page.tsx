"use client";

import React, { useState, useMemo } from "react";
import { TopHeader } from "@/components/TopHeader";
import { BottomNav } from "@/components/BottomNav";
import { SlidingCart } from "@/components/SlidingCart";
import { CategoryTabs } from "@/components/CategoryTabs";
import { FoodCard } from "@/components/FoodCard";
import { QuickViewModal } from "@/components/QuickViewModal";
import { MENU_ITEMS, MenuItem } from "@/data/mockData";
import { Search, SlidersHorizontal, Leaf, Flame, Sparkles, Star, Smile, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("chef-specials");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickViewItem, setQuickViewItem] = useState<MenuItem | null>(null);
  
  // Filter states
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [bestSellers, setBestSellers] = useState(false);
  const [chefSpecials, setChefSpecials] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);
  const [kidsFriendly, setKidsFriendly] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Compute filtered menu items
  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      // 1. Category Filter
      if (item.category !== activeCategory) return false;

      // 2. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // 3. Veg / Non Veg filters
      if (vegOnly && !item.isVeg) return false;
      if (nonVegOnly && item.isVeg) return false;

      // 4. Badges/Tags filters
      if (bestSellers && !item.isBestSeller) return false;
      if (chefSpecials && !item.isChefSpecial) return false;
      if (kidsFriendly && !item.isKids) return false;
      if (spicyOnly && item.spiceLevel < 2) return false;

      return true;
    });
  }, [
    activeCategory,
    searchQuery,
    vegOnly,
    nonVegOnly,
    bestSellers,
    chefSpecials,
    spicyOnly,
    kidsFriendly
  ]);

  const handleClearFilters = () => {
    setVegOnly(false);
    setNonVegOnly(false);
    setBestSellers(false);
    setChefSpecials(false);
    setSpicyOnly(false);
    setKidsFriendly(false);
    setSearchQuery("");
  };

  const activeFiltersCount = [
    vegOnly,
    nonVegOnly,
    bestSellers,
    chefSpecials,
    spicyOnly,
    kidsFriendly
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-32">
      <TopHeader />

      {/* Hero Header */}
      <div className="py-8 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide">
            Interactive Dining Menu
          </h1>
          <p className="text-xs text-gray-400 font-light mt-1">
            Choose your customized spiciness, configure quantities, and order instantly.
          </p>
        </div>

        {/* Search & Filter Trigger */}
        <div className="flex gap-3 w-full md:max-w-md">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes (e.g. biryani, kebabs)..."
              className="w-full bg-[#181818] border border-white/5 rounded-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A880]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`p-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFiltersCount > 0
                ? "border-[#C5A880] text-[#C5A880] bg-[#C5A880]/5"
                : "border-white/5 text-gray-400 hover:text-white bg-[#181818]"
            }`}
            title="Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-bold bg-[#C5A880] text-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Category Tabs Section */}
      <CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

      {/* Filter Drawer / Expandable Panel */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full bg-[#121212]/80 backdrop-blur-md border-b border-white/5 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden"
          >
            <div className="py-6 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-2">
                Quick Filters:
              </span>

              {/* Veg Only */}
              <button
                onClick={() => {
                  setVegOnly(!vegOnly);
                  setNonVegOnly(false);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  vegOnly
                    ? "border-green-500 bg-green-500/5 text-green-500"
                    : "border-white/5 bg-[#181818] text-gray-400 hover:text-white"
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                Veg Only
              </button>

              {/* Non Veg Only */}
              <button
                onClick={() => {
                  setNonVegOnly(!nonVegOnly);
                  setVegOnly(false);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  nonVegOnly
                    ? "border-red-500 bg-red-500/5 text-red-500"
                    : "border-white/5 bg-[#181818] text-gray-400 hover:text-white"
                }`}
              >
                <Leaf className="w-3.5 h-3.5 rotate-180" />
                Non-Veg
              </button>

              {/* Best Seller */}
              <button
                onClick={() => setBestSellers(!bestSellers)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  bestSellers
                    ? "border-[#C5A880] bg-[#C5A880]/5 text-[#C5A880]"
                    : "border-white/5 bg-[#181818] text-gray-400 hover:text-white"
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Best Seller
              </button>

              {/* Spicy Only */}
              <button
                onClick={() => setSpicyOnly(!spicyOnly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  spicyOnly
                    ? "border-yellow-500 bg-yellow-500/5 text-yellow-500"
                    : "border-white/5 bg-[#181818] text-gray-400 hover:text-white"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Spicy
              </button>

              {/* Kids Friendly */}
              <button
                onClick={() => setKidsFriendly(!kidsFriendly)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  kidsFriendly
                    ? "border-blue-400 bg-blue-400/5 text-blue-400"
                    : "border-white/5 bg-[#181818] text-gray-400 hover:text-white"
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                Kids Friendly
              </button>

              {/* Chef Recommendations */}
              <button
                onClick={() => setChefSpecials(!chefSpecials)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  chefSpecials
                    ? "border-purple-400 bg-purple-400/5 text-purple-400"
                    : "border-white/5 bg-[#181818] text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Chef Pick
              </button>

              {/* Clear CTA */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-wider ml-auto cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Grid Content */}
      <main className="py-8 px-6 md:px-12 max-w-7xl mx-auto flex-1">
        {filteredItems.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
            <p className="text-gray-500 text-sm">
              No dishes found matching your current search or filter criteria.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-5 py-2 rounded-full border border-[#C5A880] text-[#C5A880] hover:bg-[#C5A880] hover:text-black transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <FoodCard
                  key={item.id}
                  menuItem={item}
                  onQuickView={(dish) => setQuickViewItem(dish)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Embedded Quick View Modal */}
      <QuickViewModal
        item={quickViewItem}
        isOpen={quickViewItem !== null}
        onClose={() => setQuickViewItem(null)}
      />

      {/* Layout components */}
      <BottomNav />
      <SlidingCart />
    </div>
  );
}
