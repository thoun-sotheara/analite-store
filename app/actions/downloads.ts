"use server";

import { and, eq, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { DownloadState } from "@/app/actions/download-types";
import authOptions from "@/auth";
import { db } from "@/lib/db";
import { downloadActivities, purchases, templates, transactions, users } from "@/lib/db/schema";
import { toDbTemplateId } from "@/lib/payments/template-id-map";
import { generateSecureTemplateDownloadUrl } from "@/lib/storage/secure-download";

export async function createDownloadLinkAction(
  transactionId: string,
  templateId: string,
  state: DownloadState,
): Promise<DownloadState> {
  void state;

  if (!transactionId || !templateId) {
    return {
      ok: false,
      url: "",
      message: "Missing transaction or template reference.",
    };
  }

  try {
    const dbTemplateId = toDbTemplateId(templateId);

    if (!db) {
      return {
        ok: false,
        url: "",
        message: "Download service is temporarily unavailable.",
      };
    }

    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const cookieSessionId =
      cookieStore.get("authjs.session-token")?.value ??
      cookieStore.get("__Secure-authjs.session-token")?.value ??
      "";

    if (!session?.user?.email) {
      return {
        ok: false,
        url: "",
        message: "Sign in again before requesting a secure download link.",
      };
    }

    const [record] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.status, "completed"),
          eq(transactions.userEmail, session.user.email),
        ),
      )
      .limit(1);

    if (!record) {
      return {
        ok: false,
        url: "",
        message: "Payment not completed yet.",
      };
    }

    const [linkedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!linkedUser) {
      return {
        ok: false,
        url: "",
        message: "Account is not ready for downloads yet.",
      };
    }

    const [purchase] = await db
      .select({
        id: purchases.id,
        s3Key: templates.s3Key,
      })
      .from(purchases)
      .innerJoin(templates, eq(templates.id, purchases.templateId))
      .where(
        and(
            eq(purchases.userId, linkedUser.id),
            eq(purchases.transactionId, record.id),
            eq(purchases.templateId, dbTemplateId),
            eq(purchases.status, "COMPLETED"),
          ),
        )
      .limit(1);

    if (!purchase) {
      return {
        ok: false,
        url: "",
        message: "No completed purchase is linked to this account.",
      };
    }

    // Some environments use session strategies without exposing authjs cookie tokens.
    // Fall back to a deterministic fingerprint so authenticated users can still download.
    const sessionId = cookieSessionId || createHash("sha256")
      .update(`${session.user.email}:${transactionId}:${dbTemplateId}`)
      .digest("hex");

    const url = await generateSecureTemplateDownloadUrl({
      s3Key: purchase.s3Key,
      sessionId,
      transactionId,
    });

    await db.insert(downloadActivities).values({
      purchaseId: purchase.id,
      transactionId,
      userId: linkedUser.id,
      sessionIdHash: createHash("sha256").update(sessionId).digest("hex"),
      downloadUrl: url,
    });

    await db
      .update(templates)
      .set({ downloadCount: sql`${templates.downloadCount} + 1` })
      .where(eq(templates.id, dbTemplateId));

    return {
      ok: true,
      url,
      message: "Your download is ready. Link expires in 60 minutes.",
    };
  } catch (error) {
    return {
      ok: false,
      url: "",
      message:
        error instanceof Error
          ? error.message
          : "Unable to create a signed download link.",
    };
  }
}
