import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { userProfiles, users } from "@/lib/db/schema";
import { emptyUserProfile, getUserProfileByEmail } from "@/lib/profile/user-profile";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(180),
  avatarUrl: z.string().max(500000).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(120).optional(),
  website: z.string().url().optional().or(z.literal("")),
  timezone: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  favoriteCategory: z.string().max(90).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const email = user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfileByEmail(email, user?.name ?? "", user?.image ?? "");
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const email = user?.email?.toLowerCase();

  if (!email) {
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

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const payload = { ...emptyUserProfile, ...parsed.data };

  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json({ error: "User account not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: payload.displayName,
        avatarUrl: payload.avatarUrl || null,
        bio: payload.bio || null,
        location: payload.location || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    const [existing] = await tx
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, dbUser.id))
      .limit(1);

    if (existing) {
      await tx
        .update(userProfiles)
        .set({
          displayName: payload.displayName,
          avatarUrl: payload.avatarUrl || null,
          bio: payload.bio || null,
          location: payload.location || null,
          websiteUrl: payload.website || null,
          timezone: payload.timezone || null,
          phone: payload.phone || null,
          favoriteCategory: payload.favoriteCategory || null,
          updatedAt: new Date(),
        })
        .where(and(eq(userProfiles.id, existing.id), eq(userProfiles.userId, dbUser.id)));
      return;
    }

    await tx.insert(userProfiles).values({
      userId: dbUser.id,
      displayName: payload.displayName,
      avatarUrl: payload.avatarUrl || null,
      bio: payload.bio || null,
      location: payload.location || null,
      websiteUrl: payload.website || null,
      timezone: payload.timezone || null,
      phone: payload.phone || null,
      favoriteCategory: payload.favoriteCategory || null,
    });
  });

  const profile = await getUserProfileByEmail(email, payload.displayName, payload.avatarUrl ?? "");
  return NextResponse.json({ ok: true, profile, message: "Profile updated." });
}