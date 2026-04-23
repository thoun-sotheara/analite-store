"use client";

import { useMemo } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import type { TemplateItem } from "@/lib/data/mock-templates";

function normalizeUpdatedScore(label: string) {
  const value = label.toLowerCase();
  if (value.includes("just now")) return 5;
  if (value.includes("yesterday")) return 4;
  if (value.includes("this week")) return 3;
  if (value.includes("days")) return 2;
  return 1;
}

export function useSmartRecommendations(seedId?: string) {
  const { items } = useCatalog();
  const { wishlistIds, recentIds } = useWishlist();
  const { items: cartItems } = useCart();

  const recommendations = useMemo(() => {
    if (items.length === 0) return [] as TemplateItem[];

    const byId = new Map(items.map((item) => [item.id, item]));
    const categoryWeights = new Map<string, number>();
    const vendorWeights = new Map<string, number>();

    recentIds.forEach((id, index) => {
      const item = byId.get(id);
      if (!item) return;
      const weight = Math.max(1, 6 - index);
      categoryWeights.set(item.category, (categoryWeights.get(item.category) ?? 0) + weight);
      vendorWeights.set(item.vendor.slug, (vendorWeights.get(item.vendor.slug) ?? 0) + weight * 0.8);
    });

    wishlistIds.forEach((id) => {
      const item = byId.get(id);
      if (!item) return;
      categoryWeights.set(item.category, (categoryWeights.get(item.category) ?? 0) + 4);
      vendorWeights.set(item.vendor.slug, (vendorWeights.get(item.vendor.slug) ?? 0) + 2.5);
    });

    cartItems.forEach(({ templateId, quantity }) => {
      const item = byId.get(templateId);
      if (!item) return;
      const weight = quantity * 5;
      categoryWeights.set(item.category, (categoryWeights.get(item.category) ?? 0) + weight);
      vendorWeights.set(item.vendor.slug, (vendorWeights.get(item.vendor.slug) ?? 0) + weight * 0.9);
    });

    const seed = seedId ? byId.get(seedId) : null;

    const scored = items
      .filter((item) => item.id !== seedId)
      .map((item) => {
        const popularity = item.downloadCount * 0.008 + item.reviewCount * 0.03 + item.rating * 7;
        const behaviorBoost =
          (categoryWeights.get(item.category) ?? 0) * 2.2 +
          (vendorWeights.get(item.vendor.slug) ?? 0) * 1.1;
        const freshness = normalizeUpdatedScore(item.updatedLabel) * 1.4;

        let similarity = 0;
        if (seed) {
          if (seed.category === item.category) similarity += 8;
          if (seed.techStack === item.techStack) similarity += 3;
          if (seed.vendor.slug === item.vendor.slug) similarity += 2;
        }

        return { item, score: popularity + behaviorBoost + freshness + similarity };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    return scored;
  }, [items, wishlistIds, recentIds, cartItems, seedId]);

  const topPriority = recommendations.slice(0, 4);
  const related = recommendations.slice(0, 6);

  return { recommendations, topPriority, related };
}
