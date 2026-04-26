"use client";

import { useMemo, useState } from "react";

type OrderStatus = "Completed" | "Pending" | "Refunded";

type OrderItem = {
  id: string;
  buyer: string;
  product: string;
  amount: number;
  status: OrderStatus;
  date: string;
};

const orders: OrderItem[] = [
  { id: "ORD-1001", buyer: "buyer@analite.store", product: "Khmer Shopfront", amount: 79, status: "Completed", date: "2026-04-23" },
  { id: "ORD-1002", buyer: "agency@borey.studio", product: "Phnom Villa Pro", amount: 49, status: "Pending", date: "2026-04-22" },
  { id: "ORD-1003", buyer: "events@everafter.kh", product: "Moonlight Invitation", amount: 29, status: "Completed", date: "2026-04-21" },
  { id: "ORD-1004", buyer: "creator@studionine.design", product: "Creator Profile One", amount: 39, status: "Refunded", date: "2026-04-20" },
];

export function DashboardOperations() {
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [query, setQuery] = useState("");

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatch = statusFilter === "All" || order.status === statusFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${order.id} ${order.buyer} ${order.product}`.toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [query, statusFilter]);

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="elevated-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Order History</h2>
            <p className="mt-1 text-sm text-muted">Filter recent transactions by buyer, order ID, and status.</p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All" | OrderStatus)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order ID, buyer, or product"
          className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
        />

        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-3 pr-4 font-medium">Order</th>
                <th className="pb-3 pr-4 font-medium">Buyer</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id} className="border-t border-border align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-foreground">{order.id}</p>
                    <p className="text-xs text-muted">{order.product}</p>
                  </td>
                  <td className="py-3 pr-4 text-muted">{order.buyer}</td>
                  <td className="py-3 pr-4 text-foreground">${order.amount.toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">{order.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 space-y-3 md:hidden" data-stagger="true">
          {visibleOrders.map((order) => (
            <article key={order.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{order.id}</p>
                  <p className="text-xs text-muted">{order.product}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">{order.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{order.buyer}</p>
              <p className="mt-2 text-sm font-medium text-foreground">${order.amount.toFixed(2)}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="elevated-card rounded-2xl p-5 sm:p-6" data-stagger="true">
        <h2 className="text-lg font-semibold text-foreground">Support Queue</h2>
        <p className="mt-1 text-sm text-muted">A simple support center preview for store operations.</p>
        <div className="mt-5 space-y-3 text-sm">
          <div className="rounded-lg border border-border p-4">
            <p className="font-medium text-foreground">Payment Issue</p>
            <p className="mt-1 text-muted">Customer cannot find invoice after checkout completion.</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="font-medium text-foreground">License Question</p>
            <p className="mt-1 text-muted">Buyer asked whether one purchase covers multiple client deployments.</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="font-medium text-foreground">Customization Help</p>
            <p className="mt-1 text-muted">Merchant requested setup guidance for a new storefront template.</p>
          </div>
        </div>
      </article>
    </section>
  );
}
