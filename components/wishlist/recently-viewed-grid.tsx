"use client";

import { ProductGrid } from "@/components/product/product-grid";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function RecentlyViewedGrid() {
  const { recentIds } = useWishlist();
  const { items: catalogItems } = useCatalog();
  const items = recentIds
    .map((id) => catalogItems.find((template) => template.id === id))
    .filter((item): item is (typeof catalogItems)[number] => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold text-foreground">Recently Viewed</h2>
      <p className="mt-2 text-sm text-muted">Quickly jump back into templates you explored.</p>
      <div className="mt-6">
        <ProductGrid items={items} />
      </div>
    </section>
  );
}
