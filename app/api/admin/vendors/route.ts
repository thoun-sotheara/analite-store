import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { users, vendorProfiles } from "@/lib/db/schema";

// ─── Validation ───────────────────────────────────────────────────────────────
const createVendorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(180),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, or hyphens"),
  displayName: z.string().min(1).max(120),
  bio: z.string().max(1000).optional(),
  location: z.string().max(120).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  isVerified: z.boolean().optional().default(true),
});

// ─── Admin guard ──────────────────────────────────────────────────────────────
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

// ─── GET /api/admin/vendors ───────────────────────────────────────────────────
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      slug: users.slug,
      isVendorVerified: users.isVendorVerified,
      createdAt: users.createdAt,
      profile: {
        id: vendorProfiles.id,
        displayName: vendorProfiles.displayName,
        bio: vendorProfiles.bio,
        location: vendorProfiles.location,
        websiteUrl: vendorProfiles.websiteUrl,
        isVerified: vendorProfiles.isVerified,
      },
    })
    .from(users)
    .leftJoin(vendorProfiles, eq(vendorProfiles.userId, users.id))
    .where(eq(users.role, "VENDOR"));

  return NextResponse.json(rows);
}

// ─── POST /api/admin/vendors ──────────────────────────────────────────────────
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

  const parsed = createVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { email, name, slug, displayName, bio, location, websiteUrl, isVerified } = parsed.data;

  // Check uniqueness
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser.length > 0) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const existingSlug = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1);
  if (existingSlug.length > 0) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  // Insert user + vendor_profile in one transaction
  const result = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name,
        slug,
        role: "VENDOR",
        isVendorVerified: isVerified,
      })
      .returning();

    const [newProfile] = await tx
      .insert(vendorProfiles)
      .values({
        userId: newUser.id,
        slug,
        displayName,
        bio: bio ?? null,
        location: location ?? null,
        websiteUrl: websiteUrl || null,
        isVerified,
        isActive: true,
      })
      .returning();

    return { user: newUser, profile: newProfile };
  });

  return NextResponse.json(result, { status: 201 });
}
