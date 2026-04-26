"use client";

import { useMemo, useState } from "react";
import { PaymentModal } from "@/components/payment-modal";

type CheckoutExperienceProps = {
  templateId: string;
  templateTitle: string;
  templateDescription: string;
  basePriceUsd: number;
};

type Step = 1 | 2;

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
  const [message, setMessage] = useState("");

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
        </div>

        {step === 1 ? (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-foreground">Quantity</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border p-1">
                <button
                  type="button"
                  onClick={() => {
                    setQuantity((value) => {
                      if (value <= 1) {
                        setMessage("Minimum quantity is 1.");
                        return 1;
                      }
                      return value - 1;
                    });
                  }}
                  className="rounded px-3 py-1 text-sm transition hover:bg-white"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuantity((value) => {
                      if (value >= 5) {
                        setMessage("Maximum quantity per checkout is 5.");
                        return 5;
                      }
                      return value + 1;
                    });
                  }}
                  className="rounded px-3 py-1 text-sm transition hover:bg-white"
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
                  onClick={() => {
                    const candidate = couponInput.trim();
                    if (!candidate) {
                      setMessage("Please enter a coupon code first.");
                      return;
                    }

                    const discountRule = getDiscountRate(candidate);
                    if (!discountRule) {
                      setAppliedCoupon("");
                      setMessage("Coupon not recognized. Try SAVE10 or KHMER5.");
                      return;
                    }

                    setAppliedCoupon(candidate);
                    setMessage(`Coupon ${candidate.toUpperCase()} applied.`);
                  }}
                  className="rounded-md border border-border px-4 py-2 text-sm transition hover:border-slate-400"
                >
                  Apply
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setStep(2);
              }}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Continue to Payment
            </button>

            {message ? <p className="text-xs text-muted">{message}</p> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-border p-3 text-sm text-muted">
              Open payment modal, generate QR, complete payment, then continue once confirmation is received.
            </p>
            <div className="rounded-md border border-border bg-white p-3 text-xs text-muted">
              <p className="font-medium text-foreground">Checkout Steps</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Click Purchase below.</li>
                <li>Select provider and generate payment QR.</li>
                <li>Scan/pay, then wait for redirect or continue manually.</li>
              </ol>
            </div>
            <PaymentModal templateId={templateId} templateTitle={templateTitle} amountUsd={pricing.total} />
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400"
            >
              Back
            </button>
          </div>
        ) : null}


      </section>

      <aside className="sticky top-4 h-fit rounded-lg border border-border bg-white p-4 sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
        <p className="mt-1 text-xs text-muted">{templateTitle}</p>

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
          <div className="flex items-center justify-between">
            <span className="text-muted">Delivery</span>
            <span>$0.00 (digital)</span>
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
