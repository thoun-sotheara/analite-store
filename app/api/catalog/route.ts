import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
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
            isActive: templates.isActive,
          })
          .from(templates);

        const safeItems = rows
          .filter((row) => row.isActive)
          .map((row) => {
            const categoryLabel = row.category
              .split("-")
              .filter(Boolean)
              .map((word) => word[0]?.toUpperCase() + word.slice(1))
              .join(" ");

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
              rating: 0,
              reviewCount: 0,
              downloadCount: Number(row.downloadCount ?? 0),
              techStack: row.techStack ?? "Next.js",
              updatedLabel: "Recently updated",
              screenMockupUrl: row.screenMockupUrl ?? "/placeholder-product.svg",
              galleryImage1: null,
              galleryImage2: null,
              galleryImage3: null,
              galleryImage4: null,
              vendor: {
                slug: "analite",
                name: "Analite Studio",
                verified: false,
                bio: "",
                location: "Cambodia",
              },
            };
          });

        return NextResponse.json(
          {
            items: safeItems,
            categories: [],
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
