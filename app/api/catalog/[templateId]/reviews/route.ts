import { NextResponse } from "next/server";
import { getTemplateReviews } from "@/lib/db/queries";

type Params = {
  params: Promise<{ templateId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { templateId } = await params;

  if (!templateId) {
    return NextResponse.json({ error: "Missing template id" }, { status: 400 });
  }

  const reviews = await getTemplateReviews(templateId);
  return NextResponse.json({ reviews });
}