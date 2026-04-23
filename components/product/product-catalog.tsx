"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import type { TemplateItem } from "@/lib/data/mock-templates";

type ProductCatalogProps = {
  items: TemplateItem[];
  priorityItems?: TemplateItem[];
};

type SortMode = "smart" | "popular" | "price-asc" | "price-desc" | "rating" | "newest";

function getUpdatedScore(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes("yesterday")) return 5;
  if (normalized.includes("this week")) return 4;
  if (normalized.includes("3 days")) return 3;
  if (normalized.includes("2 weeks")) return 2;
  return 1;
}

const PAGE_SIZE = 50;

export function ProductCatalog({ items, priorityItems = [] }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortMode>("smart");
  const [page, setPage] = useState(1);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (!map.has(item.category)) {
        map.set(item.category, item.categoryLabel || item.category);
      }
    }
    return [{ value: "all", label: "All" }, ...Array.from(map.entries()).map(([value, label]) => ({ value, label }))];
  }, [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const text = `${item.title} ${item.description} ${item.techStack} ${item.vendor.name}`.toLowerCase();
      const queryMatch = normalizedQuery.length === 0 || text.includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "smart") {
        const priorityRankA = priorityItems.findIndex((item) => item.id === a.id);
        const priorityRankB = priorityItems.findIndex((item) => item.id === b.id);
        const normalizedA = priorityRankA === -1 ? Number.MAX_SAFE_INTEGER : priorityRankA;
        const normalizedB = priorityRankB === -1 ? Number.MAX_SAFE_INTEGER : priorityRankB;
        if (normalizedA !== normalizedB) return normalizedA - normalizedB;
        return b.downloadCount - a.downloadCount;
      }
      if (sortBy === "price-asc") return a.priceUsd - b.priceUsd;
      if (sortBy === "price-desc") return b.priceUsd - a.priceUsd;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return getUpdatedScore(b.updatedLabel) - getUpdatedScore(a.updatedLabel);
      return b.downloadCount - a.downloadCount;
    });
  }, [items, query, activeCategory, sortBy, priorityItems]);

  const totalPages = Math.ceil(visibleItems.length / PAGE_SIZE);
  const pageItems = visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange<T>(setter: (val: T) => void) {
    return (val: T) => {
      setter(val);
      setPage(1);
    };
  }

  return (
    <section>
      <div className="elevated-card rounded-lg p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={query}
            onChange={(event) => handleFilterChange(setQuery)(event.target.value)}
            placeholder="Search title, stack, or vendor"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          <select
            value={sortBy}
            onChange={(event) => handleFilterChange<SortMode>(setSortBy)(event.target.value as SortMode)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          >
            <option value="smart">Smart Priority</option>
            <option value="popular">Most Popular</option>
            <option value="newest">Recently Updated</option>
            <option value="rating">Highest Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange(setActiveCategory)(option.value)}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                option.value === activeCategory
                  ? "border-foreground bg-foreground text-white"
                  : "border-border text-foreground hover:border-slate-400"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted">
          {visibleItems.length === 0
            ? "No templates matched"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visibleItems.length)} of ${visibleItems.length} templates`}
        </p>
      </div>

      <div className="mt-8">
        {pageItems.length > 0 ? (
          <ProductGrid items={pageItems} />
        ) : (
          <div className="rounded-lg border border-border bg-white p-6 text-sm text-muted">
            No templates matched your filters. Try a different keyword or category.
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      ) : null}

      {priorityItems.length > 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-white p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Smart Picks</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Top Priority For This Session</h3>
          <p className="mt-1 text-sm text-muted">Ranked from your cart, wishlist, and recently viewed behavior.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {priorityItems.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted">{item.categoryLabel} • {item.techStack}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
