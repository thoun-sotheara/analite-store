"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function WishlistNavLink() {
  const { wishlistIds } = useWishlist();

  return (
    <Link
      href="/wishlist"
      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground transition hover:border-slate-400 sm:px-4 sm:text-sm"
    >
      <Heart className="h-4 w-4" />
      Wishlist
      <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted">{wishlistIds.length}</span>
    </Link>
  );
}
