import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Analite Kit",
  description: "Terms and conditions for using Analite Kit and purchasing digital templates.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Terms & Conditions</h1>
      <p className="mt-3 text-sm text-muted">
        These terms govern your access to Analite Kit and purchases of digital template products.
      </p>

      <section className="mt-8 space-y-5 text-sm leading-6 text-foreground">
        <article className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">1. Account and Access</h2>
          <p className="mt-2 text-muted">
            You are responsible for keeping your account credentials secure. You must provide accurate account information and a valid email address.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">2. Digital Products and Licensing</h2>
          <p className="mt-2 text-muted">
            Template purchases grant a non-exclusive license for your permitted personal or business use. You may not resell, redistribute, or claim ownership of original source files unless explicitly allowed by product terms.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">3. Payments and Delivery</h2>
          <p className="mt-2 text-muted">
            Payments are processed through supported providers. After successful payment confirmation, downloads and license details are made available in your account library.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">4. Refunds</h2>
          <p className="mt-2 text-muted">
            Because products are digital and delivered instantly, refunds are generally not guaranteed unless required by law or approved for exceptional technical issues.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">5. Acceptable Use</h2>
          <p className="mt-2 text-muted">
            You agree not to misuse the platform, attempt unauthorized access, or interfere with site operations.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">6. Updates</h2>
          <p className="mt-2 text-muted">
            We may update these terms as features evolve. Continued use of the service indicates acceptance of the latest version.
          </p>
        </article>
      </section>
    </main>
  );
}
