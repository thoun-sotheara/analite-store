import { eq, inArray } from "drizzle-orm";
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

  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!transaction) {
    return { ok: false, message: "Transaction not found." };
  }

  if (transaction.status !== "completed") {
    return { ok: false, message: "Transaction is not completed yet." };
  }

  const [existingForTransaction] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(eq(purchases.transactionId, transaction.id))
    .limit(1);

  if (existingForTransaction) {
    return { ok: true };
  }

  let [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, transaction.userEmail))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: transaction.userEmail,
        name: transaction.userEmail.split("@")[0],
      })
      .returning({ id: users.id, name: users.name });
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

  for (const item of lineItems) {
    for (let i = 0; i < item.quantity; i += 1) {
      await db.insert(purchases).values({
        userId: user.id,
        templateId: item.dbTemplateId ?? toDbTemplateId(item.templateId),
        status: "COMPLETED",
        paidAmount: item.unitPrice.toFixed(2),
        currency: "USD",
        transactionId: transaction.id,
        bankRef: transaction.bankRef,
      });
    }
  }

  // Send payment confirmation email
  const titleIds = Array.from(
    new Set(lineItems.map((item) => item.dbTemplateId ?? toDbTemplateId(item.templateId))),
  );
  const templateRows = titleIds.length
    ? await db
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

  await sendPaymentConfirmation({
    recipientEmail: transaction.userEmail,
    recipientName: user.name || transaction.userEmail.split("@")[0],
    transactionId: transaction.id,
    amount: transaction.amount,
    templates: purchasedTemplates,
  });

  return { ok: true };
}
