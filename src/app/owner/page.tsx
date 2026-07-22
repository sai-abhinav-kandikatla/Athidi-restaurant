"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRestaurantStore, Table, Order } from "@/lib/store/useRestaurantStore";
import { 
  Crown, IndianRupee, ShoppingBag, Users, Bell, 
  MapPin, Clock, X, Search, ChevronRight,
  TrendingUp, Star, Laptop, Settings, Move, Check
} from "lucide-react";
import Link from "next/link";

export default function OwnerDashboard() {
  const { 
    tables, 
    orders, 
    serviceRequests, 
    setTableStatus,
    clearTable,
    updateTablePosition
  } = useRestaurantStore();

  const [activeSection, setActiveSection] = useState<Table["section"]>("Main Hall");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  // Draggable Table States
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [draggedTable, setDraggedTable] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener for Ctrl+K command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter tables in active section
  const sectionTables = tables.filter((t) => t.section === activeSection);

  // Statistics calculations
  const todaysRevenue = orders
    .filter((o) => o.status === "Completed")
    .reduce((sum, o) => sum + o.totalAmount, 0) + 12450; // Seed offset for demo

  const activeOrdersCount = orders.filter((o) => o.status !== "Completed" && o.status !== "Cancelled").length;
  const occupiedTablesCount = tables.filter((t) => t.status !== "AVAILABLE" && t.status !== "CLEANING").length;
  const pendingRequestsCount = serviceRequests.filter((r) => r.status === "pending").length;

  const currentOrderForTable = (tableNum: number) => {
    return orders.find(
      (o) => o.tableNumber === tableNum && o.status !== "Completed" && o.status !== "Cancelled"
    );
  };

  const getTableStateColor = (status: Table["status"]) => {
    switch (status) {
      case "AVAILABLE": return "border-green-500/30 bg-green-500/5 text-green-400";
      case "BROWSING": return "border-blue-400/30 bg-blue-400/5 text-blue-300";
      case "ORDERING": return "border-cyan-400/30 bg-cyan-400/5 text-cyan-300";
      case "ORDER_PLACED": return "border-amber-500/30 bg-amber-500/5 text-amber-400 animate-pulse";
      case "PREPARING": return "border-yellow-400/30 bg-yellow-400/5 text-yellow-300 animate-pulse";
      case "READY": return "border-purple-400/30 bg-purple-400/5 text-purple-300";
      case "SERVING": return "border-fuchsia-400/30 bg-fuchsia-400/5 text-fuchsia-300 animate-pulse";
      case "DINING": return "border-indigo-400/30 bg-indigo-400/5 text-indigo-300";
      case "BILL_REQUESTED": return "border-red-500/40 bg-red-500/10 text-red-400 animate-pulse";
      case "COMPLETED": return "border-gray-400/30 bg-gray-400/5 text-gray-300";
      case "CLEANING": return "border-zinc-600/30 bg-zinc-800/10 text-zinc-500";
      default: return "border-zinc-800 bg-transparent text-zinc-400";
    }
  };

  const handleCommandPaletteAction = (action: () => void) => {
    action();
    setShowCommandPalette(false);
  };

  // Predefined quick command actions
  const quickCommands = [
    { name: "Clear Table 2", action: () => clearTable(2) },
    { name: "Force Clean Table 9", action: () => setTableStatus(9, "CLEANING") },
    { name: "Set Table 8 Browsing", action: () => setTableStatus(8, "BROWSING") },
    { name: "Switch to AC Family Room", action: () => setActiveSection("AC") }
  ];

  // Dragging event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, tableNum: number, currentX: number, currentY: number) => {
    if (!isDesignMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedTable(tableNum);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, tableNum: number) => {
    if (!isDesignMode || draggedTable !== tableNum || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    let x = e.clientX - containerRect.left - dragOffset.x;
    let y = e.clientY - containerRect.top - dragOffset.y;
    
    // Constrain within map bounds
    x = Math.max(10, Math.min(x, containerRect.width - 150)); // card width ~135px
    y = Math.max(10, Math.min(y, containerRect.height - 120)); // card height ~100px
    
    updateTablePosition(tableNum, Math.round(x), Math.round(y));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedTable !== null) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggedTable(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans pb-12 select-none">
      
      {/* 🚀 Sleek staff navigation bar */}
      <nav className="border-b border-white/5 bg-[#121214]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-lg">
            <Crown className="w-4.5 h-4.5 text-[#C5A880]" />
          </div>
          <div>
            <span className="font-serif font-bold text-white tracking-wider block text-sm">ATHIDI</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest block -mt-0.5">Live Command Center</span>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 gap-1">
          <Link href="/owner" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#C5A880] text-black transition-all">Owner</Link>
          <Link href="/kitchen" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Kitchen</Link>
          <Link href="/waiter" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Waiter</Link>
          <Link href="/checkout" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Checkout</Link>
        </div>

        <button 
          onClick={() => setShowCommandPalette(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Press Ctrl+K</span>
        </button>
      </nav>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Row 1: KPI Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Revenue Today</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">₹{todaysRevenue.toLocaleString()}</h2>
              <span className="text-[9px] text-green-400 flex items-center gap-0.5 mt-1 font-medium">
                <TrendingUp className="w-3 h-3" /> +14% since yesterday
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/15 text-[#C5A880]">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          {/* Orders */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Active Orders</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">{activeOrdersCount}</h2>
              <p className="text-[9px] text-gray-500 mt-2 font-medium">Total orders today: {orders.length + 24}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/15 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* Tables Occupied */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Tables Occupied</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">{occupiedTablesCount} / 20</h2>
              <p className="text-[9px] text-gray-500 mt-2 font-medium">Occupancy: {Math.round((occupiedTablesCount / 20) * 100)}%</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/15 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Pending Requests */}
          <div className="p-5 rounded-[24px] bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Service Calls</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1">{pendingRequestsCount}</h2>
              {pendingRequestsCount > 0 ? (
                <span className="text-[9px] text-red-400 flex items-center gap-1 mt-1 font-semibold animate-pulse">
                  ⚠️ Action required
                </span>
              ) : (
                <p className="text-[9px] text-green-400 mt-2 font-medium">All clear</p>
              )}
            </div>
            <div className={`p-3 rounded-2xl border transition-colors ${pendingRequestsCount > 0 ? "bg-red-500/10 border-red-500/15 text-red-400 animate-pulse" : "bg-zinc-800/40 border-white/5 text-zinc-400"}`}>
              <Bell className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Row 2: Live Room Layout & Live Table Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Layout Map (Left/Center 2 Cols) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C5A880]" /> Draggable Floor Planner
              </h3>

              {/* Design Mode Toggle & Tabs */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsDesignMode(!isDesignMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isDesignMode
                      ? "bg-[#C5A880] text-black border-[#C5A880]"
                      : "bg-white/5 text-gray-400 hover:text-white border-white/5"
                  }`}
                >
                  {isDesignMode ? <Check className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5 animate-pulse" />}
                  <span>{isDesignMode ? "Lock Layout" : "Edit Floor"}</span>
                </button>

                <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-0.5">
                  {(["Main Hall", "VIP", "Outdoor", "AC"] as Table["section"][]).map((sect) => (
                    <button
                      key={sect}
                      onClick={() => setActiveSection(sect)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeSection === sect
                          ? "bg-[#C5A880] text-black shadow-md"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {sect}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Draggable Floor Workspace */}
            <div 
              ref={containerRef}
              className="relative p-6 rounded-[28px] bg-[#121214]/65 backdrop-blur-md border border-white/5 h-[400px] shadow-2xl overflow-hidden"
            >
              {isDesignMode && (
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
              )}
              
              {sectionTables.map((table) => {
                const activeOrder = currentOrderForTable(table.number);
                const isSelected = selectedTable?.number === table.number;
                
                return (
                  <div
                    key={table.number}
                    onPointerDown={(e) => handlePointerDown(e, table.number, table.x, table.y)}
                    onPointerMove={(e) => handlePointerMove(e, table.number)}
                    onPointerUp={handlePointerUp}
                    onClick={() => !isDesignMode && setSelectedTable(table)}
                    style={{
                      position: "absolute",
                      left: `${table.x}px`,
                      top: `${table.y}px`,
                      width: "135px",
                      touchAction: "none"
                    }}
                    className={`p-4 rounded-2xl border flex flex-col justify-between min-h-[100px] transition-all select-none duration-150 ${
                      isDesignMode ? "cursor-move border-[#C5A880]/40 bg-[#C5A880]/5" : "cursor-pointer hover:scale-[1.03]"
                    } ${getTableStateColor(table.status)} ${
                      isSelected ? "ring-2 ring-[#C5A880] ring-offset-2 ring-offset-[#09090B]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm">T-{table.number}</span>
                      <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-black/30 border border-white/5">
                        {table.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-3">
                      {table.status !== "AVAILABLE" && table.status !== "CLEANING" && (
                        <>
                          <div className="flex items-center justify-between text-[8px] font-semibold text-gray-300">
                            <span>Total:</span>
                            <span>₹{table.currentBill || activeOrder?.totalAmount || 0}</span>
                          </div>
                        </>
                      )}
                      {table.status === "AVAILABLE" && (
                        <span className="text-[8px] text-green-400 font-semibold uppercase tracking-wider block text-center">Available</span>
                      )}
                      {table.status === "CLEANING" && (
                        <span className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider block text-center animate-pulse">Sanitizing</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room Map Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] font-semibold uppercase tracking-wider bg-black/25 p-3.5 rounded-full border border-white/5">
              <span className="flex items-center gap-1.5 text-green-400"><span className="w-2 h-2 bg-green-500/20 border border-green-500/40 rounded-full" /> Available</span>
              <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 bg-blue-500/20 border border-blue-500/40 rounded-full" /> Browsing</span>
              <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 bg-amber-500/20 border border-amber-500/40 rounded-full" /> Ordered</span>
              <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2 h-2 bg-yellow-500/20 border border-yellow-500/40 rounded-full" /> Preparing</span>
              <span className="flex items-center gap-1.5 text-purple-400"><span className="w-2 h-2 bg-purple-500/20 border border-purple-500/40 rounded-full" /> Ready</span>
              <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2 h-2 bg-indigo-500/20 border border-indigo-500/40 rounded-full" /> Dining</span>
              <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 bg-red-500/20 border border-red-500/40 rounded-full" /> Call Alert</span>
            </div>
          </div>

          {/* Quick Analytics Sidebar (Right 1 Col) */}
          <div className="flex flex-col gap-6">
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C5A880]" /> Analytics Today
            </h3>

            {/* Custom SVG Charts */}
            <div className="p-6 rounded-[28px] bg-[#121214] border border-white/5 flex flex-col gap-6 shadow-xl">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-3">Hourly Sales (₹)</span>
                {/* SVG Bar Chart */}
                <svg className="w-full h-32 text-[#C5A880]" viewBox="0 0 300 120">
                  <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" />
                  
                  <rect x="15" y="60" width="18" height="40" rx="3" fill="#C5A880" opacity="0.3" />
                  <rect x="50" y="40" width="18" height="60" rx="3" fill="#C5A880" opacity="0.5" />
                  <rect x="85" y="30" width="18" height="70" rx="3" fill="#C5A880" opacity="0.6" />
                  <rect x="120" y="80" width="18" height="20" rx="3" fill="#C5A880" opacity="0.4" />
                  <rect x="155" y="20" width="18" height="80" rx="3" fill="#C5A880" opacity="0.8" />
                  <rect x="190" y="10" width="18" height="90" rx="3" fill="#C5A880" />
                  <rect x="225" y="25" width="18" height="75" rx="3" fill="#C5A880" opacity="0.7" />
                  <rect x="260" y="45" width="18" height="55" rx="3" fill="#C5A880" opacity="0.5" />
                  
                  <text x="15" y="115" fontSize="8" fill="#52525b" textAnchor="middle" transform="translate(9,0)">12 PM</text>
                  <text x="85" y="115" fontSize="8" fill="#52525b" textAnchor="middle" transform="translate(9,0)">2 PM</text>
                  <text x="155" y="115" fontSize="8" fill="#52525b" textAnchor="middle" transform="translate(9,0)">6 PM</text>
                  <text x="225" y="115" fontSize="8" fill="#52525b" textAnchor="middle" transform="translate(9,0)">8 PM</text>
                </svg>
              </div>

              <div className="h-px bg-white/5" />

              {/* Popular items progress indicators */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Most Popular Dishes</span>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-200">
                    <span>Chicken Dum Biryani</span>
                    <span className="text-[#C5A880]">42 ordered</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C5A880] rounded-full" style={{ width: "85%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-200">
                    <span>Mutton Dum Biryani</span>
                    <span className="text-[#C5A880]">28 ordered</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C5A880]/80 rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-200">
                    <span>Apollo Fish</span>
                    <span className="text-[#C5A880]">19 ordered</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C5A880]/60 rounded-full" style={{ width: "45%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Slide-out table information side panel */}
      {selectedTable && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div 
            onClick={() => setSelectedTable(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <div className="relative w-full max-w-md bg-[#0F0F0B] border-l border-white/5 h-full shadow-2xl flex flex-col p-6 z-10">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xl font-serif font-bold text-[#C5A880]">Table {selectedTable.number}</span>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-white/5 px-2 py-0.5 rounded-full text-gray-300">
                  {selectedTable.section}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6">
              {/* Table Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Table State</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{selectedTable.status.replace("_", " ")}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Elapsed Session</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#C5A880]" /> {selectedTable.elapsedMinutes} mins
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Guest Count</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{selectedTable.guestCount || "N/A"} guests</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Assigned Waiter</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{selectedTable.assignedWaiter || "Not Assigned"}</span>
                </div>
              </div>

              {/* Active Table Order */}
              {(() => {
                const activeOrder = currentOrderForTable(selectedTable.number);
                if (!activeOrder) {
                  return (
                    <div className="py-8 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
                      <ShoppingBag className="w-8 h-8 text-zinc-700" />
                      <span>No active orders on this table.</span>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Current Order Items</h4>
                      <span className="text-xs font-serif font-bold text-[#C5A880]">{activeOrder.id}</span>
                    </div>
                    
                    {/* Items List */}
                    <div className="flex flex-col gap-2">
                      {activeOrder.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-white">{item.name}</span>
                            {item.spiceLevel && (
                              <span className="text-[8px] bg-[#C5A880]/15 text-[#C5A880] px-1 py-0.5 rounded-full font-bold ml-1.5 uppercase">
                                {item.spiceLevel}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400">{item.quantity}x</span>
                        </div>
                      ))}
                    </div>

                    {/* Timeline */}
                    <div className="flex flex-col gap-2 mt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Timeline</h4>
                      <div className="flex flex-col border-l border-white/10 pl-4 py-2 gap-4">
                        {activeOrder.timeline.map((step, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#C5A880] shadow-[0_0_8px_rgba(197,168,128,0.5)]" />
                            <div className="flex items-center justify-between text-xs font-medium text-gray-200">
                              <span>Order {step.status}</span>
                              <span className="text-[10px] text-gray-500">{step.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions Footer */}
            {selectedTable.status !== "AVAILABLE" && (
              <div className="pt-4 border-t border-white/5 flex gap-3 mt-auto">
                <button
                  onClick={() => {
                    clearTable(selectedTable.number);
                    setSelectedTable(null);
                  }}
                  className="flex-1 bg-white/5 border border-white/5 text-red-400 hover:bg-red-500/5 hover:border-red-500/30 transition-all font-semibold py-3.5 rounded-full text-xs uppercase tracking-wider text-center cursor-pointer"
                >
                  Clear Table
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Cmd+K Command Palette Overlay */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowCommandPalette(false)} />
          
          <div className="relative w-full max-w-lg bg-[#0F0F0B] border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search quick command actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-gray-500 focus:ring-0"
                autoFocus
              />
              <button 
                onClick={() => setShowCommandPalette(false)}
                className="p-1 rounded-full bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-72 overflow-y-auto flex flex-col gap-1">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-3 py-1">Quick Action Commands</span>
              {quickCommands
                .filter((cmd) => cmd.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCommandPaletteAction(cmd.action)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs text-gray-200 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{cmd.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
