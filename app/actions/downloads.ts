"use server";

import { and, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { DownloadState } from "@/app/actions/download-types";
import authOptions from "@/auth";
import { DEMO_MODE } from "@/lib/config/demo";
import { db } from "@/lib/db";
import { downloadActivities, purchases, transactions, users } from "@/lib/db/schema";
import { generateSecureTemplateDownloadUrl } from "@/lib/storage/secure-download";

export async function createDownloadLinkAction(
  transactionId: string,
  s3Key: string,
  _state: DownloadState,
): Promise<DownloadState> {
  if (!transactionId || !s3Key) {
    return {
      ok: false,
      url: "",
      message: "Missing transaction or file reference.",
    };
  }

  try {
    if (DEMO_MODE) {
      return {
        ok: true,
        url: `/api/demo/download?tx=${transactionId}`,
        message: "Demo download generated successfully.",
      };
    }

    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const sessionId =
      cookieStore.get("authjs.session-token")?.value ??
      cookieStore.get("__Secure-authjs.session-token")?.value ??
      "";

    if (!session?.user?.email || !sessionId) {
      return {
        ok: false,
        url: "",
        message: "Sign in again before requesting a secure download link.",
      };
    }

    if (db) {
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

      if (linkedUser) {
        const [purchase] = await db
          .select({ id: purchases.id })
          .from(purchases)
          .where(
            and(
              eq(purchases.userId, linkedUser.id),
              eq(purchases.templateId, record.templateId),
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

        const url = await generateSecureTemplateDownloadUrl({
          s3Key,
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

        return {
          ok: true,
          url,
          message: "Your download is ready. Link expires in 60 minutes.",
        };
      }
    }

    const url = await generateSecureTemplateDownloadUrl({
      s3Key,
      sessionId,
      transactionId,
    });

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
