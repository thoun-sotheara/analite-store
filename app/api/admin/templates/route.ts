import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
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

  let newTemplate: { id: string } | undefined;

  try {
    [newTemplate] = await db
      .insert(templates)
      .values({
        title: data.title,
        description: data.description ?? null,
        priceUsd: data.priceUsd,
        s3Key: data.s3Key,
        previewUrl: data.previewUrl || null,
        screenMockupUrl: data.screenMockupUrl || null,
        galleryImage1: data.galleryImage1 || null,
        galleryImage2: data.galleryImage2 || null,
        galleryImage3: data.galleryImage3 || null,
        galleryImage4: data.galleryImage4 || null,
        documentationUrl: data.documentationUrl || null,
        slug: data.slug,
        techStack: data.techStack ?? null,
        category: data.category,
        categoryId: data.categoryId ?? null,
        vendorId: data.vendorId ?? null,
        isActive: data.isActive,
      })
      .returning({ id: templates.id });
  } catch {
    // Fallback for older production schemas that do not yet have newer optional columns.
    const legacyCategory = ["real-estate", "portfolio", "e-commerce", "wedding"].includes(data.category)
      ? data.category
      : "e-commerce";

    [newTemplate] = await db
      .insert(templates)
      .values({
        title: data.title,
        description: data.description ?? null,
        priceUsd: data.priceUsd,
        s3Key: data.s3Key,
        previewUrl: data.previewUrl || null,
        screenMockupUrl: data.screenMockupUrl || null,
        documentationUrl: data.documentationUrl || null,
        slug: data.slug,
        techStack: data.techStack ?? null,
        category: legacyCategory,
        isActive: data.isActive,
      })
      .returning({ id: templates.id });
  }

    // Purge Next.js cached pages so the new product is visible immediately
    revalidatePath("/api/catalog");
    revalidatePath("/products");
    revalidatePath("/");

    return NextResponse.json(newTemplate ?? { id: null }, { status: 201 });
}
