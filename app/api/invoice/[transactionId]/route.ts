import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { purchases, templates, transactions, users } from "@/lib/db/schema";
import { generateInvoicePdf } from "@/lib/invoices/generate-invoice";

type Params = {
  params: Promise<{ transactionId: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { transactionId } = await params;

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!transactionId) {
    return NextResponse.json({ ok: false, message: "Missing transaction id." }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
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
      provider: transactions.provider,
      userEmail: transactions.userEmail,
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

  const purchaseRows = await db
    .select({
      currency: purchases.currency,
      paidAmount: purchases.paidAmount,
      licenseKey: purchases.licenseKey,
      templateId: templates.id,
      templateTitle: templates.title,
      templateSlug: templates.slug,
      templateCategory: templates.category,
    })
    .from(purchases)
    .innerJoin(templates, eq(templates.id, purchases.templateId))
    .where(
      and(
        eq(purchases.transactionId, transaction.id),
        eq(purchases.userId, linkedUser.id),
        eq(purchases.status, "COMPLETED"),
      ),
    );

  if (purchaseRows.length === 0) {
    return NextResponse.json({ ok: false, message: "No completed purchase found." }, { status: 404 });
  }

  const amountUsd = Number(transaction.amount);
  const invoiceDate = transaction.completedAt ?? transaction.createdAt ?? new Date();
  const primaryCurrency = purchaseRows[0].currency;

  const lineItems = purchaseRows.map((row) => ({
    templateId: row.templateId,
    title: row.templateTitle,
    slug: row.templateSlug,
    category: row.templateCategory,
    licenseKey: row.licenseKey,
    amountUsd: Number(row.paidAmount),
    currency: row.currency,
  }));

  const pdfBytes = await generateInvoicePdf({
    transactionId: transaction.id,
    createdAt: new Date(invoiceDate),
    bankRef: transaction.bankRef ?? "Pending",
    amountUsd: Number.isFinite(amountUsd) ? amountUsd : 0,
    currency: primaryCurrency,
    provider: transaction.provider,
    customerEmail: transaction.userEmail,
    lineItems,
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
