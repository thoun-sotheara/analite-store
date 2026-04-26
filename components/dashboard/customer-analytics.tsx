"use client";

import { Users, ShoppingBag, Repeat2, Wallet, TrendingUp } from "lucide-react";

export type CustomerMetric = {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  color: string;
};

export type RecentCustomer = {
  name: string;
  email: string;
  purchases: number;
  totalSpent: string;
  joinDate: string;
  status: string;
};

type CustomerAnalyticsProps = {
  customerMetrics: CustomerMetric[];
  recentCustomers: RecentCustomer[];
};

export function CustomerAnalytics({ customerMetrics, recentCustomers }: CustomerAnalyticsProps) {
  const resolveIcon = (title: string) => {
    const normalized = title.toLowerCase();
    if (normalized.includes("repeat")) return Repeat2;
    if (normalized.includes("spent") || normalized.includes("revenue")) return Wallet;
    if (normalized.includes("new") || normalized.includes("sign")) return TrendingUp;
    if (normalized.includes("purchase") || normalized.includes("order")) return ShoppingBag;
    return Users;
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Customer KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {customerMetrics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted lg:col-span-4">
            No customer KPI data yet.
          </div>
        ) : customerMetrics.map((metric) => {
          const Icon = resolveIcon(metric.title);
          return (
            <div
              key={metric.title}
              className={`rounded-xl border p-5 transition hover:shadow-lg ${metric.color}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{metric.title}</p>
                  <p className="mt-2 text-2xl font-bold">{metric.value}</p>
                  <p className="mt-2 text-xs font-semibold text-green-600">
                    {metric.trend === "up" ? "↑" : "↓"} {metric.change}
                  </p>
                </div>
                <div className="rounded-lg bg-white/50 p-2">
                  <Icon className="h-5 w-5 opacity-50" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Customers */}
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Top Recent Customers</h3>
            <p className="mt-1 text-sm text-muted">Latest customer activity and purchases</p>
          </div>
          <button className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-slate-50">
            View All Customers
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Purchases</th>
                <th className="pb-3 pr-4 font-medium">Total Spent</th>
                <th className="pb-3 pr-4 font-medium">Join Date</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCustomers.length === 0 ? (
                <tr>
                  <td className="py-4 text-sm text-muted" colSpan={5}>
                    No recent customer activity yet.
                  </td>
                </tr>
              ) : recentCustomers.map((customer) => (
                <tr key={customer.email} className="border-t border-border">
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-semibold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted">{customer.email}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{customer.purchases}</td>
                  <td className="py-3 pr-4 font-semibold text-foreground">{customer.totalSpent}</td>
                  <td className="py-3 pr-4 text-muted">{customer.joinDate}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        customer.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
