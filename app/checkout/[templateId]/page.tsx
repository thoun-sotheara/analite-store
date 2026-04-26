import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { getTemplateById } from "@/lib/db/queries";

type CheckoutPageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = await getTemplateById(templateId);

  if (!template) {
    return {
      title: "Template Not Found | Analite Kit",
    };
  }

  return {
    title: `${template.title} | Analite Kit`,
    description: template.description,
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { templateId } = await params;
  const session = await getServerSession(authOptions);
  const hasAccount = Boolean(session?.user?.email);

  if (!hasAccount) {
    redirect(`/auth?mode=signin&redirect=/checkout/${templateId}`);
  }

  const template = await getTemplateById(templateId);

  if (!template) {
    notFound();
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
