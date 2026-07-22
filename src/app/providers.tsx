"use client";

import React, { useEffect } from "react";
import { ToastProvider } from "@/context/ToastContext";
import { TableProvider } from "@/context/TableContext";
import { CartProvider } from "@/context/CartContext";
import { useRestaurantStore } from "@/lib/store/useRestaurantStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useRestaurantStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ToastProvider>
      <TableProvider>
        <CartProvider>{children}</CartProvider>
      </TableProvider>
    </ToastProvider>
  );
}
