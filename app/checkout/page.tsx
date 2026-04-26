"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { PaymentModal } from "@/components/payment-modal";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { useCart } from "@/components/cart/cart-provider";
import { useSmoothReady } from "@/lib/web/use-smooth-ready";

function CheckoutPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="h-10 w-64 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-200" />
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <article key={index} className="rounded-lg border border-border bg-white p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-6 w-44 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-lg border border-border bg-white p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-24 animate-pulse rounded bg-slate-200" />
        </aside>
      </section>
    </main>
  );
}

export default function BundleCheckoutPage() {
  const { data: session, status } = useSession();
  const { items: cartItems, isReady } = useCart();
  const { items: catalogItems } = useCatalog();
  const showContent = useSmoothReady(status !== "loading" && isReady);

  if (!showContent) {
    return <CheckoutPageSkeleton />;
  }

  const resolvedItems = cartItems
    .map((entry) => ({
      quantity: entry.quantity,
      template: catalogItems.find((item) => item.id === entry.templateId),
    }))
    .filter((entry): entry is { quantity: number; template: (typeof catalogItems)[number] } => Boolean(entry.template));

  const subtotal = resolvedItems.reduce((sum, entry) => sum + entry.template.priceUsd * entry.quantity, 0);
  const totalUnits = resolvedItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const checkoutItems = resolvedItems.map(({ template, quantity }) => ({
    templateId: template.id,
    quantity,
  }));

  if (!session?.user?.email) {
    return (
      <main className="animate-fade-up mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6">
        <section className="rounded-lg border border-border bg-white p-6">
          <h1 className="text-2xl font-semibold text-foreground">Sign In Required</h1>
          <p className="mt-2 text-sm text-muted">Please sign in to continue bundle checkout.</p>
          <Link
            href="/auth?mode=signin&redirect=/checkout"
            className="mt-4 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="animate-fade-up mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Bundle Checkout</h1>
      <p className="mt-2 text-sm text-muted">Review all cart items and complete one secure payment for the full order.</p>

      {resolvedItems.length === 0 ? (
        <section className="mt-8 rounded-lg border border-border bg-white p-6">
          <p className="text-sm text-muted">Your cart is empty, so there is nothing to checkout.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Browse Products
          </Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {resolvedItems.map(({ template, quantity }) => (
              <article key={template.id} className="rounded-lg border border-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">{template.categoryLabel}</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{template.title}</h2>
                    <p className="mt-2 text-sm text-muted">{template.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Quantity</p>
                    <p className="text-sm font-semibold text-foreground">{quantity}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-sm text-muted">
                    Unit: ${template.priceUsd.toFixed(2)} | Line total: ${(template.priceUsd * quantity).toFixed(2)}
                  </p>
                  <Link href={`/products/${template.id}`} className="inline-flex rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400">
                    View Item
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-border bg-white p-6">
            <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Unique products</span>
                <span>{resolvedItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Total units</span>
                <span>{totalUnits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tax</span>
                <span>$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Delivery</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4 flex items-center justify-between">
              <span className="text-sm text-muted">Estimated total</span>
              <span className="text-xl font-semibold text-foreground">${subtotal.toFixed(2)}</span>
            </div>

            <div className="mt-4">
              <PaymentModal
                amountUsd={subtotal}
                lineItems={checkoutItems}
                purchaseLabel={`Bundle Order (${resolvedItems.length} items)`}
              />
            </div>

            <p className="mt-3 text-xs text-muted">After successful payment confirmation, all purchased items will appear in your library.</p>
          </aside>
        </section>
      )}
    </main>
  );
}
