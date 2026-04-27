import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { createDownloadLinkAction } from "@/app/actions/downloads";
import authOptions from "@/auth";
import { DownloadButton } from "@/components/download-button";
import { getLibraryItems } from "@/lib/library/get-library-items";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth?mode=signin&redirect=/library");
  }

  const userEmail = session.user.email;
  const userName = session.user.name ?? "Account User";
  const items = await getLibraryItems(userEmail);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-10 lg:px-16">
      <h1 className="text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-5xl">
        Personal Library
      </h1>
      <p className="mt-4 text-sm text-muted sm:text-base">
        {`Logged in as ${userName} (${userEmail})`}
      </p>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:[grid-auto-rows:1fr]">
        {items.map((item) => {
          const action = createDownloadLinkAction.bind(null, item.transactionId, item.templateId);
          const itemKey = `${item.transactionId}:${item.templateId}:${item.licenseKey}`;

          return (
            <article key={itemKey} className="flex h-full flex-col rounded-lg border border-border bg-white">
              <div className="relative aspect-video overflow-hidden rounded-t-lg border-b border-border bg-surface">
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex h-full flex-col p-6 sm:p-8">
                <h2 className="line-clamp-2 text-[1.25rem] font-medium text-foreground">
                  {item.title}
                </h2>
                <p className="mt-2 text-xs text-muted">Transaction: {item.transactionId}</p>
                <p className="mt-1 text-xs text-muted">Bank Ref: {item.bankRef || "Pending"}</p>
                <p className="mt-1 break-all text-xs text-muted">License Key: {item.licenseKey}</p>
                <div className="mt-auto pt-4">
                  <DownloadButton action={action} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/products/${item.templateId}#reviews`}
                      className="inline-flex rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:border-slate-400 hover:text-foreground"
                    >
                      Leave Review
                    </Link>
                    <Link
                      href={`/api/invoice/${item.transactionId}`}
                      target="_blank"
                      className="inline-flex rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:border-slate-400 hover:text-foreground"
                    >
                      Download Invoice
                    </Link>
                    <Link
                      href={item.documentationUrl || "/support"}
                      target="_blank"
                      className="inline-flex rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:border-slate-400 hover:text-foreground"
                    >
                      View Documentation
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {items.length === 0 ? (
        <section className="elevated-card mt-8 rounded-lg p-6 sm:p-8">
          <p className="text-sm text-muted">No completed purchases were found for this account yet.</p>
          <Link href="/products" className="mt-4 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white">
            Browse Products
          </Link>
        </section>
      ) : null}
    </main>
  );
}
