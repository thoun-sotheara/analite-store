"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { shouldFallbackFromFirestore } from "@/lib/firebase/permissions";
import { hasCookieConsent, readJsonCookie, setJsonCookie } from "@/lib/web/cookies";
import { useCatalog } from "@/components/catalog/catalog-provider";

type CartItem = {
  templateId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isReady: boolean;
  addToCart: (templateId: string, quantity?: number) => void;
  removeFromCart: (templateId: string) => void;
  updateQuantity: (templateId: string, quantity: number) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "analite_cart_v1";
const CART_COOKIE_KEY = "analite_cart";

const CartContext = createContext<CartContextValue | null>(null);

function getCartDocumentRef(userEmail: string) {
  return doc(firestore, "users", userEmail.toLowerCase(), "state", "cart");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { items: catalogItems } = useCatalog();
  const userEmail = session?.user?.email?.toLowerCase() ?? "";
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [firestoreSyncEnabled, setFirestoreSyncEnabled] = useState(true);
  const validTemplateIds = useMemo(() => new Set(catalogItems.map((item) => item.id)), [catalogItems]);

  function sanitizeCartItems(rawItems: CartItem[]) {
    return rawItems.filter(
      (entry) => entry.templateId && entry.quantity > 0 && validTemplateIds.has(entry.templateId),
    );
  }

  function readStoredCart(): CartItem[] {
    const cookieItems = readJsonCookie<CartItem[]>(CART_COOKIE_KEY, []);
    if (Array.isArray(cookieItems) && cookieItems.length > 0) {
      return sanitizeCartItems(cookieItems);
    }

    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return sanitizeCartItems(parsed);
    } catch {
      return [];
    }
  }

  function loadFromLocalStorage() {
    setItems(readStoredCart());
    setIsReady(true);
  }

  useEffect(() => {
    setFirestoreSyncEnabled(true);
  }, [userEmail]);

  useEffect(() => {
    if (userEmail && firestoreSyncEnabled) {
      const unsubscribe = onSnapshot(
        getCartDocumentRef(userEmail),
        (snapshot) => {
          const rawItems = (snapshot.data()?.items ?? []) as CartItem[];
          if (Array.isArray(rawItems)) {
            setItems(sanitizeCartItems(rawItems));
          } else {
            setItems([]);
          }
          setIsReady(true);
        },
        (error) => {
          if (shouldFallbackFromFirestore(error)) {
            setFirestoreSyncEnabled(false);
            loadFromLocalStorage();
            return;
          }
          console.error("Cart Firestore subscription failed", error);
        },
      );

      return unsubscribe;
    }

    loadFromLocalStorage();
  }, [userEmail, firestoreSyncEnabled, validTemplateIds]);

  useEffect(() => {
    setItems((current) => {
      const next = sanitizeCartItems(current);
      if (next.length === current.length) {
        return current;
      }
      return next;
    });
  }, [validTemplateIds]);

  useEffect(() => {
    if (userEmail && firestoreSyncEnabled) {
      void setDoc(getCartDocumentRef(userEmail), { items }, { merge: true }).catch((error) => {
        if (shouldFallbackFromFirestore(error)) {
          setFirestoreSyncEnabled(false);
          if (hasCookieConsent()) {
            setJsonCookie(CART_COOKIE_KEY, items);
          }
          window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
          return;
        }
        console.error("Cart Firestore sync failed", error);
      });
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    if (hasCookieConsent()) {
      setJsonCookie(CART_COOKIE_KEY, items);
    }
  }, [items, userEmail, firestoreSyncEnabled]);

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
    setItems((current) => (current.length === 0 ? current : []));
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      isReady,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [items, isReady],
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
