import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mockTemplates } from "@/lib/data/mock-templates";
import { purchases, transactions, users } from "@/lib/db/schema";

export type LibraryItem = {
  templateId: string;
  transactionId: string;
  title: string;
  thumbnailUrl: string;
  documentationUrl: string;
  s3Key: string;
  bankRef: string;
  licenseKey: string;
};

export async function getLibraryItems(userEmail: string): Promise<LibraryItem[]> {
  if (!db) {
    return mockTemplates.slice(0, 3).map((item, index) => ({
      templateId: item.id,
      transactionId: `demo-${item.id}`,
      title: item.title,
      thumbnailUrl: item.screenMockupUrl,
      documentationUrl: item.documentationUrl,
      s3Key: item.s3Key,
      bankRef: `DEMO-REF-${index + 1}`,
      licenseKey: `demo-license-${item.id}`,
    }));
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
      bankRef: transactions.bankRef,
      licenseKey: purchases.licenseKey,
    })
    .from(purchases)
    .innerJoin(transactions, and(
      eq(transactions.id, purchases.transactionId),
      eq(transactions.userEmail, userEmail),
      eq(transactions.status, "completed"),
    ))
    .where(and(eq(purchases.userId, user.id), eq(purchases.status, "COMPLETED")));

  return completedPurchases
    .map((purchase) => {
      const template = mockTemplates.find((item) => item.id === purchase.templateId);

      if (!template) {
        return null;
      }

      return {
        templateId: template.id,
        transactionId: purchase.transactionId,
        title: template.title,
        thumbnailUrl: template.screenMockupUrl,
        documentationUrl: template.documentationUrl,
        s3Key: template.s3Key,
        bankRef: purchase.bankRef ?? "",
        licenseKey: purchase.licenseKey,
      };
    })
    .filter((item): item is LibraryItem => item !== null);
}
