"use client";

import { Package, Eye, Download, Star } from "lucide-react";

export type InventoryProduct = {
  id: string;
  name: string;
  category: string;
  views: number;
  downloads: number;
  rating: number;
  revenueUsd: number;
  status: "active" | "inactive";
};

type InventoryManagementProps = {
  inventoryItems: InventoryProduct[];
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function InventoryManagement({ inventoryItems }: InventoryManagementProps) {
  const inactiveCount = inventoryItems.filter((item) => item.status === "inactive").length;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Package className="h-5 w-5" /> Product Performance
          </h3>
          <p className="mt-1 text-sm text-muted">Inventory status and sales metrics</p>
        </div>
        <div className="flex gap-2">
          {inactiveCount > 0 && (
            <button className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">
              ❌ {inactiveCount} Inactive
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="pb-3 pr-4 font-medium">Product</th>
              <th className="pb-3 pr-4 font-medium">Category</th>
              <th className="pb-3 pr-4 font-medium text-center">Views</th>
              <th className="pb-3 pr-4 font-medium text-center">Downloads</th>
              <th className="pb-3 pr-4 font-medium text-center">Rating</th>
              <th className="pb-3 pr-4 font-medium text-center">Revenue</th>
              <th className="pb-3 pr-4 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.length === 0 ? (
              <tr>
                <td className="py-4 text-sm text-muted" colSpan={7}>
                  No product performance data yet.
                </td>
              </tr>
            ) : inventoryItems.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-surface/50">
                <td className="py-3 pr-4">
                  <p className="font-semibold text-foreground">{item.name}</p>
                </td>
                <td className="py-3 pr-4 text-muted">{item.category}</td>
                <td className="py-3 pr-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    {item.views.toLocaleString()}
                  </div>
                </td>
                <td className="py-3 pr-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-foreground">
                    <Download className="h-3.5 w-3.5" />
                    {item.downloads}
                  </div>
                </td>
                <td className="py-3 pr-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-foreground">{item.rating > 0 ? item.rating.toFixed(1) : "No rating"}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-center font-semibold text-foreground">{formatUsd(item.revenueUsd)}</td>
                <td className="py-3 pr-4 text-center">
                  {item.status === "active" && (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                      Active
                    </span>
                  )}
                  {item.status === "inactive" && (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
