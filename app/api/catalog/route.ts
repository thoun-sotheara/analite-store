import { NextResponse } from "next/server";
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
      { items, categories },
      {
        headers: {
          // No CDN caching — products must appear immediately after admin creates them
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    // Keep storefront alive even if production DB schema is temporarily behind.
    return NextResponse.json(
      {
        items: [],
        categories: [],
        error: "Catalog temporarily unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
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
