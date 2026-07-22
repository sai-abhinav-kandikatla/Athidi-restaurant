"use client";

import React, { useState } from "react";
import { useRestaurantStore } from "@/lib/store/useRestaurantStore";
import { MENU_ITEMS, CATEGORIES } from "@/data/mockData";
import { 
  Crown, ToggleLeft, ToggleRight, DollarSign, Clock, 
  Flame, Sparkles, Star, Plus, Trash2, Search, Edit2, Check, Laptop
} from "lucide-react";
import Link from "next/link";

export default function MenuManagement() {
  const { 
    menuAvailability, 
    toggleMenuItemAvailability, 
    updateMenuItemPrice 
  } = useRestaurantStore();

  const [activeCategory, setActiveCategory] = useState("chef-specials");
  const [searchQuery, setSearchQuery] = useState("");
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  // Group items by category
  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getItemAvailability = (itemId: string) => {
    return menuAvailability[itemId] || { id: itemId, available: true, price: 0, stock: 100 };
  };

  const handleStartEditPrice = (itemId: string, currentPrice: number) => {
    setEditPriceId(itemId);
    setTempPrice(currentPrice.toString());
  };

  const handleSavePrice = (itemId: string) => {
    const priceVal = parseFloat(tempPrice);
    if (!isNaN(priceVal) && priceVal > 0) {
      updateMenuItemPrice(itemId, priceVal);
    }
    setEditPriceId(null);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans pb-12 select-none">
      
      {/* Staff navigation bar */}
      <nav className="border-b border-white/5 bg-[#121214]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-lg">
            <Sparkles className="w-4.5 h-4.5 text-[#C5A880]" />
          </div>
          <div>
            <span className="font-serif font-bold text-white tracking-wider block text-sm">ATHIDI MENU EDITOR</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest block -mt-0.5">Menu Management</span>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 gap-1">
          <Link href="/owner" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Owner</Link>
          <Link href="/kitchen" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Kitchen</Link>
          <Link href="/waiter" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Waiter</Link>
          <Link href="/checkout" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Checkout</Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/menu-management" className="px-3 py-1.5 rounded-xl bg-[#C5A880] text-black text-[10px] font-bold uppercase tracking-wider">
            Menu Manager
          </Link>
          <Link href="/analytics" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-wider hover:text-white transition-all">
            Analytics
          </Link>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <Crown className="w-4.5 h-4.5 text-[#C5A880]" /> Interactive Menu Catalog
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Toggle item availability and modify pricing. Changes update instantly across all customer devices.</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search catalog items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121214] border border-white/5 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A880]/30"
            />
          </div>
        </div>

        {/* Categories Tab scrolling strip */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeCategory === cat.slug
                  ? "bg-[#C5A880] text-black"
                  : "bg-[#121214] text-gray-400 border border-white/5 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Table Grid */}
        <div className="flex flex-col rounded-[24px] bg-[#121214]/65 border border-white/5 overflow-hidden shadow-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-black/40 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="col-span-5 sm:col-span-6">Item Detail</div>
            <div className="col-span-3 sm:col-span-2 text-center">Price (INR)</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-center">Best Seller</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col max-h-[60vh] overflow-y-auto no-scrollbar divide-y divide-white/5">
            {filteredItems.length === 0 ? (
              <div className="py-24 text-center text-zinc-600 text-xs italic">No items matching filters.</div>
            ) : (
              filteredItems.map((item) => {
                const avail = getItemAvailability(item.id);
                const currentPrice = avail.price > 0 ? avail.price : item.price;
                const isEditingPrice = editPriceId === item.id;

                return (
                  <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/2 transition-colors">
                    
                    {/* Item details */}
                    <div className="col-span-5 sm:col-span-6 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/5 shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                          item.isVeg 
                            ? "bg-green-500/10 text-green-400 border border-green-500/10" 
                            : "bg-red-500/10 text-red-400 border border-red-500/10"
                        }`}>
                          {item.isVeg ? "Veg" : "Non-Veg"}
                        </span>
                        <span className="text-[9px] text-zinc-500 ml-2">Prep: {item.prepTime}m</span>
                      </div>
                    </div>

                    {/* Price edit */}
                    <div className="col-span-3 sm:col-span-2 flex justify-center">
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1 max-w-[100px]">
                          <input
                            type="text"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs text-white w-full text-center"
                            autoFocus
                          />
                          <button onClick={() => handleSavePrice(item.id)} className="text-green-400 hover:text-green-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-serif font-bold text-gray-200">
                          <span>₹{currentPrice}</span>
                          <button 
                            onClick={() => handleStartEditPrice(item.id, currentPrice)}
                            className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Availability toggle */}
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => toggleMenuItemAvailability(item.id)}
                        className="cursor-pointer transition-transform duration-200 hover:scale-105"
                      >
                        {avail.available ? (
                          <ToggleRight className="w-8 h-8 text-[#C5A880]" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-zinc-600" />
                        )}
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="col-span-2 flex justify-center">
                      {item.isBestSeller ? (
                        <span className="text-[#C5A880] p-1.5 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/15">
                          <Star className="w-4.5 h-4.5 fill-[#C5A880]" />
                        </span>
                      ) : (
                        <span className="text-zinc-600">
                          <Star className="w-4.5 h-4.5" />
                        </span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
