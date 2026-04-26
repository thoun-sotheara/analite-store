"use client";

import { useState } from "react";

type DashboardTabsProps = {
  overview: React.ReactNode;
  catalog: React.ReactNode;
  orders: React.ReactNode;
  admin: React.ReactNode;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "catalog", label: "Catalog" },
  { id: "orders", label: "Orders & Support" },
  { id: "admin", label: "Admin Tools" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function DashboardTabs({ overview, catalog, orders, admin }: DashboardTabsProps) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <section className="mt-8">
      <div className="rounded-xl border border-border bg-white p-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                active === tab.id
                  ? "bg-foreground text-white"
                  : "bg-surface text-foreground hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {active === "overview" ? overview : null}
        {active === "catalog" ? catalog : null}
        {active === "orders" ? orders : null}
        {active === "admin" ? admin : null}
      </div>
    </section>
  );
}
