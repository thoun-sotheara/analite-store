import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";

// ─── Validation ───────────────────────────────────────────────────────────────
const createTemplateSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(2000).optional(),
  priceUsd: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid price (e.g. 49.00)"),
  s3Key: z.string().min(1, "S3 key is required"),
  previewUrl: z.string().url().optional().or(z.literal("")),
  screenMockupUrl: z.string().min(1, "Mockup image is required"),
  galleryImage1: z.string().optional().or(z.literal("")),
  galleryImage2: z.string().optional().or(z.literal("")),
  galleryImage3: z.string().optional().or(z.literal("")),
  galleryImage4: z.string().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, or hyphens"),
  techStack: z.string().max(200).optional(),
  category: z.string().min(1).max(90),
  categoryId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  isActive: z.boolean().optional().default(true),
});

// ─── Admin guard ──────────────────────────────────────────────────────────────
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

// ─── GET /api/admin/templates ─────────────────────────────────────────────────
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const rows = await db
    .select({
      id: templates.id,
      title: templates.title,
      slug: templates.slug,
      category: templates.category,
      priceUsd: templates.priceUsd,
      techStack: templates.techStack,
      isActive: templates.isActive,
      downloadCount: templates.downloadCount,
      viewCount: templates.viewCount,
      vendorId: templates.vendorId,
      categoryId: templates.categoryId,
      createdAt: templates.createdAt,
    })
    .from(templates)
    .orderBy(templates.createdAt);

  return NextResponse.json(rows);
}

// ─── POST /api/admin/templates ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existingSlug = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.slug, data.slug))
      .limit(1);
    if (existingSlug.length > 0) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }

    const normalizedCategory = ["real-estate", "portfolio", "e-commerce", "wedding"].includes(data.category)
      ? data.category
      : "e-commerce";

    let newTemplate: { id: string } | undefined;

    function pickInsertedId(result: unknown): { id: string } | undefined {
      if (Array.isArray(result)) {
        return result[0] as { id: string } | undefined;
      }
      if (
        typeof result === "object" &&
        result !== null &&
        "rows" in result &&
        Array.isArray((result as { rows: unknown[] }).rows)
      ) {
        return (result as { rows: { id: string }[] }).rows[0];
      }
      return undefined;
    }

    try {
      const fullInsertResult = await db.execute(sql`
        insert into "templates" (
          "title",
          "description",
          "price_usd",
          "s3_key",
          "preview_url",
          "category_id",
          "vendor_id",
          "category",
          "slug",
          "tech_stack",
          "screen_mockup_url",
          "gallery_image_1",
          "gallery_image_2",
          "gallery_image_3",
          "gallery_image_4",
          "documentation_url",
          "is_active"
        ) values (
          ${data.title},
          ${data.description ?? null},
          ${data.priceUsd},
          ${data.s3Key},
          ${data.previewUrl || null},
          ${data.categoryId ?? null},
          ${data.vendorId ?? null},
          ${normalizedCategory},
          ${data.slug},
          ${data.techStack ?? null},
          ${data.screenMockupUrl || null},
          ${data.galleryImage1 || null},
          ${data.galleryImage2 || null},
          ${data.galleryImage3 || null},
          ${data.galleryImage4 || null},
          ${data.documentationUrl || null},
          ${data.isActive}
        )
        returning "id"
      `);
      newTemplate = pickInsertedId(fullInsertResult);
    } catch {
      // Fallback for older production schemas that do not yet have newer optional columns.
      const legacyInsertResult = await db.execute(sql`
        insert into "templates" (
          "title",
          "description",
          "price_usd",
          "s3_key",
          "preview_url",
          "category",
          "slug",
          "tech_stack",
          "screen_mockup_url",
          "documentation_url",
          "is_active"
        ) values (
          ${data.title},
          ${data.description ?? null},
          ${data.priceUsd},
          ${data.s3Key},
          ${data.previewUrl || null},
          ${normalizedCategory},
          ${data.slug},
          ${data.techStack ?? null},
          ${data.screenMockupUrl || null},
          ${data.documentationUrl || null},
          ${data.isActive}
        )
        returning "id"
      `);
      newTemplate = pickInsertedId(legacyInsertResult);
    }

    // Purge Next.js cached pages so the new product is visible immediately.
    // Revalidation should never block successful creation.
    try {
      revalidatePath("/api/catalog");
      revalidatePath("/products");
      revalidatePath("/");
    } catch {
      // Ignore cache revalidation failures.
    }

    return NextResponse.json(newTemplate ?? { id: null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create template" },
      { status: 500 },
    );
  }
}
