"use client";

import Link from "next/link";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { EngagementLoop } from "@/components/product/engagement-loop";
import { ProductGrid } from "@/components/product/product-grid";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export default function WishlistPage() {
  const { wishlistIds } = useWishlist();
  const { items: catalogItems } = useCatalog();
  const items = wishlistIds
    .map((id) => catalogItems.find((template) => template.id === id))
    .filter((item): item is (typeof catalogItems)[number] => Boolean(item));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:px-8 lg:px-12">
      <h1 className="text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-6xl">Saved Wishlist</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-muted">
        Keep track of templates you want to compare, revisit, or purchase later.
      </p>

      {items.length > 0 ? (
        <section className="mt-10">
          <ProductGrid items={items} />
        </section>
      ) : (
        <section className="elevated-card mt-10 rounded-lg p-6 sm:p-8">
          <p className="text-sm text-muted">No saved items yet. Browse the catalog and save templates you like.</p>
          <Link href="/products" className="mt-4 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white">
            Explore Products
          </Link>
        </section>
      )}

      <EngagementLoop
        title="You Might Also Like"
        description="Fresh recommendations tailored to your saved and recently viewed templates."
      />
    </main>
  );
}
