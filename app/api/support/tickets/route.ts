import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { supportTickets, users } from "@/lib/db/schema";
import { requireAdminRoute } from "@/lib/auth/require-admin";
import {
  checkFixedWindowRateLimit,
  getClientIp,
  hashIdentifier,
} from "@/lib/security/rate-limit";

// ─── POST /api/support/tickets — public, submit a ticket ─────────────────────
const submitSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  userId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.toLowerCase() ?? "";

  // Guest support submissions are capped at 5 requests per hour per IP.
  if (!sessionEmail) {
    const ip = getClientIp(request);
    const rl = checkFixedWindowRateLimit({
      key: `support-guest:${hashIdentifier(ip)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfterSec: rl.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSec),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000)),
          },
        },
      );
    }
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const effectiveEmail = sessionEmail || parsed.data.email.toLowerCase();

  let resolvedUserId: string | null = null;
  if (sessionEmail) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, sessionEmail))
      .limit(1);

    resolvedUserId = user?.id ?? null;
  }

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userEmail: effectiveEmail,
      userId: resolvedUserId,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "new",
    })
    .returning();

  return NextResponse.json(ticket, { status: 201 });
}

// ─── GET /api/support/tickets — admin only, list all tickets ─────────────────
export async function GET() {
  const gate = await requireAdminRoute();
  if (!gate.ok) return gate.response;
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const rows = await db
    .select()
    .from(supportTickets)
    .orderBy(desc(supportTickets.createdAt));

  return NextResponse.json(rows);
}

// ─── PATCH /api/support/tickets — admin only, update status/note ─────────────
const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_review", "resolved", "closed"]).optional(),
  adminNote: z.string().max(2000).optional(),
});

export async function PATCH(request: Request) {
  const gate = await requireAdminRoute();
  if (!gate.ok) return gate.response;
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { id, status, adminNote } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (adminNote !== undefined) updates.adminNote = adminNote;
  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = new Date();
  }

  const [updated] = await db
    .update(supportTickets)
    .set(updates)
    .where(eq(supportTickets.id, id))
    .returning();

  return NextResponse.json(updated);
}
