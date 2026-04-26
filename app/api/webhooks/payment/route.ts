import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { finalizeTransaction } from "@/lib/payments/finalize-transaction";
import { verifyPaymentSignature } from "@/lib/payments/verify-payment";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function readStringLower(value: unknown): string | null {
  const text = readString(value);
  return text ? text.toLowerCase() : null;
}

function readAmount(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function normalizeEvent(raw: Record<string, unknown>): "payment.paid" | "payment.failed" | "payment.expired" | null {
  const directEvent = readStringLower(raw.event);
  const directType = readStringLower(raw.type);
  const data = asObject(raw.data);
  const dataEvent = readStringLower(data?.event);
  const dataType = readStringLower(data?.type);
  const directStatus = readStringLower(raw.status);
  const dataStatus = readStringLower(data?.status);
  const directAction = readStringLower(raw.action);
  const dataAction = readStringLower(data?.action);
  const candidates = [directEvent, directType, dataEvent, dataType, directStatus, dataStatus, directAction, dataAction];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (
      candidate === "payment.paid"
      || candidate === "payment.success"
      || candidate === "paid"
      || candidate === "completed"
      || candidate === "success"
      || candidate === "succeeded"
    ) {
      return "payment.paid";
    }

    if (candidate === "payment.failed" || candidate === "failed") {
      return "payment.failed";
    }

    if (candidate === "payment.expired" || candidate === "expired") {
      return "payment.expired";
    }
  }

  return null;
}

function extractPayloadFields(raw: Record<string, unknown>): {
  providerTransactionId: string | null;
  orderId: string | null;
  amount: number | null;
  currency: string | null;
} {
  const data = asObject(raw.data);
  const metadata = asObject(data?.metadata);

  const providerTransactionId =
    readString(data?.transaction_id)
    ?? readString(data?.tran_id)
    ?? readString(data?.reference)
    ?? readString(raw.transaction_id)
    ?? readString(raw.reference)
    ?? null;

  const orderId = readString(metadata?.order_id) ?? readString(data?.order_id) ?? null;
  const amount = readAmount(data?.amount ?? raw.amount);
  const currency = readString(data?.currency ?? raw.currency);

  return { providerTransactionId, orderId, amount, currency };
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
  }

  const bodyText = await request.text();
  const signature =
    request.headers.get("x-webhook-signature")
    ?? request.headers.get("x-callback-signature")
    ?? "";
  const secret = (process.env.KHPAY_WEBHOOK_SECRET ?? "").trim();
  const requireSignature = (process.env.KHPAY_REQUIRE_SIGNATURE ?? "false").toLowerCase() === "true";

  console.log("[webhook] incoming", {
    hasSignature: Boolean(signature),
    signatureLength: signature.length,
    hasSecret: Boolean(secret),
    requireSignature,
  });

  if (secret) {
    if (!signature && requireSignature) {
      console.warn("[webhook] rejected missing signature");
      return NextResponse.json({ ok: false, message: "Missing signature." }, { status: 401 });
    }

    if (signature) {
      const valid = verifyPaymentSignature(bodyText, signature, secret);
      if (!valid) {
        console.warn("[webhook] rejected invalid signature");
        return NextResponse.json({ ok: false, message: "Invalid signature." }, { status: 401 });
      }
    }
  }

  let payloadRaw: Record<string, unknown>;

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    const normalized = asObject(parsed);
    if (!normalized) {
      return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
    }
    payloadRaw = normalized;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const event = normalizeEvent(payloadRaw);
  if (!event) {
    console.warn("[webhook] unsupported event", { payload: payloadRaw });
    return NextResponse.json({ ok: false, message: "Unsupported event." }, { status: 400 });
  }

  const { providerTransactionId, orderId, amount, currency } = extractPayloadFields(payloadRaw);
  console.log("[webhook] parsed payload", {
    event,
    providerTransactionId,
    orderId,
    amount,
    currency,
  });

  if (!providerTransactionId && !orderId) {
    console.warn("[webhook] missing transaction reference", { payload: payloadRaw });
    return NextResponse.json({ ok: false, message: "Missing transaction reference." }, { status: 400 });
  }

  let transaction:
    | { id: string; amount: string; status: string }
    | undefined;

  if (providerTransactionId) {
    const [byBankRef] = await db
      .select({ id: transactions.id, amount: transactions.amount, status: transactions.status })
      .from(transactions)
      .where(eq(transactions.bankRef, providerTransactionId))
      .limit(1);

    transaction = byBankRef;
  }

  if (!transaction && orderId) {
    const [byOrderId] = await db
      .select({ id: transactions.id, amount: transactions.amount, status: transactions.status })
      .from(transactions)
      .where(eq(transactions.id, orderId))
      .limit(1);

    transaction = byOrderId;
  }

  if (!transaction) {
    console.warn("[webhook] transaction not found", {
      providerTransactionId,
      orderId,
    });
    return NextResponse.json({ ok: false, message: "Transaction not found." }, { status: 404 });
  }

  if (amount !== null) {
    const localAmount = Number(transaction.amount);
    if (Number.isFinite(localAmount)) {
      const shouldValidateAmount = !currency || currency.toUpperCase() === "USD";
      if (shouldValidateAmount && localAmount.toFixed(2) !== amount.toFixed(2)) {
        console.warn("[webhook] amount mismatch", {
          transactionId: transaction.id,
          localAmount,
          payloadAmount: amount,
          currency,
        });
        return NextResponse.json({ ok: false, message: "Amount mismatch." }, { status: 400 });
      }
    }
  }

  if (event === "payment.paid") {
    console.log("[webhook] marking transaction completed", { transactionId: transaction.id });
    await db
      .update(transactions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(transactions.id, transaction.id));

    await finalizeTransaction(transaction.id);
    console.log("[webhook] finalized transaction", { transactionId: transaction.id });
  }

  if (event === "payment.failed" || event === "payment.expired") {
    // Keep as pending when schema supports only pending/completed.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
