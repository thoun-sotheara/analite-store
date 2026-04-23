"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PaymentModal } from "@/components/payment-modal";

type CheckoutExperienceProps = {
  templateId: string;
  templateTitle: string;
  templateDescription: string;
  basePriceUsd: number;
};

type Step = 1 | 2 | 3;

const TAX_RATE = 0;

function getDiscountRate(code: string): number {
  const normalized = code.trim().toUpperCase();
  if (normalized === "SAVE10") return 0.1;
  if (normalized === "KHMER5") return 5;
  return 0;
}

export function CheckoutExperience({
  templateId,
  templateTitle,
  templateDescription,
  basePriceUsd,
}: CheckoutExperienceProps) {
  const [step, setStep] = useState<Step>(1);
  const [quantity, setQuantity] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");

  const pricing = useMemo(() => {
    const subtotal = basePriceUsd * quantity;
    const discountRule = getDiscountRate(appliedCoupon);
    const discount = discountRule > 0 && discountRule < 1 ? subtotal * discountRule : Number(discountRule);
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * TAX_RATE;
    const total = Math.max(0, taxableAmount + tax);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [basePriceUsd, quantity, appliedCoupon]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Checkout</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-4xl">{templateTitle}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">{templateDescription}</p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 ${step >= 1 ? "bg-foreground text-white" : "border border-border text-muted"}`}>
            1. Details
          </span>
          <span className={`rounded-full px-3 py-1 ${step >= 2 ? "bg-foreground text-white" : "border border-border text-muted"}`}>
            2. Payment
          </span>
          <span className={`rounded-full px-3 py-1 ${step >= 3 ? "bg-foreground text-white" : "border border-border text-muted"}`}>
            3. Success
          </span>
        </div>

        {step === 1 ? (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-foreground">Quantity</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="rounded px-3 py-1 text-sm hover:bg-white"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(5, value + 1))}
                  className="rounded px-3 py-1 text-sm hover:bg-white"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Coupon Code</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="Try SAVE10 or KHMER5"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(couponInput)}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:border-slate-400"
                >
                  Apply
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Continue to Payment
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-border p-3 text-sm text-muted">
              Complete payment using the modal below. After paying, click continue.
            </p>
            <PaymentModal templateId={templateId} templateTitle={templateTitle} amountUsd={pricing.total} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-md bg-foreground px-4 py-2 text-sm text-white"
              >
                Continue to Success
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-border p-3 text-sm text-muted">
              Payment step completed for testing. Visit success and library flows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/success?template=${templateId}&tx=demo-${templateId}`}
                className="rounded-md bg-foreground px-4 py-2 text-sm text-white"
              >
                Open Success Page
              </Link>
              <Link
                href="/library"
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
              >
                Open Library
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="sticky top-4 h-fit rounded-lg border border-border bg-white p-4 sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Base Price</span>
            <span>${basePriceUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Quantity</span>
            <span>{quantity}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Subtotal</span>
            <span>${pricing.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Discount</span>
            <span>-${pricing.discount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Tax (placeholder)</span>
            <span>${pricing.tax.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Total</span>
            <span className="text-xl font-semibold text-foreground">${pricing.total.toFixed(2)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
