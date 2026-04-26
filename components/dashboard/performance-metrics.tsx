"use client";

import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export type PerformanceKpi = {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  description: string;
  color: string;
};

type PerformanceMetricsProps = {
  kpis: PerformanceKpi[];
};

export function PerformanceMetrics({ kpis }: PerformanceMetricsProps) {
  const iconCycle = [TrendingUp, TrendingDown, TrendingUp];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Key Performance Indicators</h2>
          <p className="mt-1 text-sm text-muted">Real-time metrics showing marketplace health</p>
        </div>
        <select className="rounded-md border border-border px-3 py-2 text-sm outline-none">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Last 90 Days</option>
          <option>Year to Date</option>
        </select>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted lg:col-span-3">
            No KPI data yet.
          </div>
        ) : kpis.map((kpi, idx) => {
          const Icon = iconCycle[idx % iconCycle.length];
          return (
            <div
              key={kpi.title}
              className={`rounded-xl border p-5 transition hover:shadow-md ${kpi.color}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{kpi.title}</p>
                  <p className="mt-3 text-2xl font-bold">{kpi.value}</p>
                  <p className="mt-1 text-xs opacity-60">{kpi.description}</p>
                </div>
                <div className="rounded-lg bg-white/40 p-2">
                  <Icon className="h-5 w-5 opacity-50" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-current border-opacity-10">
                {kpi.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 opacity-60" />
                ) : kpi.trend === "down" ? (
                  <TrendingDown className="h-4 w-4 opacity-60" />
                ) : null}
                <span className="text-sm font-semibold">{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
