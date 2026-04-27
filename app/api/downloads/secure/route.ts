import { NextResponse } from "next/server";
import { createDownloadLinkAction } from "@/app/actions/downloads";
import { defaultDownloadState } from "@/app/actions/download-types";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const transactionId = typeof (body as { transactionId?: unknown }).transactionId === "string"
    ? (body as { transactionId: string }).transactionId.trim()
    : "";
  const templateId = typeof (body as { templateId?: unknown }).templateId === "string"
    ? (body as { templateId: string }).templateId.trim()
    : "";

  if (!transactionId || !templateId) {
    return NextResponse.json({ ok: false, message: "Missing transaction or template reference." }, { status: 400 });
  }

  const result = await createDownloadLinkAction(transactionId, templateId, defaultDownloadState);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
