"use client";

import React, { useEffect } from "react";
import { 
  Crown, Flame, Bell, Receipt, 
  Sparkles, BarChart3, Laptop, CheckCircle2,
  Users, ShoppingBag, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRestaurantStore } from "@/lib/store/useRestaurantStore";

export default function AdminPortal() {
  const router = useRouter();
  const { tables, orders, serviceRequests } = useRestaurantStore();

  const occupiedCount = tables.filter(t => t.status !== "AVAILABLE" && t.status !== "CLEANING").length;
  const pendingRequests = serviceRequests.filter(r => r.status === "pending").length;
  const preparingOrders = orders.filter(o => o.status === "Preparing" || o.status === "Received").length;

  const portals = [
    {
      key: "1",
      name: "Owner Dashboard",
      description: "Visual floor coordinator grid, table statuses, live seating charts, and details drawer.",
      href: "/owner",
      icon: <Crown className="w-5 h-5 text-[#C5A880]" />,
      badge: "Command Center",
      color: "border-[#C5A880]/15 hover:border-[#C5A880]/40 hover:shadow-[0_0_20px_rgba(197,168,128,0.08)] bg-gradient-to-br from-[#121214] to-[#121214]/40"
    },
    {
      key: "2",
      name: "Kitchen Terminal",
      description: "Station filter queues (Biryani, Grill, Tandoor), chef assignment, and prep delay clocks.",
      href: "/kitchen",
      icon: <Flame className="w-5 h-5 text-amber-500" />,
      badge: "Live Cook stations",
      color: "border-amber-500/10 hover:border-amber-500/35 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] bg-gradient-to-br from-[#121214] to-[#121214]/40"
    },
    {
      key: "3",
      name: "Waiter Panel",
      description: "Service call logs (Water, Spoon, Bill) with native Audio Synthesis priority chime alarms.",
      href: "/waiter",
      icon: <Bell className="w-5 h-5 text-blue-400" />,
      badge: "Staff dispatcher",
      color: "border-blue-500/10 hover:border-blue-500/35 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)] bg-gradient-to-br from-[#121214] to-[#121214]/40"
    },
    {
      key: "4",
      name: "Checkout POS Terminal",
      description: "Cashier bill details, equal split check calculator, and printable GST tax invoice receipts.",
      href: "/checkout",
      icon: <Receipt className="w-5 h-5 text-green-400" />,
      badge: "POS Cashier",
      color: "border-green-500/10 hover:border-green-500/35 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] bg-gradient-to-br from-[#121214] to-[#121214]/40"
    },
    {
      key: "5",
      name: "Menu Catalog Editor",
      description: "CRUD active availability toggles, price settings, and kitchen preparation time settings.",
      href: "/menu-management",
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      badge: "CRUD Catalog",
      color: "border-purple-500/10 hover:border-purple-500/35 hover:shadow-[0_0_20px_rgba(168,85,247,0.06)] bg-gradient-to-br from-[#121214] to-[#121214]/40"
    },
    {
      key: "6",
      name: "Performance Analytics",
      description: "Hourly sales trend lines, turnovers, response times, and best/least ordered dishes.",
      href: "/analytics",
      icon: <BarChart3 className="w-5 h-5 text-pink-400" />,
      badge: "Business Intelligence",
      color: "border-pink-500/10 hover:border-pink-500/35 hover:shadow-[0_0_20px_rgba(236,72,153,0.06)] bg-gradient-to-br from-[#121214] to-[#121214]/40"
    }
  ];

  // Hotkey keyboard navigation listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Avoid firing hotkeys when typing in input/select
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") {
        return;
      }
      const portal = portals.find(p => p.key === e.key);
      if (portal) {
        router.push(portal.href);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans select-none justify-center py-16 px-6 relative overflow-hidden">
      
      {/* Premium background gradient maps */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.03)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-10 z-10">
        
        {/* Top Header */}
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-[0_0_20px_rgba(197,168,128,0.2)]">
            <Crown className="w-7 h-7 text-[#C5A880]" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-black tracking-wider text-white">ATHIDI OPERATING SYSTEM</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 flex items-center justify-center gap-2 font-bold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              Unified Operating System Portal
            </p>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-[22px] bg-[#121214]/40 border border-white/5 backdrop-blur-md">
          <div className="text-center flex flex-col items-center gap-1 border-r border-white/5">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Tables Occupied
            </span>
            <span className="text-sm font-serif font-black text-white">{occupiedCount} / 20</span>
          </div>
          <div className="text-center flex flex-col items-center gap-1 border-r border-white/5">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-500" /> Cooking Load
            </span>
            <span className="text-sm font-serif font-black text-white">{preparingOrders} Active</span>
          </div>
          <div className="text-center flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-red-400" /> Waiter Calls
            </span>
            <span className={`text-sm font-serif font-black ${pendingRequests > 0 ? "text-red-400 animate-pulse" : "text-white"}`}>
              {pendingRequests} pending
            </span>
          </div>
        </div>

        {/* Portals Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((portal) => (
            <Link 
              key={portal.name}
              href={portal.href}
              className={`p-6 rounded-[26px] border bg-[#121214]/65 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] flex flex-col justify-between min-h-[170px] group shadow-xl ${portal.color}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                    {portal.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                      {portal.badge}
                    </span>
                    <span className="text-[9px] font-black border border-white/10 text-zinc-500 px-2 py-0.5 rounded bg-black/30 group-hover:border-[#C5A880]/30 group-hover:text-[#C5A880] transition-colors">
                      {portal.key}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-4 group-hover:text-white transition-colors">
                  {portal.name}
                </h3>
                <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed">
                  {portal.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-[10px] text-zinc-600 font-semibold pt-6 border-t border-white/5">
          <span>ATHIDI RESTAURANT OPERATING SYSTEM</span>
          <span className="flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5" /> Hotkeys [1 - 6] enabled
          </span>
        </div>
      </div>
    </div>
  );
}
