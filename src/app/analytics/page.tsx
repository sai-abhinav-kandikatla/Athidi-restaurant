"use client";

import React from "react";
import { 
  TrendingUp, Clock, AlertOctagon, Award, 
  Users, BarChart3, PieChart, Sparkles, Laptop
} from "lucide-react";
import Link from "next/link";

export default function AnalyticsDashboard() {
  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans pb-12 select-none">
      
      {/* Staff navigation bar */}
      <nav className="border-b border-white/5 bg-[#121214]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-lg">
            <BarChart3 className="w-4.5 h-4.5 text-[#C5A880]" />
          </div>
          <div>
            <span className="font-serif font-bold text-white tracking-wider block text-sm">ATHIDI ANALYTICS</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest block -mt-0.5">Performance Intelligence</span>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 gap-1">
          <Link href="/owner" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Owner</Link>
          <Link href="/kitchen" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Kitchen</Link>
          <Link href="/waiter" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Waiter</Link>
          <Link href="/checkout" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Checkout</Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/menu-management" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-wider hover:text-white transition-all">
            Menu Manager
          </Link>
          <Link href="/analytics" className="px-3 py-1.5 rounded-xl bg-[#C5A880] text-black text-[10px] font-bold uppercase tracking-wider">
            Analytics
          </Link>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-[#C5A880]" /> Operations Overview
          </h3>
          <p className="text-[10px] text-gray-500 mt-1">Real-time analytical graphs mapping dining metrics, kitchen speed, and waiter dispatch response times.</p>
        </div>

        {/* Row 1: Operations Metrics Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Table Turnover */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Table Turnover</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">26 min</h2>
              <span className="text-[9px] text-green-400 mt-1 block font-medium">
                ⚡ Optimal seating speed
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/15 text-green-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Waiter Response Time */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Waiter Response</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">42 sec</h2>
              <span className="text-[9px] text-green-400 mt-1 block font-medium">
                ⚡ Excellent resolution lag
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/15 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Kitchen Delay Rate */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Kitchen Delay</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">4.2%</h2>
              <span className="text-[9px] text-amber-400 mt-1 block font-medium">
                ⚠️ Within tolerance (5%)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/15 text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Guest Rating</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">4.85 / 5</h2>
              <span className="text-[9px] text-green-400 mt-1 block font-medium">
                ★ 312 review logs
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/15 text-yellow-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Row 2: Charts Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Sales Hourly Chart */}
          <div className="p-6 rounded-[28px] bg-[#121214]/65 border border-white/5 shadow-2xl flex flex-col gap-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Daily Revenue Peak Hours</span>
            
            <svg className="w-full h-48 text-[#C5A880] mt-2" viewBox="0 0 400 150">
              {/* Grid lines */}
              <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" />
              
              {/* Bars */}
              <rect x="20" y="70" width="22" height="50" rx="3" fill="#C5A880" opacity="0.3" />
              <rect x="65" y="50" width="22" height="70" rx="3" fill="#C5A880" opacity="0.5" />
              <rect x="110" y="30" width="22" height="90" rx="3" fill="#C5A880" opacity="0.6" />
              <rect x="155" y="90" width="22" height="30" rx="3" fill="#C5A880" opacity="0.4" />
              <rect x="200" y="20" width="22" height="100" rx="3" fill="#C5A880" opacity="0.8" />
              <rect x="245" y="10" width="22" height="110" rx="3" fill="#C5A880" />
              <rect x="290" y="25" width="22" height="95" rx="3" fill="#C5A880" opacity="0.7" />
              <rect x="335" y="45" width="22" height="75" rx="3" fill="#C5A880" opacity="0.5" />
              
              {/* Labels */}
              <text x="31" y="140" fontSize="9" fill="#52525b" textAnchor="middle">12 PM</text>
              <text x="121" y="140" fontSize="9" fill="#52525b" textAnchor="middle">2 PM</text>
              <text x="211" y="140" fontSize="9" fill="#52525b" textAnchor="middle">6 PM</text>
              <text x="301" y="140" fontSize="9" fill="#52525b" textAnchor="middle">8 PM</text>
            </svg>
          </div>

          {/* Table Turnover Line Chart */}
          <div className="p-6 rounded-[28px] bg-[#121214]/65 border border-white/5 shadow-2xl flex flex-col gap-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Table Seating Turnovers (Mins)</span>

            <svg className="w-full h-48 text-[#C5A880] mt-2" viewBox="0 0 400 150">
              <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" />
              
              {/* Line path */}
              <path
                d="M 20,80 L 80,60 L 140,90 L 200,45 L 260,35 L 320,55 L 380,30"
                fill="none"
                stroke="#C5A880"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              
              {/* Line Glow circles */}
              <circle cx="20" cy="80" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />
              <circle cx="80" cy="60" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />
              <circle cx="140" cy="90" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />
              <circle cx="200" cy="45" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />
              <circle cx="260" cy="35" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />
              <circle cx="320" cy="55" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />
              <circle cx="380" cy="30" r="4" fill="#09090B" stroke="#C5A880" strokeWidth="2" />

              {/* Labels */}
              <text x="20" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Mon</text>
              <text x="80" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Tue</text>
              <text x="140" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Wed</text>
              <text x="200" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Thu</text>
              <text x="260" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Fri</text>
              <text x="320" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Sat</text>
              <text x="380" y="140" fontSize="9" fill="#52525b" textAnchor="middle">Sun</text>
            </svg>
          </div>
        </section>

        {/* Row 3: Items Popularity Log */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Top Selling */}
          <div className="p-6 rounded-[28px] bg-[#121214] border border-white/5 shadow-xl flex flex-col gap-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Top Selling Catalog Items</span>
            
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">1. Chicken Dum Biryani</span>
                <span className="text-[#C5A880] font-bold">142 orders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">2. Mutton Dum Biryani</span>
                <span className="text-[#C5A880] font-bold">96 orders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">3. Apollo Fish</span>
                <span className="text-[#C5A880] font-bold">78 orders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">4. Tandoori Chicken</span>
                <span className="text-[#C5A880] font-bold">64 orders</span>
              </div>
            </div>
          </div>

          {/* Least Selling */}
          <div className="p-6 rounded-[28px] bg-[#121214] border border-white/5 shadow-xl flex flex-col gap-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Least Selling Catalog Items</span>
            
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">1. Veg Spring Rolls</span>
                <span className="text-zinc-500">4 orders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">2. Green Salad</span>
                <span className="text-zinc-500">6 orders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">3. Sweet Corn Veg Soup</span>
                <span className="text-zinc-500">9 orders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">4. Hot & Sour Chicken Soup</span>
                <span className="text-zinc-500">11 orders</span>
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
