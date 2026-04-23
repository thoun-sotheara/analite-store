"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = {
  templateId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addToCart: (templateId: string, quantity?: number) => void;
  removeFromCart: (templateId: string) => void;
  updateQuantity: (templateId: string, quantity: number) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "analite_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        setItems(parsed.filter((entry) => entry.templateId && entry.quantity > 0));
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addToCart(templateId: string, quantity = 1) {
    setItems((current) => {
      const existing = current.find((item) => item.templateId === templateId);
      if (!existing) {
        return [...current, { templateId, quantity: Math.max(1, Math.min(5, quantity)) }];
      }

      return current.map((item) =>
        item.templateId === templateId
          ? { ...item, quantity: Math.min(5, item.quantity + Math.max(1, quantity)) }
          : item,
      );
    });
  }

  function removeFromCart(templateId: string) {
    setItems((current) => current.filter((item) => item.templateId !== templateId));
  }

  function updateQuantity(templateId: string, quantity: number) {
    const normalized = Math.max(1, Math.min(5, quantity));
    setItems((current) =>
      current.map((item) => (item.templateId === templateId ? { ...item, quantity: normalized } : item)),
    );
  }

  function clearCart() {
    setItems([]);
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return context;
}
