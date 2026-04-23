import { Star } from "lucide-react";
import type { TemplateReview } from "@/lib/data/mock-templates";

type ReviewListProps = {
  rating: number;
  reviewCount: number;
  reviews: TemplateReview[];
};

export function ReviewList({ rating, reviewCount, reviews }: ReviewListProps) {
  const satisfaction = Math.min(99, Math.round((rating / 5) * 100));
  const recommend = Math.min(98, Math.round(((reviewCount * rating) / Math.max(1, reviewCount * 5)) * 100));

  return (
    <section className="mt-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="elevated-card rounded-lg p-6">
          <p className="text-sm text-muted">Average Rating</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{rating.toFixed(1)}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
            <Star className="h-4 w-4 fill-current" />
          </p>
        </article>
        <article className="elevated-card rounded-lg p-6">
          <p className="text-sm text-muted">Verified Reviews</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{reviewCount}</p>
          <p className="mt-2 text-sm text-muted">Collected from completed demo orders and storefront feedback.</p>
        </article>
        <article className="elevated-card rounded-lg p-6">
          <p className="text-sm text-muted">Would Recommend</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{Math.max(satisfaction, recommend)}%</p>
          <p className="mt-2 text-sm text-muted">Strong buyer confidence for launch-ready projects.</p>
        </article>
      </div>

      <div className="mt-6 space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="elevated-card rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{review.author}</p>
                <p className="text-xs text-muted">{review.role}</p>
              </div>
              <div className="text-right">
                <p className="inline-flex items-center gap-1 text-sm text-amber-500">
                  {Array.from({ length: review.rating }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </p>
                <p className="text-xs text-muted">{review.dateLabel}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{review.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
