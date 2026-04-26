import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import authOptions from "@/auth";
import { ensureAuthSchema } from "@/lib/auth/ensure-auth-schema";
import { db } from "@/lib/db";
import { authCredentials } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 500 });
  }

  await ensureAuthSchema();

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let payload: z.infer<typeof changePasswordSchema>;
  try {
    payload = changePasswordSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const [credential] = await db
    .select({
      passwordHash: authCredentials.passwordHash,
      emailVerifiedAt: authCredentials.emailVerifiedAt,
    })
    .from(authCredentials)
    .where(eq(authCredentials.userEmail, email))
    .limit(1);

  if (!credential) {
    return NextResponse.json({ ok: false, message: "Password login is not enabled for this account." }, { status: 400 });
  }

  if (!credential.emailVerifiedAt) {
    return NextResponse.json({ ok: false, message: "Verify your email before changing password." }, { status: 400 });
  }

  if (!verifyPassword(payload.currentPassword, credential.passwordHash)) {
    return NextResponse.json({ ok: false, message: "Current password is incorrect." }, { status: 400 });
  }

  await db
    .update(authCredentials)
    .set({
      passwordHash: hashPassword(payload.newPassword),
      updatedAt: new Date(),
    })
    .where(eq(authCredentials.userEmail, email));

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}
