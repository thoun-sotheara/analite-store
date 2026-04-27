"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import QRCodeSVG from "react-qr-code";

type CheckoutResponse = {
  ok: boolean;
  transactionId: string;
  templateId: string;
  amount: number;
  isBundle?: boolean;
  lineItems?: Array<{
    templateId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  provider: "khpay" | "aba-payway";
  paymentUrl?: string;
  khqrString?: string;
  qrImageUrl?: string;
  expiresAt: string;
  expiresIn?: number;
  message?: string;
};

type PaymentStatusResponse = {
  ok: boolean;
  status: "pending" | "completed" | "paid" | "success";
  templateId?: string;
  isBundle?: boolean;
  provider?: string;
  requiresManualConfirmation?: boolean;
  message?: string;
};

type PaymentModalProps = {
  templateId?: string;
  templateTitle?: string;
  amountUsd: number;
  lineItems?: Array<{ templateId: string; quantity: number }>;
  purchaseLabel?: string;
};

export function PaymentModal({
  templateId,
  templateTitle,
  amountUsd,
  lineItems,
  purchaseLabel,
}: PaymentModalProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [manualConfirmHint, setManualConfirmHint] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function resetModalState() {
    setPending(false);
    setCheckoutData(null);
    setSecondsLeft(0);
    setSuccessCountdown(null);
    setIsRedirecting(false);
    setManualConfirmHint("");
    setErrorMessage("");
  }

  function openModal() {
    resetModalState();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    resetModalState();
  }

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
        console.log("[payment-modal] polled status", {
          transactionId: checkoutData.transactionId,
          httpStatus: response.status,
          body: status,
        });

        const normalizedStatus = String(status.status ?? "").toLowerCase();
        const isSuccess = status.ok && ["completed", "paid", "success"].includes(normalizedStatus);

        if (status.ok && status.requiresManualConfirmation) {
          setManualConfirmHint(status.message ?? "Payment status requires manual confirmation.");
        }

        if (isSuccess) {
          window.clearInterval(pollInterval);
          setManualConfirmHint("");
          setIsRedirecting(true);
          setSuccessCountdown(3);
        }
      } catch {
        // Ignore transient poll issues.
        console.warn("[payment-modal] poll failed", { transactionId: checkoutData.transactionId });
      }
    }, 3000);

    return () => window.clearInterval(pollInterval);
  }, [checkoutData?.transactionId, checkoutData]);

  useEffect(() => {
    if (!isRedirecting || !checkoutData?.transactionId) {
      return;
    }

    const tick = window.setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev === null) return 2;
        return Math.max(prev - 1, 0);
      });
    }, 1000);

    const redirectTimer = window.setTimeout(() => {
      window.location.href = `/success?tx=${checkoutData.transactionId}`;
    }, 3000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(redirectTimer);
    };
  }, [isRedirecting, checkoutData?.transactionId, checkoutData]);

  const clock = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  async function startCheckout() {
    setErrorMessage("");
    setManualConfirmHint("");
    setIsRedirecting(false);
    setSuccessCountdown(null);

    const email = session?.user?.email ?? "";
    if (!email.includes("@")) {
      setErrorMessage("A valid signed-in email is required. Please sign in again and retry checkout.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          lineItems?.length
            ? {
                provider: "khpay",
                items: lineItems,
              }
            : {
                provider: "khpay",
                templateId,
              },
        ),
      });

      const data = (await response.json()) as CheckoutResponse;
      console.log("[checkout] Response status:", response.status, "data:", {
        ok: data.ok,
        transactionId: data.transactionId,
        paymentUrl: data.paymentUrl,
        khqrString: data.khqrString ? data.khqrString.slice(0, 40) + "..." : undefined,
      });

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "Unable to start checkout. Please try again.");
        setPending(false);
        return;
      }

      setCheckoutData({ ...data, templateId: templateId ?? data.templateId });
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
        onClick={openModal}
        className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
      >
        Purchase
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={closeModal}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Secure Checkout</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-border p-2 text-muted transition hover:text-foreground"
                aria-label="Close checkout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-md border border-border bg-surface p-3 text-xs text-muted">
              <p className="font-medium text-foreground">Checkout guide</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Generate your KHQR code.</li>
                <li>Pay in any KHQR-supported banking app.</li>
                <li>Wait for automatic payment confirmation redirect.</li>
              </ol>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-md border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Order Summary</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">{purchaseLabel ?? templateTitle ?? "Template Purchase"}</h3>
                <p className="mt-1 text-sm text-muted">Total: ${amountUsd.toFixed(2)}</p>

                {lineItems?.length ? (
                  <div className="mt-3 rounded-md border border-border bg-surface p-3 text-xs text-muted">
                    <p>Items in this payment: {lineItems.length}</p>
                    <p className="mt-1">Total units: {lineItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  </div>
                ) : null}

                <label htmlFor="checkout-email" className="mt-4 block text-sm text-muted">
                  Buyer Email
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={session?.user?.email ?? ""}
                  readOnly
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
                />

                <p className="mt-3 text-sm text-muted">Payment Method: KHQR</p>

                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={pending}
                  className="mt-4 w-full rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {pending ? "Creating payment..." : "Generate KHQR"}
                </button>

                {checkoutData?.paymentUrl ? (
                  <a
                    href={checkoutData.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs text-muted hover:text-foreground"
                  >
                    Open hosted payment page
                  </a>
                ) : null}

                {errorMessage ? <p className="mt-3 text-xs text-red-600">{errorMessage}</p> : null}
                {manualConfirmHint ? <p className="mt-3 text-xs text-amber-700">{manualConfirmHint}</p> : null}
                {isRedirecting ? (
                  <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    Payment successful. Redirecting in {successCountdown ?? 3}s...
                  </p>
                ) : null}
              </section>

              <section className="rounded-xl border border-[#d8e5ff] bg-gradient-to-b from-[#f5f9ff] to-white p-4">
                <div className="rounded-lg bg-[#0b3b8f] p-3 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-blue-100">ABA Style KHQR</p>
                      <p className="text-sm font-semibold">Scan To Pay</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image src="/aba-pay-wordmark.svg" alt="ABA Pay" width={66} height={20} unoptimized />
                      <Image src="/khqr-badge.svg" alt="KHQR" width={46} height={20} unoptimized />
                    </div>
                  </div>
                </div>

                {checkoutData ? (
                  <>
                    <div className="mt-3 rounded-md border border-[#cfe0ff] bg-white px-3 py-2 text-xs text-slate-600">
                      <p>Transaction: {checkoutData.transactionId}</p>
                      <p className="mt-1">Amount: ${checkoutData.amount.toFixed(2)} USD</p>
                    </div>

                    <div className="mt-3 rounded-md border border-[#93b7ff] bg-[#eef4ff] p-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#19479f]">Time Remaining</p>
                      <p className="mt-1 text-2xl font-bold text-[#0b3b8f]">{clock}</p>
                    </div>

                    {checkoutData.khqrString ? (
                      <div className="mx-auto mt-4 flex aspect-square w-full max-w-[260px] items-center justify-center rounded-md border border-[#cfdbf2] bg-white p-2">
                        <QRCodeSVG
                          value={checkoutData.khqrString}
                          size={240}
                          level="M"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                    ) : checkoutData.provider === "aba-payway" && checkoutData.paymentUrl ? (
                      <div className="mx-auto mt-4 flex flex-col items-center gap-1">
                        <div className="flex aspect-square w-full max-w-[260px] items-center justify-center rounded-md border border-[#cfdbf2] bg-white p-2">
                          <QRCodeSVG
                            value={checkoutData.paymentUrl}
                            size={240}
                            level="M"
                            style={{ width: "100%", height: "100%" }}
                          />
                        </div>
                        <p className="text-center text-xs text-amber-600">
                          Scan to open PayWay payment page — enter the amount there to pay
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 flex h-[260px] items-center justify-center rounded-md border border-dashed border-[#9ab5e6] bg-white px-4 text-center text-sm text-slate-500">
                        {checkoutData.provider === "aba-payway"
                          ? "Open hosted payment page to generate a bank-scannable QR for this amount."
                          : "QR unavailable. Please retry checkout."}
                      </div>
                    )}

                    <p className="mt-3 text-xs text-muted">
                      {checkoutData.provider === "aba-payway"
                        ? "PayWay status is checked automatically. This page will redirect once payment is approved."
                        : "We are polling for provider confirmation. This page will redirect automatically once paid."}
                    </p>
                  </>
                ) : (
                  <div className="mt-4 flex h-64 items-center justify-center rounded-md border border-dashed border-[#9ab5e6] bg-white text-sm text-slate-500">
                    KHQR placeholder appears here after checkout initialization.
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
