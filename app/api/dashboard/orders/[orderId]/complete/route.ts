import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { finalizeTransaction } from "@/lib/payments/finalize-transaction";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const gate = await requireAdminRoute();
  if (!gate.ok) {
    return gate.response;
  }

  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is unavailable." }, { status: 503 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ ok: false, message: "Order id is required." }, { status: 400 });
  }

  const [transaction] = await db
    .select({ id: transactions.id, status: transactions.status })
    .from(transactions)
    .where(eq(transactions.id, orderId))
    .limit(1);

  if (!transaction) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  if (transaction.status !== "completed") {
    await db
      .update(transactions)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(transactions.id, orderId), eq(transactions.status, transaction.status)));
  }

  const result = await finalizeTransaction(orderId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message ?? "Unable to finalize order." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Order marked as completed." });
}
