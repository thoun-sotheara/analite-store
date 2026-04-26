import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { finalizeTransaction } from "@/lib/payments/finalize-transaction";

/**
 * Admin endpoint for payment confirmation via external systems (e.g., ABA Telegram bot)
 * Requires PAYMENT_ADMIN_SECRET header for security
 *
 * Request body:
 * {
 *   "transactionId": "uuid",
 *   "bankRef": "optional-bank-reference-for-verification"
 * }
 */
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
  }

  const adminSecret = process.env.PAYMENT_ADMIN_SECRET;
  const providedSecret = request.headers.get("x-payment-admin-secret");

  // Require admin secret for this endpoint
  if (!adminSecret || !providedSecret || adminSecret !== providedSecret) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let body: { transactionId: string; bankRef?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  if (!body?.transactionId) {
    return NextResponse.json({ ok: false, message: "Transaction ID is required." }, { status: 400 });
  }

  try {
    const [transaction] = await db
      .select({
        id: transactions.id,
        status: transactions.status,
        bankRef: transactions.bankRef,
      })
      .from(transactions)
      .where(eq(transactions.id, body.transactionId))
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ ok: false, message: "Transaction not found." }, { status: 404 });
    }

    // If bankRef is provided, verify it matches
    if (body.bankRef && transaction.bankRef !== body.bankRef) {
      return NextResponse.json({ ok: false, message: "Bank reference mismatch." }, { status: 400 });
    }

    // If already completed, just return success
    if (transaction.status === "completed") {
      return NextResponse.json({ ok: true, message: "Payment already confirmed." });
    }

    // Mark transaction as completed
    await db
      .update(transactions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(transactions.id, transaction.id));

    // Finalize the transaction (creates purchases and sends email)
    await finalizeTransaction(transaction.id);

    console.log(`[payments/admin-confirm] Payment confirmed: ${body.transactionId}`);

    return NextResponse.json({ ok: true, message: "Payment confirmed successfully." });
  } catch (error) {
    console.error("[payments/admin-confirm] Error:", error);
    return NextResponse.json({ ok: false, message: "Unable to confirm payment." }, { status: 500 });
  }
}
