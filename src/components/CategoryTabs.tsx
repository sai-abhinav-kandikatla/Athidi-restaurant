"use client";

import React, { useRef, useEffect } from "react";
import { Category, CATEGORIES } from "@/data/mockData";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";

interface CategoryTabsProps {
  activeCategory: string;
  setActiveCategory: (slug: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  setActiveCategory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic icon rendering helper
  const renderIcon = (iconName: string, isActive: boolean) => {
    // Dynamically retrieve the Lucide icon component
    const LucideIcon = (Icons as any)[iconName] || Icons.Utensils;
    return (
      <LucideIcon
        className={`w-4 h-4 transition-transform duration-300 ${
          isActive ? "text-black scale-110" : "text-[#C5A880] group-hover:scale-110"
        }`}
      />
    );
  };

  // Auto scroll active tab into view in the horizontal container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeTab = container.querySelector("[data-active='true']");
    if (!activeTab) return;

    const containerScrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    const tabOffsetLeft = (activeTab as HTMLElement).offsetLeft;
    const tabWidth = (activeTab as HTMLElement).offsetWidth;

    // Center the active tab in the scrolling container
    const targetScrollLeft = tabOffsetLeft - containerWidth / 2 + tabWidth / 2;

    container.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
  }, [activeCategory]);

  return (
    <div className="w-full relative py-3">
      {/* Soft overlay gradients on sides for indicating swipeability */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0F0F0F] to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0F0F0F] to-transparent pointer-events-none z-10" />

      <div
        ref={containerRef}
        className="flex items-center gap-3 overflow-x-auto no-scrollbar px-6 md:px-12 py-1 scroll-smooth"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.slug === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              data-active={isActive}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all duration-300 group shrink-0 cursor-pointer ${
                isActive
                  ? "border-[#C5A880] text-black bg-[#C5A880] shadow-[0_0_15px_rgba(197,168,128,0.35)]"
                  : "border-white/5 text-gray-400 hover:text-white hover:border-[#C5A880]/20 bg-[#181818]"
              }`}
            >
              {/* Dynamic layout using Framer Motion layoutId for sliding effect */}
              {isActive && (
                <motion.span
                  layoutId="activeCategoryBg"
                  className="absolute inset-0 bg-[#C5A880] rounded-full z-[-1]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {renderIcon(cat.icon, isActive)}
              <span className={isActive ? "text-black" : "text-gray-300"}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
