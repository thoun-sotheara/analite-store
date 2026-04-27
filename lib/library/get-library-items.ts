import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchases, templates, transactions, users } from "@/lib/db/schema";

export type LibraryItem = {
  templateId: string;
  transactionId: string;
  title: string;
  thumbnailUrl: string;
  documentationUrl: string;
  previewUrl: string;
  s3Key: string;
  bankRef: string;
  licenseKey: string;
  purchasedAt: string;
};

export async function getLibraryItems(userEmail: string): Promise<LibraryItem[]> {
  if (!db) {
    return [];
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, userEmail))
    .limit(1);

  if (!user) {
    return [];
  }

  const completedPurchases = await db
    .select({
      templateId: purchases.templateId,
      transactionId: transactions.id,
      purchasedAt: transactions.createdAt,
      bankRef: transactions.bankRef,
      licenseKey: purchases.licenseKey,
      title: templates.title,
      s3Key: templates.s3Key,
      previewUrl: templates.previewUrl,
      documentationUrl: templates.documentationUrl,
    })
    .from(purchases)
    .innerJoin(
      transactions,
      and(
        eq(transactions.id, purchases.transactionId),
        eq(transactions.userEmail, userEmail),
        eq(transactions.status, "completed"),
      ),
    )
    .innerJoin(templates, eq(templates.id, purchases.templateId))
    .where(and(eq(purchases.userId, user.id), eq(purchases.status, "COMPLETED")));

  return completedPurchases.map((purchase) => ({
    templateId: purchase.templateId,
    transactionId: purchase.transactionId,
    title: purchase.title,
    thumbnailUrl: purchase.previewUrl ?? "/placeholder-product.svg",
    documentationUrl: purchase.documentationUrl ?? "",
    previewUrl: purchase.previewUrl ?? "",
    s3Key: purchase.s3Key,
    bankRef: purchase.bankRef ?? "",
    licenseKey: purchase.licenseKey,
    purchasedAt: purchase.purchasedAt.toISOString(),
  }));
}
