import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

// ─── Admin guard ──────────────────────────────────────────────────────────────
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const createCategorySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(90)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens"),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  iconSlug: z.string().max(40).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

// ─── GET /api/admin/categories ────────────────────────────────────────────────
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const rows = await db.select().from(categories).orderBy(asc(categories.displayOrder));
  return NextResponse.json(rows);
}

// ─── POST /api/admin/categories ───────────────────────────────────────────────
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, parsed.data.slug))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const [row] = await db.insert(categories).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}

// ─── DELETE /api/admin/categories?id=… ───────────────────────────────────────
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
