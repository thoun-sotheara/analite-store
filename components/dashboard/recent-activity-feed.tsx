"use client";

import { CheckCircle, ShoppingBag, MessageSquare, Clock } from "lucide-react";

export type ActivityEvent = {
  id: string;
  type: "sale" | "support" | "review";
  title: string;
  description: string;
  timestamp: string;
};

type RecentActivityFeedProps = {
  recentActivities: ActivityEvent[];
};

export function RecentActivityFeed({ recentActivities }: RecentActivityFeedProps) {
  const resolveVisuals = (type: ActivityEvent["type"]) => {
    if (type === "sale") {
      return {
        color: "border-green-200 bg-green-50 text-green-700",
        icon: CheckCircle,
      };
    }
    if (type === "support") {
      return {
        color: "border-amber-200 bg-amber-50 text-amber-700",
        icon: MessageSquare,
      };
    }
    return {
      color: "border-blue-200 bg-blue-50 text-blue-700",
      icon: ShoppingBag,
    };
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Clock className="h-5 w-5" /> Recent Activity
          </h3>
          <p className="mt-1 text-sm text-muted">Real-time updates from your marketplace</p>
        </div>
        <button className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-slate-50">
          See All
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {recentActivities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
            No recent activity yet.
          </div>
        ) : recentActivities.map((activity) => {
          const visuals = resolveVisuals(activity.type);
          const Icon = visuals.icon;
          return (
            <div key={activity.id} className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4">
              <div className={`rounded-lg border p-2 ${visuals.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{activity.title}</h4>
                <p className="mt-1 text-sm text-muted">{activity.description}</p>
                <p className="mt-2 text-xs text-muted">{activity.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
