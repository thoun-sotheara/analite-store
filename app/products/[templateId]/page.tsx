"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, Download, Eye, Server, Star, X, ChevronLeft, ChevronRight } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { useCatalog } from "@/components/catalog/catalog-provider";
import { EngagementLoop } from "@/components/product/engagement-loop";
import { ReviewList } from "@/components/reviews/review-list";
import { useSmartRecommendations } from "@/components/product/use-smart-recommendations";
import { TrackRecentView } from "@/components/wishlist/track-recent-view";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import type { ReviewEligibility } from "@/app/actions/reviews";
import type { TemplateReview } from "@/lib/data/mock-templates";
import { useCurrency } from "@/components/currency/currency-provider";

type ProductAccessState = {
  hasAccess: boolean;
  requiresSignIn: boolean;
  transactionId: string;
  purchasedAt: string;
  licenseKey: string;
  previewUrl: string;
  documentationUrl: string;
  message: string;
};

function formatCount(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : "0";
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating)
                ? "fill-amber-400 text-amber-400"
                : "text-border"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted">({count} reviews)</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ templateId: string }>();
  const { items, isLoading } = useCatalog();
  const { formatFromUsd } = useCurrency();
  const template = items.find((item) => item.id === params.templateId || item.slug === params.templateId);
  const { related } = useSmartRecommendations(template?.id);
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [reviewEligibility, setReviewEligibility] = useState<ReviewEligibility>({
    canReview: false,
    hasPurchased: false,
    hasReviewed: false,
    requiresSignIn: true,
    message: "Sign in to check whether you can leave a verified buyer review.",
  });
  const [mainImageUrl, setMainImageUrl] = useState<string>("");
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string>("");
  const [viewCount, setViewCount] = useState<number>(0);
  const [accessState, setAccessState] = useState<ProductAccessState>({
    hasAccess: false,
    requiresSignIn: false,
    transactionId: "",
    purchasedAt: "",
    licenseKey: "",
    previewUrl: "",
    documentationUrl: "",
    message: "",
  });
  const [accessLoading, setAccessLoading] = useState(false);
  const [downloadPending, setDownloadPending] = useState(false);
  const [accessNotice, setAccessNotice] = useState("");

  useEffect(() => {
    if (!template?.id) {
      setReviews([]);
      return;
    }

    let active = true;

    fetch(`/api/catalog/${template.id}/reviews`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { reviews?: TemplateReview[]; eligibility?: ReviewEligibility } | null) => {
        if (!active) return;
        setReviews(payload?.reviews ?? []);
        setReviewEligibility(
          payload?.eligibility ?? {
            canReview: false,
            hasPurchased: false,
            hasReviewed: false,
            requiresSignIn: true,
            message: "Sign in to check whether you can leave a verified buyer review.",
          },
        );
      })
      .catch(() => {
        if (!active) return;
        setReviews([]);
        setReviewEligibility({
          canReview: false,
          hasPurchased: false,
          hasReviewed: false,
          requiresSignIn: true,
          message: "Unable to load review access right now.",
        });
      });

    return () => {
      active = false;
    };
  }, [template?.id]);

  // Set main image on template change
  useEffect(() => {
    setMainImageUrl(template?.screenMockupUrl || "/placeholder-product.svg");
  }, [template?.screenMockupUrl]);

  useEffect(() => {
    setViewCount(template?.viewCount ?? 0);
  }, [template?.viewCount, template?.id]);

  useEffect(() => {
    if (!template?.id) {
      return;
    }

    void fetch(`/api/catalog/${template.id}/view`, {
      method: "POST",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { viewCount?: number } | null) => {
        if (typeof payload?.viewCount === "number") {
          setViewCount(payload.viewCount);
        } else {
          setViewCount((current) => current + 1);
        }
      })
      .catch(() => {
        setViewCount((current) => current + 1);
      });
  }, [template?.id]);

  useEffect(() => {
    if (!template?.id) {
      setAccessState({
        hasAccess: false,
        requiresSignIn: false,
        transactionId: "",
        purchasedAt: "",
        licenseKey: "",
        previewUrl: "",
        documentationUrl: "",
        message: "",
      });
      return;
    }

    let active = true;
    setAccessLoading(true);
    setAccessNotice("");

    fetch(`/api/catalog/${template.id}/access`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: Partial<ProductAccessState> | null) => {
        if (!active) return;

        setAccessState({
          hasAccess: Boolean(payload?.hasAccess),
          requiresSignIn: Boolean(payload?.requiresSignIn),
          transactionId: payload?.transactionId ?? "",
          purchasedAt: payload?.purchasedAt ?? "",
          licenseKey: payload?.licenseKey ?? "",
          previewUrl: payload?.previewUrl ?? "",
          documentationUrl: payload?.documentationUrl ?? "",
          message: payload?.message ?? "",
        });
      })
      .catch(() => {
        if (!active) return;
        setAccessState((current) => ({ ...current, message: "Unable to verify purchase access right now." }));
      })
      .finally(() => {
        if (!active) return;
        setAccessLoading(false);
      });

    return () => {
      active = false;
    };
  }, [template?.id]);

  async function downloadPurchasedTemplate() {
    if (!template?.id || !accessState.transactionId) {
      return;
    }

    try {
      setDownloadPending(true);
      setAccessNotice("");
      const response = await fetch("/api/downloads/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: accessState.transactionId,
          templateId: template.id,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; url?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setAccessNotice(payload.message ?? "Unable to create a secure download link.");
        return;
      }

      setAccessNotice(payload.message ?? "Your secure download link is ready.");
      window.location.href = payload.url;
    } catch {
      setAccessNotice("Unable to create a secure download link.");
    } finally {
      setDownloadPending(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:px-12">
        <section className="rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Loading product...</h1>
          <p className="mt-2 text-sm text-muted">Fetching the latest database record for this template.</p>
        </section>
      </main>
    );
  }

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
  const safeMainImageUrl = mainImageUrl || template.screenMockupUrl || "/placeholder-product.svg";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:px-12">
      <TrackRecentView templateId={template.id} />
      <section className="grid gap-8 animate-fade-up lg:grid-cols-2">
        <div className="elevated-card overflow-hidden rounded-lg">
          {/* Main image with zoom on click */}
          <div
            onClick={() => {
              setZoomImageUrl(safeMainImageUrl);
              setShowZoomModal(true);
            }}
            className="relative aspect-[16/10] w-full border-b border-border bg-surface cursor-pointer group"
          >
            <Image
              src={safeMainImageUrl}
              alt={template.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition">
              <span className="text-white/0 group-hover:text-white/80 transition text-sm font-medium">Click to zoom</span>
            </div>
          </div>

          {/* Gallery grid below main image */}
          {(() => {
            const galleryImages = [
              template.galleryImage1,
              template.galleryImage2,
              template.galleryImage3,
              template.galleryImage4,
            ].filter((img): img is string => Boolean(img));

            if (galleryImages.length === 0) {
              return null; // Hide gallery section if no gallery images
            }

            return (
              <div className="border-t border-border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">Gallery</p>
                <div className="grid grid-cols-4 gap-2">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMainImageUrl(imgUrl)}
                      className={`relative aspect-square rounded-md border-2 transition overflow-hidden ${
                        mainImageUrl === imgUrl
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-border hover:border-blue-300"
                      }`}
                    >
                      <Image
                        src={imgUrl}
                        alt={`Gallery ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1">
              <span className="text-xs uppercase tracking-[0.14em] text-muted">{template.categoryLabel}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">{template.title}</h1>
            <p className="mt-3 text-sm text-muted">{template.description}</p>
            <div className="mt-4">
              <StarRating rating={template.rating} count={template.reviewCount} />
            </div>
          </div>
        </div>

        <aside className="elevated-card rounded-lg p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Quick Details</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
              <span className="text-muted">Downloads</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Download className="h-3.5 w-3.5" />
                {formatCount(template.downloadCount)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
              <span className="text-muted">Views</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Eye className="h-3.5 w-3.5" />
                {formatCount(viewCount)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
              <span className="text-muted">Stack</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Server className="h-3.5 w-3.5" />
                {template.techStack}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
              <span className="text-muted">Vendor</span>
              <span className="inline-flex items-center gap-1.5">
                {template.vendor.slug ? (
                  <Link href={`/vendors/${template.vendor.slug}`} className="text-foreground underline underline-offset-2 hover:text-slate-600">
                    {template.vendor.name}
                  </Link>
                ) : (
                  <span className="text-foreground">{template.vendor.name}</span>
                )}
                {template.vendor.verified ? <BadgeCheck className="h-4 w-4 text-blue-500" /> : null}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
              <span className="text-muted">Updated</span>
              <span className="font-semibold text-foreground">{template.updatedLabel}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-4xl font-bold text-foreground">{formatFromUsd(template.priceUsd)}</p>
            <p className="mt-1 text-sm text-muted">Price shown in your preferred currency</p>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/preview/${template.id}`}
              className="rounded-md border border-border px-3 py-2 text-center text-sm font-medium text-foreground transition hover:bg-slate-50"
            >
              Live Preview
            </Link>
            <Link
              href={`/checkout/${template.id}`}
              className="rounded-md bg-foreground px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Purchase Now
            </Link>
            <AddToCartButton
              templateId={template.id}
              className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
            />
            <WishlistButton
              templateId={template.id}
              className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
            />
          </div>

          <div className="mt-5 rounded-md border border-border bg-surface p-4 text-sm">
            <p className="font-medium text-foreground">Your Access</p>
            {accessLoading ? (
              <p className="mt-2 text-muted">Checking your purchase access...</p>
            ) : accessState.hasAccess ? (
              <>
                <p className="mt-2 text-muted">You own this product. Download, receipt, and preview links are unlocked for this item.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={downloadPurchasedTemplate}
                    disabled={downloadPending}
                    className="inline-flex items-center justify-center rounded-md bg-foreground px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {downloadPending ? "Preparing secure file..." : "Download ZIP"}
                  </button>
                  <Link
                    href={`/api/invoice/${accessState.transactionId}`}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
                  >
                    Download Receipt
                  </Link>
                  <Link
                    href={`/preview/${template.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
                  >
                    Open Preview
                  </Link>
                  <Link
                    href={accessState.documentationUrl || "/support"}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-50"
                  >
                    {accessState.documentationUrl ? "Open Documentation" : "Open Support"}
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-2 text-muted">
                {accessState.message || "Purchase this product to unlock download, receipt, and full access links."}
              </p>
            )}
            {accessNotice ? <p className="mt-3 text-xs text-muted">{accessNotice}</p> : null}
          </div>

          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">What's included</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>✓ Complete source files</li>
              <li>✓ Setup & installation guide</li>
              <li>✓ Lifetime updates</li>
              <li>✓ Email support</li>
            </ul>
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
            <div>
              <p className="font-medium text-foreground">How do reviews work?</p>
              <p className="mt-1">Verified buyer reviews can be submitted from this product page after a completed purchase.</p>
            </div>
          </div>
        </article>
      </section>

      <ReviewList
        templateId={template.id}
        rating={template.rating}
        reviewCount={template.reviewCount}
        reviews={reviews}
        eligibility={reviewEligibility}
        onReviewsUpdated={(nextReviews, nextEligibility) => {
          setReviews(nextReviews);
          setReviewEligibility(nextEligibility);
        }}
      />

      {relatedTemplates.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground">Related Templates</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {relatedTemplates.map((item) => (
              <Link key={item.id} href={`/products/${item.id}`} className="elevated-card rounded-lg p-5 transition hover:shadow-lg hover:-translate-y-1">
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

      {/* Zoom Modal */}
      {showZoomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowZoomModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowZoomModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-full aspect-[16/10] bg-black rounded-lg overflow-hidden">
              <Image
                src={zoomImageUrl}
                alt="Zoomed view"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 90vw"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
