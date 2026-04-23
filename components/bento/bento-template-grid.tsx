import type { TemplateItem } from "@/lib/data/mock-templates";
import { ProductGrid } from "@/components/product/product-grid";

type BentoTemplateGridProps = {
  items: TemplateItem[];
};

export function BentoTemplateGrid({ items }: BentoTemplateGridProps) {
  return <ProductGrid items={items} />;
}
