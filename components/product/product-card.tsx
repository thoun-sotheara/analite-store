"use client";

import Link from "next/link";
import { ArrowUpRight, Download, Monitor, Server, Sparkles, Star } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { useCurrency } from "@/components/currency/currency-provider";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import type { TemplateItem } from "@/lib/data/mock-templates";

type ProductCardProps = {
  item: TemplateItem;
  featured?: boolean;
};

export function ProductCard({ item, featured = false }: ProductCardProps) {
  const { formatFromUsd } = useCurrency();

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-surface">
        <img
          src={item.screenMockupUrl}
          alt={`${item.title} preview`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="rounded-full bg-white/20 px-2 py-1 uppercase tracking-[0.14em]">
              {item.categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1">
              <Sparkles className="h-3 w-3" /> Top Seller
            </span>
          </div>
        </div>
      </div>

      <div className={`flex h-full flex-col gap-3 ${featured ? "p-6 sm:p-8" : "p-4 sm:p-6"}`}>
        <div className="flex items-start justify-between gap-3 text-xs text-muted">
          <span className="rounded-full border border-border bg-surface px-2 py-1 tracking-[0.14em] uppercase">
            {item.techStack}
          </span>
          <span className="text-base font-semibold text-foreground">{formatFromUsd(item.priceUsd)}</span>
        </div>

        <h3 className="line-clamp-2 min-h-10 text-[1.25rem] font-semibold text-foreground">
          {item.title}
        </h3>

        <p className="line-clamp-2 min-h-10 text-sm text-muted">{item.description}</p>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted sm:grid-cols-3 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1">
            <Download className="h-3 w-3" />
            {item.downloadCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {item.rating.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1">
            <Server className="h-3 w-3" />
            {item.techStack}
          </span>
        </div>

        <p className="text-[11px] text-muted">
          <Link href={`/vendors/${item.vendor.slug}`} className="underline decoration-transparent underline-offset-4 transition hover:text-foreground hover:decoration-current">
            {item.vendor.name}
          </Link>{" "}
          {item.vendor.verified ? "• Verified" : ""}
        </p>

        <div className="rounded-lg border border-border bg-surface/50 p-3 text-[11px] text-muted">
          <p>{item.reviewCount} reviews • {item.updatedLabel}</p>
          <p className="mt-1 truncate">Best for teams building {item.categoryLabel.toLowerCase()} products.</p>
        </div>

        <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2 pt-3">
          <Link
            href={`/preview/${item.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-foreground transition hover:border-slate-400"
          >
            <Monitor className="h-3.5 w-3.5" />
            Live Preview
          </Link>
          <AddToCartButton templateId={item.id} />
          <WishlistButton templateId={item.id} iconOnly />
        </div>

        <Link
          href={`/products/${item.id}`}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-foreground px-3 py-2 text-xs text-white transition hover:bg-slate-800"
        >
          View Product
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
