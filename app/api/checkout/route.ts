import { randomUUID, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { templates, transactions } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";

const checkoutItemSchema = z.object({
  templateId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(5),
});

const checkoutSchema = z.object({
  provider: z.literal("khpay").optional().default("khpay"),
  templateId: z.string().min(1).optional(),
  items: z.array(checkoutItemSchema).min(1).max(20).optional(),
}).refine((value) => Boolean(value.templateId) || Boolean(value.items?.length), {
  message: "Either templateId or items is required.",
});

type KhpayGenerateResult = {
  transactionId: string;
  paymentUrl: string;
  qrString?: string;
  expiresIn: number;
};

type PaywayGenerateResult = {
  providerTransactionId: string;
  qrString: string;
  paymentUrl: string;
  expiresIn: number;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(record: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isTruthySuccess(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function extractKhpayMessage(raw: unknown): string | undefined {
  const root = asRecord(raw);
  const data = asRecord(root?.data);

  return firstNonEmpty(
    getString(root, "message"),
    getString(root, "error"),
    getString(root, "detail"),
    getString(data, "message"),
    getString(data, "error"),
    getString(data, "detail"),
  );
}

function normalizeKhpayGenerate(raw: unknown): KhpayGenerateResult | undefined {
  const root = asRecord(raw);
  const data = asRecord(root?.data);
  if (!root) return undefined;

  const success = root.success;
  const status = root.status;
  const hasSuccessSignal = isTruthySuccess(success) || isTruthySuccess(status);

  const transactionId = firstNonEmpty(
    getString(data, "transaction_id"),
    getString(data, "transactionId"),
    getString(data, "tx_id"),
    getString(root, "transaction_id"),
    getString(root, "transactionId"),
  );

  // KHPay API/SDK variants may return one of these keys for checkout URL.
  const paymentUrl = firstNonEmpty(
    getString(data, "qr_url"),
    getString(data, "payment_url"),
    getString(data, "paymentUrl"),
    getString(data, "download_qr"),
    getString(data, "downloadQr"),
    getString(root, "qr_url"),
    getString(root, "payment_url"),
    getString(root, "paymentUrl"),
    getString(root, "download_qr"),
  );

  const qrString = firstNonEmpty(
    getString(data, "qr_string"),
    getString(data, "qrString"),
    getString(root, "qr_string"),
    getString(root, "qrString"),
  );

  const expiresIn =
    getNumber(data, "expires_in") ??
    getNumber(data, "expiresIn") ??
    getNumber(root, "expires_in") ??
    getNumber(root, "expiresIn") ??
    180;

  if (!transactionId || !paymentUrl) {
    return undefined;
  }

  if (!hasSuccessSignal && !qrString) {
    // Keep strictness when there is no success indicator and no QR payload.
    return undefined;
  }

  return {
    transactionId,
    paymentUrl,
    qrString,
    expiresIn: expiresIn > 0 ? expiresIn : 180,
  };
}

function sanitizeApiKey(input: string): string {
  // Remove accidental quotes/newlines/spaces copied from dashboards or env editors.
  return input.replace(/^['\"]|['\"]$/g, "").replace(/[\r\n\t ]+/g, "").trim();
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

function resolvePaywayLink(): string | undefined {
  return firstNonEmpty(
    process.env.PAYWAY_LINK,
    process.env.ABA_PAYWAY_LINK,
    process.env.NEXT_PUBLIC_PAYWAY_LINK,
    "https://link.payway.com.kh/ABAPAYdE436285n",
  );
}

function formatPaywayRequestTime(date = new Date()): string {
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const hh = date.getHours().toString().padStart(2, "0");
  const mi = date.getMinutes().toString().padStart(2, "0");
  const ss = date.getSeconds().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

function paywaysha512(value: string): string {
  return createHash("sha512").update(value).digest("hex");
}

function resolvePaywayLinkToken(): string {
  const link = resolvePaywayLink() ?? "https://link.payway.com.kh/ABAPAYdE436285n";
  // Extract the path token, e.g. "ABAPAYdE436285n" from the URL
  const token = link.split("/").filter(Boolean).pop() ?? "ABAPAYdE436285n";
  return token;
}

async function fetchPaywayAbaData(requestTime: string): Promise<{ ok: true; abaData: string } | { ok: false; message: string }> {
  const linkToken = resolvePaywayLinkToken();
  const hash = paywaysha512(requestTime + linkToken);

  let response: Response;
  try {
    response = await fetch("https://pwapp.ababank.com/api/pw-app/v1/payment/gateway/validate-payment-link-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ request_time: requestTime, instore_transaction_id: linkToken, hash }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { ok: false, message: "PayWay validation request timed out." };
  }

  let raw: unknown = null;
  try { raw = await response.json(); } catch { raw = null; }

  const root = asRecord(raw);
  const abaData = getString(root, "aba_data");
  if (!abaData) {
    console.error("[checkout] validate-payment-link-v2 did not return aba_data", raw);
    return { ok: false, message: "PayWay could not initialize payment session." };
  }
  return { ok: true, abaData };
}

async function postPaywayGenerate(amount: number, paymentUrl: string): Promise<{ ok: true; data: PaywayGenerateResult } | { ok: false; status: number; message: string }> {
  const requestTime = formatPaywayRequestTime();

  // Step 1: Validate the payment link to get a fresh aba_data
  const linkDataResult = await fetchPaywayAbaData(requestTime);
  if (!linkDataResult.ok) {
    return { ok: false, status: 502, message: linkDataResult.message };
  }
  const abaData = linkDataResult.abaData;

  // Step 2: Generate KHQR with correct SHA512 hash
  const additionalFields = JSON.stringify({ amount: amount.toFixed(2) });
  const hash = paywaysha512(requestTime + abaData + additionalFields);

  let response: Response;
  try {
    response = await fetch("https://pwapp.ababank.com/api/pw-app/v1/payment/gateway/list-payment-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        additional_fields: additionalFields,
        request_time: requestTime,
        aba_data: abaData,
        hash,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, status: 504, message: "PayWay request timed out." };
  }

  let raw: unknown = null;
  try {
    raw = await response.json();
  } catch {
    raw = null;
  }

  const root = asRecord(raw);
  const status = asRecord(root?.status);
  const data = asRecord(root?.data);
  const statusCode = getString(status, "code");
  const statusMessage = getString(status, "message");
  const qrString = getString(root, "qr_string");
  const expiresIn = Number(getString(root, "expire_in_sec") ?? "180");
  // `check-payment-status` expects `client_id`; keep `tran_id` only as fallback.
  const providerTransactionId = firstNonEmpty(
    getString(root, "client_id"),
    getString(data, "client_id"),
    getString(status, "client_id"),
    getString(status, "tran_id"),
    getString(data, "tran_id"),
    randomUUID(),
  ) as string;

  console.log("[checkout] payway generate ids", {
    providerTransactionId,
    rootClientId: getString(root, "client_id"),
    dataClientId: getString(data, "client_id"),
    statusClientId: getString(status, "client_id"),
    statusTranId: getString(status, "tran_id"),
  });

  if (!response.ok || statusCode !== "00" || !qrString) {
    return {
      ok: false,
      status: response.status >= 400 ? response.status : 502,
      message: statusMessage ?? extractKhpayMessage(raw) ?? "PayWay could not generate QR.",
    };
  }

  return {
    ok: true,
    data: {
      providerTransactionId,
      qrString,
      paymentUrl,
      expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 180,
    },
  };
}

async function postKhpayGenerate(
  requestId: string,
  body: Record<string, unknown>,
  siteUrl: string,
): Promise<{ ok: true; data: KhpayGenerateResult } | { ok: false; status: number; message: string }> {
  const proxySecret = (process.env.KHPAY_PROXY_SECRET ?? "").replace(/[\r\n\t\s]/g, "");
  if (!proxySecret) {
    return { ok: false, status: 503, message: "Payment proxy is not configured." };
  }

  let response: Response;
  try {
    response = await fetch(`${siteUrl}/api/khpay-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-proxy-secret": proxySecret,
        "Idempotency-Key": requestId,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(18_000),
    });
  } catch {
    return { ok: false, status: 504, message: "Payment provider request timed out." };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return { ok: false, status: 502, message: "Payment provider returned invalid response." };
  }

  const normalized = normalizeKhpayGenerate(raw);
  if (!normalized) {
    const message = extractKhpayMessage(raw) ?? "Payment provider returned an unexpected response.";
    const preview = (() => {
      try {
        const text = JSON.stringify(raw);
        return text.length > 600 ? `${text.slice(0, 600)}...` : text;
      } catch {
        return "<unserializable-response>";
      }
    })();

    console.error("[checkout] unexpected KHPay generate payload", {
      status: response.status,
      preview,
    });

    return {
      ok: false,
      status: response.status >= 400 ? response.status : 502,
      message,
    };
  }

  return {
    ok: true,
    data: normalized,
  };
}

function resolveSiteUrl(request: NextRequest): string {
  const fromHeader = firstNonEmpty(request.headers.get("origin") ?? undefined);
  if (fromHeader) {
    return fromHeader.replace(/\/+$/, "");
  }

  const forwardedProto = firstNonEmpty(request.headers.get("x-forwarded-proto") ?? undefined, "https") as string;
  const forwardedHost = firstNonEmpty(request.headers.get("x-forwarded-host") ?? undefined);
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  return (firstNonEmpty(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    "http://localhost:3000",
  ) as string).replace(/\/+$/, "");
}

type CheckoutLineItem = {
  templateId: string;
  dbTemplateId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type CheckoutSignature = {
  lineItems: CheckoutLineItem[];
  isBundle: boolean;
  providerTransactionId?: string;
};

function buildCheckoutSignature(lineItems: CheckoutLineItem[], isBundle: boolean, providerTransactionId?: string): string {
  const payload: CheckoutSignature = {
    lineItems,
    isBundle,
    ...(providerTransactionId ? { providerTransactionId } : {}),
  };

  return JSON.stringify(payload);
}

function parseCheckoutSignature(value: string | null): CheckoutSignature | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as CheckoutSignature;
    if (!Array.isArray(parsed.lineItems) || typeof parsed.isBundle !== "boolean") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function signaturesMatch(left: CheckoutSignature | null, right: CheckoutSignature): boolean {
  if (!left || left.isBundle !== right.isBundle || left.lineItems.length !== right.lineItems.length) {
    return false;
  }

  return left.lineItems.every((item, index) => {
    const other = right.lineItems[index];
    return item.templateId === other.templateId
      && item.dbTemplateId === other.dbTemplateId
      && item.quantity === other.quantity
      && item.unitPrice === other.unitPrice
      && item.lineTotal === other.lineTotal;
  });
}

async function resolveCheckoutLineItems(payload: z.infer<typeof checkoutSchema>): Promise<CheckoutLineItem[]> {
  const items = payload.items?.length
    ? payload.items
    : [{ templateId: payload.templateId as string, quantity: 1 }];

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
    if (typeof dbPrice === "number" && Number.isFinite(dbPrice) && dbPrice > 0) {
      lineItems.push({
        templateId: item.templateId,
        dbTemplateId: item.dbTemplateId,
        quantity: item.quantity,
        unitPrice: dbPrice,
        lineTotal: dbPrice * item.quantity,
      });
    }
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

  let payload: z.infer<typeof checkoutSchema>;

  try {
    payload = checkoutSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid checkout payload." }, { status: 400 });
  }

  if (payload.provider !== "khpay") {
    return NextResponse.json(
      { ok: false, message: "Only KHPay is enabled in production checkout." },
      { status: 400 },
    );
  }

  const lineItems = await resolveCheckoutLineItems(payload);
  if (!lineItems.length) {
    return NextResponse.json({ ok: false, message: "No valid cart items were provided." }, { status: 400 });
  }

  const transactionId = randomUUID();
  const amount = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid checkout amount." }, { status: 400 });
  }

  const primaryTemplateId = lineItems[0].templateId;
  const primaryDbTemplateId = lineItems[0].dbTemplateId;
  const isBundle = lineItems.length > 1 || lineItems[0].quantity > 1;
  const signaturePayload: CheckoutSignature = { lineItems, isBundle };

  let templateRecord: { id: string } | undefined;
  try {
    const [row] = await db
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.id, primaryDbTemplateId), eq(templates.isActive, true)))
      .limit(1);
    templateRecord = row;
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to prepare template for checkout." }, { status: 500 });
  }

  if (!templateRecord) {
    return NextResponse.json({ ok: false, message: "Unable to prepare template for checkout." }, { status: 500 });
  }

  const existingCutoff = new Date(Date.now() - 10 * 60 * 1000);

  try {
    const pendingCandidates = await db
      .select({
        id: transactions.id,
        bankRef: transactions.bankRef,
        khqrPayload: transactions.khqrPayload,
        createdAt: transactions.createdAt,
        signature: transactions.signature,
      })
      .from(transactions)
      .where(and(
        eq(transactions.userEmail, accountEmail),
        eq(transactions.status, "pending"),
        eq(transactions.provider, "khpay"),
        eq(transactions.templateId, primaryDbTemplateId),
        eq(transactions.amount, amount.toFixed(2)),
        gte(transactions.createdAt, existingCutoff),
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    const existingPending = pendingCandidates.find((candidate) => {
      return signaturesMatch(parseCheckoutSignature(candidate.signature), signaturePayload);
    });

    if (existingPending?.bankRef && existingPending.khqrPayload) {
      const expiresAt = new Date(existingPending.createdAt.getTime() + 180 * 1000).toISOString();
      console.log("[checkout] reusing pending khpay transaction", {
        transactionId: existingPending.id,
        bankRef: existingPending.bankRef,
      });

      return NextResponse.json({
        ok: true,
        transactionId: existingPending.id,
        templateId: primaryTemplateId,
        amount,
        isBundle,
        lineItems,
        provider: "khpay",
        providerTransactionId: existingPending.bankRef,
        paymentUrl: undefined,
        khqrString: existingPending.khqrPayload,
        expiresAt,
        expiresIn: Math.max(Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000), 0),
        reused: true,
      });
    }
  } catch {
    console.warn("[checkout] pending transaction reuse lookup failed", {
      userEmail: accountEmail,
      templateId: primaryDbTemplateId,
    });
  }

  const siteUrl = resolveSiteUrl(request);
  const callbackUrl = `${siteUrl}/api/payments/webhook`;

  console.log("[checkout] resolved callback", {
    transactionId,
    siteUrl,
    callbackUrl,
  });

  // --- Direct ABA PayWay link mode with amount-based QR generation ---
  const paywayLink = resolvePaywayLink();
  if (paywayLink) {
    const payway = await postPaywayGenerate(amount, paywayLink);

    const fallbackPaywayUrl = `${paywayLink}${paywayLink.includes("?") ? "&" : "?"}amount=${amount.toFixed(2)}`;
    const paywayData = payway.ok
      ? payway.data
      : {
          providerTransactionId: transactionId,
          qrString: "",
          paymentUrl: fallbackPaywayUrl,
          expiresIn: 10 * 60,
        };

    const expiresIn = paywayData.expiresIn;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    try {
      await db.insert(transactions).values({
        id: transactionId,
        userEmail: accountEmail,
        status: "pending",
        amount: amount.toFixed(2),
        provider: "aba-payway",
        templateId: primaryDbTemplateId,
        khqrPayload: paywayData.qrString || null,
        bankRef: paywayData.providerTransactionId,
        signature: buildCheckoutSignature(lineItems, isBundle, paywayData.providerTransactionId),
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
      provider: "aba-payway",
      providerTransactionId: paywayData.providerTransactionId,
      paymentUrl: paywayData.paymentUrl,
      khqrString: paywayData.qrString,
      expiresAt,
      expiresIn,
      mode: "payway-link",
      message: payway.ok ? undefined : "PayWay direct QR API unavailable. Open hosted payment page to generate QR.",
    });
  }

  // --- KHPay QR generation via edge proxy (bypasses WAF IP blocking) ---
  const khpayApiKey = sanitizeApiKey(process.env.KHPAY_API_KEY ?? "");
  if (!khpayApiKey) {
    return NextResponse.json({ ok: false, message: "Payment service is not configured." }, { status: 503 });
  }

  const khpay = await postKhpayGenerate(
    transactionId,
    {
      amount: amount.toFixed(2),
      currency: "USD",
      note: `Analite order ${transactionId.slice(0, 8)}`,
      callback_url: callbackUrl,
      success_url: `${siteUrl}/success?tx=${transactionId}`,
      cancel_url: `${siteUrl}/cart`,
      source: "widget",
      metadata: {
        order_id: transactionId,
        user_email: accountEmail,
      },
    },
    siteUrl,
  );

  if (!khpay.ok) {
    console.error("[checkout] KHPay generate failed after retry:", khpay.status, khpay.message);

    // If provider blocks fresh generation, try serving a very recent pending KHQR
    // for the same user/order profile to avoid hard-failing checkout retries.
    try {
      const fallbackCutoff = new Date(Date.now() - 5 * 60 * 1000);
      const fallbackCandidates = await db
        .select({
          id: transactions.id,
          bankRef: transactions.bankRef,
          khqrPayload: transactions.khqrPayload,
          createdAt: transactions.createdAt,
          signature: transactions.signature,
        })
        .from(transactions)
        .where(and(
          eq(transactions.userEmail, accountEmail),
          eq(transactions.status, "pending"),
          eq(transactions.provider, "khpay"),
          eq(transactions.templateId, primaryDbTemplateId),
          eq(transactions.amount, amount.toFixed(2)),
          gte(transactions.createdAt, fallbackCutoff),
        ))
        .orderBy(desc(transactions.createdAt))
        .limit(20);

      const fallbackPending = fallbackCandidates.find((candidate) => {
        if (!candidate.bankRef || !candidate.khqrPayload) {
          return false;
        }
        return signaturesMatch(parseCheckoutSignature(candidate.signature), signaturePayload);
      });

      if (fallbackPending) {
        const expiresAt = new Date(fallbackPending.createdAt.getTime() + 180 * 1000).toISOString();
        console.log("[checkout] using fallback pending khpay transaction after generate failure", {
          transactionId: fallbackPending.id,
          bankRef: fallbackPending.bankRef,
          generateStatus: khpay.status,
        });

        return NextResponse.json({
          ok: true,
          transactionId: fallbackPending.id,
          templateId: primaryTemplateId,
          amount,
          isBundle,
          lineItems,
          provider: "khpay",
          providerTransactionId: fallbackPending.bankRef,
          paymentUrl: undefined,
          khqrString: fallbackPending.khqrPayload,
          expiresAt,
          expiresIn: Math.max(Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000), 0),
          reused: true,
          fallback: true,
        });
      }
    } catch {
      console.warn("[checkout] fallback pending transaction lookup failed after generate error", {
        userEmail: accountEmail,
        templateId: primaryDbTemplateId,
      });
    }

    return NextResponse.json(
      { ok: false, message: khpay.message },
      { status: khpay.status >= 400 ? khpay.status : 502 },
    );
  }

  const providerTransactionId = khpay.data.transactionId;
  const khqrString = khpay.data.qrString;
  const paymentUrl = khpay.data.paymentUrl;
  const khpayExpiresIn = khpay.data.expiresIn;

  const expiresAt = new Date(Date.now() + khpayExpiresIn * 1000).toISOString();

  try {
    await db.insert(transactions).values({
      id: transactionId,
      userEmail: accountEmail,
      status: "pending",
      amount: amount.toFixed(2),
      provider: "khpay",
      templateId: primaryDbTemplateId,
      khqrPayload: khqrString || null,
      bankRef: providerTransactionId,
      signature: buildCheckoutSignature(lineItems, isBundle, providerTransactionId),
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
    providerTransactionId,
    paymentUrl,
    khqrString,
    expiresAt,
    expiresIn: khpayExpiresIn,
  });
}
