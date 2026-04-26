import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { finalizeTransaction } from "@/lib/payments/finalize-transaction";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function sanitizeApiKey(input: string): string {
  return input.replace(/^['\"]|['\"]$/g, "").replace(/[\r\n\t ]+/g, "").trim();
}

function asLowerString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

function isPaidSignal(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  const normalized = asLowerString(value);
  if (!normalized) {
    return false;
  }

  return ["paid", "completed", "complete", "success", "succeeded", "true", "1"].includes(normalized);
}

function shouldInspectKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return ["paid", "status", "action", "state", "payment_status", "paymentstatus", "event", "type"].includes(normalized);
}

function hasPaidSignalDeep(value: unknown, depth = 0, seen?: WeakSet<object>): boolean {
  if (isPaidSignal(value)) {
    return true;
  }

  if (!value || typeof value !== "object" || depth > 6) {
    return false;
  }

  const visited = seen ?? new WeakSet<object>();
  if (visited.has(value as object)) {
    return false;
  }
  visited.add(value as object);

  if (Array.isArray(value)) {
    return value.some((item) => hasPaidSignalDeep(item, depth + 1, visited));
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (shouldInspectKey(key) && isPaidSignal(child)) {
      return true;
    }

    if (hasPaidSignalDeep(child, depth + 1, visited)) {
      return true;
    }
  }

  return false;
}

function isKhpayPaidResponse(raw: unknown): boolean {
  const root = asObject(raw);
  if (!root) {
    return false;
  }

  return hasPaidSignalDeep(root);
}

function formatPaywayRequestTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function paywaysha512(value: string): string {
  return createHash("sha512").update(value).digest("hex");
}

function randomDeviceId(): string {
  return Math.random().toString(36).slice(2, 12);
}

async function checkPaywayStatus(clientId: string): Promise<"paid" | "pending" | "error"> {
  const requestTime = formatPaywayRequestTime();
  const deviceId = randomDeviceId();
  const hash = paywaysha512(clientId + deviceId + requestTime);

  let response: Response;
  try {
    response = await fetch("https://pwapp.ababank.com/api/pw-app/v1/payment-link/check-payment-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ device_id: deviceId, request_time: requestTime, client_id: clientId, hash }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return "error";
  }

  let raw: unknown = null;
  try { raw = await response.json(); } catch { raw = null; }

  const root = asObject(raw);
  const data = asObject(root?.data);
  const action = typeof data?.action === "string" ? data.action.toLowerCase() : "";

  console.log("[checkout-status] payway check", { clientId, action, raw });

  if (action === "approved" || action === "paid" || action === "success") {
    return "paid";
  }

  return response.ok ? "pending" : "error";
}

type Params = {
  params: Promise<{ transactionId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { transactionId } = await params;
  const session = await getServerSession(authOptions);
  const requesterEmail = session?.user?.email?.toLowerCase();

  if (!transactionId) {
    return NextResponse.json({ ok: false, message: "Missing transaction id." }, { status: 400 });
  }

  if (!requesterEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ ok: false, message: "Checkout service is unavailable." }, { status: 500 });
  }

  let transaction: {
    id: string;
    status: string;
    bankRef: string | null;
    provider: string;
    templateId: string;
    userEmail: string;
    metadata: string | null;
  } | undefined;

  try {
    const [row] = await db
      .select({
        id: transactions.id,
        status: transactions.status,
        bankRef: transactions.bankRef,
        provider: transactions.provider,
        templateId: transactions.templateId,
        userEmail: transactions.userEmail,
        metadata: transactions.signature,
      })
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);
    transaction = row;
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to fetch transaction." }, { status: 500 });
  }

  if (!transaction) {
    return NextResponse.json({ ok: false, message: "Transaction not found." }, { status: 404 });
  }

  if (transaction.userEmail.toLowerCase() !== requesterEmail) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  let effectiveStatus = transaction.status;

  // --- PayWay automatic status polling ---
  if (transaction.status !== "completed" && transaction.provider === "aba-payway" && transaction.bankRef) {
    try {
      const paywayResult = await checkPaywayStatus(transaction.bankRef);
      if (paywayResult === "paid") {
        await db
          .update(transactions)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(transactions.id, transaction.id));

        await finalizeTransaction(transaction.id);
        effectiveStatus = "completed";
      }
    } catch {
      console.warn("[checkout-status] payway status check failed", {
        transactionId: transaction.id,
        bankRef: transaction.bankRef,
      });
    }
  }

  if (transaction.status !== "completed" && transaction.provider === "khpay" && transaction.bankRef) {
    const khpayApiKey = sanitizeApiKey(process.env.KHPAY_API_KEY ?? "");
    const khpayBaseUrl = (firstNonEmpty(process.env.KHPAY_BASE_URL, "https://khpay.site/api/v1") as string)
      .replace(/\/+$/, "");
    const proxySecret = (process.env.KHPAY_PROXY_SECRET ?? "").replace(/[\r\n\t\s]/g, "");
    const origin = firstNonEmpty(
      request.headers.get("origin") ?? undefined,
      `${request.nextUrl.protocol}//${request.nextUrl.host}`,
    ) as string;

    if (khpayApiKey) {
      try {
        let response = await fetch(`${origin.replace(/\/+$/, "")}/api/khpay-proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-proxy-secret": proxySecret,
          },
          body: JSON.stringify({
            action: "check",
            transactionId: transaction.bankRef,
          }),
          cache: "no-store",
        });

        // Fallback direct provider call when proxy check is unavailable.
        if (!response.ok) {
          response = await fetch(`${khpayBaseUrl}/qr/check/${encodeURIComponent(transaction.bankRef)}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${khpayApiKey}`,
            },
            cache: "no-store",
          });
        }

        let raw: unknown = null;
        try {
          raw = await response.json();
        } catch {
          raw = null;
        }

        const isPaid = response.ok && isKhpayPaidResponse(raw);
        console.log("[checkout-status] provider check", {
          transactionId: transaction.id,
          bankRef: transaction.bankRef,
          localStatus: transaction.status,
          providerHttpStatus: response.status,
          isPaid,
          providerRaw: raw,
        });

        if (isPaid) {
          await db
            .update(transactions)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(transactions.id, transaction.id));

          await finalizeTransaction(transaction.id);
          effectiveStatus = "completed";
        }
      } catch {
        // If provider polling fails transiently, return current local status.
        console.warn("[checkout-status] provider check failed", {
          transactionId: transaction.id,
          bankRef: transaction.bankRef,
        });
      }
    }
  }

  let lineItems: unknown[] = [];
  let isBundle = false;
  try {
    if (transaction.metadata) {
      const parsed = JSON.parse(transaction.metadata) as { lineItems?: unknown[]; isBundle?: boolean };
      lineItems = parsed.lineItems ?? [];
      isBundle = Boolean(parsed.isBundle);
    }
  } catch {
    lineItems = [];
    isBundle = false;
  }

  return NextResponse.json({
    ok: true,
    transactionId: transaction.id,
    templateId: transaction.templateId,
    lineItems,
    isBundle,
    status: effectiveStatus,
    bankRef: transaction.bankRef,
    provider: transaction.provider,
    requiresManualConfirmation: false,
  });
}
