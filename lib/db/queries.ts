/**
 * DB query helpers for the public storefront.
 * These replace mock-template helper functions.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates, categories, users, vendorProfiles, reviews } from "@/lib/db/schema";
import type { TemplateItem, TemplateReview } from "@/lib/data/mock-templates";

const UUID_V4_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TemplateRow = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string;
  categoryTitle: string | null;
  priceUsd: string | number;
  s3Key: string;
  previewUrl: string | null;
  documentationUrl: string | null;
  techStack: string | null;
  screenMockupUrl: string | null;
  galleryImage1: string | null;
  galleryImage2: string | null;
  galleryImage3: string | null;
  galleryImage4: string | null;
  downloadCount: number;
  viewCount: number;
  updatedAt: Date | null;
  vendorId: string | null;
  vendorSlug: string | null;
  vendorName: string | null;
  vendorDisplayName: string | null;
  vendorBio: string | null;
  vendorLocation: string | null;
  vendorVerified: boolean | null;
  avgRating?: number;
  reviewCount?: number;
};

// ─── Shape adapter: DB row → TemplateItem ─────────────────────────────────────
function toTemplateItem(row: TemplateRow): TemplateItem {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    categoryLabel: row.categoryTitle ?? toLabel(row.category),
    priceUsd: Number(row.priceUsd),
    s3Key: row.s3Key,
    previewUrl: row.previewUrl ?? "",
    documentationUrl: row.documentationUrl ?? "",
    rating: Number(row.avgRating ?? 0),
    reviewCount: Number(row.reviewCount ?? 0),
    downloadCount: Number(row.downloadCount ?? 0),
    viewCount: Number(row.viewCount ?? 0),
    techStack: row.techStack ?? "Next.js",
    updatedLabel: row.updatedAt
      ? formatRelative(new Date(row.updatedAt))
      : "Recently updated",
    screenMockupUrl: row.screenMockupUrl ?? "",
    galleryImage1: row.galleryImage1,
    galleryImage2: row.galleryImage2,
    galleryImage3: row.galleryImage3,
    galleryImage4: row.galleryImage4,
    vendor: {
      slug: row.vendorSlug ?? "analite",
      name: row.vendorName ?? row.vendorDisplayName ?? "Analite Studio",
      verified: Boolean(row.vendorVerified),
      bio: row.vendorBio ?? "",
      location: row.vendorLocation ?? "Cambodia",
    },
  };
}

async function attachReviewMetrics<T extends TemplateRow>(rows: T[]): Promise<T[]> {
  if (!db || rows.length === 0) {
    return rows.map((row) => ({ ...row, avgRating: row.avgRating ?? 0, reviewCount: row.reviewCount ?? 0 })) as T[];
  }

  const metrics = await db
    .select({
      templateId: reviews.templateId,
      avgRating: sql<string>`coalesce(avg(((${reviews.rating})::text)::int), 0)`,
      reviewCount: sql<string>`count(*)`,
    })
    .from(reviews)
    .where(and(inArray(reviews.templateId, rows.map((row) => row.id)), eq(reviews.isVisible, true)))
    .groupBy(reviews.templateId);

  const metricsByTemplateId = new Map(
    metrics.map((row) => [
      row.templateId,
      {
        avgRating: Number(row.avgRating ?? 0),
        reviewCount: Number(row.reviewCount ?? 0),
      },
    ]),
  );

  return rows.map((row) => {
    const metric = metricsByTemplateId.get(row.id);
    return {
      ...row,
      avgRating: metric?.avgRating ?? 0,
      reviewCount: metric?.reviewCount ?? 0,
    };
  }) as T[];
}

function toLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

type TemplateLiteRow = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string;
  priceUsd: string | number;
  s3Key: string;
  previewUrl: string | null;
  documentationUrl: string | null;
  techStack: string | null;
  screenMockupUrl: string | null;
  galleryImage1: string | null;
  galleryImage2: string | null;
  galleryImage3: string | null;
  galleryImage4: string | null;
  downloadCount: number;
  viewCount: number;
  updatedAt: Date | null;
  isActive: boolean;
};

function toTemplateItemFromLiteRow(row: TemplateLiteRow): TemplateItem {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    categoryLabel: toLabel(row.category),
    priceUsd: Number(row.priceUsd),
    s3Key: row.s3Key,
    previewUrl: row.previewUrl ?? "",
    documentationUrl: row.documentationUrl ?? "",
    rating: 0,
    reviewCount: 0,
    downloadCount: Number(row.downloadCount ?? 0),
    viewCount: Number(row.viewCount ?? 0),
    techStack: row.techStack ?? "Next.js",
    updatedLabel: row.updatedAt ? formatRelative(new Date(row.updatedAt)) : "Recently updated",
    screenMockupUrl: row.screenMockupUrl ?? "/placeholder-product.svg",
    galleryImage1: row.galleryImage1,
    galleryImage2: row.galleryImage2,
    galleryImage3: row.galleryImage3,
    galleryImage4: row.galleryImage4,
    vendor: {
      slug: "analite",
      name: "Analite Studio",
      verified: false,
      bio: "",
      location: "Cambodia",
    },
  };
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} weeks ago`;
  return `Updated ${Math.floor(days / 30)} months ago`;
}

// ─── getAllTemplates ───────────────────────────────────────────────────────────
export async function getAllTemplates(): Promise<TemplateItem[]> {
  if (!db) return [];

  const rows = await db
    .select({
      id: templates.id,
      slug: templates.slug,
      title: templates.title,
      description: templates.description,
      category: templates.category,
      categoryTitle: categories.title,
      priceUsd: templates.priceUsd,
      s3Key: templates.s3Key,
      previewUrl: templates.previewUrl,
      documentationUrl: templates.documentationUrl,
      techStack: templates.techStack,
      screenMockupUrl: templates.screenMockupUrl,
      galleryImage1: templates.galleryImage1,
      galleryImage2: templates.galleryImage2,
      galleryImage3: templates.galleryImage3,
      galleryImage4: templates.galleryImage4,
      downloadCount: templates.downloadCount,
      viewCount: templates.viewCount,
      updatedAt: templates.updatedAt,
      vendorId: templates.vendorId,
      vendorSlug: users.slug,
      vendorName: users.name,
      vendorDisplayName: vendorProfiles.displayName,
      vendorBio: vendorProfiles.bio,
      vendorLocation: vendorProfiles.location,
      vendorVerified: vendorProfiles.isVerified,
    })
    .from(templates)
    .leftJoin(categories, eq(categories.id, templates.categoryId))
    .leftJoin(users, eq(users.id, templates.vendorId))
    .leftJoin(vendorProfiles, eq(vendorProfiles.userId, templates.vendorId))
    .where(eq(templates.isActive, true))
    .orderBy(desc(templates.downloadCount));

  return (await attachReviewMetrics(rows)).map(toTemplateItem);
}

// ─── getTemplateBySlug ────────────────────────────────────────────────────────
export async function getTemplateBySlug(slug: string): Promise<TemplateItem | null> {
  if (!db) return null;

  try {
    const rows = await db
      .select({
        id: templates.id,
        slug: templates.slug,
        title: templates.title,
        description: templates.description,
        category: templates.category,
        categoryTitle: categories.title,
        priceUsd: templates.priceUsd,
        s3Key: templates.s3Key,
        previewUrl: templates.previewUrl,
        documentationUrl: templates.documentationUrl,
        techStack: templates.techStack,
        screenMockupUrl: templates.screenMockupUrl,
        galleryImage1: templates.galleryImage1,
        galleryImage2: templates.galleryImage2,
        galleryImage3: templates.galleryImage3,
        galleryImage4: templates.galleryImage4,
        downloadCount: templates.downloadCount,
        viewCount: templates.viewCount,
        updatedAt: templates.updatedAt,
        vendorId: templates.vendorId,
        vendorSlug: users.slug,
        vendorName: users.name,
        vendorDisplayName: vendorProfiles.displayName,
        vendorBio: vendorProfiles.bio,
        vendorLocation: vendorProfiles.location,
        vendorVerified: vendorProfiles.isVerified,
      })
      .from(templates)
      .leftJoin(categories, eq(categories.id, templates.categoryId))
      .leftJoin(users, eq(users.id, templates.vendorId))
      .leftJoin(vendorProfiles, eq(vendorProfiles.userId, templates.vendorId))
      .where(eq(templates.slug, slug))
      .limit(1);

    const [row] = await attachReviewMetrics(rows);
    return row ? toTemplateItem(row) : null;
  } catch {
    try {
      const rows = await db
        .select({
          id: templates.id,
          slug: templates.slug,
          title: templates.title,
          description: templates.description,
          category: templates.category,
          priceUsd: templates.priceUsd,
          s3Key: templates.s3Key,
          previewUrl: templates.previewUrl,
          documentationUrl: templates.documentationUrl,
          techStack: templates.techStack,
          screenMockupUrl: templates.screenMockupUrl,
          galleryImage1: templates.galleryImage1,
          galleryImage2: templates.galleryImage2,
          galleryImage3: templates.galleryImage3,
          galleryImage4: templates.galleryImage4,
          downloadCount: templates.downloadCount,
          viewCount: templates.viewCount,
          updatedAt: templates.updatedAt,
          isActive: templates.isActive,
        })
        .from(templates)
        .where(eq(templates.slug, slug))
        .limit(1);

      const row = rows[0];
      if (!row || !row.isActive) return null;
      return toTemplateItemFromLiteRow(row);
    } catch {
      return null;
    }
  }
}

// ─── getTemplateById ──────────────────────────────────────────────────────────
export async function getTemplateById(id: string): Promise<TemplateItem | null> {
  if (!db) return null;
  if (!UUID_V4_LIKE_PATTERN.test(id)) return null;

  try {
    const rows = await db
      .select({
        id: templates.id,
        slug: templates.slug,
        title: templates.title,
        description: templates.description,
        category: templates.category,
        categoryTitle: categories.title,
        priceUsd: templates.priceUsd,
        s3Key: templates.s3Key,
        previewUrl: templates.previewUrl,
        documentationUrl: templates.documentationUrl,
        techStack: templates.techStack,
        screenMockupUrl: templates.screenMockupUrl,
        galleryImage1: templates.galleryImage1,
        galleryImage2: templates.galleryImage2,
        galleryImage3: templates.galleryImage3,
        galleryImage4: templates.galleryImage4,
        downloadCount: templates.downloadCount,
        viewCount: templates.viewCount,
        updatedAt: templates.updatedAt,
        vendorId: templates.vendorId,
        vendorSlug: users.slug,
        vendorName: users.name,
        vendorDisplayName: vendorProfiles.displayName,
        vendorBio: vendorProfiles.bio,
        vendorLocation: vendorProfiles.location,
        vendorVerified: vendorProfiles.isVerified,
      })
      .from(templates)
      .leftJoin(categories, eq(categories.id, templates.categoryId))
      .leftJoin(users, eq(users.id, templates.vendorId))
      .leftJoin(vendorProfiles, eq(vendorProfiles.userId, templates.vendorId))
      .where(eq(templates.id, id))
      .limit(1);

    const [row] = await attachReviewMetrics(rows);
    return row ? toTemplateItem(row) : null;
  } catch {
    try {
      const rows = await db
        .select({
          id: templates.id,
          slug: templates.slug,
          title: templates.title,
          description: templates.description,
          category: templates.category,
          priceUsd: templates.priceUsd,
          s3Key: templates.s3Key,
          previewUrl: templates.previewUrl,
          documentationUrl: templates.documentationUrl,
          techStack: templates.techStack,
          screenMockupUrl: templates.screenMockupUrl,
          galleryImage1: templates.galleryImage1,
          galleryImage2: templates.galleryImage2,
          galleryImage3: templates.galleryImage3,
          galleryImage4: templates.galleryImage4,
          downloadCount: templates.downloadCount,
          viewCount: templates.viewCount,
          updatedAt: templates.updatedAt,
          isActive: templates.isActive,
        })
        .from(templates)
        .where(eq(templates.id, id))
        .limit(1);

      const row = rows[0];
      if (!row || !row.isActive) return null;
      return toTemplateItemFromLiteRow(row);
    } catch {
      return null;
    }
  }
}

// ─── getTemplatesByVendorSlug ─────────────────────────────────────────────────
export async function getTemplatesByVendorSlugDB(vendorSlug: string): Promise<TemplateItem[]> {
  if (!db) return [];

  const rows = await db
    .select({
      id: templates.id,
      slug: templates.slug,
      title: templates.title,
      description: templates.description,
      category: templates.category,
      categoryTitle: categories.title,
      priceUsd: templates.priceUsd,
      s3Key: templates.s3Key,
      previewUrl: templates.previewUrl,
      documentationUrl: templates.documentationUrl,
      techStack: templates.techStack,
      screenMockupUrl: templates.screenMockupUrl,
      galleryImage1: templates.galleryImage1,
      galleryImage2: templates.galleryImage2,
      galleryImage3: templates.galleryImage3,
      galleryImage4: templates.galleryImage4,
      downloadCount: templates.downloadCount,
      viewCount: templates.viewCount,
      updatedAt: templates.updatedAt,
      vendorId: templates.vendorId,
      vendorSlug: users.slug,
      vendorName: users.name,
      vendorDisplayName: vendorProfiles.displayName,
      vendorBio: vendorProfiles.bio,
      vendorLocation: vendorProfiles.location,
      vendorVerified: vendorProfiles.isVerified,
    })
    .from(templates)
    .leftJoin(categories, eq(categories.id, templates.categoryId))
    .innerJoin(users, and(eq(users.id, templates.vendorId), eq(users.slug, vendorSlug)))
    .leftJoin(vendorProfiles, eq(vendorProfiles.userId, templates.vendorId))
    .where(eq(templates.isActive, true))
    .orderBy(desc(templates.downloadCount));

  return (await attachReviewMetrics(rows)).map(toTemplateItem);
}

// ─── getVendorBySlugDB ────────────────────────────────────────────────────────
export type VendorProfile = {
  slug: string;
  name: string;
  bio: string;
  location: string;
  verified: boolean;
  websiteUrl: string | null;
};

export async function getVendorBySlugDB(vendorSlug: string): Promise<VendorProfile | null> {
  if (!db) return null;

  const rows = await db
    .select({
      slug: users.slug,
      name: users.name,
      bio: vendorProfiles.bio,
      location: vendorProfiles.location,
      verified: vendorProfiles.isVerified,
      websiteUrl: vendorProfiles.websiteUrl,
    })
    .from(users)
    .leftJoin(vendorProfiles, eq(vendorProfiles.userId, users.id))
    .where(eq(users.slug, vendorSlug))
    .limit(1);

  if (!rows[0]) return null;
  return {
    slug: rows[0].slug ?? vendorSlug,
    name: rows[0].name ?? "Unknown Vendor",
    bio: rows[0].bio ?? "",
    location: rows[0].location ?? "Cambodia",
    verified: rows[0].verified ?? false,
    websiteUrl: rows[0].websiteUrl ?? null,
  };
}

// ─── getAllCategories ─────────────────────────────────────────────────────────
export type CategoryRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  iconSlug: string | null;
  displayOrder: number;
};

export async function getAllCategories(): Promise<CategoryRow[]> {
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.displayOrder));
}

export async function getTemplateReviews(templateId: string): Promise<TemplateReview[]> {
  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: reviews.id,
      templateId: reviews.templateId,
      authorName: reviews.authorName,
      comment: reviews.comment,
      rating: reviews.rating,
      createdAt: reviews.createdAt,
      userName: users.name,
      userRole: users.role,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.templateId, templateId), eq(reviews.isVisible, true)))
    .orderBy(desc(reviews.createdAt));

  return rows.map((row) => ({
    id: row.id,
    templateId: row.templateId,
    author: row.authorName ?? row.userName ?? "Verified Buyer",
    role: row.userRole === "VENDOR" ? "Vendor" : row.userRole === "ADMIN" ? "Admin" : "Customer",
    rating: Number(row.rating),
    dateLabel: formatRelative(new Date(row.createdAt)),
    comment: row.comment ?? "",
  }));
}
