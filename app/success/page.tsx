import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { createDownloadLinkAction } from "@/app/actions/downloads";
import { ClearCartOnSuccess } from "@/components/cart/clear-cart-on-success";
import { ConfettiOverlay } from "@/components/confetti-overlay";
import { DownloadButton } from "@/components/download-button";
import { db } from "@/lib/db";
import { purchases, templates, transactions, users } from "@/lib/db/schema";

type SuccessPageProps = {
  searchParams: Promise<{ tx?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.toLowerCase();

  if (!userEmail) {
    redirect("/auth?mode=signin&redirect=/success");
  }

  const params = await searchParams;
  const transactionId = params.tx ?? "";

  if (!transactionId) {
    notFound();
  }

  let purchasedTemplateIds: string[] = [];
  let purchasedTemplates: Array<{
    purchaseId: string;
    templateId: string;
    title: string;
    previewUrl: string;
    documentationUrl: string;
    licenseKey: string;
  }> = [];
  let relatedTemplates: Array<{ id: string; title: string }> = [];
  let hasAuthorizedPurchase = false;
  if (db) {
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!owner) {
      notFound();
    }

    const [transaction] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userEmail, userEmail),
          eq(transactions.status, "completed"),
        ),
      )
      .limit(1);

    if (!transaction) {
      notFound();
    }

    if (owner) {
      const rows = await db
        .select({
          purchaseId: purchases.id,
          templateId: purchases.templateId,
          templateTitle: templates.title,
          previewUrl: templates.previewUrl,
          documentationUrl: templates.documentationUrl,
          licenseKey: purchases.licenseKey,
        })
        .from(purchases)
        .innerJoin(
          transactions,
          and(
            eq(transactions.id, purchases.transactionId),
            eq(transactions.userEmail, userEmail),
            eq(transactions.status, "completed"),
          ),
        )
        .innerJoin(templates, eq(templates.id, purchases.templateId))
        .where(
          and(
            eq(purchases.userId, owner.id),
            eq(purchases.transactionId, transactionId),
            eq(purchases.status, "COMPLETED"),
          ),
        );

      if (rows.length === 0) {
        notFound();
      }

      hasAuthorizedPurchase = true;

      purchasedTemplateIds = rows.map((row) => row.templateId);

      purchasedTemplates = rows.map((row) => ({
        purchaseId: row.purchaseId,
        templateId: row.templateId,
        title: row.templateTitle,
        previewUrl: row.previewUrl ?? "",
        documentationUrl: row.documentationUrl ?? "",
        licenseKey: row.licenseKey,
      }));

      if (purchasedTemplateIds.length > 0) {
        const candidates = await db
          .select({
            id: templates.id,
            title: templates.title,
          })
          .from(templates)
          .limit(12);

        relatedTemplates = candidates
          .filter((item) => !purchasedTemplateIds.includes(item.id))
          .slice(0, 2);
      }
    }
  }

  if (!hasAuthorizedPurchase) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-8 sm:px-6">
      <section className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <Suspense fallback={null}><ClearCartOnSuccess /></Suspense>
        <ConfettiOverlay />
        <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.16em] text-accent">Payment Success</p>
        <h1 className="mt-3 text-3xl font-semibold">Your template is ready</h1>
        <p className="mt-3 text-sm text-muted">
          Transaction <span className="font-mono text-foreground">{transactionId || "N/A"}</span>
          {" "}
          was confirmed. Your purchased items are ready for secure download.
        </p>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Receipt</p>
          <p className="mt-2 text-sm text-emerald-900">
            A payment receipt is ready for accounting and records.
          </p>
          <Link
            href={`/api/invoice/${transactionId}`}
            target="_blank"
            className="mt-3 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm text-white transition hover:bg-emerald-800"
          >
            Download Receipt (PDF)
          </Link>
        </div>

        {purchasedTemplates.length === 0 ? (
          <p className="mt-4 rounded-md border border-border px-3 py-2 text-sm text-muted">
            Your library is being updated. If items do not appear in a moment, open your library page.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {purchasedTemplates.map((template) => {
              const action = createDownloadLinkAction.bind(null, transactionId, template.templateId);
              return (
                <div key={template.purchaseId} className="rounded-xl border border-border bg-white/80 p-4">
                  <p className="text-sm font-semibold text-foreground">{template.title}</p>
                  <p className="mt-1 break-all text-xs text-muted">License: {template.licenseKey}</p>
                  <DownloadButton action={action} />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/api/invoice/${transactionId}`}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-50"
                    >
                      Download Receipt
                    </Link>
                    <Link
                      href={`/preview/${template.templateId}`}
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-50"
                    >
                      Live Preview
                    </Link>
                    <Link
                      href={`/products/${template.templateId}`}
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-50"
                    >
                      Open Product
                    </Link>
                    <Link
                      href={template.documentationUrl || "/support"}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-50"
                    >
                      {template.documentationUrl ? "Documentation" : "Support"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/library" className="inline-flex rounded-md border border-border px-4 py-2 text-sm text-foreground">
            Open Library
          </Link>
          <Link
            href="/products"
            className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white"
          >
            Continue shopping
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Recommended Next</p>
          <div className="mt-3 space-y-2">
            {relatedTemplates.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="block rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:border-foreground"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
        </div>
      </section>
    </main>
  );
}
