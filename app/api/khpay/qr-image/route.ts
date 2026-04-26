import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("u")?.trim() ?? "";
  if (!source) {
    return NextResponse.json({ ok: false, message: "Missing query param: u" }, { status: 400 });
  }

  const apiKey = process.env.KHPAY_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "Payment service is not configured." }, { status: 503 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid source URL." }, { status: 400 });
  }

  const isValidHost = sourceUrl.hostname === "khpay.site";
  const isValidPath = sourceUrl.pathname.startsWith("/api/v1/qr/");
  const isHttps = sourceUrl.protocol === "https:";
  if (!isValidHost || !isValidPath || !isHttps) {
    return NextResponse.json({ ok: false, message: "URL is not allowed for QR fetch." }, { status: 403 });
  }

  try {
    const upstream = await fetch(sourceUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[khpay-qr-image] fetch failed", error);
    return NextResponse.json({ ok: false, message: "QR fetch failed." }, { status: 502 });
  }
}
