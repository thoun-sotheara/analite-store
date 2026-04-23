import { DashboardOperations } from "@/components/dashboard/dashboard-operations";
import { EnhancedOrderManager } from "@/components/dashboard/enhanced-order-manager";
import { ProductCrudManager } from "@/components/dashboard/product-crud-manager";
import { SupportTicketManager } from "@/components/dashboard/support-ticket-manager";

const stats = [
  { label: "Templates", value: "48" },
  { label: "Pending", value: "19" },
  { label: "Completed", value: "126" },
  { label: "Revenue", value: "$4,720" },
  { label: "Conversion", value: "4.8%" },
  { label: "Avg. Order", value: "$37" },
];

const performanceHighlights = [
  { label: "Top Category", value: "E-commerce", detail: "42% of total sales" },
  { label: "Fastest Growing", value: "Portfolio", detail: "+18% this month" },
  { label: "Repeat Buyers", value: "31%", detail: "Healthy retention" },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 md:px-8 lg:px-12">
      <h1 className="animate-fade-up text-3xl font-semibold sm:text-4xl">Merchant Dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Transaction activity synced from ABA/Bakong webhook notifications.
      </p>

      <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" data-stagger="true">
        {stats.map((item) => (
          <div key={item.label} className="elevated-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3" data-stagger="true">
        {performanceHighlights.map((card) => (
          <article key={card.label} className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.detail}</p>
          </article>
        ))}
      </section>

      {/* Phase 4: Enhanced Operations */}
      <div className="mt-12 space-y-6 animate-fade-up">
        {/* Original dashboard operations for quick overview */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Quick Overview</h2>
          <DashboardOperations />
        </div>

        {/* Enhanced order management */}
        <div>
          <EnhancedOrderManager />
        </div>

        {/* Support ticket management */}
        <div>
          <SupportTicketManager />
        </div>

        {/* Product CRUD management */}
        <div>
          <ProductCrudManager />
        </div>
      </div>
    </main>
  );
}
