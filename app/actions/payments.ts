"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates, transactions } from "@/lib/db/schema";
import { buildBakongKhqr, getKhqrImageUrl } from "@/lib/payments/bakong-khqr";
import { createAbaPaymentPayload, signAbaPayload } from "@/lib/payments/aba-payway";
import { toDbTemplateId } from "@/lib/payments/template-id-map";
import { emptyPaymentSession, type PaymentSession } from "@/lib/payments/types";

export async function initiatePaymentAction(
  templateId: string,
  _state: PaymentSession,
  formData: FormData,
): Promise<PaymentSession> {
  if (!db) {
    return {
      ...emptyPaymentSession,
      message: "Payment service is temporarily unavailable.",
    };
  }

  const dbTemplateId = toDbTemplateId(templateId);
  const [selectedTemplate] = await db
    .select({ id: templates.id, priceUsd: templates.priceUsd, isActive: templates.isActive })
    .from(templates)
    .where(eq(templates.id, dbTemplateId))
    .limit(1);

  if (!selectedTemplate || !selectedTemplate.isActive) {
    return {
      ...emptyPaymentSession,
      message: "Template not found.",
    };
  }

  const provider = (formData.get("provider")?.toString() ?? "bakong") as
    | "aba"
    | "bakong";
  const userEmail = formData.get("email")?.toString().trim() ?? "";

  if (!userEmail || !userEmail.includes("@")) {
    return {
      ...emptyPaymentSession,
      provider,
      message: "Valid email is required.",
    };
  }

  const transactionId = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const amount = Number(selectedTemplate.priceUsd);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ...emptyPaymentSession,
      provider,
      message: "Template price is invalid.",
    };
  }

  let khqrString = "";

  if (provider === "aba") {
    const payload = createAbaPaymentPayload({
      merchantId: process.env.ABA_MERCHANT_ID ?? "sandbox-merchant",
      amount,
      transactionId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/success?tx=${transactionId}`,
    });

    const signature = signAbaPayload(
      payload as Record<string, string>,
      process.env.ABA_SECRET_KEY ?? "dev-secret",
    );

    khqrString = JSON.stringify({ payload, signature });
  } else {
    khqrString = buildBakongKhqr({
      merchantId: process.env.BAKONG_MERCHANT_ID ?? "0000000000",
      merchantName: process.env.BAKONG_MERCHANT_NAME ?? "Analite Kit",
      amount,
      transactionRef: transactionId,
    });
  }

  try {
    await db.insert(transactions).values({
      id: transactionId,
      userEmail,
      status: "pending",
      amount: amount.toFixed(2),
      provider,
      templateId: dbTemplateId,
      khqrPayload: khqrString,
    });
  } catch {
    return {
      ...emptyPaymentSession,
      provider,
      message: "Unable to create the payment session.",
    };
  }

  return {
    ok: true,
    provider,
    transactionId,
    amount,
    khqrString,
    qrImageUrl: getKhqrImageUrl(khqrString),
    expiresAt,
    message: "KHQR generated. Complete payment before countdown reaches zero.",
  };
}
