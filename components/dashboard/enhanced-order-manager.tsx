"use client";

import { useMemo, useState } from "react";
import { MoreVertical, RefreshCw, RotateCcw, FileText } from "lucide-react";

type OrderStatus = "Completed" | "Pending" | "Refunded" | "Failed";

type OrderItemWithActions = {
  id: string;
  buyer: string;
  buyerEmail: string;
  product: string;
  amount: number;
  status: OrderStatus;
  date: string;
  licenseKey: string;
  downloadUrl?: string;
};

const orders: OrderItemWithActions[] = [
  {
    id: "ORD-1001",
    buyer: "Demo User",
    buyerEmail: "demo@analite.store",
    product: "Khmer Shopfront",
    amount: 79,
    status: "Completed",
    date: "2026-04-23",
    licenseKey: "KS-2026-0001-DEMO",
    downloadUrl: "/downloads/khmer-shopfront.zip",
  },
  {
    id: "ORD-1002",
    buyer: "Borey Craft",
    buyerEmail: "agency@borey.studio",
    product: "Phnom Villa Pro",
    amount: 49,
    status: "Pending",
    date: "2026-04-22",
    licenseKey: "PV-2026-0002-PENDING",
  },
  {
    id: "ORD-1003",
    buyer: "Ever After",
    buyerEmail: "events@everafter.kh",
    product: "Moonlight Invitation",
    amount: 29,
    status: "Completed",
    date: "2026-04-21",
    licenseKey: "MI-2026-0003-DEMO",
    downloadUrl: "/downloads/moonlight-invitation.zip",
  },
  {
    id: "ORD-1004",
    buyer: "Studio Nine",
    buyerEmail: "creator@studionine.design",
    product: "Creator Profile One",
    amount: 39,
    status: "Refunded",
    date: "2026-04-20",
    licenseKey: "CP-2026-0004-REFUNDED",
  },
];

const statusColors: Record<OrderStatus, string> = {
  Completed: "text-green-700 bg-green-50 border-green-200",
  Pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
  Refunded: "text-red-700 bg-red-50 border-red-200",
  Failed: "text-gray-700 bg-gray-50 border-gray-200",
};

export function EnhancedOrderManager() {
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [query, setQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatch = statusFilter === "All" || order.status === statusFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${order.id} ${order.buyer} ${order.product} ${order.buyerEmail}`.toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [query, statusFilter]);

  const handleAction = (orderId: string, action: string) => {
    console.log(`Action: ${action} on order: ${orderId}`);
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Order Management</h2>
          <p className="mt-1 text-sm text-muted">View, process, and manage customer orders</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | OrderStatus)}
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
          <option value="Refunded">Refunded</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search order ID, customer, email, or product..."
        className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
      />

      <div className="mt-5 space-y-3" data-stagger="true">
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
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div className="text-xs">
                      <p className="mb-2 font-semibold text-foreground">Order Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAction(order.id, "resendEmail")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                        >
                          <RotateCcw className="h-3 w-3" /> Resend Email
                        </button>
                        <button
                          onClick={() => handleAction(order.id, "regenerateLicense")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                        >
                          <RefreshCw className="h-3 w-3" /> Regenerate License
                        </button>
                        <button
                          onClick={() => handleAction(order.id, "generateInvoice")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                        >
                          <FileText className="h-3 w-3" /> Generate Invoice
                        </button>
                        {order.status === "Completed" && (
                          <button
                            onClick={() => handleAction(order.id, "refund")}
                            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 transition hover:border-red-400"
                          >
                            <RotateCcw className="h-3 w-3" /> Process Refund
                          </button>
                        )}
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

      {visibleOrders.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted">No orders found matching your criteria</p>
        </div>
      )}
    </section>
  );
}
