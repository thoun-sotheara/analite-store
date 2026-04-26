import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { finalizeTransaction } from "@/lib/payments/finalize-transaction";

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.toLowerCase();

  let body: { transactionId: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  if (!body?.transactionId) {
    return NextResponse.json({ ok: false, message: "Transaction ID is required." }, { status: 400 });
  }

  if (!userEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const [transaction] = await db
      .select({
        id: transactions.id,
        status: transactions.status,
        userEmail: transactions.userEmail,
      })
      .from(transactions)
      .where(eq(transactions.id, body.transactionId))
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ ok: false, message: "Transaction not found." }, { status: 404 });
    }

    // Only the transaction owner can confirm their own payment
    if (transaction.userEmail.toLowerCase() !== userEmail) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
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

    return NextResponse.json({ ok: true, message: "Payment confirmed successfully." });
  } catch (error) {
    console.error("[payments/confirm] Error:", error);
    return NextResponse.json({ ok: false, message: "Unable to confirm payment." }, { status: 500 });
  }
}
