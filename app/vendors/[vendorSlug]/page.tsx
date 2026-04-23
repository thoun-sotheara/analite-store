import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { getTemplatesByVendorSlug, getVendorBySlug, mockTemplates } from "@/lib/data/mock-templates";

type VendorPageProps = {
  params: Promise<{ vendorSlug: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function VendorPage({ params, searchParams }: VendorPageProps) {
  const { vendorSlug } = await params;
  const filters = await searchParams;
  const vendor = getVendorBySlug(vendorSlug);

  if (!vendor) {
    notFound();
  }

  const templates = getTemplatesByVendorSlug(vendorSlug);
  const categories = Array.from(new Set(templates.map((template) => template.category)));
  const activeCategory = filters.category;
  const visibleTemplates = activeCategory
    ? templates.filter((template) => template.category === activeCategory)
    : templates;
  const featuredTemplate = mockTemplates.find((template) => template.vendor.slug === vendorSlug);
  const categoryLabels = Object.fromEntries(templates.map((template) => [template.category, template.categoryLabel]));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:px-8 lg:px-12">
      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="elevated-card rounded-lg p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Verified Vendor</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{vendor.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{vendor.bio}</p>
          <p className="mt-3 text-sm text-muted">Based in {vendor.location}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/products" className="rounded-md border border-border px-4 py-2 text-sm text-foreground">
              Back to Products
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/vendors/${vendor.slug}?category=${category}`}
                className={`rounded-md border px-4 py-2 text-sm ${
                  activeCategory === category
                    ? "border-foreground bg-foreground text-white"
                    : "border-border text-foreground"
                }`}
              >
                {categoryLabels[category]}
              </Link>
            ))}
            <Link
              href={`/vendors/${vendor.slug}`}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
            >
              All
            </Link>
          </div>
        </article>

        <article className="elevated-card rounded-lg p-6 sm:p-8">
          <p className="text-sm text-muted">Storefront Stats</p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>Templates: {templates.length}</p>
            <p>Total Downloads: {templates.reduce((sum, item) => sum + item.downloadCount, 0)}</p>
            <p>Average Rating: {(templates.reduce((sum, item) => sum + item.rating, 0) / templates.length).toFixed(1)}</p>
            <p>Featured Stack: {featuredTemplate?.techStack ?? "Mixed"}</p>
          </div>
        </article>
      </section>

      <section className="mt-10">
        <ProductGrid items={visibleTemplates} />
      </section>
    </main>
  );
}
