"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type WishlistContextValue = {
  wishlistIds: string[];
  recentIds: string[];
  toggleWishlist: (templateId: string) => void;
  isWishlisted: (templateId: string) => boolean;
  trackRecentView: (templateId: string) => void;
};

const WISHLIST_KEY = "analite_wishlist_v1";
const RECENT_KEY = "analite_recent_v1";
const MAX_RECENT = 6;

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const rawWishlist = window.localStorage.getItem(WISHLIST_KEY);
      const rawRecent = window.localStorage.getItem(RECENT_KEY);
      if (rawWishlist) {
        const parsed = JSON.parse(rawWishlist) as string[];
        if (Array.isArray(parsed)) setWishlistIds(parsed);
      }
      if (rawRecent) {
        const parsed = JSON.parse(rawRecent) as string[];
        if (Array.isArray(parsed)) setRecentIds(parsed);
      }
    } catch {
      // Ignore malformed storage data.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
  }, [recentIds]);

  const toggleWishlist = useCallback((templateId: string) => {
    setWishlistIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [templateId, ...current],
    );
  }, []);

  const isWishlisted = useCallback((templateId: string) => wishlistIds.includes(templateId), [wishlistIds]);

  const trackRecentView = useCallback((templateId: string) => {
    setRecentIds((current) => {
      const next = [templateId, ...current.filter((id) => id !== templateId)].slice(0, MAX_RECENT);
      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ wishlistIds, recentIds, toggleWishlist, isWishlisted, trackRecentView }),
    [wishlistIds, recentIds, toggleWishlist, isWishlisted, trackRecentView],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider.");
  }

  return context;
}
