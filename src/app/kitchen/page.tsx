"use client";

import React, { useEffect, useState } from "react";
import { useRestaurantStore, Order } from "@/lib/store/useRestaurantStore";
import { MENU_ITEMS } from "@/data/mockData";
import { 
  Flame, Clock, CheckCircle2, Play, Check, 
  ChefHat, AlertTriangle, Sparkles, Laptop
} from "lucide-react";
import Link from "next/link";

// Mapping category slugs to physical kitchen stations
const categoryToStationMap: { [key: string]: string } = {
  "signature-starters": "Grill",
  "veg-starters": "Grill",
  "non-veg-starters": "Grill",
  "tandoor-kebabs": "Tandoor",
  "hyderabadi-biryani": "Biryani",
  "mandi": "Biryani",
  "chicken-curries": "Grill",
  "mutton-curries": "Grill",
  "seafood": "Grill",
  "veg-curries": "Grill",
  "indian-breads": "Tandoor",
  "rice-fried-rice": "Biryani",
  "noodles": "Grill",
  "soups": "Grill",
  "salads": "Grill",
  "desserts": "Desserts",
  "beverages": "Beverages",
  "chef-specials": "Biryani"
};

const getStationForItem = (itemName: string): string => {
  const item = MENU_ITEMS.find((m) => m.name === itemName);
  if (!item) return "Grill";
  return categoryToStationMap[item.category] || "Grill";
};

export default function KitchenTerminal() {
  const { 
    orders, 
    updateOrderStatus, 
    assignChef,
    tickPrepTimers 
  } = useRestaurantStore();

  const [activeStation, setActiveStation] = useState<string>("All");

  // Run ticking timer for preparing/new orders every second
  useEffect(() => {
    const timer = setInterval(() => {
      tickPrepTimers();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickPrepTimers]);

  const getOrderStation = (order: Order): string => {
    if (order.items.length === 0) return "Grill";
    return getStationForItem(order.items[0].name);
  };

  // Filter orders by station tab selection
  const filterByStation = (orderList: Order[]) => {
    if (activeStation === "All") return orderList;
    return orderList.filter((o) => 
      o.items.some((it) => getStationForItem(it.name) === activeStation)
    );
  };

  // Filter orders by status columns and then by station
  const newOrders = filterByStation(orders.filter((o) => o.status === "Received"));
  const preparingOrders = filterByStation(orders.filter((o) => o.status === "Preparing"));
  const readyOrders = filterByStation(orders.filter((o) => o.status === "Ready"));

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const getPriority = (order: Order) => {
    const elapsedMinutes = Math.floor(order.elapsedSeconds / 60);
    if (elapsedMinutes >= order.expectedMinutes) {
      return { label: "🔥 Delayed", color: "bg-red-500/10 border-red-500/30 text-red-400 font-bold" };
    }
    if (order.specialInstructions && order.specialInstructions.length > 0) {
      return { label: "🟠 High", color: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
    }
    return { label: "🔵 Normal", color: "bg-zinc-800 border-white/5 text-zinc-400" };
  };

  const chefs = ["Abdul", "Vikram", "Shyam", "Chef Ali"];
  const stationsList = ["All", "Biryani", "Grill", "Tandoor", "Desserts", "Beverages"];

  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans pb-12 select-none">
      
      {/* Staff navigation bar */}
      <nav className="border-b border-white/5 bg-[#121214]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-lg">
            <ChefHat className="w-4.5 h-4.5 text-[#C5A880]" />
          </div>
          <div>
            <span className="font-serif font-bold text-white tracking-wider block text-sm">ATHIDI KITCHEN</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest block -mt-0.5">Live Station Monitor</span>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 gap-1">
          <Link href="/owner" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Owner</Link>
          <Link href="/kitchen" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#C5A880] text-black transition-all">Kitchen</Link>
          <Link href="/waiter" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Waiter</Link>
          <Link href="/checkout" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Checkout</Link>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-green-400 font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
          Live Connected
        </div>
      </nav>

      {/* Kanban Board Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <Flame className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> Active Prep Queues
          </h3>

          {/* Kitchen Station Tab Filter */}
          <div className="flex bg-black/40 border border-white/5 rounded-full p-0.5 overflow-x-auto no-scrollbar">
            {stationsList.map((station) => (
              <button
                key={station}
                onClick={() => setActiveStation(station)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeStation === station
                    ? "bg-[#C5A880] text-black shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {station} {station !== "All" && `(${filterByStation(orders).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban Columns */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
          
          {/* Column 1: NEW ORDERS */}
          <div className="flex flex-col gap-4 rounded-3xl bg-[#121214]/65 border border-white/5 p-4 min-h-[500px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">New Orders</h4>
              </div>
              <span className="text-[10px] font-bold bg-white/5 px-2.5 py-0.5 rounded-full text-gray-400">
                {newOrders.length}
              </span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] no-scrollbar">
              {newOrders.length === 0 ? (
                <div className="py-20 text-center text-zinc-600 text-xs italic">Awaiting new orders...</div>
              ) : (
                newOrders.map((order) => {
                  const priority = getPriority(order);
                  const orderStation = getOrderStation(order);
                  return (
                    <div key={order.id} className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-[#C5A880]/30 transition-all flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-serif font-bold text-[#C5A880]">Table {order.tableNumber}</span>
                          <span className="text-[9px] text-zinc-500 block">ID: {order.id} • Station: {orderStation}</span>
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-200">
                            <span>
                              {it.name}
                              {it.spiceLevel && (
                                <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/10 px-1 py-0.5 rounded ml-1 font-bold">
                                  {it.spiceLevel}
                                </span>
                              )}
                            </span>
                            <span className="font-bold">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {order.specialInstructions && (
                        <div className="p-2 rounded-xl bg-white/5 text-[10px] text-gray-400 italic">
                          💡 Notes: {order.specialInstructions}
                        </div>
                      )}

                      <button
                        onClick={() => updateOrderStatus(order.id, "Preparing")}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-black" /> Accept Order
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: PREPARING */}
          <div className="flex flex-col gap-4 rounded-3xl bg-[#121214]/65 border border-white/5 p-4 min-h-[500px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Preparing</h4>
              </div>
              <span className="text-[10px] font-bold bg-white/5 px-2.5 py-0.5 rounded-full text-gray-400">
                {preparingOrders.length}
              </span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] no-scrollbar">
              {preparingOrders.length === 0 ? (
                <div className="py-20 text-center text-zinc-600 text-xs italic">No items cooking...</div>
              ) : (
                preparingOrders.map((order) => {
                  const priority = getPriority(order);
                  const isDelayed = Math.floor(order.elapsedSeconds / 60) >= order.expectedMinutes;
                  const orderStation = getOrderStation(order);
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`p-5 rounded-2xl bg-black/40 border transition-all flex flex-col gap-4 ${
                        isDelayed ? "border-red-500/40 bg-red-500/2" : "border-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-serif font-bold text-white">Table {order.tableNumber}</span>
                          <span className="text-[9px] text-zinc-500 block">ID: {order.id} • Station: {orderStation}</span>
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>

                      {/* Ticking timers */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between border border-white/5">
                          <span className="text-gray-400">Elapsed:</span>
                          <span className={`font-bold flex items-center gap-1 ${isDelayed ? "text-red-400" : "text-white"}`}>
                            <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
                            {formatTimer(order.elapsedSeconds)}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between border border-white/5">
                          <span className="text-gray-400">Target:</span>
                          <span className="font-semibold text-gray-200">{order.expectedMinutes}m</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-1.5 border-t border-b border-white/5 py-3">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-200">
                            <span>
                              {it.name}
                              {it.spiceLevel && (
                                <span className="text-[8px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded ml-1 font-bold">
                                  {it.spiceLevel}
                                </span>
                              )}
                            </span>
                            <span className="font-bold">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Chef Assignment */}
                      <div className="flex items-center justify-between text-xs gap-3">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Assign Chef:</span>
                        <select
                          value={order.chefName || ""}
                          onChange={(e) => assignChef(order.id, e.target.value)}
                          className="bg-[#121214] border border-white/5 text-gray-200 text-[10px] rounded-lg px-2 py-1 outline-none"
                        >
                          <option value="">Unassigned</option>
                          {chefs.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id, "Ready")}
                        className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Ready
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3: READY / COMPLETED */}
          <div className="flex flex-col gap-4 rounded-3xl bg-[#121214]/65 border border-white/5 p-4 min-h-[500px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Ready</h4>
              </div>
              <span className="text-[10px] font-bold bg-white/5 px-2.5 py-0.5 rounded-full text-gray-400">
                {readyOrders.length}
              </span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] no-scrollbar">
              {readyOrders.length === 0 ? (
                <div className="py-20 text-center text-zinc-600 text-xs italic">Awaiting completed dishes...</div>
              ) : (
                readyOrders.map((order) => {
                  return (
                    <div key={order.id} className="p-5 rounded-2xl bg-black/40 border border-green-500/10 hover:border-green-500/25 transition-all flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-serif font-bold text-green-400">Table {order.tableNumber}</span>
                          <span className="text-[9px] text-zinc-500 block">ID: {order.id} • Ready to Serve</span>
                        </div>
                        <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Ready
                        </span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-1.5 py-2">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-200">
                            <span>{it.name}</span>
                            <span className="font-bold">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id, "Served")}
                        className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-[#C5A880] hover:text-black text-gray-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Dispatch / Served
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
