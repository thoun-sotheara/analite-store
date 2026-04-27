import { EnhancedOrderManager } from "@/components/dashboard/enhanced-order-manager";
import { DbTemplateManager, CategoryManager } from "@/components/dashboard/db-template-manager";
import { SupportTicketManager } from "@/components/dashboard/support-ticket-manager";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { CustomerAnalytics } from "@/components/dashboard/customer-analytics";
import { PerformanceMetrics } from "@/components/dashboard/performance-metrics";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { InventoryManagement } from "@/components/dashboard/inventory-management";
import { VendorManagement } from "@/components/dashboard/vendor-management";
import { RevenueBreakdown } from "@/components/dashboard/revenue-breakdown";
import { ExportReports } from "@/components/dashboard/export-reports";
import { SystemSettings } from "@/components/dashboard/system-settings";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import Link from "next/link";
import { getDashboardAnalytics } from "@/lib/db/dashboard-analytics";
import {
  getDashboardActivity,
  getDashboardCustomers,
  getDashboardInventory,
  getDashboardStats,
} from "@/lib/db/dashboard-data";

const quickActions = [
  { label: "Add New Product", href: "/dashboard?tab=catalog#template-manager", icon: "📦" },
  { label: "View Reports", href: "/dashboard?tab=admin#export-reports", icon: "📊" },
  { label: "Manage Users", href: "/dashboard?tab=admin#system-settings", icon: "👥" },
  { label: "Email Templates", href: "mailto:support@analite-kit.vercel.app?subject=Email%20Template%20Request", icon: "✉️" },
];

const validTabs = new Set(["overview", "catalog", "orders", "admin"] as const);

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const requestedTab = params?.tab;
  const initialTab = requestedTab && validTabs.has(requestedTab as "overview" | "catalog" | "orders" | "admin")
    ? (requestedTab as "overview" | "catalog" | "orders" | "admin")
    : "overview";

  const [analytics, statsData, customersData, activityData, inventoryData] = await Promise.all([
    getDashboardAnalytics(),
    getDashboardStats(),
    getDashboardCustomers(),
    getDashboardActivity(),
    getDashboardInventory(),
  ]);

  const stats = [
    { label: "Total Revenue", value: formatUsd(statsData.totalRevenueUsd), trend: "All completed transactions" },
    { label: "Total Orders", value: statsData.totalOrders.toLocaleString(), trend: "Completed orders" },
    { label: "Avg Order Value", value: formatUsd(analytics.avgOrderValueUsd), trend: "Revenue per completed order" },
    { label: "Conversion Rate", value: `${analytics.conversionRatePct.toFixed(2)}%`, trend: "Orders / page views" },
    { label: "Total Customers", value: customersData.totalCustomers.toLocaleString(), trend: "Unique paying customers" },
    { label: "Page Views", value: analytics.totalPageViews.toLocaleString(), trend: "Last 60 days" },
  ];

  const customerMetrics = [
    {
      title: "Total Customers",
      value: customersData.totalCustomers.toLocaleString(),
      change: `${customersData.recentSignups} new this month`,
      trend: "up" as const,
      color: "border-blue-200 bg-blue-50",
    },
    {
      title: "Repeat Buyers",
      value: customersData.repeatBuyers.toLocaleString(),
      change: "Customers with 2+ purchases",
      trend: "up" as const,
      color: "border-green-200 bg-green-50",
    },
    {
      title: "Recent Signups",
      value: customersData.recentSignups.toLocaleString(),
      change: "Last 30 days",
      trend: "up" as const,
      color: "border-purple-200 bg-purple-50",
    },
    {
      title: "Customer Base",
      value: statsData.totalUsers.toLocaleString(),
      change: "All registered users",
      trend: "up" as const,
      color: "border-orange-200 bg-orange-50",
    },
  ];

  const recentCustomers = customersData.recentCustomers.map((customer) => ({
    name: customer.name,
    email: customer.email,
    purchases: customer.purchases,
    totalSpent: formatUsd(customer.totalSpent),
    joinDate: new Date(customer.joinDate).toLocaleDateString(),
    status: customer.status === "new" ? "New" : "Active",
  }));

  const inventoryItems = inventoryData.slice(0, 20).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    views: item.views,
    downloads: item.downloads,
    rating: item.rating,
    revenueUsd: item.revenue,
    status: item.status,
  }));

  const performanceHighlights = [
    {
      label: "Top Category",
      value: analytics.topCategory,
      detail: analytics.topCategory === "No data" ? "No sales yet" : formatUsd(analytics.topCategoryRevenueUsd),
    },
    {
      label: "Fastest Growing",
      value: analytics.fastestGrowingCategory,
      detail: analytics.fastestGrowingCategory === "No data"
        ? "No growth data"
        : `${analytics.fastestGrowthPct >= 0 ? "+" : ""}${analytics.fastestGrowthPct.toFixed(1)}% vs prev 7 days`,
    },
    {
      label: "Repeat Buyers",
      value: `${analytics.repeatBuyerRatePct.toFixed(1)}%`,
      detail: "Completed purchase history",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 md:px-8 lg:px-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="animate-fade-up text-4xl font-bold text-foreground sm:text-5xl">
            Merchant Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Complete analytics, real-time sales data, customer insights, and store management tools.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard?tab=admin#export-reports" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50">
            📥 Export Report
          </Link>
          <Link href="/dashboard?tab=admin#system-settings" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
            ⚙️ Settings
          </Link>
        </div>
      </div>

      <DashboardTabs
        initialTab={initialTab}
        overview={(
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-surface p-4 transition hover:shadow-md"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-75">{item.label}</p>
                  <p className="mt-3 text-xl font-bold text-foreground sm:text-2xl">{item.value}</p>
                  <p className="mt-2 text-xs font-semibold text-muted">{item.trend}</p>
                </div>
              ))}
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
                <div className="mt-4 space-y-2">
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="block w-full rounded-lg border border-border bg-surface px-4 py-2 text-left text-sm font-medium text-foreground transition hover:border-foreground"
                    >
                      {action.icon} {action.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 space-y-3">
                {performanceHighlights.map((card) => (
                  <article
                    key={card.label}
                    className="rounded-xl border border-border bg-white p-4 transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                          {card.label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{card.value}</p>
                      </div>
                      <p className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                        {card.detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <PerformanceMetrics
              kpis={[
                {
                  title: "Revenue",
                  value: formatUsd(statsData.totalRevenueUsd),
                  change: "Completed transactions",
                  trend: "up",
                  description: "Gross revenue captured",
                  color: "border-green-200 bg-green-50 text-green-900",
                },
                {
                  title: "Orders",
                  value: statsData.totalOrders.toLocaleString(),
                  change: "Total fulfilled orders",
                  trend: "up",
                  description: "Order volume to date",
                  color: "border-blue-200 bg-blue-50 text-blue-900",
                },
                {
                  title: "Templates",
                  value: statsData.totalTemplates.toLocaleString(),
                  change: "Catalog items tracked",
                  trend: "neutral",
                  description: "Products in catalog",
                  color: "border-purple-200 bg-purple-50 text-purple-900",
                },
              ]}
            />

            <AnalyticsCharts
              revenueByDay={analytics.revenueByDay}
              topProducts={analytics.topProducts}
              categoryDistribution={analytics.categoryDistribution}
            />

            <InventoryManagement inventoryItems={inventoryItems} />
            <CustomerAnalytics customerMetrics={customerMetrics} recentCustomers={recentCustomers} />
            <RecentActivityFeed recentActivities={activityData} />
            <RevenueBreakdown
              paymentMethods={analytics.paymentMethods}
              totalRefunds={analytics.totalRefunds}
              refundRatePct={analytics.refundRatePct}
              avgTransactionUsd={analytics.avgTransactionUsd}
              totalTransactions={analytics.totalTransactions}
            />
          </>
        )}
        catalog={(
          <>
            <DbTemplateManager />
            <CategoryManager />
            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 sm:p-6">
              <h3 className="text-base font-semibold text-amber-950">Template Creation Note</h3>
              <p className="mt-2 max-w-3xl">
                Upload actual template ZIP and image files from this dashboard. Files are stored in object storage and only their keys are saved in the database.
              </p>
            </section>
          </>
        )}
        orders={(
          <>
            <EnhancedOrderManager />
            <div className="mt-6">
              <SupportTicketManager />
            </div>
          </>
        )}
        admin={(
          <>
            <VendorManagement />
            <ExportReports />
            <SystemSettings />
          </>
        )}
      />
    </main>
  );
}
