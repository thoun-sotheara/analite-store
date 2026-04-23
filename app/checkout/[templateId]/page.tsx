import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { mockTemplates } from "@/lib/data/mock-templates";

type CheckoutPageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = mockTemplates.find((item) => item.id === templateId);

  if (!template) {
    return {
      title: "Template Not Found | Analite Store",
    };
  }

  return {
    title: `${template.title} | Analite Store`,
    description: template.description,
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { templateId } = await params;
  const cookieStore = await cookies();
  const hasAccount = Boolean(cookieStore.get("demo_user_email")?.value);

  if (!hasAccount) {
    redirect(`/auth?mode=signin&redirect=/checkout/${templateId}`);
  }

  const template = mockTemplates.find((item) => item.id === templateId);

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
