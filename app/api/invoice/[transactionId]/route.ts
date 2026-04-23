import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { DEMO_MODE } from "@/lib/config/demo";
import { db } from "@/lib/db";
import { purchases, transactions, users } from "@/lib/db/schema";
import { generateInvoicePdf } from "@/lib/invoices/generate-invoice";

type Params = {
  params: Promise<{ transactionId: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const session = DEMO_MODE ? null : await getServerSession(authOptions);
  const { transactionId } = await params;

  if (!DEMO_MODE && !session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!transactionId) {
    return NextResponse.json({ ok: false, message: "Missing transaction id." }, { status: 400 });
  }

  if (DEMO_MODE || !db) {
    const demoPdf = await generateInvoicePdf({
      transactionId,
      createdAt: new Date(),
      bankRef: "DEMO-REF",
      amountUsd: 49,
      currency: "USD",
    });
    const demoPdfBuffer = Buffer.from(demoPdf);

    return new Response(demoPdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${transactionId}.pdf"`,
      },
    });
  }

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const [linkedUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!linkedUser) {
    return NextResponse.json({ ok: false, message: "User account not found." }, { status: 404 });
  }

  const [transaction] = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      bankRef: transactions.bankRef,
      completedAt: transactions.completedAt,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userEmail, session.user.email),
        eq(transactions.status, "completed"),
      ),
    )
    .limit(1);

  if (!transaction) {
    return NextResponse.json({ ok: false, message: "Completed transaction not found." }, { status: 404 });
  }

  const [purchase] = await db
    .select({ currency: purchases.currency })
    .from(purchases)
    .where(
      and(
        eq(purchases.transactionId, transaction.id),
        eq(purchases.userId, linkedUser.id),
        eq(purchases.status, "COMPLETED"),
      ),
    )
    .limit(1);

  if (!purchase) {
    return NextResponse.json({ ok: false, message: "No completed purchase found." }, { status: 404 });
  }

  const amountUsd = Number(transaction.amount);
  const invoiceDate = transaction.completedAt ?? transaction.createdAt ?? new Date();

  const pdfBytes = await generateInvoicePdf({
    transactionId: transaction.id,
    createdAt: new Date(invoiceDate),
    bankRef: transaction.bankRef ?? "Pending",
    amountUsd: Number.isFinite(amountUsd) ? amountUsd : 0,
    currency: purchase.currency,
  });
  const pdfBuffer = Buffer.from(pdfBytes);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${transaction.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
