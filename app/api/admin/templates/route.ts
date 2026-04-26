import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { uploadAdminAsset } from "@/lib/storage/upload";

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

  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
    }

    const zipFile = form.get("zipFile");
    const imageFile = form.get("imageFile");
    const galleryFile1 = form.get("galleryImage1");
    const galleryFile2 = form.get("galleryImage2");
    const galleryFile3 = form.get("galleryImage3");
    const galleryFile4 = form.get("galleryImage4");

    if (!(zipFile instanceof File) || zipFile.size === 0) {
      return NextResponse.json({ error: "Zip file is required." }, { status: 422 });
    }

    if (!(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json({ error: "Mockup image file is required." }, { status: 422 });
    }

    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .zip files are allowed for template package." }, { status: 422 });
    }

    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed for mockup." }, { status: 422 });
    }

    // Validate gallery images if provided
    const galleryFiles = [galleryFile1, galleryFile2, galleryFile3, galleryFile4];
    for (const galleryFile of galleryFiles) {
      if (galleryFile instanceof File && galleryFile.size > 0 && !galleryFile.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed for gallery images." }, { status: 422 });
      }
    }

    let uploadedZipKey = "";
    let uploadedImageUrl = "";
    let uploadedGalleryUrls: (string | null)[] = [];

    try {
      const uploadedZip = await uploadAdminAsset(zipFile, "templates");
      const uploadedImage = await uploadAdminAsset(imageFile, "images");
      uploadedZipKey = uploadedZip.key;
      uploadedImageUrl = uploadedImage.publicUrl;

      // Upload gallery images
      for (const galleryFile of galleryFiles) {
        if (galleryFile instanceof File && galleryFile.size > 0) {
          const uploadedGallery = await uploadAdminAsset(galleryFile, "images");
          uploadedGalleryUrls.push(uploadedGallery.publicUrl);
        } else {
          uploadedGalleryUrls.push(null);
        }
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to upload assets." },
        { status: 500 },
      );
    }

    body = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      priceUsd: String(form.get("priceUsd") ?? ""),
      s3Key: uploadedZipKey,
      previewUrl: String(form.get("previewUrl") ?? ""),
      screenMockupUrl: uploadedImageUrl,
      galleryImage1: uploadedGalleryUrls[0],
      galleryImage2: uploadedGalleryUrls[1],
      galleryImage3: uploadedGalleryUrls[2],
      galleryImage4: uploadedGalleryUrls[3],
      documentationUrl: String(form.get("documentationUrl") ?? ""),
      slug: String(form.get("slug") ?? ""),
      techStack: String(form.get("techStack") ?? ""),
      category: String(form.get("category") ?? ""),
      categoryId: String(form.get("categoryId") ?? "") || undefined,
      vendorId: String(form.get("vendorId") ?? "") || undefined,
      isActive: String(form.get("isActive") ?? "true").toLowerCase() === "true",
    };
  } else {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
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

  const [newTemplate] = await db
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
    .returning();

    // Purge Next.js cached pages so the new product is visible immediately
    revalidatePath("/api/catalog");
    revalidatePath("/products");
    revalidatePath("/");

    return NextResponse.json(newTemplate, { status: 201 });
}
