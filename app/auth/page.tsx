"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const EMAIL_AUTH_ENABLED = process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED?.trim().toLowerCase() === "true";
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === "true";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [message, setMessage] = useState("");
  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const verified = searchParams.get("verified");
  const authError = searchParams.get("error");
  const redirectPath = searchParams.get("redirect") ?? (mode === "signup" ? "/profile" : "/library");
  const suggestedGoogleRedirectUri = "https://analite-kit.vercel.app/api/auth/callback/google";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectPath);
    }
  }, [status, router, redirectPath]);

  async function continueWithGoogle() {
    if (!GOOGLE_AUTH_ENABLED) {
      setMessage("Google sign-in is disabled until OAuth credentials are configured.");
      return;
    }

    await signIn("google", { callbackUrl: redirectPath });
  }

  async function continueWithEmail() {
    if (!EMAIL_AUTH_ENABLED) {
      setMessage("Email and password login is currently disabled.");
      return;
    }

    if (!email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      if (!acceptTerms) {
        setMessage("Please accept the Terms and Conditions to create an account.");
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          acceptTerms,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setMessage(payload.message ?? "Unable to create account.");
        return;
      }

      setMessage(payload.message ?? "Check your email to verify your account.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: redirectPath,
      redirect: false,
    });

    if (result?.error) {
      setMessage("Sign in failed. Verify your email and check your password.");
      return;
    }

    if (result?.ok) {
      router.replace(redirectPath);
      return;
    }

    setMessage("Unable to sign in right now.");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-12 pt-8 sm:pt-12">
      <section className="elevated-card rounded-lg p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Secure Access</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          {mode === "signup" ? "Create Account" : "Sign In"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with Google or use email and password.
        </p>

        {verified === "1" ? (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Email verified successfully. You can sign in now.
          </p>
        ) : null}
        {verified === "0" ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Verification link is invalid or expired. Sign up again to receive a new email.
          </p>
        ) : null}
        {authError === "google" ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Google sign-in is currently blocked by OAuth redirect settings. Add this URI in Google Cloud Console:
            {" "}
            {suggestedGoogleRedirectUri}
          </p>
        ) : null}

        <label className="mt-4 block text-sm text-muted" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
        />

        <label className="mt-4 block text-sm text-muted" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
        />

        {mode === "signup" ? (
          <>
            <label className="mt-4 block text-sm text-muted" htmlFor="auth-confirm-password">
              Confirm Password
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
            />

            <label className="mt-4 flex items-start gap-2 text-xs text-muted" htmlFor="auth-accept-terms">
              <input
                id="auth-accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                I agree to the <Link href="/terms" className="underline">Terms and Conditions</Link>.
              </span>
            </label>
          </>
        ) : null}

        <button
          type="button"
          onClick={continueWithEmail}
          disabled={!EMAIL_AUTH_ENABLED}
          className="mt-5 w-full rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
        >
          {mode === "signup" ? "Create Account" : "Sign In With Email"}
        </button>

        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={!GOOGLE_AUTH_ENABLED}
          className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:bg-slate-50"
        >
          {GOOGLE_AUTH_ENABLED ? "Continue with Google" : "Google Sign-In Unavailable"}
        </button>

        {message ? <p className="mt-3 text-xs text-muted">{message}</p> : null}

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <Link
                  href={`/auth?mode=signup${redirectPath && redirectPath !== "/library" ? `&redirect=${encodeURIComponent(redirectPath)}` : ""}`}
                  className="font-medium text-foreground underline"
                >
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href={`/auth?mode=signin${redirectPath && redirectPath !== "/profile" ? `&redirect=${encodeURIComponent(redirectPath)}` : ""}`}
                  className="font-medium text-foreground underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
