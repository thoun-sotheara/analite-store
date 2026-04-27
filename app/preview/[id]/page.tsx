"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PreviewLayout } from "@/components/preview/preview-layout";
import { useCatalog } from "@/components/catalog/catalog-provider";

export default function PreviewByIdPage() {
  const params = useParams<{ id: string }>();
  const templateId = params?.id ?? "";
  const { items, isLoading } = useCatalog();

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <section className="rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Loading preview...</h1>
          <p className="mt-2 text-sm text-muted">Fetching the latest template data.</p>
        </section>
      </main>
    );
  }

  const template = items.find((item) => item.id === templateId || item.slug === templateId);

  if (!template) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <section className="rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Preview not available</h1>
          <p className="mt-2 text-sm text-muted">This template could not be found. It may have been removed.</p>
          <Link href="/products" className="mt-5 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white">
            Browse Products
          </Link>
        </section>
      </main>
    );
  }

  return (
    <PreviewLayout
      title={template.title}
      previewUrl={template.previewUrl}
      purchaseHref={`/checkout/${template.id}`}
    />
  );
}
