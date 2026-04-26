import { notFound } from "next/navigation";
import { PreviewLayout } from "@/components/preview/preview-layout";
import { getTemplateById, getTemplateBySlug } from "@/lib/db/queries";

type PreviewByIdPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PreviewByIdPage({ params }: PreviewByIdPageProps) {
  const { id } = await params;
  const template = (await getTemplateById(id)) ?? (await getTemplateBySlug(id));

  if (!template) {
    notFound();
  }

  return (
    <PreviewLayout
      title={template.title}
      previewUrl={template.previewUrl}
      purchaseHref={`/checkout/${template.id}`}
    />
  );
}
