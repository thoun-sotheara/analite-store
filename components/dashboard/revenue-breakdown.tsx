"use client";

import { CreditCard, Zap } from "lucide-react";

type PaymentMethod = {
  name: string;
  amount: number;
  percentage: number;
  transactions: number;
  trend: string;
};

type RevenueBreakdownProps = {
  paymentMethods: PaymentMethod[];
  totalRefunds: number;
  refundRatePct: number;
  avgTransactionUsd: number;
  totalTransactions: number;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function RevenueBreakdown({
  paymentMethods,
  totalRefunds,
  refundRatePct,
  avgTransactionUsd,
  totalTransactions,
}: RevenueBreakdownProps) {

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {/* Payment Methods */}
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <CreditCard className="h-5 w-5" /> Payment Methods
        </h3>
        <p className="mt-1 text-sm text-muted">Revenue distribution by payment method</p>

        <div className="mt-5 space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
              No payment method data yet.
            </div>
          ) : paymentMethods.map((method) => (
            <div key={method.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{method.name}</p>
                  <p className="text-xs text-muted">{method.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatUsd(method.amount)}</p>
                  <p className="text-xs font-semibold text-green-600">{method.trend}</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${method.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted">{method.percentage}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="space-y-4">
        {/* Refund Stats */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Zap className="h-5 w-5" /> Refund Summary
          </h3>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-red-600">Total Refunds</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{formatUsd(totalRefunds)}</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-orange-600">Refund Rate</p>
              <p className="mt-2 text-2xl font-bold text-orange-700">{refundRatePct.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs text-muted">Avg Transaction</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatUsd(avgTransactionUsd)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs text-muted">Total Transactions</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalTransactions.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
