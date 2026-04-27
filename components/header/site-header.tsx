"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { CartNavLink } from "@/components/cart/cart-nav-link";
import { CurrencySwitcher } from "@/components/currency/currency-switcher";
import { WishlistNavLink } from "@/components/wishlist/wishlist-nav-link";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@analite.store").toLowerCase();

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email ?? "";
  const userImage = session?.user?.image ?? "";
  const sessionUserName = session?.user?.name ?? userEmail;
  const isSessionLoading = status === "loading";

  const isSignedIn = status === "authenticated" && Boolean(userEmail);
  const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL;

  const navLinks = useMemo(
    () => [
      { href: "/products", label: "Browse" },
      ...(!isSessionLoading && isSignedIn ? [{ href: "/library", label: "Library" }] : []),
      ...(!isSessionLoading && isAdmin ? [{ href: "/dashboard", label: "Dashboard" }] : []),
      { href: "/support", label: "Help" },
    ],
    [isSessionLoading, isSignedIn, isAdmin],
  );

  useEffect(() => {
    if (!userEmail) {
      setProfileAvatar("");
      setProfileDisplayName("");
      return;
    }

    let active = true;

    const applyProfile = (profile?: { avatarUrl?: string; displayName?: string }) => {
      if (!active) {
        return;
      }

      setProfileAvatar(profile?.avatarUrl ?? "");
      setProfileDisplayName(profile?.displayName ?? "");
    };

    void fetch("/api/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((profile: { avatarUrl?: string; displayName?: string } | null) => {
        applyProfile(profile ?? undefined);
      })
      .catch(() => {
        applyProfile(undefined);
      });

    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarUrl?: string; displayName?: string }>;
      applyProfile(customEvent.detail);
    };

    window.addEventListener("analite-profile-updated", handleProfileUpdated as EventListener);

    return () => {
      active = false;
      window.removeEventListener("analite-profile-updated", handleProfileUpdated as EventListener);
    };
  }, [userEmail]);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  const userName = profileDisplayName || sessionUserName;
  const avatarFallback = (userName || userEmail || "U").trim().charAt(0).toUpperCase();
  const avatarSource = profileAvatar || userImage;

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
          {isSessionLoading ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
              <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
              <span className="h-3 w-12 animate-pulse rounded bg-slate-200" />
            </div>
          ) : isSignedIn ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((current) => !current)}
                className="flex items-center gap-2 rounded-full border border-border bg-white px-2 py-1 transition hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                {avatarSource ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSource} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                    {avatarFallback}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>

              <div
                className={`absolute right-0 top-12 z-50 w-48 origin-top-right rounded-md border border-border bg-white p-2 shadow-lg transition-all duration-150 ${
                  userMenuOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
              >
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
                >
                  Profile
                </Link>
                <Link
                  href="/library"
                  onClick={() => setUserMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
                >
                  Library
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-slate-100"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/auth?mode=signin"
              className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Sign In
            </Link>
          )}
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
                {isSessionLoading ? (
                  <span className="rounded-md border border-border px-3 py-2 text-center text-sm text-muted">
                    Loading account...
                  </span>
                ) : isSignedIn ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-md border border-border px-3 py-2 text-center text-sm text-foreground transition hover:bg-slate-100"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/library"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-md border border-border px-3 py-2 text-center text-sm text-foreground transition hover:bg-slate-100"
                    >
                      Library
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/auth?mode=signin"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md bg-foreground px-3 py-2 text-center text-sm text-white transition hover:bg-slate-800"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
