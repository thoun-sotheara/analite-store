import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { purchases, transactions, users } from "@/lib/db/schema";
import { verifyPaymentSignature } from "@/lib/payments/verify-payment";

const payloadSchema = z.object({
  transaction_id: z.string(),
  bank_ref: z.string(),
  status: z.enum(["pending", "completed"]),
  amount: z.union([z.string(), z.number()]),
});

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const signature = request.headers.get("x-bank-signature") ?? "";
  const secret = process.env.BANK_WEBHOOK_SECRET ?? "";

  if (!secret) {
    return NextResponse.json({ ok: false, message: "Missing webhook secret." }, { status: 500 });
  }

  const valid = verifyPaymentSignature(bodyText, signature, secret);

  if (!valid) {
    return NextResponse.json({ ok: false, message: "Invalid signature." }, { status: 401 });
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(JSON.parse(bodyText));
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  if (db) {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, payload.transaction_id),
          eq(transactions.amount, String(payload.amount)),
        ),
      )
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ ok: false, message: "Transaction not found." }, { status: 404 });
    }

    await db
      .update(transactions)
      .set({
        status: payload.status,
        bankRef: payload.bank_ref,
        completedAt: payload.status === "completed" ? new Date() : null,
      })
      .where(eq(transactions.id, payload.transaction_id));

    if (payload.status === "completed") {
      let [user] = await db
        .select({ id: users.id })
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
          .returning({ id: users.id });
      }

      const [existingPurchase] = await db
        .select({ id: purchases.id })
        .from(purchases)
        .where(eq(purchases.transactionId, transaction.id))
        .limit(1);

      if (!existingPurchase) {
        await db.insert(purchases).values({
          userId: user.id,
          templateId: transaction.templateId,
          status: "COMPLETED",
          paidAmount: transaction.amount,
          currency: "USD",
          transactionId: transaction.id,
          bankRef: payload.bank_ref,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
