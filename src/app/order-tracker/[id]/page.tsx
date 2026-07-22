"use client";

import React, { useState, useEffect } from "react";
import { TopHeader } from "@/components/TopHeader";
import { BottomNav } from "@/components/BottomNav";
import { SlidingCart } from "@/components/SlidingCart";
import { db } from "@/lib/supabaseFallback";
import { useParams, useRouter } from "next/navigation";
import { Clock, CheckCircle2, ChevronLeft, Bell, MessageSquare, Phone } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  totalAmount: number;
  specialInstructions: string;
  couponCode: string;
  status: string; // 'Received' | 'Preparing' | 'Ready' | 'Serving' | 'Delivered'
  createdAt: string;
  updatedAt: string;
}

export default function OrderTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const data = await db.getOrderById(orderId);
      if (data) {
        setOrder(data);
      }
    } catch (err) {
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Listen to simulated realtime order status updates
    const handleStatusUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.orderId === orderId) {
        fetchOrder();
      }
    };

    window.addEventListener("orderStatusUpdate", handleStatusUpdate);
    return () => {
      window.removeEventListener("orderStatusUpdate", handleStatusUpdate);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-[#C5A880] animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col items-center justify-center p-6 text-center gap-4">
        <h2 className="text-xl font-serif font-bold text-gray-300">Order not found</h2>
        <p className="text-xs text-gray-500 max-w-xs">
          We couldn't locate any active order with ID "{orderId}". Check your link or return to Menu.
        </p>
        <Link
          href="/menu"
          className="px-6 py-2.5 rounded-full bg-[#C5A880] text-black font-semibold text-xs uppercase tracking-wider"
        >
          Go to Menu
        </Link>
      </div>
    );
  }

  const statuses = ["Received", "Preparing", "Ready", "Serving", "Delivered"];
  const currentStep = statuses.indexOf(order.status);

  const statusDescriptions = {
    Received: "We have received your order. Handing it to the chef.",
    Preparing: "The chef is handcrafting your dishes with fresh spices.",
    Ready: "Your food is freshly plated and packed, leaving the kitchen counter.",
    Serving: "Staff is bringing the steaming platters to your table right now.",
    Delivered: "Dishes served. Enjoy your royal culinary feast!"
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-32">
      <TopHeader />

      <main className="py-8 px-6 max-w-lg mx-auto flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href="/menu"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>

        {/* Live Status Header Card */}
        <div className="glass-panel border border-[#C5A880]/15 rounded-[24px] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[#C5A880]/2 pointer-events-none" />
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                Live order status
              </span>
              <h2 className="text-lg font-serif font-bold text-[#C5A880] mt-1 uppercase tracking-wide">
                {order.status}
              </h2>
            </div>
            <span className="text-xs bg-white/5 border border-white/5 px-3 py-1 rounded-full font-bold text-gray-300">
              #{order.id}
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed font-light mt-3">
            {statusDescriptions[order.status as keyof typeof statusDescriptions]}
          </p>

          {/* Table Number */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-semibold">Table Location</span>
            <span className="text-[#C5A880] font-serif font-bold">
              Table {order.tableNumber}
            </span>
          </div>
        </div>

        {/* Live Process Tracker (Vertical timeline on mobile, extremely gorgeous) */}
        <div className="p-6 rounded-[24px] bg-[#181818]/65 border border-white/5 flex flex-col gap-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Kitchen Preparation Progress
          </h3>

          <div className="flex flex-col relative gap-6">
            {/* Connector Line */}
            <div className="absolute left-4 top-3 bottom-3 w-[2px] bg-white/5 z-0">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(currentStep / (statuses.length - 1)) * 100}%` }}
                transition={{ duration: 1 }}
                className="w-full bg-gradient-to-b from-[#C5A880] to-[#D4AF37]"
              />
            </div>

            {/* Stages */}
            {statuses.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isActive = idx === currentStep;
              const isPending = idx > currentStep;

              return (
                <div key={step} className="flex gap-4 items-start z-10">
                  {/* Step dot */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-[#C5A880] border border-[#C5A880]/40 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-4 h-4 text-black" />
                      </div>
                    ) : isActive ? (
                      <div className="w-8 h-8 rounded-full bg-black border-2 border-[#C5A880] flex items-center justify-center relative shadow-[0_0_15px_rgba(197,168,128,0.4)]">
                        <span className="w-2 h-2 bg-[#C5A880] rounded-full animate-ping" />
                        <span className="w-2 h-2 bg-[#C5A880] rounded-full absolute" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#181818] border border-white/5 flex items-center justify-center">
                        <span className="w-2 h-2 bg-gray-700 rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Stage detail */}
                  <div className="flex flex-col mt-0.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isActive
                          ? "text-[#C5A880] font-serif"
                          : isCompleted
                          ? "text-gray-300 font-medium"
                          : "text-gray-600 font-medium"
                      }`}
                    >
                      {step}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                        Currently processing...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details Accordion */}
        <div className="p-6 rounded-[24px] bg-[#181818]/65 border border-white/5 flex flex-col gap-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Order Receipt Summary
          </h3>

          <div className="flex flex-col gap-3 text-xs">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-gray-300">
                <span className="font-medium">
                  {item.quantity}x <span className="text-white">{item.name}</span>
                </span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            
            <div className="h-px bg-white/5 my-1" />
            
            <div className="flex justify-between font-serif font-bold text-sm text-white">
              <span>Grand Total</span>
              <span className="text-[#C5A880]">₹{order.totalAmount.toFixed(2)}</span>
            </div>
            
            {order.specialInstructions && (
              <div className="mt-2 p-3 bg-black/30 border border-white/5 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">
                  Cooking instruction
                </span>
                <p className="text-xs text-gray-300 mt-1 italic">
                  "{order.specialInstructions}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Table/Waiter Help CTAs */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                // Dispatch event to open service requests immediately
                const srvBtn = document.querySelector('[class*="text-[#C5A880] animate-pulse"]');
                if (srvBtn) (srvBtn as HTMLButtonElement).click();
              }
            }}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-full bg-[#181818] border border-white/5 text-[#C5A880] hover:bg-[#C5A880] hover:text-black transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            Need Waiter at Table {order.tableNumber}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:+919876543210"
              className="flex items-center justify-center gap-2 p-3 rounded-full bg-[#181818] border border-white/5 text-gray-300 hover:text-white transition-all text-xs cursor-pointer"
            >
              <Phone className="w-4 h-4 text-gray-400" />
              <span>Call Desk</span>
            </a>
            <a
              href={`https://wa.me/919876543210?text=I%20am%20at%20Table%20${order.tableNumber}%20tracking%20order%20${order.id}.%20Please%20verify.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 rounded-full bg-[#181818] border border-white/5 text-gray-300 hover:text-green-400 transition-all text-xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-green-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      {/* Nav layout */}
      <BottomNav />
      <SlidingCart />
    </div>
  );
}
