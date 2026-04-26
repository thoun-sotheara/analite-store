import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";

type Params = {
  params: Promise<{ templateId: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const { templateId } = await params;

  if (!templateId) {
    return NextResponse.json({ ok: false, message: "Missing template id." }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ ok: false, message: "Database unavailable." }, { status: 503 });
  }

  try {
    const [updated] = await db
      .update(templates)
      .set({ viewCount: sql`${templates.viewCount} + 1` })
      .where(eq(templates.id, templateId))
      .returning({ id: templates.id, viewCount: templates.viewCount });

    if (!updated) {
      return NextResponse.json({ ok: false, message: "Template not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, templateId: updated.id, viewCount: updated.viewCount });
  } catch {
    return NextResponse.json({ ok: false, message: "Failed to track view." }, { status: 500 });
  }
}
