import { Star } from "lucide-react";
import type { ReviewEligibility } from "@/app/actions/reviews";
import type { TemplateReview } from "@/lib/data/mock-templates";
import { ReviewComposer } from "@/components/reviews/review-composer";

type ReviewListProps = {
  templateId: string;
  rating: number;
  reviewCount: number;
  reviews: TemplateReview[];
  eligibility: ReviewEligibility;
  onReviewsUpdated: (reviews: TemplateReview[], eligibility: ReviewEligibility) => void;
};

export function ReviewList({ templateId, rating, reviewCount, reviews, eligibility, onReviewsUpdated }: ReviewListProps) {
  const computedReviewCount = reviews.length;
  const computedRating = computedReviewCount
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / computedReviewCount
    : 0;

  const effectiveReviewCount = computedReviewCount || reviewCount;
  const effectiveRating = computedReviewCount ? computedRating : rating;

  const satisfaction = Math.min(99, Math.round((effectiveRating / 5) * 100));
  const recommend = Math.min(98, Math.round(((effectiveReviewCount * effectiveRating) / Math.max(1, effectiveReviewCount * 5)) * 100));

  return (
    <section id="reviews" className="mt-8 scroll-mt-24">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="elevated-card rounded-lg p-5 sm:p-6">
          <p className="text-sm text-muted">Average Rating</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{effectiveRating.toFixed(1)}</p>
          <p className="mt-2 inline-flex flex-wrap items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, index) => {
              const starNumber = index + 1;
              const isFilled = starNumber <= Math.round(effectiveRating);

              return <Star key={index} className={`h-4 w-4 ${isFilled ? "fill-current" : ""}`} />;
            })}
          </p>
        </article>
        <article className="elevated-card rounded-lg p-5 sm:p-6">
          <p className="text-sm text-muted">Verified Reviews</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{effectiveReviewCount}</p>
          <p className="mt-2 text-sm text-muted">Collected only from completed orders tied to verified buyers.</p>
        </article>
        <article className="elevated-card rounded-lg p-5 sm:p-6 sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-muted">Would Recommend</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{Math.max(satisfaction, recommend)}%</p>
          <p className="mt-2 text-sm text-muted">Strong buyer confidence for launch-ready projects.</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-surface/60 p-5 text-sm text-muted">
          <p className="font-medium text-foreground">How reviews work</p>
          <ul className="mt-3 space-y-2">
            <li>Only completed buyers can submit a verified review.</li>
            <li>Each purchase can leave one review for that product.</li>
            <li>Documentation and preview links stay available from your library after checkout.</li>
          </ul>
        </div>
        <ReviewComposer templateId={templateId} eligibility={eligibility} onReviewsUpdated={onReviewsUpdated} />
      </div>

      <div className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <article className="rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted">
            No verified buyer reviews yet. The first completed buyer can leave one from this product page.
          </article>
        ) : reviews.map((review) => (
          <article key={review.id} className="elevated-card rounded-lg p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{review.author}</p>
                <p className="text-xs text-muted">{review.role}</p>
              </div>
              <div className="sm:text-right">
                <p className="inline-flex flex-wrap items-center gap-1 text-sm text-amber-500">
                  {Array.from({ length: review.rating }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </p>
                <p className="text-xs text-muted">{review.dateLabel}</p>
              </div>
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-muted">{review.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
