"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Download, Eye, Monitor, Server, Sparkles, Star } from "lucide-react";
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
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-surface">
        <Image
          src={item.screenMockupUrl}
          alt={`${item.title} preview`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
          unoptimized
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
            <Eye className="h-3 w-3" />
            {item.viewCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {item.rating.toFixed(1)}
          </span>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded border border-border px-2 py-1 text-[11px] text-muted">
          <Server className="h-3 w-3" />
          {item.techStack}
        </span>

        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          {item.vendor.slug ? (
            <Link href={`/vendors/${item.vendor.slug}`} className="underline decoration-transparent underline-offset-4 transition hover:text-foreground hover:decoration-current">
              {item.vendor.name}
            </Link>
          ) : (
            <span>{item.vendor.name}</span>
          )}
          {item.vendor.verified ? <BadgeCheck className="h-4 w-4 text-blue-500" /> : null}
        </p>

        <div className="rounded-lg border border-border bg-surface/50 p-3 text-[11px] text-muted">
          <p>{item.reviewCount} reviews • {item.updatedLabel}</p>
          <p className="mt-1 truncate">Best for teams building {item.categoryLabel.toLowerCase()} products.</p>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
          <Link
            href={`/preview/${item.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-foreground transition hover:bg-slate-50"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Link>
          <AddToCartButton templateId={item.id} className="inline-flex items-center justify-center rounded-md border border-border px-2 py-2 text-xs text-foreground transition hover:bg-slate-50" />
          <WishlistButton templateId={item.id} iconOnly className="inline-flex items-center justify-center rounded-md border border-border px-2 py-2 text-xs text-foreground transition hover:bg-slate-50" />
        </div>

        <Link
          href={`/products/${item.id}`}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
        >
          View Product
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
