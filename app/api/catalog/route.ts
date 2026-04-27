import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews, templates, users } from "@/lib/db/schema";
import { getAllTemplates, getAllCategories } from "@/lib/db/queries";

// Public catalog — no auth required
// Returns all active templates + all categories
export async function GET() {
  try {
    const [items, categories] = await Promise.all([
      getAllTemplates(),
      getAllCategories(),
    ]);

    return NextResponse.json(
      { items, categories, lastUpdatedAt: Date.now() },
      {
        headers: {
          // No CDN caching — products must appear immediately after admin creates them
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    // Fallback: keep storefront alive if richer joined query fails.
    // This reads from templates only and avoids optional/newer joins.
    if (db) {
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
            downloadCount: templates.downloadCount,
            viewCount: templates.viewCount,
            vendorId: templates.vendorId,
            isActive: templates.isActive,
          })
          .from(templates);

        const activeRows = rows.filter((row) => row.isActive);
        const activeTemplateIds = activeRows.map((row) => row.id);
        const activeVendorIds = Array.from(new Set(activeRows.map((row) => row.vendorId).filter(Boolean))) as string[];

        const vendorRows = activeVendorIds.length
          ? await db
              .select({
                id: users.id,
                slug: users.slug,
                name: users.name,
                isVendorVerified: users.isVendorVerified,
              })
              .from(users)
              .where(inArray(users.id, activeVendorIds))
          : [];

        const vendorById = new Map(vendorRows.map((row) => [row.id, row]));

        const categoryLabels = new Map<string, string>();
        for (const row of activeRows) {
          if (!categoryLabels.has(row.category)) {
            categoryLabels.set(
              row.category,
              row.category
                .split("-")
                .filter(Boolean)
                .map((word) => word[0]?.toUpperCase() + word.slice(1))
                .join(" "),
            );
          }
        }

        const fallbackCategories = Array.from(categoryLabels.entries()).map(([slug, title], index) => ({
          id: slug,
          slug,
          title,
          description: null,
          iconSlug: null,
          displayOrder: index,
        }));

        const reviewMetrics = activeTemplateIds.length
          ? await db
              .select({
                templateId: reviews.templateId,
                avgRating: sql<string>`coalesce(avg(((${reviews.rating})::text)::int), 0)`,
                reviewCount: sql<string>`count(*)`,
              })
              .from(reviews)
              .where(and(inArray(reviews.templateId, activeTemplateIds), eq(reviews.isVisible, true)))
              .groupBy(reviews.templateId)
          : [];

        const reviewMap = new Map(
          reviewMetrics.map((row) => [
            row.templateId,
            {
              rating: Number(row.avgRating ?? 0),
              reviewCount: Number(row.reviewCount ?? 0),
            },
          ]),
        );

        const safeItems = activeRows
          .map((row) => {
            const categoryLabel = row.category
              .split("-")
              .filter(Boolean)
              .map((word) => word[0]?.toUpperCase() + word.slice(1))
              .join(" ");
            const metric = reviewMap.get(row.id);
            const vendor = row.vendorId ? vendorById.get(row.vendorId) : undefined;

            return {
              id: row.id,
              slug: row.slug ?? row.id,
              title: row.title,
              description: row.description ?? "",
              category: row.category,
              categoryLabel,
              priceUsd: Number(row.priceUsd),
              s3Key: row.s3Key,
              previewUrl: row.previewUrl ?? "",
              documentationUrl: row.documentationUrl ?? "",
              rating: metric?.rating ?? 0,
              reviewCount: metric?.reviewCount ?? 0,
              downloadCount: Number(row.downloadCount ?? 0),
              viewCount: Number(row.viewCount ?? 0),
              techStack: row.techStack ?? "Next.js",
              updatedLabel: "Recently updated",
              screenMockupUrl: row.screenMockupUrl ?? "/placeholder-product.svg",
              galleryImage1: null,
              galleryImage2: null,
              galleryImage3: null,
              galleryImage4: null,
              vendor: {
                slug: vendor?.slug ?? "vendor",
                name: vendor?.name ?? "Marketplace Vendor",
                verified: Boolean(vendor?.isVendorVerified),
                bio: "",
                location: "Cambodia",
              },
            };
          });

        return NextResponse.json(
          {
            items: safeItems,
            categories: fallbackCategories,
            degraded: true,
            error: "Catalog fallback mode",
            details: error instanceof Error ? error.message : "Unknown error",
            lastUpdatedAt: Date.now(),
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      } catch {
        // fall through to empty fallback
      }
    }

    // Final fallback if both primary + lightweight queries fail.
    return NextResponse.json(
      {
        items: [],
        categories: [],
        error: "Catalog temporarily unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
        lastUpdatedAt: Date.now(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
