import { randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureAuthSchema } from "@/lib/auth/ensure-auth-schema";
import { authCredentials, emailVerificationTokens, users } from "@/lib/db/schema";
import { hashVerificationToken, sendVerificationEmail } from "@/lib/auth/email-verification";
import { hashPassword } from "@/lib/auth/password";
import { resolveRoleFromEmail } from "@/lib/auth/role";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(2).max(100).optional(),
  acceptTerms: z.literal(true),
});

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
  }

  await ensureAuthSchema();

  let payload: z.infer<typeof signupSchema>;
  try {
    payload = signupSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid signup payload. Please accept Terms and Conditions." },
      { status: 400 },
    );
  }

  const email = payload.email.trim().toLowerCase();
  const role = resolveRoleFromEmail(email, process.env.ADMIN_EMAIL);
  const displayName = payload.name?.trim() || email.split("@")[0];

  const [existingCredential] = await db
    .select({ emailVerifiedAt: authCredentials.emailVerifiedAt })
    .from(authCredentials)
    .where(eq(authCredentials.userEmail, email))
    .limit(1);

  if (existingCredential?.emailVerifiedAt) {
    return NextResponse.json(
      { ok: false, message: "An account with this email already exists. Please sign in." },
      { status: 409 },
    );
  }

  if (existingCredential && !existingCredential.emailVerifiedAt) {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userEmail, email));

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      userEmail: email,
      tokenHash,
      expiresAt,
    });

    const publicBaseUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
    const verificationUrl = `${publicBaseUrl}/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`;

    const sent = await sendVerificationEmail({
      to: email,
      verificationUrl,
    });

    if (!sent) {
      return NextResponse.json(
        {
          ok: false,
          message: "Email verification is pending, but email service is not configured. Please set EMAIL_SERVER_* and EMAIL_FROM.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Account exists but is not verified yet. A new verification email has been sent.",
    });
  }

  const passwordHash = hashPassword(payload.password);

  await db
    .insert(users)
    .values({
      email,
      name: displayName,
      role,
    })
    .onConflictDoNothing();

  await db
    .insert(authCredentials)
    .values({
      id: randomUUID(),
      userEmail: email,
      passwordHash,
      emailVerifiedAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: authCredentials.userEmail,
      set: {
        passwordHash,
        emailVerifiedAt: null,
        updatedAt: new Date(),
      },
    });

  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userEmail, email));

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(emailVerificationTokens).values({
    id: randomUUID(),
    userEmail: email,
    tokenHash,
    expiresAt,
  });

  const publicBaseUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const verificationUrl = `${publicBaseUrl}/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`;

  const sent = await sendVerificationEmail({
    to: email,
    verificationUrl,
  });

  if (!sent) {
    return NextResponse.json(
      {
        ok: false,
        message: "Signup created, but email service is not configured. Please set EMAIL_SERVER_* and EMAIL_FROM.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Account created. Check your email to verify before signing in.",
  });
}
