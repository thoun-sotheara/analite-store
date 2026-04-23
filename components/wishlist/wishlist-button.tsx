"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

type WishlistButtonProps = {
  templateId: string;
  className?: string;
  iconOnly?: boolean;
};

export function WishlistButton({ templateId, className }: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const active = isWishlisted(templateId);

  return (
    <button
      type="button"
      onClick={() => toggleWishlist(templateId)}
      className={
        className ??
        `inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
          active
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-border text-foreground hover:border-slate-400"
        }`
      }
      aria-label={active ? "Remove from saved" : "Save"}
    >
      <Heart className={`h-3.5 w-3.5 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
