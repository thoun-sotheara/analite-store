"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreVertical, RefreshCw, FileText } from "lucide-react";

type OrderStatus = "Completed" | "Pending";

type OrderItemWithActions = {
  id: string;
  buyer: string;
  buyerEmail: string;
  product: string;
  amount: number;
  status: OrderStatus;
  date: string;
  licenseKey: string;
  bankRef: string;
  itemCount: number;
  invoiceUrl: string | null;
};

const statusColors: Record<OrderStatus, string> = {
  Completed: "text-green-700 bg-green-50 border-green-200",
  Pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

export function EnhancedOrderManager() {
  const [orders, setOrders] = useState<OrderItemWithActions[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [query, setQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/orders", { cache: "no-store" });
      if (!response.ok) {
        setOrders([]);
        return;
      }

      setOrders(await response.json());
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatch = statusFilter === "All" || order.status === statusFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${order.id} ${order.buyer} ${order.product} ${order.buyerEmail}`.toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [orders, query, statusFilter]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Order Management</h2>
          <p className="mt-1 text-sm text-muted">View, process, and manage customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | OrderStatus)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:border-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search order ID, customer, email, or product..."
        className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
      />

      <div className="mt-5 space-y-3" data-stagger="true">
        {loading ? (
          <p className="text-sm text-muted">Loading orders...</p>
        ) : null}
        {visibleOrders.map((order) => (
          <div
            key={order.id}
            className="cursor-pointer rounded-lg border border-border p-4 transition hover:border-foreground"
            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-mono text-xs font-semibold text-muted">{order.id}</span>
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Customer</p>
                    <p className="font-medium text-foreground">{order.buyer}</p>
                    <p className="text-xs text-muted">{order.buyerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Product</p>
                    <p className="font-medium text-foreground">{order.product}</p>
                    <p className="text-xs text-muted">${order.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Order Date</p>
                    <p className="font-medium text-foreground">{order.date}</p>
                    <p className="text-xs text-muted">License: {order.licenseKey}</p>
                    <p className="text-xs text-muted">Bank Ref: {order.bankRef}</p>
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div className="text-xs">
                      <p className="mb-2 font-semibold text-foreground">Order Details</p>
                      <div className="flex flex-wrap gap-2">
                        {order.invoiceUrl ? (
                          <Link
                            href={order.invoiceUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                          >
                            <FileText className="h-3 w-3" /> Download Invoice
                          </Link>
                        ) : null}
                        <span className="rounded-md border border-border px-3 py-1 text-xs text-muted">
                          Items: {order.itemCount}
                        </span>
                        <span className="rounded-md border border-border px-3 py-1 text-xs text-muted">
                          Refund and resend automation remain payment-provider tasks.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedOrder(expandedOrder === order.id ? null : order.id);
                }}
                className="flex-shrink-0 rounded-md p-1 text-muted transition hover:bg-surface"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && visibleOrders.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted">No orders found matching your criteria</p>
        </div>
      )}
    </section>
  );
}
