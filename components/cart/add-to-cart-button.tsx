"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

type AddToCartButtonProps = {
  templateId: string;
  quantity?: number;
  className?: string;
};

export function AddToCartButton({ templateId, quantity = 1, className }: AddToCartButtonProps) {
  const { addToCart, items } = useCart();
  const inCart = items.some((item) => item.templateId === templateId);

  function onAdd() {
    addToCart(templateId, quantity);
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className={
        className ??
        `inline-flex items-center justify-center rounded border px-3 py-2 transition ${
          inCart
            ? "border-slate-400 bg-slate-50 text-slate-700"
            : "border-border text-foreground hover:border-slate-400"
        }`
      }
      aria-label={inCart ? "In cart" : "Add to cart"}
    >
      <ShoppingCart className="h-3.5 w-3.5" />
    </button>
  );
}
