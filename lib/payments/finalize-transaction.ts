import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchases, templates, transactions, users } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";
import { sendPaymentConfirmation } from "@/lib/payments/send-payment-confirmation";

type TransactionLineItem = {
  templateId: string;
  dbTemplateId?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function parseLineItems(signature: string | null): TransactionLineItem[] {
  if (!signature) {
    return [];
  }

  try {
    const parsed = JSON.parse(signature) as { lineItems?: TransactionLineItem[] };
    if (!Array.isArray(parsed.lineItems)) {
      return [];
    }

    return parsed.lineItems.filter(
      (item) =>
        Boolean(item?.templateId) &&
        Number.isFinite(item?.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item?.unitPrice) &&
        item.unitPrice >= 0,
    );
  } catch {
    return [];
  }
}

export async function finalizeTransaction(transactionId: string): Promise<{ ok: boolean; message?: string }> {
  if (!db) {
    return { ok: false, message: "Database is not configured." };
  }

  const finalized = await db.transaction(async (tx) => {
    // Serialize finalization per transaction id across concurrent workers.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${transactionId}))`);

    const [transaction] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      return { ok: false as const, message: "Transaction not found." };
    }

    if (transaction.status !== "completed") {
      return { ok: false as const, message: "Transaction is not completed yet." };
    }

    const [existingForTransaction] = await tx
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.transactionId, transaction.id))
      .limit(1);

    if (existingForTransaction) {
      return { ok: true as const, skipped: true as const };
    }

    let [user] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, transaction.userEmail))
      .limit(1);

    if (!user) {
      await tx
        .insert(users)
        .values({
          email: transaction.userEmail,
          name: transaction.userEmail.split("@")[0],
        })
        .onConflictDoNothing();

      [user] = await tx
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.email, transaction.userEmail))
        .limit(1);
    }

    if (!user) {
      return { ok: false as const, message: "Unable to resolve user for finalized transaction." };
    }

    let lineItems = parseLineItems(transaction.signature);

    if (!lineItems.length) {
      lineItems = [
        {
          templateId: transaction.templateId,
          quantity: 1,
          unitPrice: Number(transaction.amount),
          lineTotal: Number(transaction.amount),
        },
      ];
    }

    const purchaseRows = lineItems.flatMap((item) => {
      const dbTemplateId = item.dbTemplateId ?? toDbTemplateId(item.templateId);
      return Array.from({ length: item.quantity }, () => ({
        userId: user.id,
        templateId: dbTemplateId,
        status: "COMPLETED" as const,
        paidAmount: item.unitPrice.toFixed(2),
        currency: "USD" as const,
        transactionId: transaction.id,
        bankRef: transaction.bankRef,
      }));
    });

    if (purchaseRows.length) {
      await tx.insert(purchases).values(purchaseRows);
    }

    const titleIds = Array.from(
      new Set(lineItems.map((item) => item.dbTemplateId ?? toDbTemplateId(item.templateId))),
    );
    const templateRows = titleIds.length
      ? await tx
          .select({ id: templates.id, title: templates.title })
          .from(templates)
          .where(inArray(templates.id, titleIds))
      : [];
    const titleById = new Map(templateRows.map((row) => [row.id, row.title]));

    const purchasedTemplates = lineItems.map((item) => {
      const dbTemplateId = item.dbTemplateId ?? toDbTemplateId(item.templateId);
      return {
        title: titleById.get(dbTemplateId) ?? item.templateId,
        quantity: item.quantity,
      };
    });

    return {
      ok: true as const,
      skipped: false as const,
      email: {
        recipientEmail: transaction.userEmail,
        recipientName: user.name || transaction.userEmail.split("@")[0],
        transactionId: transaction.id,
        amount: transaction.amount,
        templates: purchasedTemplates,
      },
    };
  });

  if (!finalized.ok) {
    return { ok: false, message: finalized.message };
  }

  if (finalized.skipped) {
    return { ok: true };
  }

  await sendPaymentConfirmation(finalized.email);

  return { ok: true };
}
