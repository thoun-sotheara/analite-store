import { and, eq, gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAuthSchema } from "@/lib/auth/ensure-auth-schema";
import { hashVerificationToken } from "@/lib/auth/email-verification";
import { authCredentials, emailVerificationTokens } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
  }

  await ensureAuthSchema();

  const emailRaw = request.nextUrl.searchParams.get("email");
  const tokenRaw = request.nextUrl.searchParams.get("token");

  if (!emailRaw || !tokenRaw) {
    return NextResponse.redirect(new URL("/auth?mode=signin&verified=0", request.url));
  }

  const email = emailRaw.trim().toLowerCase();
  const tokenHash = hashVerificationToken(tokenRaw);

  const [tokenRecord] = await db
    .select({
      id: emailVerificationTokens.id,
    })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userEmail, email),
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!tokenRecord) {
    return NextResponse.redirect(new URL("/auth?mode=signin&verified=0", request.url));
  }

  await db
    .update(authCredentials)
    .set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(authCredentials.userEmail, email));

  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userEmail, email));

  return NextResponse.redirect(new URL("/auth?mode=signin&verified=1", request.url));
}
