"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { useSmartRecommendations } from "@/components/product/use-smart-recommendations";

type EngagementLoopProps = {
  title?: string;
  description?: string;
  seedId?: string;
};

export function EngagementLoop({
  title = "Continue Exploring",
  description = "Recommended products based on what you viewed, saved, and added to cart.",
  seedId,
}: EngagementLoopProps) {
  const { recommendations } = useSmartRecommendations(seedId);
  const items = recommendations.slice(0, 3);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Smart Loop</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Link href="/products" className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground">
          View More Recommendations
        </Link>
      </div>
      <div className="mt-5">
        <ProductGrid items={items} />
      </div>
    </section>
  );
}
