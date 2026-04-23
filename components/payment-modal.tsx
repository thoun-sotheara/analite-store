"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type CheckoutResponse = {
  ok: boolean;
  transactionId: string;
  templateId: string;
  amount: number;
  provider: "aba" | "bakong";
  qrImageUrl: string;
  expiresAt: string;
  message?: string;
};

type PaymentStatusResponse = {
  ok: boolean;
  status: "pending" | "completed";
  templateId?: string;
};

type PaymentModalProps = {
  templateId: string;
  templateTitle: string;
  amountUsd: number;
};

export function PaymentModal({ templateId, templateTitle, amountUsd }: PaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"aba" | "bakong">("bakong");
  const [pending, setPending] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!checkoutData?.expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      const delta = Math.floor((new Date(checkoutData.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(delta, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [checkoutData?.expiresAt]);

  useEffect(() => {
    if (!checkoutData?.transactionId) {
      return;
    }

    const pollInterval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/checkout/${checkoutData.transactionId}`, {
          method: "GET",
          cache: "no-store",
        });
        const status = (await response.json()) as PaymentStatusResponse;

        if (status.ok && status.status === "completed") {
          window.clearInterval(pollInterval);
          window.location.href = `/success?tx=${checkoutData.transactionId}&template=${templateId}`;
        }
      } catch {
        // Ignore transient poll issues.
      }
    }, 3000);

    return () => window.clearInterval(pollInterval);
  }, [checkoutData?.transactionId, templateId]);

  const clock = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  async function startCheckout() {
    setErrorMessage("");

    if (!email.includes("@")) {
      setErrorMessage("A valid email is required.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, email, provider }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "Unable to start checkout.");
        setPending(false);
        return;
      }

      setCheckoutData({ ...data, templateId });
      setPending(false);
    } catch {
      setErrorMessage("Checkout failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
      >
        Purchase
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-4xl rounded-lg border border-border bg-white p-4 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Secure Checkout</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-border p-2 text-muted hover:text-foreground"
                aria-label="Close checkout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-md border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Order Summary</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">{templateTitle}</h3>
                <p className="mt-1 text-sm text-muted">Total: ${amountUsd.toFixed(2)}</p>

                <label htmlFor="checkout-email" className="mt-4 block text-sm text-muted">
                  Buyer Email
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
                />

                <label htmlFor="checkout-provider" className="mt-3 block text-sm text-muted">
                  Payment Method
                </label>
                <select
                  id="checkout-provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as "aba" | "bakong")}
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
                >
                  <option value="bakong">Bakong KHQR</option>
                  <option value="aba">ABA PayWay</option>
                </select>

                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={pending}
                  className="mt-4 w-full rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {pending ? "Creating payment..." : "Generate Payment QR"}
                </button>

                {checkoutData ? (
                  <Link
                    href={`/success?tx=${checkoutData.transactionId}&template=${templateId}`}
                    className="mt-3 inline-flex text-xs text-muted hover:text-foreground"
                  >
                    I already paid, continue manually
                  </Link>
                ) : null}

                {errorMessage ? <p className="mt-3 text-xs text-red-600">{errorMessage}</p> : null}
              </section>

              <section className="rounded-md border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Dynamic QR</p>
                {checkoutData ? (
                  <>
                    <p className="mt-2 text-sm text-muted">Transaction: {checkoutData.transactionId}</p>
                    <p className="mt-1 text-sm text-muted">Provider: {checkoutData.provider.toUpperCase()}</p>
                    <p className="mt-1 text-sm text-muted">Expires in: {clock}</p>
                    <img
                      src={checkoutData.qrImageUrl}
                      alt="Payment QR"
                      className="mt-4 h-64 w-64 rounded-md border border-border bg-white p-2"
                    />
                    <p className="mt-3 text-xs text-muted">
                      We are polling for webhook confirmation. This page will redirect automatically once paid.
                    </p>
                  </>
                ) : (
                  <div className="mt-4 flex h-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted">
                    QR placeholder appears here after checkout initialization.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
