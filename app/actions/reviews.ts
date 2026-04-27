"use server";

import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { purchases, reviews, users } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";

export type ReviewEligibility = {
  canReview: boolean;
  hasPurchased: boolean;
  hasReviewed: boolean;
  requiresSignIn: boolean;
  message: string;
};

const SIGN_IN_ELIGIBILITY: ReviewEligibility = {
  canReview: false,
  hasPurchased: false,
  hasReviewed: false,
  requiresSignIn: true,
  message: "Sign in to check whether you can leave a verified buyer review.",
};

export async function getReviewEligibility(templateId: string): Promise<ReviewEligibility> {
  const dbTemplateId = toDbTemplateId(templateId);
  const session = await getServerSession(authOptions);

  if (!db || !session?.user?.email) {
    return SIGN_IN_ELIGIBILITY;
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!user) {
    return {
      canReview: false,
      hasPurchased: false,
      hasReviewed: false,
      requiresSignIn: false,
      message: "Your account could not be matched to a buyer profile yet.",
    };
  }

  const [purchase] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, user.id),
        eq(purchases.templateId, dbTemplateId),
        eq(purchases.status, "COMPLETED"),
      ),
    )
    .limit(1);

  if (!purchase) {
    return {
      canReview: false,
      hasPurchased: false,
      hasReviewed: false,
      requiresSignIn: false,
      message: "Only customers with a completed purchase can leave a verified review.",
    };
  }

  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, user.id),
        eq(reviews.templateId, dbTemplateId),
        eq(reviews.purchaseId, purchase.id),
      ),
    )
    .limit(1);

  if (existingReview) {
    return {
      canReview: false,
      hasPurchased: true,
      hasReviewed: true,
      requiresSignIn: false,
      message: "You have already submitted a verified review for this purchase.",
    };
  }

  return {
    canReview: true,
    hasPurchased: true,
    hasReviewed: false,
    requiresSignIn: false,
    message: "You can leave one verified review for this purchase.",
  };
}

export async function submitReviewAction(
  templateId: string,
  rating: "1" | "2" | "3" | "4" | "5",
  comment?: string,
) {
  const dbTemplateId = toDbTemplateId(templateId);
  const session = await getServerSession(authOptions);

  if (!db || !session?.user?.email) {
    throw new Error("You must be signed in to submit a review.");
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!user) {
    throw new Error("User account not found.");
  }

  const [purchase] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, user.id),
        eq(purchases.templateId, dbTemplateId),
        eq(purchases.status, "COMPLETED"),
      ),
    )
    .limit(1);

  if (!purchase) {
    throw new Error("Only customers with a completed purchase can submit reviews.");
  }

  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, user.id),
        eq(reviews.templateId, dbTemplateId),
        eq(reviews.purchaseId, purchase.id),
      ),
    )
    .limit(1);

  if (existingReview) {
    await db
      .update(reviews)
      .set({
        rating,
        comment,
        authorName: session.user.name ?? null,
        isVisible: true,
      })
      .where(eq(reviews.id, existingReview.id));

    return { ok: true, message: "Your review has been updated." };
  }

  await db.insert(reviews).values({
    userId: user.id,
    templateId: dbTemplateId,
    purchaseId: purchase.id,
    rating,
    comment,
    authorName: session.user.name ?? null,
  });

  return { ok: true, message: "Thanks for sharing your review." };
}
