"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { hasCookieConsent, readJsonCookie, setJsonCookie } from "@/lib/web/cookies";

type WishlistContextValue = {
  wishlistIds: string[];
  recentIds: string[];
  toggleWishlist: (templateId: string) => void;
  isWishlisted: (templateId: string) => boolean;
  trackRecentView: (templateId: string) => void;
};

const WISHLIST_KEY = "analite_wishlist_v1";
const RECENT_KEY = "analite_recent_v1";
const WISHLIST_COOKIE_KEY = "analite_wishlist";
const RECENT_COOKIE_KEY = "analite_recent";
const MAX_RECENT = 6;

const WishlistContext = createContext<WishlistContextValue | null>(null);

function normalizeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email?.toLowerCase() ?? "";
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  function loadFromLocalStorage(): { wishlist: string[]; recent: string[] } {
    const fromCookieWishlist = readJsonCookie<string[]>(WISHLIST_COOKIE_KEY, []);
    const fromCookieRecent = readJsonCookie<string[]>(RECENT_COOKIE_KEY, []);
    if (fromCookieWishlist.length > 0 || fromCookieRecent.length > 0) {
      return {
        wishlist: normalizeIds(Array.isArray(fromCookieWishlist) ? fromCookieWishlist : []),
        recent: normalizeIds(Array.isArray(fromCookieRecent) ? fromCookieRecent : []).slice(0, MAX_RECENT),
      };
    }

    try {
      const rawWishlist = window.localStorage.getItem(WISHLIST_KEY);
      const rawRecent = window.localStorage.getItem(RECENT_KEY);
      const nextWishlist = rawWishlist ? (JSON.parse(rawWishlist) as string[]) : [];
      const nextRecent = rawRecent ? (JSON.parse(rawRecent) as string[]) : [];

      return {
        wishlist: normalizeIds(Array.isArray(nextWishlist) ? nextWishlist : []),
        recent: normalizeIds(Array.isArray(nextRecent) ? nextRecent : []).slice(0, MAX_RECENT),
      };
    } catch {
      return { wishlist: [], recent: [] };
    }
  }

  useEffect(() => {
    const { wishlist: localWishlist, recent: localRecent } = loadFromLocalStorage();
    setRecentIds(localRecent);

    if (!userEmail) {
      setWishlistIds(localWishlist);
      return;
    }

    let isCancelled = false;

    async function syncSignedInWishlist() {
      try {
        const readRes = await fetch("/api/wishlist", { cache: "no-store" });
        if (!readRes.ok) {
          throw new Error("Unable to fetch wishlist");
        }

        const readPayload = (await readRes.json()) as { wishlistIds?: string[] };
        const remoteWishlist = normalizeIds(Array.isArray(readPayload.wishlistIds) ? readPayload.wishlistIds : []);

        let mergedWishlist = remoteWishlist;

        if (localWishlist.length > 0) {
          const mergeRes = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mergeIds: localWishlist }),
          });

          if (mergeRes.ok) {
            const mergePayload = (await mergeRes.json()) as { wishlistIds?: string[] };
            mergedWishlist = normalizeIds(Array.isArray(mergePayload.wishlistIds) ? mergePayload.wishlistIds : []);
          } else {
            mergedWishlist = normalizeIds([...remoteWishlist, ...localWishlist]);
          }
        }

        if (!isCancelled) {
          setWishlistIds(mergedWishlist);
        }
      } catch {
        if (!isCancelled) {
          setWishlistIds(localWishlist);
        }
      }
    }

    void syncSignedInWishlist();

    return () => {
      isCancelled = true;
    };
  }, [userEmail]);

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));

    if (hasCookieConsent()) {
      setJsonCookie(WISHLIST_COOKIE_KEY, wishlistIds);
      setJsonCookie(RECENT_COOKIE_KEY, recentIds);
    }
  }, [wishlistIds, recentIds]);

  const syncWishlistChange = useCallback(
    async (templateId: string, action: "add" | "remove") => {
      if (!userEmail) return;

      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId, action }),
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { wishlistIds?: string[] };
        if (Array.isArray(payload.wishlistIds)) {
          setWishlistIds(normalizeIds(payload.wishlistIds));
        }
      } catch {
        // Keep optimistic state; it will reconcile on next signed-in sync.
      }
    },
    [userEmail],
  );

  const toggleWishlist = useCallback(
    (templateId: string) => {
      setWishlistIds((current) => {
        const exists = current.includes(templateId);
        const next = exists
          ? current.filter((id) => id !== templateId)
          : [templateId, ...current];

        if (userEmail) {
          void syncWishlistChange(templateId, exists ? "remove" : "add");
        }

        return next;
      });
    },
    [syncWishlistChange, userEmail],
  );

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
