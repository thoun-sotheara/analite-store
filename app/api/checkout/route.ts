import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { mockTemplates } from "@/lib/data/mock-templates";
import { createAbaPaymentPayload, signAbaPayload } from "@/lib/payments/aba-payway";
import { buildBakongKhqr, getKhqrImageUrl } from "@/lib/payments/bakong-khqr";

const checkoutSchema = z.object({
  templateId: z.string(),
  email: z.string().email(),
  provider: z.enum(["aba", "bakong"]),
});

export async function POST(request: NextRequest) {
  const accountEmail = request.cookies.get("demo_user_email")?.value;
  if (!accountEmail) {
    return NextResponse.json({ ok: false, message: "Please sign in before purchasing." }, { status: 401 });
  }

  let payload: z.infer<typeof checkoutSchema>;

  try {
    payload = checkoutSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid checkout payload." }, { status: 400 });
  }

  const selectedTemplate = mockTemplates.find((item) => item.id === payload.templateId);

  if (!selectedTemplate) {
    return NextResponse.json({ ok: false, message: "Template not found." }, { status: 404 });
  }

  const transactionId = randomUUID();
  const amount = selectedTemplate.priceUsd;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  let khqrString = "";

  if (payload.provider === "aba") {
    const abaPayload = createAbaPaymentPayload({
      merchantId: process.env.ABA_MERCHANT_ID ?? "demo-merchant",
      amount,
      transactionId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/success?tx=${transactionId}&template=${selectedTemplate.id}`,
    });

    const signature = signAbaPayload(
      abaPayload as Record<string, string>,
      process.env.ABA_SECRET_KEY ?? "dev-secret",
    );

    khqrString = JSON.stringify({ payload: abaPayload, signature });
  } else {
    khqrString = buildBakongKhqr({
      merchantId: process.env.BAKONG_MERCHANT_ID ?? "0000000000",
      merchantName: process.env.BAKONG_MERCHANT_NAME ?? "Analite Store",
      amount,
      transactionRef: transactionId,
    });
  }

  try {
    await db?.insert(transactions).values({
      id: transactionId,
      userEmail: payload.email,
      status: "pending",
      amount: amount.toFixed(2),
      provider: payload.provider,
      templateId: selectedTemplate.id,
      khqrPayload: khqrString,
    });
  } catch {
    // Keep local preview functional without hard DB requirement.
  }

  return NextResponse.json({
    ok: true,
    transactionId,
    amount,
    provider: payload.provider,
    khqrString,
    qrImageUrl: getKhqrImageUrl(khqrString),
    expiresAt,
  });
}
