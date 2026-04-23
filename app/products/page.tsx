"use client";

import { ProductCatalog } from "@/components/product/product-catalog";
import { useSmartRecommendations } from "@/components/product/use-smart-recommendations";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { RecentlyViewedGrid } from "@/components/wishlist/recently-viewed-grid";

export default function ProductsPage() {
  const { items } = useCatalog();
  const { topPriority } = useSmartRecommendations();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:px-8 lg:px-12">
      <h1 className="text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-6xl">
        Template Marketplace
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-muted">
        Browse minimal, conversion-focused templates with secure payment confirmation
        and private instant download.
      </p>

      <section className="mt-10">
        <ProductCatalog items={items} priorityItems={topPriority} />
      </section>

      <RecentlyViewedGrid />
    </main>
  );
}
