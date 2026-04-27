import { NextResponse } from "next/server";
import { getReviewEligibility, submitReviewAction } from "@/app/actions/reviews";
import { getTemplateReviews } from "@/lib/db/queries";

type Params = {
  params: Promise<{ templateId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { templateId } = await params;

  if (!templateId) {
    return NextResponse.json({ error: "Missing template id" }, { status: 400 });
  }

  const [reviews, eligibility] = await Promise.all([
    getTemplateReviews(templateId),
    getReviewEligibility(templateId),
  ]);
  return NextResponse.json({ reviews, eligibility });
}

export async function POST(request: Request, { params }: Params) {
  const { templateId } = await params;

  if (!templateId) {
    return NextResponse.json({ ok: false, message: "Missing template id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const rating = typeof (body as { rating?: unknown }).rating === "string"
    ? (body as { rating: "1" | "2" | "3" | "4" | "5" }).rating
    : "";
  const comment = typeof (body as { comment?: unknown }).comment === "string"
    ? (body as { comment?: string }).comment
    : "";

  if (!["1", "2", "3", "4", "5"].includes(rating)) {
    return NextResponse.json({ ok: false, message: "Rating must be between 1 and 5." }, { status: 422 });
  }

  try {
    const result = await submitReviewAction(templateId, rating as "1" | "2" | "3" | "4" | "5", comment);
    const [reviews, eligibility] = await Promise.all([
      getTemplateReviews(templateId),
      getReviewEligibility(templateId),
    ]);

    return NextResponse.json({
      ok: true,
      message: result.message,
      reviews,
      eligibility,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to submit review." },
      { status: 400 },
    );
  }
}