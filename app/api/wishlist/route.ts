import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { users, wishlists } from "@/lib/db/schema";

const postSchema = z
  .object({
    templateId: z.string().min(1).optional(),
    action: z.enum(["toggle", "add", "remove"]).optional(),
    mergeIds: z.array(z.string().min(1)).max(300).optional(),
  })
  .refine((payload) => Boolean(payload.templateId) || Boolean(payload.mergeIds?.length), {
    message: "templateId or mergeIds is required",
  });

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

async function getSessionUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase() ?? null;
}

async function resolveUserId(email: string): Promise<string | null> {
  if (!db) return null;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing?.id) {
    return existing.id;
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0],
      role: "USER",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  return created?.id ?? null;
}

async function fetchWishlistIds(userId: string): Promise<string[]> {
  if (!db) return [];

  const rows = await db
    .select({ templateId: wishlists.templateId })
    .from(wishlists)
    .where(eq(wishlists.userId, userId));

  return rows.map((row) => row.templateId);
}

export async function GET() {
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const email = await getSessionUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await resolveUserId(email);
  if (!userId) {
    return NextResponse.json({ wishlistIds: [] });
  }

  const wishlistIds = await fetchWishlistIds(userId);
  return NextResponse.json({ wishlistIds });
}

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const email = await getSessionUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const userId = await resolveUserId(email);
  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user" }, { status: 500 });
  }

  const { templateId, action = "toggle", mergeIds = [] } = parsed.data;

  const currentIds = new Set(await fetchWishlistIds(userId));

  // Merge local guest wishlist into DB wishlist once user is signed in.
  for (const id of mergeIds) {
    if (isUuid(id)) {
      currentIds.add(id);
    }
  }

  if (templateId && isUuid(templateId)) {
    if (action === "add") {
      currentIds.add(templateId);
    } else if (action === "remove") {
      currentIds.delete(templateId);
    } else if (currentIds.has(templateId)) {
      currentIds.delete(templateId);
    } else {
      currentIds.add(templateId);
    }
  }

  const nextIds = [...currentIds];

  await db.transaction(async (tx) => {
    await tx.delete(wishlists).where(eq(wishlists.userId, userId));

    if (nextIds.length > 0) {
      await tx.insert(wishlists).values(
        nextIds.map((id) => ({
          userId,
          templateId: id,
        })),
      );
    }
  });

  return NextResponse.json({ wishlistIds: nextIds });
}
