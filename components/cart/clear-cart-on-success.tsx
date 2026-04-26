"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";

export function ClearCartOnSuccess() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const handledTransactionRef = useRef<string | null>(null);
  const transactionId = searchParams.get("tx");

  useEffect(() => {
    if (!transactionId || handledTransactionRef.current === transactionId) {
      return;
    }

    handledTransactionRef.current = transactionId;
    clearCart();
  }, [clearCart, transactionId]);

  return null;
}
