"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { CartNavLink } from "@/components/cart/cart-nav-link";
import { CurrencySwitcher } from "@/components/currency/currency-switcher";
import { WishlistNavLink } from "@/components/wishlist/wishlist-nav-link";

const ADMIN_EMAIL = "demo@analite.store";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("demo_user_email="))
      ?.split("=")[1];
    setUserEmail(cookieValue ? decodeURIComponent(cookieValue) : "");
  }, []);

  const isSignedIn = Boolean(userEmail);
  const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL;

  const navLinks = useMemo(
    () => [
      { href: "/products", label: "Browse" },
      ...(isSignedIn ? [{ href: "/library", label: "Library" }] : []),
      ...(isAdmin ? [{ href: "/dashboard", label: "Dashboard" }] : []),
      { href: "/support", label: "Help" },
    ],
    [isSignedIn, isAdmin],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
      {/* Desktop Header */}
      <div className="mx-auto hidden w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 md:flex lg:px-8">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-[0.18em] text-foreground">
          ANALITE
        </Link>

        {/* Desktop Navigation */}
        <nav className="flex flex-1 items-center gap-8 text-sm text-muted">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="flex shrink-0 items-center gap-3">
          <CurrencySwitcher />
          <div className="h-6 w-px bg-border" />
          <WishlistNavLink />
          <CartNavLink />
          <Link
            href="/auth?mode=signin"
            className="rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
          >
            Sign In
          </Link>
          <Link
            href="/auth?mode=signup"
            className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Sign Up
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:hidden sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-foreground">
          ANALITE
        </Link>

        <div className="flex items-center gap-2">
          <WishlistNavLink />
          <CartNavLink />
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md border border-border p-2 text-foreground"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-muted">Currency:</span>
                <CurrencySwitcher />
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/auth?mode=signin"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md border border-border px-3 py-2 text-center text-sm text-foreground transition hover:bg-slate-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md bg-foreground px-3 py-2 text-center text-sm text-white transition hover:bg-slate-800"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
