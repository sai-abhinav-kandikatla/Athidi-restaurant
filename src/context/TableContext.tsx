"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/supabaseFallback";
import { useToast } from "./ToastContext";

interface TableContextProps {
  tableNumber: number | null;
  setTableNumber: (num: number) => void;
  clearTable: () => void;
  requestService: (type: "waiter" | "water" | "bill" | "spoon" | "tissue") => Promise<boolean>;
  activeRequests: { type: string; id: string; createdAt: string }[];
}

const TableContext = createContext<TableContextProps | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tableNumber, setTableNumberState] = useState<number | null>(null);
  const [activeRequests, setActiveRequests] = useState<{ type: string; id: string; createdAt: string }[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("athidi_table_number");
      if (stored) {
        setTableNumberState(parseInt(stored, 10));
      }

      const requests = localStorage.getItem("athidi_active_requests");
      if (requests) {
        setActiveRequests(JSON.parse(requests));
      }
    }
  }, []);

  // Custom event listener for service updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleServiceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const requestId = customEvent.detail;
      
      setActiveRequests((prev) => {
        const filtered = prev.filter((r) => r.id !== requestId);
        localStorage.setItem("athidi_active_requests", JSON.stringify(filtered));
        return filtered;
      });

      showToast("Service request completed. Thank you!", "info");
    };

    window.addEventListener("serviceRequestUpdate", handleServiceUpdate);
    return () => {
      window.removeEventListener("serviceRequestUpdate", handleServiceUpdate);
    };
  }, [showToast]);

  const setTableNumber = (num: number) => {
    setTableNumberState(num);
    if (typeof window !== "undefined") {
      localStorage.setItem("athidi_table_number", num.toString());
    }
    showToast(`Welcome to Table ${num}. Scan complete!`, "success");
  };

  const clearTable = () => {
    setTableNumberState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("athidi_table_number");
    }
    showToast("Checked out from Table.", "info");
  };

  const requestService = async (type: "waiter" | "water" | "bill" | "spoon" | "tissue"): Promise<boolean> => {
    if (!tableNumber) {
      showToast("Please scan a table QR code to request service.", "error");
      return false;
    }

    // Check if duplicate request exists
    const duplicate = activeRequests.find((r) => r.type === type);
    if (duplicate) {
      showToast(`A request for ${type} is already active for Table ${tableNumber}.`, "info");
      return false;
    }

    try {
      const req = await db.createServiceRequest(tableNumber, type);
      const newRequest = { type, id: req.id, createdAt: req.createdAt };
      const updated = [...activeRequests, newRequest];
      setActiveRequests(updated);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("athidi_active_requests", JSON.stringify(updated));
      }

      const labels = {
        waiter: "Waiter called",
        water: "Water requested",
        bill: "Bill requested",
        spoon: "Spoon requested",
        tissue: "Tissues requested"
      };

      showToast(`${labels[type]} for Table ${tableNumber}. Staff is on their way.`, "success");
      return true;
    } catch {
      showToast("Failed to request service. Please try again.", "error");
      return false;
    }
  };

  return (
    <TableContext.Provider
      value={{
        tableNumber,
        setTableNumber,
        clearTable,
        requestService,
        activeRequests
      }}
    >
      {children}
    </TableContext.Provider>
  );
};

export const useTable = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
};
