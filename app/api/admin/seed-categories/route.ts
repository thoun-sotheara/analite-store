import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "drizzle-orm";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const DEFAULT_CATEGORIES = [
  { slug: "real-estate", title: "Real Estate", description: "Property listing and agency templates", displayOrder: 1 },
  { slug: "portfolio", title: "Portfolio", description: "Personal and creative portfolio templates", displayOrder: 2 },
  { slug: "e-commerce", title: "E-Commerce", description: "Online store and product listing templates", displayOrder: 3 },
  { slug: "wedding", title: "Wedding", description: "Wedding invitation and event templates", displayOrder: 4 },
  { slug: "saas", title: "SaaS", description: "Software as a service landing pages", displayOrder: 5 },
  { slug: "education", title: "Education", description: "Course, school, and learning platform templates", displayOrder: 6 },
  { slug: "restaurant", title: "Restaurant", description: "Food, cafe, and restaurant menu templates", displayOrder: 7 },
  { slug: "blog", title: "Blog", description: "Blog, news, and article site templates", displayOrder: 8 },
  { slug: "agency", title: "Agency", description: "Digital agency and studio templates", displayOrder: 9 },
  { slug: "healthcare", title: "Healthcare", description: "Medical, clinic, and wellness templates", displayOrder: 10 },
];

// POST /api/admin/seed-categories — inserts default categories, skips if already exist
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  // Delete all existing categories (no FK dependencies if no templates yet)
  // so gen_random_uuid() generates fresh RFC-compliant UUIDs on re-insert
  await db.delete(categories);
  await db.insert(categories).values(DEFAULT_CATEGORIES);

  const rows = await db.select().from(categories).orderBy(sql`display_order`);
  return NextResponse.json({ seeded: rows.length, categories: rows });
}
