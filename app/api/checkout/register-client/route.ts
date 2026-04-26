import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { templates, transactions } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";

const checkoutItemSchema = z.object({
  templateId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(5),
});

const registerSchema = z.object({
  templateId: z.string().min(1).optional(),
  items: z.array(checkoutItemSchema).min(1).max(20).optional(),
  providerTransactionId: z.string().min(1),
  paymentUrl: z.string().url(),
  qrString: z.string().optional(),
  expiresIn: z.number().int().positive().optional(),
}).refine((value) => Boolean(value.templateId) || Boolean(value.items?.length), {
  message: "Either templateId or items is required.",
});

type CheckoutLineItem = {
  templateId: string;
  dbTemplateId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

async function resolveCheckoutLineItems(payload: z.infer<typeof registerSchema>): Promise<CheckoutLineItem[]> {
  const items = payload.items?.length ? payload.items : [{ templateId: payload.templateId as string, quantity: 1 }];

  const merged = new Map<string, number>();
  for (const item of items) {
    const current = merged.get(item.templateId) ?? 0;
    merged.set(item.templateId, Math.min(5, current + item.quantity));
  }

  const lookup = Array.from(merged.entries()).map(([templateId, quantity]) => ({
    templateId,
    dbTemplateId: toDbTemplateId(templateId),
    quantity,
  }));

  const dbRows = db
    ? await db
        .select({
          id: templates.id,
          priceUsd: templates.priceUsd,
          isActive: templates.isActive,
        })
        .from(templates)
        .where(inArray(templates.id, lookup.map((item) => item.dbTemplateId)))
    : [];

  const priceByDbId = new Map(
    dbRows
      .filter((row) => row.isActive)
      .map((row) => [row.id, Number(row.priceUsd)]),
  );

  const lineItems: CheckoutLineItem[] = [];
  for (const item of lookup) {
    const dbPrice = priceByDbId.get(item.dbTemplateId);
    if (typeof dbPrice !== "number" || !Number.isFinite(dbPrice) || dbPrice <= 0) {
      continue;
    }

    lineItems.push({
      templateId: item.templateId,
      dbTemplateId: item.dbTemplateId,
      quantity: item.quantity,
      unitPrice: dbPrice,
      lineTotal: dbPrice * item.quantity,
    });
  }

  return lineItems;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const accountEmail = session?.user?.email;
  if (!accountEmail) {
    return NextResponse.json({ ok: false, message: "Please sign in before purchasing." }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ ok: false, message: "Checkout service is unavailable." }, { status: 500 });
  }

  let payload: z.infer<typeof registerSchema>;
  try {
    payload = registerSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid checkout payload." }, { status: 400 });
  }

  const lineItems = await resolveCheckoutLineItems(payload);
  if (!lineItems.length) {
    return NextResponse.json({ ok: false, message: "No valid cart items were provided." }, { status: 400 });
  }

  const amount = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid checkout amount." }, { status: 400 });
  }

  const transactionId = randomUUID();
  const primaryTemplateId = lineItems[0].templateId;
  const primaryDbTemplateId = lineItems[0].dbTemplateId;
  const isBundle = lineItems.length > 1 || lineItems[0].quantity > 1;
  const [templateRecord] = await db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.id, primaryDbTemplateId), eq(templates.isActive, true)))
    .limit(1);

  if (!templateRecord) {
    return NextResponse.json({ ok: false, message: "Unable to prepare template for checkout." }, { status: 500 });
  }

  const expiresIn = payload.expiresIn ?? 180;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  try {
    await db.insert(transactions).values({
      id: transactionId,
      userEmail: accountEmail,
      status: "pending",
      amount: amount.toFixed(2),
      provider: "khpay",
      templateId: primaryDbTemplateId,
      khqrPayload: payload.qrString ?? null,
      bankRef: payload.providerTransactionId,
      signature: JSON.stringify({
        lineItems,
        isBundle,
        providerTransactionId: payload.providerTransactionId,
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to initialize checkout." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    transactionId,
    templateId: primaryTemplateId,
    amount,
    isBundle,
    lineItems,
    provider: "khpay",
    providerTransactionId: payload.providerTransactionId,
    paymentUrl: payload.paymentUrl,
    khqrString: payload.qrString,
    expiresAt,
    expiresIn,
  });
}
