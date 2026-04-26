"use server";

import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { purchases, reviews, users } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";

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

  await db.insert(reviews).values({
    userId: user.id,
    templateId: dbTemplateId,
    purchaseId: purchase.id,
    rating,
    comment,
  });

  return { ok: true };
}
