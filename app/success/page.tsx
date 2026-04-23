import Link from "next/link";
import { createDownloadLinkAction } from "@/app/actions/downloads";
import { ConfettiOverlay } from "@/components/confetti-overlay";
import { DownloadButton } from "@/components/download-button";
import { mockTemplates } from "@/lib/data/mock-templates";

type SuccessPageProps = {
  searchParams: Promise<{ tx?: string; template?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const transactionId = params.tx ?? "";
  const templateId = params.template ?? "";
  const template = mockTemplates.find((item) => item.id === templateId);
  const relatedTemplates = template
    ? mockTemplates.filter((item) => item.id !== template.id && item.category === template.category).slice(0, 2)
    : mockTemplates.slice(0, 2);

  const action = createDownloadLinkAction.bind(
    null,
    transactionId,
    template?.s3Key ?? "",
  );

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-20 pt-8 sm:px-6">
      <section className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <ConfettiOverlay />
        <p className="text-xs uppercase tracking-[0.16em] text-accent">Payment Success</p>
        <h1 className="mt-3 text-3xl font-semibold">Your template is ready</h1>
        <p className="mt-3 text-sm text-muted">
          Transaction <span className="font-mono text-foreground">{transactionId || "N/A"}</span>
          {" "}
          was confirmed. Generate your instant secure download link below.
        </p>

        <DownloadButton action={action} />

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
      </section>
    </main>
  );
}
