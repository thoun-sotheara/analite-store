import { NextRequest, NextResponse } from "next/server";

// KHPay's WAF geo-blocks non-Cambodian IPs (LiteSpeed checks cf-ipcountry=KH).
// KHPAY_LOCAL_PROXY_URL should point to scripts/khpay-local-proxy.js running on
// a KH machine exposed via Cloudflare Tunnel (npx cloudflared tunnel --url http://localhost:4099).
export const runtime = "nodejs";
export const preferredRegion = "sin1";

function parseErrorMessage(payloadText: string): string {
  try {
    const parsed = JSON.parse(payloadText) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const data = obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : undefined;
      const candidates = [obj.message, obj.error, obj.detail, data?.message, data?.error, data?.detail];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
  } catch {
    // ignore non-json payloads
  }

  return "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const proxySecret = (process.env.KHPAY_PROXY_SECRET ?? "").replace(/[\r\n\t\s]/g, "");
  const incoming = (request.headers.get("x-proxy-secret") ?? "").replace(/[\r\n\t\s]/g, "");

  if (!proxySecret || incoming !== proxySecret) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const apiKey = (process.env.KHPAY_API_KEY ?? "").replace(/[\s"']/g, "").trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "Payment service not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const requestBody = (body && typeof body === "object" && !Array.isArray(body))
    ? (body as Record<string, unknown>)
    : {};
  const action = typeof requestBody.action === "string" ? requestBody.action : "generate";
  const transactionId = typeof requestBody.transactionId === "string" ? requestBody.transactionId : "";
  const upstreamPath = action === "check"
    ? `/qr/check/${encodeURIComponent(transactionId)}`
    : "/qr/generate";
  const upstreamMethod = action === "check" ? "GET" : "POST";

  if (action === "check" && !transactionId) {
    return NextResponse.json({ ok: false, message: "Missing transaction id." }, { status: 400 });
  }

  // Route through local KH proxy if configured (bypasses KHPay's geo-block).
  // Otherwise, attempt direct call (will fail from non-KH datacenter IPs).
  const localProxyUrl = (process.env.KHPAY_LOCAL_PROXY_URL ?? "").replace(/[\s"']/g, "").replace(/\/$/, "");

  const directFetch = async (): Promise<Response> => {
    return fetch(`https://khpay.site/api/v1${upstreamPath}`, {
      method: upstreamMethod,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "khpay-cli/0.2.0",
        "x-request-id": `srv_${Date.now().toString(36)}`,
        ...(upstreamMethod === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(upstreamMethod === "POST" ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
  };

  let khpayResponse: Response;
  try {
    if (localProxyUrl) {
      try {
        // Primary path: call local proxy from KH IP.
        khpayResponse = await fetch(`${localProxyUrl}${upstreamPath}`, {
          method: upstreamMethod,
          headers: {
            Accept: "application/json",
            "x-proxy-secret": proxySecret,
            ...(upstreamMethod === "POST" ? { "Content-Type": "application/json" } : {}),
          },
          ...(upstreamMethod === "POST" ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(12_000),
        });
      } catch {
        // Compatibility fallback when local proxy is unreachable.
        khpayResponse = await directFetch();
      }
    } else {
      khpayResponse = await directFetch();
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Payment provider is unreachable. KHPAY_LOCAL_PROXY_URL may be offline." },
      { status: 504 },
    );
  }

  const text = await khpayResponse.text();
  if (!khpayResponse.ok) {
    const normalizedMessage = parseErrorMessage(text).toLowerCase();
    const isFraudBlocked = khpayResponse.status === 403
      && (normalizedMessage.includes("fraud") || normalizedMessage.includes("blocked"));

    if (isFraudBlocked) {
      return NextResponse.json(
        {
          ok: false,
          message: "KHPay blocked this request. Start or restore KHPAY local proxy (KH IP) and retry.",
        },
        { status: 503 },
      );
    }
  }

  return new NextResponse(text, {
    status: khpayResponse.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
