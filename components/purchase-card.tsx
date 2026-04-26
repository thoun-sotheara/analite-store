"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { PaymentSession } from "@/lib/payments/types";

type PurchaseCardProps = {
  templateId: string;
  templateTitle: string;
  amount: number;
  initiateAction: (
    state: PaymentSession,
    formData: FormData,
  ) => Promise<PaymentSession>;
  initialState: PaymentSession;
};

export function PurchaseCard({
  templateId,
  templateTitle,
  amount,
  initiateAction,
  initialState,
}: PurchaseCardProps) {
  const [state, formAction, pending] = useActionState(initiateAction, initialState);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!state.expiresAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const delta = Math.floor((new Date(state.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(delta, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [state.expiresAt]);

  const clock = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  return (
    <aside className="glass-card sticky top-4 rounded-2xl p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Purchase {templateTitle}</h2>
      <p className="mt-2 text-sm text-muted">Secure checkout via ABA PayWay or Bakong KHQR.</p>

      <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Total</span>
          <span className="text-xl font-semibold">${amount.toFixed(2)}</span>
        </div>
      </div>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="templateId" value={templateId} />

        <label className="block text-sm text-muted" htmlFor="email">
          Buyer Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <label className="block text-sm text-muted" htmlFor="provider">
          Payment Method
        </label>
        <select
          id="provider"
          name="provider"
          className="w-full rounded-xl border border-border bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-accent"
          defaultValue="bakong"
        >
          <option value="bakong">Bakong KHQR</option>
          <option value="aba">ABA PayWay</option>
        </select>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-60"
        >
          {pending ? "Generating KHQR..." : "Generate QR"}
        </button>
      </form>

      <p className="mt-3 text-xs text-muted">{state.message}</p>

      {state.ok ? (
        <div className="mt-4 rounded-xl border border-accent/40 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-accent">Expires In</p>
          <p className="mt-1 font-mono text-2xl">{clock}</p>

          <Image
            src={state.qrImageUrl}
            alt="KHQR code"
            width={208}
            height={208}
            className="mt-3 rounded-lg border border-border bg-white p-2"
            unoptimized
          />

          <div className="mt-4 space-y-2 text-sm text-muted">
            <p>Transaction: {state.transactionId}</p>
            <p>Provider: {state.provider.toUpperCase()}</p>
          </div>

          <Link
            href={`/success?tx=${state.transactionId}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-accent px-3 py-2 text-sm text-accent transition hover:bg-accent/10"
          >
            I Paid, Continue
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
