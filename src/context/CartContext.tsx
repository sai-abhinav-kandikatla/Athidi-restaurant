"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MenuItem } from "@/data/mockData";
import { db } from "@/lib/supabaseFallback";
import { useTable } from "./TableContext";
import { useToast } from "./ToastContext";

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  spiceLevel: number;
}

interface CartContextProps {
  cartItems: CartItem[];
  addToCart: (item: MenuItem, quantity: number, spiceLevel: number) => void;
  removeFromCart: (itemId: string, spiceLevel: number) => void;
  updateQuantity: (itemId: string, spiceLevel: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  taxes: number;
  discountAmount: number;
  grandTotal: number;
  specialInstructions: string;
  setSpecialInstructions: (note: string) => void;
  couponCode: string;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  checkout: () => Promise<string | null>;
  estimatedPrepTime: number;
  favorites: string[];
  toggleFavorite: (itemId: string) => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const { tableNumber } = useTable();
  const { showToast } = useToast();

  // Load cart and favorites from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem("athidi_cart");
      if (storedCart) setCartItems(JSON.parse(storedCart));

      const storedFavs = localStorage.getItem("athidi_favorites");
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
    }
  }, []);

  // Save cart to LocalStorage when changed
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    if (typeof window !== "undefined") {
      localStorage.setItem("athidi_cart", JSON.stringify(items));
    }
  };

  const addToCart = (item: MenuItem, quantity: number, spiceLevel: number) => {
    const existingIndex = cartItems.findIndex(
      (c) => c.menuItem.id === item.id && c.spiceLevel === spiceLevel
    );

    let newItems = [...cartItems];
    if (existingIndex > -1) {
      newItems[existingIndex].quantity += quantity;
    } else {
      newItems.push({ menuItem: item, quantity, spiceLevel });
    }

    saveCart(newItems);
    showToast(`Added ${quantity}x ${item.name} to cart.`, "success");
  };

  const removeFromCart = (itemId: string, spiceLevel: number) => {
    const item = cartItems.find((c) => c.menuItem.id === itemId && c.spiceLevel === spiceLevel);
    const newItems = cartItems.filter(
      (c) => !(c.menuItem.id === itemId && c.spiceLevel === spiceLevel)
    );
    saveCart(newItems);
    if (item) {
      showToast(`Removed ${item.menuItem.name} from cart.`, "info");
    }
  };

  const updateQuantity = (itemId: string, spiceLevel: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, spiceLevel);
      return;
    }
    const newItems = cartItems.map((c) => {
      if (c.menuItem.id === itemId && c.spiceLevel === spiceLevel) {
        return { ...c, quantity };
      }
      return c;
    });
    saveCart(newItems);
  };

  const clearCart = () => {
    saveCart([]);
    setSpecialInstructions("");
    setCouponCode("");
    setDiscountPercent(0);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxes = useMemo(() => {
    const taxableAmount = subtotal - discountAmount;
    // 5% GST + 5% Service Charge (10% total)
    return taxableAmount * 0.1;
  }, [subtotal, discountAmount]);

  const grandTotal = useMemo(() => {
    return subtotal - discountAmount + taxes;
  }, [subtotal, discountAmount, taxes]);

  const estimatedPrepTime = useMemo(() => {
    if (cartItems.length === 0) return 0;
    // Estimated time is the max preparation time in cart plus 2 minutes per additional unique item
    const maxTime = Math.max(...cartItems.map((c) => c.menuItem.prepTime));
    return maxTime + (cartItems.length - 1) * 2;
  }, [cartItems]);

  const applyCoupon = (code: string): boolean => {
    const formattedCode = code.toUpperCase().trim();
    if (formattedCode === "WELCOME10") {
      setCouponCode("WELCOME10");
      setDiscountPercent(10);
      showToast("Coupon 'WELCOME10' applied: 10% off!", "success");
      return true;
    } else if (formattedCode === "ATHIDI20") {
      setCouponCode("ATHIDI20");
      setDiscountPercent(20);
      showToast("Coupon 'ATHIDI20' applied: 20% off!", "success");
      return true;
    }
    showToast("Invalid coupon code.", "error");
    return false;
  };

  const removeCoupon = () => {
    setCouponCode("");
    setDiscountPercent(0);
    showToast("Coupon removed.", "info");
  };

  const toggleFavorite = (itemId: string) => {
    let updated: string[];
    if (favorites.includes(itemId)) {
      updated = favorites.filter((id) => id !== itemId);
      showToast("Removed from favorites.", "info");
    } else {
      updated = [...favorites, itemId];
      showToast("Added to favorites.", "success");
    }
    setFavorites(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("athidi_favorites", JSON.stringify(updated));
    }
  };

  const checkout = async (): Promise<string | null> => {
    if (cartItems.length === 0) {
      showToast("Your cart is empty.", "error");
      return null;
    }
    if (!tableNumber) {
      showToast("Please scan a table QR code to place an order.", "error");
      return null;
    }

    try {
      const orderItems = cartItems.map((c) => ({
        menuItemId: c.menuItem.id,
        name: c.menuItem.name,
        quantity: c.quantity,
        price: c.menuItem.price
      }));

      const order = await db.createOrder({
        tableNumber,
        items: orderItems,
        totalAmount: grandTotal,
        specialInstructions,
        couponCode: couponCode || undefined
      });

      clearCart();
      setIsCartOpen(false);
      showToast("Order placed successfully! Sending to kitchen...", "success");
      
      // Save ordered ID to recent orders
      if (typeof window !== "undefined") {
        const recents = localStorage.getItem("athidi_recent_orders");
        const list = recents ? JSON.parse(recents) : [];
        localStorage.setItem("athidi_recent_orders", JSON.stringify([order.id, ...list]));
      }

      return order.id;
    } catch {
      showToast("Checkout failed. Please try again.", "error");
      return null;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        taxes,
        discountAmount,
        grandTotal,
        specialInstructions,
        setSpecialInstructions,
        couponCode,
        applyCoupon,
        removeCoupon,
        isCartOpen,
        setIsCartOpen,
        checkout,
        estimatedPrepTime,
        favorites,
        toggleFavorite
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
