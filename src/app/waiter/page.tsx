"use client";

import React, { useEffect, useRef } from "react";
import { useRestaurantStore, ServiceRequest } from "@/lib/store/useRestaurantStore";
import { 
  Bell, Droplet, UserCheck, Receipt, Utensils, Scroll,
  Check, AlertOctagon, HelpCircle, Laptop
} from "lucide-react";
import Link from "next/link";

export default function WaiterPanel() {
  const { 
    serviceRequests, 
    resolveServiceRequest 
  } = useRestaurantStore();

  const pendingRequests = serviceRequests.filter((r) => r.status === "pending");
  const prevLengthRef = useRef(pendingRequests.length);

  // Audio synthesizer chime using native Web Audio API
  const playAlertChime = (priority: ServiceRequest["priority"]) => {
    if (typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      let freq1 = 440; // A4
      let freq2 = 880; // A5
      let duration = 0.3;
      
      if (priority === "critical") {
        freq1 = 523.25; // C5
        freq2 = 659.25; // E5
        duration = 0.5; // Longer, urgent tone
      } else if (priority === "high") {
        freq1 = 440;
        freq2 = 554.37; // C#5
        duration = 0.4;
      } else {
        freq1 = 587.33; // D5
        freq2 = 880; // A5
        duration = 0.2; // Short soft chime
      }

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq1, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq2, audioCtx.currentTime + duration);
      
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.error("Failed to synthesise audio chime:", err);
    }
  };

  // Trigger synthesized audio alarm when new request appears
  useEffect(() => {
    if (pendingRequests.length > prevLengthRef.current) {
      const newest = pendingRequests[0];
      if (newest) {
        playAlertChime(newest.priority);
      }
    }
    prevLengthRef.current = pendingRequests.length;
  }, [pendingRequests]);

  const getRequestIcon = (type: ServiceRequest["type"]) => {
    switch (type) {
      case "waiter": return <UserCheck className="w-5 h-5 text-amber-400" />;
      case "water": return <Droplet className="w-5 h-5 text-blue-400" />;
      case "bill": return <Receipt className="w-5 h-5 text-green-400" />;
      case "spoon": return <Utensils className="w-5 h-5 text-yellow-500" />;
      case "tissue": return <Scroll className="w-5 h-5 text-pink-400" />;
      default: return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: ServiceRequest["priority"]) => {
    switch (priority) {
      case "critical": return "border-red-500/30 bg-red-500/10 text-red-400 font-bold animate-pulse";
      case "high": return "border-amber-500/20 bg-amber-500/10 text-amber-400";
      case "medium": return "border-yellow-400/20 bg-yellow-400/10 text-yellow-400";
      case "low": return "border-zinc-800 bg-zinc-800 text-zinc-400";
      default: return "border-zinc-800 bg-transparent text-zinc-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans pb-12 select-none">
      
      {/* Staff navigation bar */}
      <nav className="border-b border-white/5 bg-[#121214]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-lg">
            <Bell className="w-4.5 h-4.5 text-[#C5A880] animate-bounce" />
          </div>
          <div>
            <span className="font-serif font-bold text-white tracking-wider block text-sm">ATHIDI WAITER</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest block -mt-0.5">Live Service Requests</span>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 gap-1">
          <Link href="/owner" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Owner</Link>
          <Link href="/kitchen" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Kitchen</Link>
          <Link href="/waiter" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#C5A880] text-black transition-all">Waiter</Link>
          <Link href="/cashier" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Cashier</Link>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-gray-400">
          <span>Active Alerts:</span>
          <span className="font-bold text-[#C5A880]">{pendingRequests.length}</span>
        </div>
      </nav>

      {/* Requests List */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-[#C5A880] animate-pulse" /> Live Request Queue
          </h3>
          {pendingRequests.length > 0 && (
            <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" /> Action Required
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {pendingRequests.length === 0 ? (
            <div className="py-24 rounded-3xl bg-[#121214]/65 border border-white/5 flex flex-col items-center justify-center text-center p-6 gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-green-400">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200">All service requests resolved</h4>
                <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                  Nice job! Customer calls will automatically chime and pop up here in real-time.
                </p>
              </div>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div 
                key={req.id}
                className={`p-5 rounded-[22px] bg-[#121214] border border-white/5 flex items-center justify-between gap-6 shadow-xl transition-all hover:border-white/10 ${
                  req.priority === "critical" ? "border-red-500/20 bg-red-500/2" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Icon bubble */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 shadow-md">
                    {getRequestIcon(req.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Table {req.tableNumber} requests {req.type.toUpperCase()}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadge(req.priority)}`}>
                        {req.priority}
                      </span>
                      <span className="text-zinc-500 text-[10px]">{req.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.type === "bill" && (
                    <Link
                      href={`/checkout?table=${req.tableNumber}`}
                      onClick={() => resolveServiceRequest(req.id)}
                      className="px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-black transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" /> Print Bill
                    </Link>
                  )}
                  <button
                    onClick={() => resolveServiceRequest(req.id)}
                    className="px-4 py-2.5 rounded-full bg-white/5 border border-white/5 text-gray-200 hover:bg-[#C5A880] hover:text-black hover:border-transparent transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Resolve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
