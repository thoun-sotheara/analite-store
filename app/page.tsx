"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { ProductCard } from "@/components/product/product-card";
import { ProductGrid } from "@/components/product/product-grid";
import { useSmartRecommendations } from "@/components/product/use-smart-recommendations";

type HomeSort = "smart" | "popular" | "price-asc" | "price-desc" | "rating";

const CATEGORY_LIMIT = 6;
const FILTER_LIMIT = 12;

export default function Home() {
  const { items } = useCatalog();
  const { topPriority } = useSmartRecommendations();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stack, setStack] = useState("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(300);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<HomeSort>("smart");

  // Category groups — top CATEGORY_LIMIT per category, sorted by downloads
  const categoryGroups = useMemo(() => {
    const map = new Map<string, { label: string; picks: typeof items }>();
    for (const item of items) {
      if (!map.has(item.category)) {
        map.set(item.category, { label: item.categoryLabel || item.category, picks: [] });
      }
      map.get(item.category)!.picks.push(item);
    }
    return Array.from(map.entries())
      .map(([cat, { label, picks }]) => ({
        category: cat,
        label,
        picks: [...picks].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, CATEGORY_LIMIT),
        total: picks.length,
      }))
      .sort((a, b) => b.picks[0].downloadCount - a.picks[0].downloadCount);
  }, [items]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (!map.has(item.category)) {
        map.set(item.category, item.categoryLabel || item.category);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const stackOptions = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.techStack))).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = [...items].filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const stackMatch = stack === "all" || item.techStack === stack;
      const priceMatch = item.priceUsd >= minPrice && item.priceUsd <= maxPrice;
      const ratingMatch = item.rating >= minRating;
      const verifiedMatch = !verifiedOnly || item.vendor.verified;
      const queryText = `${item.title} ${item.description} ${item.categoryLabel} ${item.techStack} ${item.vendor.name}`.toLowerCase();
      const queryMatch = normalized.length === 0 || queryText.includes(normalized);
      return categoryMatch && stackMatch && priceMatch && ratingMatch && verifiedMatch && queryMatch;
    });

    source.sort((a, b) => {
      if (sortBy === "price-asc") return a.priceUsd - b.priceUsd;
      if (sortBy === "price-desc") return b.priceUsd - a.priceUsd;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "popular") return b.downloadCount - a.downloadCount;

      const rankA = topPriority.findIndex((item) => item.id === a.id);
      const rankB = topPriority.findIndex((item) => item.id === b.id);
      const safeA = rankA === -1 ? Number.MAX_SAFE_INTEGER : rankA;
      const safeB = rankB === -1 ? Number.MAX_SAFE_INTEGER : rankB;
      if (safeA !== safeB) return safeA - safeB;
      return b.downloadCount - a.downloadCount;
    });

    return source;
  }, [items, query, category, stack, minPrice, maxPrice, minRating, verifiedOnly, sortBy, topPriority]);

  const isFiltering =
    query.trim().length > 0 ||
    category !== "all" ||
    stack !== "all" ||
    minPrice > 0 ||
    maxPrice < 300 ||
    minRating > 0 ||
    verifiedOnly;

  const visibleFilteredItems = filteredItems.slice(0, FILTER_LIMIT);

  const featured = items[0];
  const topPicks = (topPriority.length > 0 ? topPriority : items).slice(1, 4);

  if (!featured) return null;

  function resetFilters() {
    setQuery("");
    setCategory("all");
    setStack("all");
    setMinPrice(0);
    setMaxPrice(300);
    setMinRating(0);
    setVerifiedOnly(false);
    setSortBy("smart");
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-8 sm:px-6 md:px-8 lg:px-12">
      {/* Hero */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <article className="elevated-card rounded-lg p-8 lg:col-span-8 lg:p-10">
          <p className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted">
            <Sparkles className="h-3.5 w-3.5" /> Premium Marketplace
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Sell and Buy Professional Templates, Faster.
          </h1>
          <p className="mt-4 max-w-3xl text-base text-muted">
            A production-ready digital store for Real Estate, Portfolio, E-commerce, and
            Wedding templates with ABA/Bakong checkout, secure S3 delivery, and instant license keys.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-muted sm:grid-cols-4">
            <p className="rounded-md border border-border px-3 py-2">4,300+ Downloads</p>
            <p className="rounded-md border border-border px-3 py-2">98% Satisfaction</p>
            <p className="rounded-md border border-border px-3 py-2">Private S3 Assets</p>
            <p className="rounded-md border border-border px-3 py-2">Local KHQR Payments</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Explore Marketplace
            </Link>
            <Link
              href="/preview/t-ec-001"
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400"
            >
              Live Demo
            </Link>
          </div>
        </article>

        <article className="elevated-card rounded-lg p-8 lg:col-span-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Top Picks For You</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {topPicks.map((item) => (
              <Link
                key={item.id}
                href={`/preview/${item.id}`}
                className="rounded-md border border-border px-4 py-3 text-foreground transition hover:border-slate-400"
              >
                <p className="line-clamp-2 font-semibold">{item.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                  {item.categoryLabel}
                </p>
              </Link>
            ))}
          </div>
          <Link
            href="/products"
            className="mt-4 inline-flex rounded-md border border-border px-4 py-2 text-xs uppercase tracking-[0.12em] text-muted hover:text-foreground"
          >
            View all templates
          </Link>
        </article>
      </section>

      {/* Featured product + quick browse */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ProductCard item={featured} featured />
        </div>
        <article className="flex flex-col gap-3 rounded-lg border border-border bg-white p-6 sm:p-8 lg:col-span-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Quick Browse</p>
          <p className="text-sm text-muted">
            Jump into the catalog and explore by template type, vendor, and live previews.
          </p>
          <Link href="/products" className="rounded-md bg-foreground px-3 py-2 text-center text-sm text-white">
            Open Full Catalog
          </Link>
          <Link href="/vendors/mekong-commerce-lab" className="rounded-md border border-border px-3 py-2 text-left text-sm text-foreground">
            Browse Top Vendor
          </Link>
          <Link href="/products/t-re-001" className="rounded-md border border-border px-3 py-2 text-left text-sm text-foreground">
            Featured Real Estate
          </Link>
          <Link href="/products/t-ec-001" className="rounded-md border border-border px-3 py-2 text-left text-sm text-foreground">
            Popular E-commerce
          </Link>
        </article>
      </section>

      {/* Trust features */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <article className="elevated-card rounded-lg p-8">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4" /> Payment Security
          </p>
          <p className="mt-3 text-sm text-muted">
            ABA PayWay and Bakong confirmation with HMAC verification before asset unlock.
          </p>
        </article>
        <article className="elevated-card rounded-lg p-8">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <BadgeCheck className="h-4 w-4" /> Verified Vendors
          </p>
          <p className="mt-3 text-sm text-muted">
            Curated publishers with quality standards, documentation checks, and update history.
          </p>
        </article>
        <article className="elevated-card rounded-lg p-8">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <Zap className="h-4 w-4" /> Instant Delivery
          </p>
          <p className="mt-3 text-sm text-muted">
            60-minute signed links, license key issuance, and invoice generation in one flow.
          </p>
        </article>
      </section>

      {/* Smart Filter — shown always, but prominent when actively filtering */}
      <section className="elevated-card rounded-2xl p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Smart Finder</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
              {isFiltering ? "Filter Results" : "Find The Right Product Fast"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isFiltering
                ? `${filteredItems.length} templates matched — showing first ${Math.min(FILTER_LIMIT, filteredItems.length)}`
                : "Search across all categories, stacks, and price ranges."}
            </p>
          </div>
          {isFiltering ? (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground"
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, use-case, vendor, stack"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none xl:col-span-2"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-border px-3 py-2 text-sm outline-none">
            <option value="all">All Categories</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={stack} onChange={(event) => setStack(event.target.value)} className="rounded-md border border-border px-3 py-2 text-sm outline-none">
            <option value="all">All Tech Stacks</option>
            {stackOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-xs text-muted">Min Price (USD)</p>
            <input type="range" min={0} max={300} step={5} value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value))} className="mt-1 w-full" />
            <p className="text-xs text-foreground">${minPrice}</p>
          </div>

          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-xs text-muted">Max Price (USD)</p>
            <input type="range" min={0} max={300} step={5} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="mt-1 w-full" />
            <p className="text-xs text-foreground">${maxPrice}</p>
          </div>

          <select value={String(minRating)} onChange={(event) => setMinRating(Number(event.target.value))} className="rounded-md border border-border px-3 py-2 text-sm outline-none">
            <option value="0">Any Rating</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as HomeSort)} className="rounded-md border border-border px-3 py-2 text-sm outline-none">
            <option value="smart">Smart Priority</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price-asc">Price Low to High</option>
            <option value="price-desc">Price High to Low</option>
          </select>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
          Verified vendors only
        </label>

        {isFiltering ? (
          <div className="mt-6">
            {visibleFilteredItems.length > 0 ? (
              <>
                <ProductGrid items={visibleFilteredItems} />
                {filteredItems.length > FILTER_LIMIT ? (
                  <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-surface p-4">
                    <p className="text-sm text-muted">
                      Showing {FILTER_LIMIT} of {filteredItems.length} results
                    </p>
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-1 rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
                    >
                      See all in catalog <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
                No templates matched. Try broadening your filters or{" "}
                <button type="button" onClick={resetFilters} className="underline underline-offset-2 hover:text-foreground">
                  clear all
                </button>
                .
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Use the filters above to search across {items.length} templates. Results appear instantly.
          </p>
        )}
      </section>

      {/* Category sections — smart browse */}
      {!isFiltering ? (
        <div className="flex flex-col gap-12">
          {categoryGroups.map(({ category: cat, label, picks, total }) => (
            <section key={cat}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{label} Templates</h2>
                </div>
                <Link
                  href={`/products?category=${cat}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  {total > CATEGORY_LIMIT ? `All ${total}` : "Browse"} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-4">
                <ProductGrid items={picks} />
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}

