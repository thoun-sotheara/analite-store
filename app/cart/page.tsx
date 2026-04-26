"use client";

import Link from "next/link";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { EngagementLoop } from "@/components/product/engagement-loop";
import { useCart } from "@/components/cart/cart-provider";
import { useSmoothReady } from "@/lib/web/use-smooth-ready";

function CartPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 md:px-8 lg:px-12">
      <div className="h-10 w-56 animate-pulse rounded-md bg-slate-200" />
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <article key={index} className="elevated-card rounded-lg p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-6 w-44 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-36 animate-pulse rounded bg-slate-200" />
            </article>
          ))}
        </div>
        <aside className="elevated-card h-fit rounded-lg p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-24 animate-pulse rounded bg-slate-200" />
        </aside>
      </section>
    </main>
  );
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, isReady } = useCart();
  const { items: catalogItems } = useCatalog();
  const showContent = useSmoothReady(isReady);

  if (!showContent) {
    return <CartPageSkeleton />;
  }

  const cartItems = items
    .map((entry) => ({
      quantity: entry.quantity,
      template: catalogItems.find((item) => item.id === entry.templateId),
    }))
    .filter((entry): entry is { quantity: number; template: (typeof catalogItems)[number] } => Boolean(entry.template));

  const subtotal = cartItems.reduce((sum, entry) => sum + entry.template.priceUsd * entry.quantity, 0);
  const totalUnits = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);

  return (
    <main className="animate-fade-up mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 md:px-8 lg:px-12">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Your Cart</h1>
        {cartItems.length > 0 ? (
          <button
            type="button"
            onClick={clearCart}
            className="rounded-md border border-border px-3 py-2 text-xs text-muted transition hover:text-foreground"
          >
            Clear Cart
          </button>
        ) : null}
      </div>

      {cartItems.length === 0 ? (
        <section className="elevated-card mt-8 rounded-lg p-8">
          <p className="text-sm text-muted">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Browse Products
          </Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {cartItems.map(({ template, quantity }) => (
              <article key={template.id} className="elevated-card rounded-lg p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">{template.categoryLabel}</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{template.title}</h2>
                    <p className="mt-2 text-sm text-muted">${template.priceUsd.toFixed(2)} each</p>
                  </div>

                  <div className="flex items-center gap-2 rounded-md border border-border p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(template.id, Math.max(1, quantity - 1))}
                      className="rounded px-2 py-1 text-sm transition hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(template.id, Math.min(5, quantity + 1))}
                      className="rounded px-2 py-1 text-sm transition hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                  <Link
                    href={`/products/${template.id}`}
                    className="rounded-md border border-border px-3 py-2 text-xs text-foreground transition hover:border-slate-400"
                  >
                    View Product
                  </Link>
                  <Link
                    href={`/checkout/${template.id}`}
                    className="rounded-md bg-foreground px-3 py-2 text-xs text-white"
                  >
                    Checkout This Item
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFromCart(template.id)}
                    className="rounded-md border border-border px-3 py-2 text-xs text-muted transition hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="elevated-card h-fit rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground">Cart Summary</h2>
            <div className="mt-4 rounded-md border border-border bg-surface p-3 text-xs text-muted">
              <p>Total products: {cartItems.length}</p>
              <p className="mt-1">Total units: {totalUnits}</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Tax</span>
              <span>$0.00</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Delivery</span>
              <span>$0.00 (digital)</span>
            </div>
            <div className="mt-4 border-t border-border pt-4 flex items-center justify-between">
              <span className="text-sm text-muted">Total</span>
              <span className="text-xl font-semibold text-foreground">${subtotal.toFixed(2)}</span>
            </div>

            <Link
              href={cartItems.length > 0 ? "/checkout" : "/products"}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Checkout All Items
            </Link>
            <p className="mt-2 text-xs text-muted">Bundle checkout now lists all items so you can complete payment with a clear step-by-step flow.</p>
          </aside>
        </section>
      )}

      <EngagementLoop
        title="Complete Your Bundle"
        description="Customers with similar carts often add these templates before checkout."
      />
    </main>
  );
}
