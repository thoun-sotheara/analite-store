"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Star } from "lucide-react";
import { useCurrency } from "@/components/currency/currency-provider";
import type { TemplateItem } from "@/lib/data/mock-templates";

type AppleProductCardProps = {
  item: TemplateItem;
  featured?: boolean;
};

export function AppleProductCard({ item, featured = false }: AppleProductCardProps) {
  const { formatFromUsd } = useCurrency();

  return (
    <article
      className={`rounded-3xl border border-border bg-white transition duration-300 hover:-translate-y-0.5 hover:border-slate-400 ${
        featured ? "p-16" : "p-12"
      }`}
    >
      <div className="relative h-52 overflow-hidden rounded-2xl border border-border bg-surface">
        <Image
          src={item.screenMockupUrl}
          alt={`${item.title} mockup`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="mt-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            {item.categoryLabel}
          </p>
          <h3 className="mt-3 text-2xl font-medium tracking-[-0.01em] text-foreground">
            {item.title}
          </h3>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {item.rating.toFixed(1)} ({item.reviewCount})
            </span>
            <span>•</span>
            <span>{item.updatedLabel}</span>
          </div>
        </div>
        <p className="text-lg font-medium text-foreground">{formatFromUsd(item.priceUsd)}</p>
      </div>

      <p className="mt-4 max-w-xl text-sm leading-7 text-muted">{item.description}</p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
        <span>{item.vendor.name}</span>
        {item.vendor.verified ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified Vendor
          </span>
        ) : null}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/checkout/${item.id}`}
          className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition hover:border-slate-400"
        >
          Buy Template
        </Link>
        <Link
          href={`/preview/${item.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-muted transition hover:border-slate-400 hover:text-foreground"
        >
          Preview
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
