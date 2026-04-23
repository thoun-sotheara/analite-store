"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { mockTemplates } from "@/lib/data/mock-templates";
import { buildBakongKhqr, getKhqrImageUrl } from "@/lib/payments/bakong-khqr";
import { createAbaPaymentPayload, signAbaPayload } from "@/lib/payments/aba-payway";
import { emptyPaymentSession, type PaymentSession } from "@/lib/payments/types";

export async function initiatePaymentAction(
  templateId: string,
  _state: PaymentSession,
  formData: FormData,
): Promise<PaymentSession> {
  const selectedTemplate = mockTemplates.find((item) => item.id === templateId);

  if (!selectedTemplate) {
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
  const amount = selectedTemplate.priceUsd;

  let khqrString = "";

  if (provider === "aba") {
    const payload = createAbaPaymentPayload({
      merchantId: process.env.ABA_MERCHANT_ID ?? "demo-merchant",
      amount,
      transactionId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/success?tx=${transactionId}&template=${templateId}`,
    });

    const signature = signAbaPayload(
      payload as Record<string, string>,
      process.env.ABA_SECRET_KEY ?? "dev-secret",
    );

    khqrString = JSON.stringify({ payload, signature });
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
      userEmail,
      status: "pending",
      amount: amount.toFixed(2),
      provider,
      templateId,
      khqrPayload: khqrString,
    });
  } catch {
    // Allow local development to continue when DB is not connected.
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
