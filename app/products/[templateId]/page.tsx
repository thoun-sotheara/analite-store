"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { EngagementLoop } from "@/components/product/engagement-loop";
import { ReviewList } from "@/components/reviews/review-list";
import { useSmartRecommendations } from "@/components/product/use-smart-recommendations";
import { TrackRecentView } from "@/components/wishlist/track-recent-view";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { getReviewsByTemplateId } from "@/lib/data/mock-templates";

export default function ProductDetailPage() {
  const params = useParams<{ templateId: string }>();
  const { items } = useCatalog();
  const template = items.find((item) => item.id === params.templateId);
  const { related } = useSmartRecommendations(template?.id);

  if (!template) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:px-12">
        <section className="rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Product not found</h1>
          <p className="mt-2 text-sm text-muted">This template may have been removed from the marketplace.</p>
          <Link href="/products" className="mt-5 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white">
            Browse Products
          </Link>
        </section>
      </main>
    );
  }

  const relatedTemplates = related.filter((item) => item.category === template.category).slice(0, 3);
  const reviews = getReviewsByTemplateId(template.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:px-12">
      <TrackRecentView templateId={template.id} />
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="elevated-card overflow-hidden rounded-lg">
          <div className="aspect-[16/10] w-full border-b border-border bg-surface">
            <img src={template.screenMockupUrl} alt={template.title} className="h-full w-full object-cover" />
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{template.categoryLabel}</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">{template.title}</h1>
            <p className="mt-3 text-sm text-muted">{template.description}</p>
          </div>
        </div>

        <aside className="elevated-card rounded-lg p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Product Details</p>
          <div className="mt-4 space-y-2 text-sm text-muted">
            <p>Rating: {template.rating.toFixed(1)} ({template.reviewCount} reviews)</p>
            <p>Downloads: {template.downloadCount}</p>
            <p>Stack: {template.techStack}</p>
            <p>
              Vendor:{" "}
              <Link href={`/vendors/${template.vendor.slug}`} className="text-foreground underline underline-offset-4">
                {template.vendor.name}
              </Link>
            </p>
            <p>Last Update: {template.updatedLabel}</p>
          </div>

          <p className="mt-5 text-3xl font-semibold text-foreground">${template.priceUsd.toFixed(2)}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <Link
              href={`/preview/${template.id}`}
              className="rounded-md border border-border px-4 py-2 text-center text-sm text-foreground transition hover:border-slate-400"
            >
              Live Preview
            </Link>
            <AddToCartButton
              templateId={template.id}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400"
            />
            <WishlistButton
              templateId={template.id}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400"
            />
            <Link
              href={`/checkout/${template.id}`}
              className="rounded-md bg-foreground px-4 py-2 text-center text-sm text-white transition hover:bg-slate-800"
            >
              Try Demo Purchase
            </Link>
          </div>

          <div className="mt-6 rounded-md border border-border p-4 text-sm text-muted">
            Includes source files, setup guide, deployment notes, and lifetime template updates.
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <article className="elevated-card rounded-lg p-8">
          <h2 className="text-lg font-semibold text-foreground">What You Get</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>Complete template package with organized source files.</li>
            <li>Step-by-step installation and environment setup instructions.</li>
            <li>Commercial usage rights for one project per purchase.</li>
            <li>Email support and bug-fix updates.</li>
          </ul>
        </article>

        <article className="elevated-card rounded-lg p-8">
          <h2 className="text-lg font-semibold text-foreground">Frequently Asked</h2>
          <div className="mt-4 space-y-4 text-sm text-muted">
            <div>
              <p className="font-medium text-foreground">Can I use this for client work?</p>
              <p className="mt-1">Yes. One purchase covers one end-client project.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">How do I receive files?</p>
              <p className="mt-1">After checkout confirmation, files unlock in your library instantly.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Can I request support?</p>
              <p className="mt-1">Yes. Documentation and contact details are included in your order access.</p>
            </div>
          </div>
        </article>
      </section>

      <ReviewList rating={template.rating} reviewCount={template.reviewCount} reviews={reviews} />

      {relatedTemplates.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground">Related Templates</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {relatedTemplates.map((item) => (
              <Link key={item.id} href={`/products/${item.id}`} className="elevated-card rounded-lg p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">{item.categoryLabel}</p>
                <p className="mt-2 text-base font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description}</p>
                <p className="mt-3 text-sm font-medium text-foreground">${item.priceUsd.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <EngagementLoop
        seedId={template.id}
        title="Keep Browsing Similar Picks"
        description="Stay in flow with recommendations tuned to this product and your activity."
      />
    </main>
  );
}
