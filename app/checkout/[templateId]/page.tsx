"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { useCatalog } from "@/components/catalog/catalog-provider";

export default function CheckoutPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params?.templateId ?? "";
  const { items, isLoading } = useCatalog();

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <section className="rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Loading checkout...</h1>
          <p className="mt-2 text-sm text-muted">Preparing the latest template details.</p>
        </section>
      </main>
    );
  }

  const template = items.find((item) => item.id === templateId || item.slug === templateId);

  if (!template) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <section className="rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Template not found</h1>
          <p className="mt-2 text-sm text-muted">This item is no longer available for checkout.</p>
          <Link href="/products" className="mt-5 inline-flex rounded-md bg-foreground px-4 py-2 text-sm text-white">
            Browse Products
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <CheckoutExperience
        templateId={template.id}
        templateTitle={template.title}
        templateDescription={template.description}
        basePriceUsd={template.priceUsd}
      />
    </main>
  );
}
