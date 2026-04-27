import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { purchases, templates, transactions, users } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";

type Params = {
  params: Promise<{ templateId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { templateId } = await params;

  if (!templateId) {
    return NextResponse.json({ ok: false, message: "Missing template id." }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ ok: true, hasAccess: false, requiresSignIn: false, message: "Service unavailable." });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      ok: true,
      hasAccess: false,
      requiresSignIn: true,
      message: "Sign in to unlock download and receipt access for this product.",
    });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!user) {
    return NextResponse.json({ ok: true, hasAccess: false, requiresSignIn: false, message: "Account not ready yet." });
  }

  const dbTemplateId = toDbTemplateId(templateId);

  const [purchase] = await db
    .select({
      transactionId: transactions.id,
      purchasedAt: purchases.createdAt,
      licenseKey: purchases.licenseKey,
      previewUrl: templates.previewUrl,
      documentationUrl: templates.documentationUrl,
    })
    .from(purchases)
    .innerJoin(
      transactions,
      and(
        eq(transactions.id, purchases.transactionId),
        eq(transactions.userEmail, session.user.email),
        eq(transactions.status, "completed"),
      ),
    )
    .innerJoin(templates, eq(templates.id, purchases.templateId))
    .where(
      and(
        eq(purchases.userId, user.id),
        eq(purchases.templateId, dbTemplateId),
        eq(purchases.status, "COMPLETED"),
      ),
    )
    .orderBy(desc(purchases.createdAt))
    .limit(1);

  if (!purchase) {
    return NextResponse.json({
      ok: true,
      hasAccess: false,
      requiresSignIn: false,
      message: "Purchase this product to unlock secure download and receipt access.",
    });
  }

  return NextResponse.json({
    ok: true,
    hasAccess: true,
    requiresSignIn: false,
    transactionId: purchase.transactionId,
    purchasedAt: purchase.purchasedAt.toISOString(),
    licenseKey: purchase.licenseKey,
    previewUrl: purchase.previewUrl ?? "",
    documentationUrl: purchase.documentationUrl ?? "",
  });
}