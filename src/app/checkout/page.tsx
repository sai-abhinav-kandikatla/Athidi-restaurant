"use client";

import React, { useState } from "react";
import { useRestaurantStore, Table, Order } from "@/lib/store/useRestaurantStore";
import { 
  IndianRupee, Receipt, CheckCircle2, 
  Printer, Users, X, Search, ChevronRight, Laptop
} from "lucide-react";
import Link from "next/link";

export default function CheckoutTerminal() {
  const { 
    tables, 
    orders, 
    processPayment, 
    clearTable 
  } = useRestaurantStore();

  const [selectedTableNum, setSelectedTableNum] = useState<number | null>(null);
  const [splitWays, setSplitWays] = useState<number>(2);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | "card">("upi");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Auto-select table based on URL query parameter (e.g. ?table=8)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get("table");
      if (tableParam) {
        const num = parseInt(tableParam, 10);
        if (!isNaN(num)) {
          setSelectedTableNum(num);
        }
      }
    }
  }, []);

  const handlePrint = () => {
    const printContents = document.getElementById("invoice-print-area")?.innerHTML;
    if (!printContents) return;
    
    const popupWin = window.open("", "_blank", "width=600,height=600");
    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
        <html>
          <head>
            <title>Table ${selectedTableNum} Bill Invoice</title>
            <style>
              body { font-family: monospace; padding: 20px; color: #000; background: #fff; width: 300px; margin: 0 auto; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .flex { display: flex; }
              .justify-between { display: flex; justify-content: space-between; }
              .border-b { border-bottom: 1px dashed #000; }
              .pb-4 { padding-bottom: 1rem; }
              .pt-4 { padding-top: 1rem; }
              .mt-1 { margin-top: 0.25rem; }
              .mt-2 { margin-top: 0.5rem; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .text-xl { font-size: 1.25rem; }
              .text-lg { font-size: 1.125rem; }
              .text-xs { font-size: 0.75rem; }
              .uppercase { text-transform: uppercase; }
              .tracking-wider { letter-spacing: 0.05em; }
              .tracking-widest { letter-spacing: 0.1em; }
              .pb-1 { padding-bottom: 0.25rem; }
              .p-3 { padding: 0.75rem; }
              .bg-zinc-50 { background-color: #f4f4f5; border: 1px solid #e4e4e7; }
              .rounded-xl { border-radius: 0.75rem; }
              .text-zinc-400 { color: #71717a; }
              .text-zinc-500 { color: #71717a; }
              .text-zinc-600 { color: #52525b; }
              .text-zinc-950 { color: #09090b; }
            </style>
          </head>
          <body onload="window.print();window.close()">
            ${printContents}
          </body>
        </html>
      `);
      popupWin.document.close();
    }
  };

  const occupiedTables = tables.filter((t) => t.status !== "AVAILABLE");
  const selectedTable = tables.find((t) => t.number === selectedTableNum);

  const currentOrderForTable = (tableNum: number) => {
    return orders.find(
      (o) => o.tableNumber === tableNum && o.status !== "Completed" && o.status !== "Cancelled"
    );
  };

  const activeOrder = selectedTableNum ? currentOrderForTable(selectedTableNum) : null;
  const billAmount = activeOrder ? activeOrder.totalAmount : (selectedTable?.currentBill || 0);

  // GST & Tax calculations
  const cgstRate = 0.025; // 2.5%
  const sgstRate = 0.025; // 2.5%
  const serviceChargeRate = 0.05; // 5%
  
  const subtotal = billAmount;
  const cgst = subtotal * cgstRate;
  const sgst = subtotal * sgstRate;
  const serviceCharge = subtotal * serviceChargeRate;
  const grandTotal = subtotal + cgst + sgst + serviceCharge;

  const handleSelectTable = (tableNum: number) => {
    setSelectedTableNum(tableNum);
    setSplitWays(2);
  };

  const handleGenerateInvoice = () => {
    if (!selectedTableNum) return;
    const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    setInvoiceNumber(invNum);
    setShowInvoiceModal(true);
  };

  const handleSettleBill = () => {
    if (!selectedTableNum) return;
    processPayment(selectedTableNum, paymentMethod);
    clearTable(selectedTableNum);
    setSelectedTableNum(null);
    setShowInvoiceModal(false);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-gray-100 flex flex-col font-sans pb-12 select-none">
      
      {/* Staff navigation bar */}
      <nav className="border-b border-white/5 bg-[#121214]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C5A880] flex items-center justify-center bg-black/60 shadow-lg">
            <Receipt className="w-4.5 h-4.5 text-[#C5A880]" />
          </div>
          <div>
            <span className="font-serif font-bold text-white tracking-wider block text-sm">ATHIDI CHECKOUT</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest block -mt-0.5">Cashier Terminal</span>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-1 gap-1">
          <Link href="/owner" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Owner</Link>
          <Link href="/kitchen" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Kitchen</Link>
          <Link href="/waiter" className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white transition-all">Waiter</Link>
          <Link href="/checkout" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#C5A880] text-black transition-all">Checkout</Link>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-gray-400">
          <span>Occupied Tables:</span>
          <span className="font-bold text-white">{occupiedTables.length}</span>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Tables List (Left 1 Col) */}
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <Receipt className="w-4.5 h-4.5 text-[#C5A880]" /> Select Table to Check Out
          </h3>

          <div className="flex flex-col gap-3">
            {occupiedTables.length === 0 ? (
              <div className="py-24 rounded-3xl bg-[#121214]/65 border border-white/5 flex flex-col items-center justify-center text-center p-6 text-zinc-600 text-xs italic">
                No occupied tables at the moment.
              </div>
            ) : (
              occupiedTables.map((t) => {
                const tableOrder = currentOrderForTable(t.number);
                const orderAmount = tableOrder ? tableOrder.totalAmount : t.currentBill;
                const isSelected = selectedTableNum === t.number;

                return (
                  <div
                    key={t.number}
                    onClick={() => handleSelectTable(t.number)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 shadow-xl ${
                      isSelected
                        ? "border-[#C5A880] bg-[#C5A880]/5 text-white"
                        : "border-white/5 bg-[#121214] text-gray-300 hover:border-white/10"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm">Table {t.number}</span>
                        <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-bold uppercase tracking-wider">
                          {t.status}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 block">
                        {t.guestCount || "2"} Guests • Waiter: {t.assignedWaiter || "Ramesh"}
                      </span>
                    </div>
                    <span className="text-base font-serif font-bold text-[#C5A880]">₹{orderAmount}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Bill Calculations & Splits (Right 2 Cols) */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          {!selectedTable ? (
            <div className="flex-1 border border-white/5 bg-[#121214]/40 rounded-[28px] p-8 flex flex-col items-center justify-center text-center text-gray-500 text-xs gap-3 min-h-[400px]">
              <Printer className="w-12 h-12 text-zinc-700" />
              <span>Select an active table from the sidebar to process payment.</span>
            </div>
          ) : (
            <div className="p-8 rounded-[28px] bg-[#121214]/65 backdrop-blur-md border border-white/5 flex flex-col gap-6 shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">Billing Details: Table {selectedTable.number}</h3>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-1 block">
                    Waiter: {selectedTable.assignedWaiter || "Ramesh"} • Status: {selectedTable.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">Subtotal</span>
                  <span className="text-lg font-serif font-bold text-white">₹{subtotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Items Summary */}
              {activeOrder ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Order Items Breakdown</span>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto no-scrollbar">
                    {activeOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                        <span>{it.name} <span className="text-[9px] text-zinc-500 font-bold ml-1.5">x{it.quantity}</span></span>
                        <span className="font-semibold text-gray-200">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-gray-400 italic">
                  💡 Manual bill amount configured: ₹{subtotal} (No specific items logged).
                </div>
              )}

              {/* Split Bill Calculator */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-4">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C5A880]" /> Split Bill Calculator
                </span>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300">Number of guests:</span>
                    <div className="flex items-center bg-black/40 border border-white/5 rounded-full p-0.5">
                      <button
                        onClick={() => { if (splitWays > 1) setSplitWays(splitWays - 1); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-white min-w-[20px] text-center">{splitWays}</span>
                      <button
                        onClick={() => { if (splitWays < 8) setSplitWays(splitWays + 1); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-white/10" />

                  <div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Per Person Share</span>
                    <span className="text-base font-serif font-bold text-[#C5A880]">
                      ₹{Math.round(grandTotal / splitWays).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Actions */}
              <div className="flex flex-col gap-4 border-t border-white/5 pt-6 mt-2">
                <div className="flex items-center justify-between text-xs text-gray-400 gap-4">
                  <span>Payment Method:</span>
                  <div className="flex bg-black/40 border border-white/5 rounded-full p-0.5 gap-1">
                    {(["upi", "cash", "card"] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          paymentMethod === method
                            ? "bg-[#C5A880] text-black"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateInvoice}
                  className="w-full bg-[#C5A880] hover:bg-[#D4AF37] text-black font-bold py-3.5 rounded-full text-xs uppercase tracking-widest shadow-lg transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4.5 h-4.5" /> Generate printable GST Invoice
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Printable Receipt Modal */}
      {showInvoiceModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowInvoiceModal(false)} />
          
          <div className="relative w-full max-w-sm bg-white text-zinc-900 border border-zinc-200 rounded-[28px] shadow-2xl p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <>
            {/* Invoice Print Container */}
            <div id="invoice-print-area" className="flex flex-col gap-5">
              {/* Receipt Header */}
              <div className="text-center flex flex-col gap-1 border-b border-dashed border-zinc-300 pb-4">
                <span className="font-serif font-black text-xl tracking-wider block">ATHIDI</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Family Restaurant</span>
                <span className="text-[9px] text-zinc-400 block mt-1">Jubilee Hills, Road No. 36, Hyderabad</span>
                <span className="text-[9px] text-zinc-400 block">GSTIN: 36AAAAA1111A1Z1</span>
              </div>

              {/* Receipt Meta */}
              <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                <div className="flex flex-col gap-0.5">
                  <span>Inv: {invoiceNumber}</span>
                  <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex flex-col text-right gap-0.5">
                  <span>Table: {selectedTableNum}</span>
                  <span>Time: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="flex flex-col gap-2 border-b border-dashed border-zinc-300 pb-4 text-xs font-semibold">
                <div className="flex justify-between text-zinc-400 text-[10px] uppercase tracking-wider pb-1">
                  <span>Item Description</span>
                  <span>Total</span>
                </div>
                
                {activeOrder?.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-bold">
                    <span>{it.name} <span className="text-[10px] text-zinc-400 font-normal ml-1">x{it.quantity}</span></span>
                    <span>₹{(it.price * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Invoice Splits Tax summary */}
              <div className="flex flex-col gap-1.5 text-xs font-semibold border-b border-dashed border-zinc-300 pb-4 text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%)</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%)</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge (5%)</span>
                  <span>₹{serviceCharge.toFixed(2)}</span>
                </div>
              </div>

              {/* Invoice Total */}
              <div className="flex justify-between items-center text-sm font-black border-b border-dashed border-zinc-300 pb-4">
                <span>GRAND TOTAL</span>
                <span className="text-zinc-950 font-serif font-black text-lg">₹{Math.round(grandTotal).toLocaleString()}</span>
              </div>

              {/* Split count */}
              {splitWays > 1 && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-xs font-bold text-zinc-600">
                  Split equal ({splitWays} ways): <span className="text-zinc-950 font-black">₹{Math.round(grandTotal / splitWays).toLocaleString()} per guest</span>
                </div>
              )}

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-zinc-400 font-medium">
                <p>Thank you for dining with royalty.</p>
                <p className="mt-0.5">Please visit us again!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" /> Print Bill
              </button>
              <button
                onClick={handleSettleBill}
                className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Paid & Clear
              </button>
            </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
