"use client";

import { TrendingUp, TrendingDown, BarChart3, PieChart, LineChart } from "lucide-react";

type ChartData = {
  label: string;
  value: number;
  change: number;
  changeDirection: "up" | "down";
};

type AnalyticsChartsProps = {
  revenueByDay: ChartData[];
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  categoryDistribution: Array<{ name: string; percentage: number; value: number }>;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function AnalyticsCharts({
  revenueByDay,
  topProducts,
  categoryDistribution,
}: AnalyticsChartsProps) {
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.value), 1);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {/* Revenue Trend */}
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <LineChart className="h-5 w-5" /> Revenue Trend (7 Days)
            </h3>
            <p className="mt-1 text-sm text-muted">Daily sales performance</p>
          </div>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            Live data pending
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {revenueByDay.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
              No revenue trend data yet.
            </div>
          ) : revenueByDay.map((day) => (
            <div key={day.label} className="flex items-center gap-3">
              <span className="w-8 text-xs font-semibold text-muted">{day.label}</span>
              <div className="flex-1">
                <div className="relative h-6 overflow-hidden rounded-md bg-surface">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                    style={{ width: `${(day.value / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex w-24 items-center justify-between text-right">
                <span className="text-sm font-medium text-foreground">{formatUsd(day.value)}</span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    day.changeDirection === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {day.changeDirection === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {day.change > 0 ? "+" : ""}
                  {day.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5" /> Top Selling Products
        </h3>
        <p className="mt-1 text-sm text-muted">Best performers this month</p>

        <div className="mt-5 space-y-3">
          {topProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
              No top product data yet.
            </div>
          ) : topProducts.map((product, idx) => (
            <div
              key={product.name}
              className="rounded-lg border border-border bg-surface p-3 transition hover:border-foreground"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {idx + 1}. {product.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">{product.sales} sales • {formatUsd(product.revenue)}</p>
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    #{idx + 1}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 lg:col-span-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <PieChart className="h-5 w-5" /> Sales by Category
        </h3>
        <p className="mt-1 text-sm text-muted">Revenue distribution across categories</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {categoryDistribution.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted lg:col-span-4">
              No category distribution data yet.
            </div>
          ) : categoryDistribution.map((cat) => (
            <div key={cat.name} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                <span className="text-xs font-bold text-blue-600">{cat.percentage}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{formatUsd(cat.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
