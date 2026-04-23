import type { TemplateItem } from "@/lib/data/mock-templates";
import { ProductCard } from "@/components/product/product-card";

type ProductGridProps = {
  items: TemplateItem[];
};

export function ProductGrid({ items }: ProductGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:[grid-auto-rows:1fr]">
      {items.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </section>
  );
}
