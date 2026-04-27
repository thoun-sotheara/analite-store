"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import type { ReviewEligibility } from "@/app/actions/reviews";
import type { TemplateReview } from "@/lib/data/mock-templates";

type ReviewComposerProps = {
  templateId: string;
  eligibility: ReviewEligibility;
  onReviewsUpdated: (reviews: TemplateReview[], eligibility: ReviewEligibility) => void;
};

export function ReviewComposer({ templateId, eligibility, onReviewsUpdated }: ReviewComposerProps) {
  const { status } = useSession();
  const [rating, setRating] = useState<"1" | "2" | "3" | "4" | "5">("5");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(eligibility.message);

  const isSignedIn = status === "authenticated";
  const disabled = useMemo(() => submitting || !eligibility.canReview, [eligibility.canReview, submitting]);

  async function submitReview() {
    if (!eligibility.canReview) {
      setNotice(eligibility.message);
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`/api/catalog/${templateId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        reviews?: TemplateReview[];
        eligibility?: ReviewEligibility;
      };

      if (!response.ok || !payload.ok || !payload.reviews || !payload.eligibility) {
        setNotice(payload.message ?? "Unable to submit your review right now.");
        return;
      }

      setComment("");
      setNotice(payload.message ?? "Review submitted.");
      onReviewsUpdated(payload.reviews, payload.eligibility);
    } catch {
      setNotice("Unable to submit your review right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Verified Buyer Reviews</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Leave your review</h3>
          <p className="mt-1 text-sm text-muted">Only customers with a completed purchase can submit one verified review per product.</p>
        </div>
        {!isSignedIn ? (
          <Link
            href={`/auth?mode=signin&redirect=${encodeURIComponent(`/products/${templateId}`)}`}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-50"
          >
            Sign in to review
          </Link>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["1", "2", "3", "4", "5"] as const).map((value) => {
          const active = Number(value) <= Number(rating);
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              disabled={!eligibility.canReview}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-sm transition ${
                active
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-border bg-white text-muted"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Star className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
              {value}
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={4}
        disabled={!eligibility.canReview}
        placeholder={eligibility.canReview ? "What worked well? What should future buyers know?" : eligibility.message}
        className="mt-4 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition focus:border-foreground disabled:cursor-not-allowed disabled:bg-slate-50"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{notice || eligibility.message}</p>
        <button
          type="button"
          onClick={submitReview}
          disabled={disabled}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : eligibility.hasReviewed ? "Update Review" : "Submit Review"}
        </button>
      </div>
    </article>
  );
}
