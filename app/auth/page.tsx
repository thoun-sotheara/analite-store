"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DemoAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [email, setEmail] = useState("demo@analite.store");
  const [name, setName] = useState("Demo User");

  function continueDemo() {
    document.cookie = `demo_user_email=${encodeURIComponent(email)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    document.cookie = `demo_user_name=${encodeURIComponent(name)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    router.push("/library");
  }

  function continueWithGoogle() {
    document.cookie = `demo_user_email=${encodeURIComponent("google.user@analite.store")}; Path=/; Max-Age=2592000; SameSite=Lax`;
    document.cookie = `demo_user_name=${encodeURIComponent("Google User")}; Path=/; Max-Age=2592000; SameSite=Lax`;
    router.push("/library");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-12 pt-8 sm:pt-12">
      <section className="elevated-card rounded-lg p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Demo Access</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          {mode === "signup" ? "Create Demo Account" : "Sign In to Demo"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Demo mode is active. No real authentication is required for testing.
        </p>
        {mode === "signup" ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Email/password sign-up requires email verification before account activation.
          </p>
        ) : null}
        <p className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted">
          Use any name and email to instantly unlock library, checkout, wishlist, and invoice testing.
        </p>

        <label className="mt-4 block text-sm text-muted" htmlFor="demo-name">
          Name
        </label>
        <input
          id="demo-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
        />

        <label className="mt-3 block text-sm text-muted" htmlFor="demo-email">
          Email
        </label>
        <input
          id="demo-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
        />

        <button
          type="button"
          onClick={continueDemo}
          className="mt-5 w-full rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
        >
          Continue to Library
        </button>

        <button
          type="button"
          onClick={continueWithGoogle}
          className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:bg-slate-50"
        >
          Continue with Google
        </button>
      </section>
    </main>
  );
}

export default function DemoAuthPage() {
  return (
    <Suspense fallback={null}>
      <DemoAuthForm />
    </Suspense>
  );
}
