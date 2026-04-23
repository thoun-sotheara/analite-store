"use client";

import { useState } from "react";
import { appendHelpReport } from "@/lib/support/help-reports";

const faqs = [
  {
    title: "How do downloads work in demo mode?",
    body: "Demo mode issues placeholder downloads so you can validate the full buyer journey before wiring production storage.",
  },
  {
    title: "Where can buyers find invoices?",
    body: "Invoices are available from the library after the order appears in the account purchase list.",
  },
  {
    title: "How should vendor support be handled?",
    body: "Each product page should link to documentation, support notes, and vendor contact expectations.",
  },
];

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  function submitIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    appendHelpReport({
      id: `help-${Date.now()}`,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      status: "new",
    });
    setNotice("Your issue was submitted. Admin will see it in dashboard alerts.");
    setSubject("");
    setMessage("");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-8 lg:px-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="elevated-card rounded-2xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Support Center</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-5xl">Help buyers and vendors fast.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            This Phase 4 support area gives the store a more complete operational feel with self-serve answers and issue categories.
          </p>
        </article>
        <article className="elevated-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Contact Channels</h2>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>Email: support@analite.store</p>
            <p>Vendor Ops: vendors@analite.store</p>
            <p>Payments: billing@analite.store</p>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {faqs.map((item) => (
          <article key={item.title} className="elevated-card rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="elevated-card mt-8 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Report a Problem</h2>
        <p className="mt-2 text-sm text-muted">Send your issue directly to admin dashboard alerts.</p>
        <form onSubmit={submitIssue} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          <input
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Issue subject"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          <textarea
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe your problem"
            rows={4}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none md:col-span-2"
          />
          <button className="rounded-md bg-foreground px-4 py-2 text-sm text-white md:col-span-2 md:w-fit">
            Submit Issue
          </button>
        </form>
        {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
      </section>
    </main>
  );
}
