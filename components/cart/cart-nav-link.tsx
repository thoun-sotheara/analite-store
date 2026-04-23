"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

export function CartNavLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground transition hover:border-slate-400 sm:px-4 sm:text-sm"
    >
      <ShoppingCart className="h-4 w-4" />
      Cart
      <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted">{itemCount}</span>
    </Link>
  );
}
