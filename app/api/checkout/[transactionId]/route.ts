import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

type Params = {
  params: Promise<{ transactionId: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { transactionId } = await params;

  if (!transactionId) {
    return NextResponse.json({ ok: false, message: "Missing transaction id." }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({
      ok: true,
      status: "pending",
      bankRef: null,
    });
  }

  const [transaction] = await db
    .select({
      id: transactions.id,
      status: transactions.status,
      bankRef: transactions.bankRef,
      templateId: transactions.templateId,
    })
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!transaction) {
    return NextResponse.json({ ok: false, message: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    transactionId: transaction.id,
    templateId: transaction.templateId,
    status: transaction.status,
    bankRef: transaction.bankRef,
  });
}
