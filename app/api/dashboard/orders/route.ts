import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchases, templates, transactions, users } from "@/lib/db/schema";
import { requireAdminRoute } from "@/lib/auth/require-admin";

export async function GET() {
  const gate = await requireAdminRoute();
  if (!gate.ok) {
    return gate.response;
  }

  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const baseRows = await db
    .select({
      id: transactions.id,
      status: transactions.status,
      amount: transactions.amount,
      userEmail: transactions.userEmail,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
      bankRef: transactions.bankRef,
      templateId: transactions.templateId,
      templateTitle: templates.title,
      userName: users.name,
    })
    .from(transactions)
    .leftJoin(templates, eq(templates.id, transactions.templateId))
    .leftJoin(users, eq(users.email, transactions.userEmail))
    .orderBy(desc(transactions.createdAt));

  const transactionIds = baseRows.map((row) => row.id);
  const purchaseRows = transactionIds.length
    ? await db
        .select({
          transactionId: purchases.transactionId,
          licenseKey: purchases.licenseKey,
          templateTitle: templates.title,
        })
        .from(purchases)
        .leftJoin(templates, eq(templates.id, purchases.templateId))
        .where(inArray(purchases.transactionId, transactionIds))
    : [];

  const purchasesByTransactionId = new Map<string, typeof purchaseRows>();
  for (const row of purchaseRows) {
    const bucket = purchasesByTransactionId.get(row.transactionId ?? "") ?? [];
    bucket.push(row);
    purchasesByTransactionId.set(row.transactionId ?? "", bucket);
  }

  const orders = baseRows.map((row) => {
    const purchased = purchasesByTransactionId.get(row.id) ?? [];
    const itemCount = purchased.length || 1;
    const firstTitle = purchased[0]?.templateTitle ?? row.templateTitle ?? "Template order";
    const product = itemCount > 1 ? `${firstTitle} +${itemCount - 1} more` : firstTitle;

    return {
      id: row.id,
      buyer: row.userName ?? row.userEmail.split("@")[0],
      buyerEmail: row.userEmail,
      product,
      amount: Number(row.amount),
      status: row.status === "completed" ? "Completed" : "Pending",
      date: new Date(row.completedAt ?? row.createdAt ?? new Date()).toISOString().slice(0, 10),
      licenseKey: purchased[0]?.licenseKey ?? "Pending",
      bankRef: row.bankRef ?? "Pending",
      itemCount,
      invoiceUrl: row.status === "completed" ? `/api/invoice/${row.id}` : null,
    };
  });

  return NextResponse.json(orders);
}