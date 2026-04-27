"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CheckCircle2, Copy, ExternalLink, Globe, RefreshCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import type { LibraryItem } from "@/lib/library/get-library-items";
import type { AppUserProfile } from "@/lib/profile/user-profile";

type ProfilePanelProps = {
  email: string;
  initialProfile: AppUserProfile;
  purchases: LibraryItem[];
};

type NoticeTone = "success" | "error" | "neutral";

type NoticeState = {
  message: string;
  tone: NoticeTone;
};

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function formatCategoryLabel(value: string): string {
  if (!value) {
    return "Not set";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recent purchase";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getCompletionScore(profile: AppUserProfile): number {
  const completedFields = [
    profile.displayName,
    profile.avatarUrl,
    profile.bio,
    profile.location,
    profile.website,
    profile.timezone,
    profile.phone,
    profile.favoriteCategory,
  ].filter((value) => value.trim().length > 0).length;

  return Math.round((completedFields / 8) * 100);
}

function getNoticeClasses(tone: NoticeTone): string {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-border bg-surface text-muted";
}

export function ProfilePanel({ email, initialProfile, purchases }: ProfilePanelProps) {
  const [profile, setProfile] = useState<AppUserProfile>(initialProfile);
  const [savedProfile, setSavedProfile] = useState<AppUserProfile>(initialProfile);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [saving, setSaving] = useState(false);
  const [copyingLicense, setCopyingLicense] = useState<string | null>(null);
  const [downloadingPurchase, setDownloadingPurchase] = useState<string | null>(null);
  const [activePurchase, setActivePurchase] = useState<LibraryItem | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const avatarSource = profile.avatarUrl || savedProfile.avatarUrl;
  const avatarFallback = (profile.displayName || email || "U").trim().charAt(0).toUpperCase();
  const hasUnsavedChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  const completionScore = useMemo(() => getCompletionScore(profile), [profile]);
  const completedPurchaseCount = purchases.length;
  const docsReadyCount = purchases.filter((item) => item.documentationUrl.trim().length > 0).length;
  const profileHighlights = [
    {
      label: "Profile completion",
      value: `${completionScore}%`,
      detail: completionScore >= 75 ? "Looking sharp" : "Add a few more details",
    },
    {
      label: "Purchases",
      value: completedPurchaseCount.toString(),
      detail: completedPurchaseCount === 1 ? "1 item unlocked" : `${completedPurchaseCount} items unlocked`,
    },
    {
      label: "Docs ready",
      value: docsReadyCount.toString(),
      detail: docsReadyCount === 0 ? "No linked docs yet" : "Products with direct docs links",
    },
    {
      label: "Favorite category",
      value: formatCategoryLabel(profile.favoriteCategory),
      detail: profile.favoriteCategory ? "Used for faster recommendations" : "Pick one to personalize your account",
    },
  ];

  const recentPurchases = useMemo(
    () => [...purchases].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()),
    [purchases],
  );

  function getPurchaseKey(item: LibraryItem): string {
    return `${item.transactionId}:${item.templateId}:${item.licenseKey}`;
  }

  function handleAvatarUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }
      setProfile((current) => ({ ...current, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  function resetAvatar() {
    setProfile((current) => ({ ...current, avatarUrl: savedProfile.avatarUrl }));
  }

  function resetChanges() {
    setProfile(savedProfile);
    setNotice({ message: "Unsaved profile changes were discarded.", tone: "neutral" });
  }

  async function saveProfile() {
    const normalizedProfile: AppUserProfile = {
      ...profile,
      displayName: profile.displayName.trim(),
      location: profile.location.trim(),
      website: normalizeWebsite(profile.website),
      timezone: profile.timezone.trim(),
      phone: profile.phone.trim(),
      favoriteCategory: profile.favoriteCategory.trim(),
      bio: profile.bio.trim(),
    };

    if (!normalizedProfile.displayName) {
      setNotice({ message: "Display name is required.", tone: "error" });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedProfile),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        profile?: AppUserProfile;
        issues?: Record<string, string[]>;
      };

      if (!response.ok || !payload.ok || !payload.profile) {
        const firstIssue = payload.issues
          ? Object.values(payload.issues).flat().find(Boolean)
          : "";
        setNotice({ message: firstIssue || payload.message || payload.error || "Unable to save profile right now.", tone: "error" });
        return;
      }

      setProfile(payload.profile);
      setSavedProfile(payload.profile);
      window.dispatchEvent(new CustomEvent("analite-profile-updated", { detail: payload.profile }));
      setNotice({ message: payload.message ?? "Profile updated.", tone: "success" });
    } catch {
      setNotice({ message: "Unable to save profile right now.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    setNotice(null);
    if (!currentPassword || !newPassword) {
      setNotice({ message: "Enter both current and new password.", tone: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setNotice({ message: "New password must be at least 8 characters.", tone: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({ message: "New passwords do not match.", tone: "error" });
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setNotice({ message: payload.message ?? "Unable to update password.", tone: "error" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ message: payload.message ?? "Password updated.", tone: "success" });
    } catch {
      setNotice({ message: "Unable to update password right now.", tone: "error" });
    }
  }

  async function copyLicense(licenseKey: string) {
    try {
      setCopyingLicense(licenseKey);
      await navigator.clipboard.writeText(licenseKey);
      setNotice({ message: "License key copied to clipboard.", tone: "success" });
    } catch {
      setNotice({ message: "Could not copy the license key on this device.", tone: "error" });
    } finally {
      setCopyingLicense(null);
    }
  }

  async function downloadPurchase(item: LibraryItem) {
    const purchaseKey = getPurchaseKey(item);
    try {
      setDownloadingPurchase(purchaseKey);
      const response = await fetch("/api/downloads/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: item.transactionId, templateId: item.templateId }),
      });

      const payload = (await response.json()) as { ok?: boolean; url?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setNotice({ message: payload.message ?? "Unable to create a secure download link.", tone: "error" });
        return;
      }

      setNotice({ message: payload.message ?? "Your download is starting.", tone: "success" });
      window.location.href = payload.url;
    } catch {
      setNotice({ message: "Unable to create a secure download link.", tone: "error" });
    } finally {
      setDownloadingPurchase(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Your Profile</h1>
          <p className="mt-2 text-sm text-muted">Manage account details, security, preferences, and everything you have purchased.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:bg-slate-100"
          >
            Open Library
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Sign Out
          </button>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {profileHighlights.map((card) => (
          <article key={card.label} className="rounded-2xl border border-border bg-white p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{card.value}</p>
            <p className="mt-2 text-sm text-muted">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="elevated-card rounded-lg p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Profile Setup</h2>
              <p className="mt-1 text-sm text-muted">Keep your account recognizable and make your recommendations more relevant.</p>
            </div>
            <div className="rounded-full border border-border bg-white px-3 py-1 text-xs text-muted">
              Completion {completionScore}%
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${completionScore}%` }} />
          </div>

          <div className="mt-5 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-4">
              {avatarSource ? (
                <img src={avatarSource} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-xl font-semibold text-slate-700 ring-2 ring-slate-200">
                  {avatarFallback}
                </span>
              )}
              <div className="flex-1 space-y-2">
                <label className="block text-sm text-muted" htmlFor="profile-avatar-upload">Change profile photo</label>
                <input
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetAvatar}
                    className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
                  >
                    Use saved photo
                  </button>
                  {profile.website ? (
                    <a
                      href={normalizeWebsite(profile.website)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
                    >
                      <Globe className="h-4 w-4" /> Visit website
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="grid gap-3 md:col-span-2">
              <label className="text-sm text-muted" htmlFor="profile-email">Email</label>
              <input id="profile-email" value={email} readOnly className="rounded-md border border-border px-3 py-2 text-sm outline-none" />
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-muted" htmlFor="profile-name">Display Name</label>
              <input
                id="profile-name"
                value={profile.displayName}
                onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-muted" htmlFor="profile-location">Location</label>
              <input
                id="profile-location"
                value={profile.location}
                onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))}
                placeholder="Phnom Penh, Cambodia"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-muted" htmlFor="profile-website">Website</label>
              <input
                id="profile-website"
                value={profile.website}
                onChange={(event) => setProfile((current) => ({ ...current, website: event.target.value }))}
                placeholder="your-site.com"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-muted" htmlFor="profile-timezone">Timezone</label>
              <input
                id="profile-timezone"
                value={profile.timezone}
                onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))}
                placeholder="Asia/Phnom_Penh"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-muted" htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Optional"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid gap-3">
              <label className="text-sm text-muted" htmlFor="profile-category">Favorite Template Category</label>
              <select
                id="profile-category"
                value={profile.favoriteCategory}
                onChange={(event) => setProfile((current) => ({ ...current, favoriteCategory: event.target.value }))}
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              >
                <option value="">Select one</option>
                <option value="real-estate">Real Estate</option>
                <option value="portfolio">Portfolio</option>
                <option value="e-commerce">E-commerce</option>
                <option value="wedding">Wedding</option>
              </select>
            </div>

            <div className="grid gap-3 md:col-span-2">
              <label className="text-sm text-muted" htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                value={profile.bio}
                onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
                rows={4}
                placeholder="Tell buyers or collaborators a little about yourself."
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || !hasUnsavedChanges}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              onClick={resetChanges}
              disabled={!hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" /> Reset changes
            </button>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-white p-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Profile Snapshot</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{profile.displayName || email}</p>
              <p className="mt-1 text-sm text-muted">{profile.location || "Location not added yet"}</p>
              <p className="mt-3 text-sm text-muted">{profile.bio || "Add a short bio so your account feels complete and easier to recognize."}</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 rounded-md bg-surface p-3 text-muted">
                <Sparkles className="mt-0.5 h-4 w-4 text-foreground" />
                <span>Favorite category: {formatCategoryLabel(profile.favoriteCategory)}</span>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-surface p-3 text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-foreground" />
                <span>{profile.timezone ? `Timezone set to ${profile.timezone}` : "Set your timezone to make support and invoices easier to coordinate."}</span>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-surface p-3 text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-foreground" />
                <span>{hasUnsavedChanges ? "You have unsaved edits ready to publish." : "All profile changes are saved."}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="rounded-md border border-border px-3 py-2 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={updatePassword}
              className="mt-3 rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:border-slate-400"
            >
              Update Password
            </button>
          </div>

          {notice ? <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${getNoticeClasses(notice.tone)}`}>{notice.message}</p> : null}
        </article>

        <article className="elevated-card rounded-lg p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Purchases and Access</h2>
              <p className="mt-1 text-sm text-muted">Quick access to licenses, docs, previews, and invoices from one place.</p>
            </div>
            <Link href="/library" className="text-sm text-foreground underline underline-offset-4">
              Open full library
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-white p-4 text-sm text-muted">
            <p>Account email: {email}</p>
            <p className="mt-1">Completed purchases: {completedPurchaseCount}</p>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-5 text-sm text-muted">
              No purchases yet. Once you buy a template, licenses and quick actions will show up here.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentPurchases.map((item) => (
                <button
                  key={getPurchaseKey(item)}
                  type="button"
                  onClick={() => setActivePurchase(item)}
                  className="w-full rounded-xl border border-border bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">Purchased {formatDate(item.purchasedAt)}</p>
                    </div>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs text-muted">{item.bankRef || "Digital order"}</span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                    <p className="truncate">Transaction: {item.transactionId}</p>
                    <p>Template ID: {item.templateId}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1">Invoice</span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1">License</span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1">Review</span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1">Support</span>
                    {item.previewUrl ? <span className="rounded-full border border-border bg-surface px-2.5 py-1">Preview</span> : null}
                  </div>

                  <p className="mt-3 text-sm text-muted">Click to view full access details and actions.</p>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      {activePurchase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActivePurchase(null)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Purchase Details</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">{activePurchase.title}</h3>
                <p className="mt-1 text-sm text-muted">Purchased {formatDate(activePurchase.purchasedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePurchase(null)}
                className="rounded-md border border-border p-2 text-muted transition hover:bg-slate-100"
                aria-label="Close purchase details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
              <p>Transaction: {activePurchase.transactionId}</p>
              <p>Template: {activePurchase.templateId}</p>
              <p className="break-all">License: {activePurchase.licenseKey}</p>
              <p>Bank Reference: {activePurchase.bankRef || "Digital order"}</p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => downloadPurchase(activePurchase)}
                disabled={downloadingPurchase === getPurchaseKey(activePurchase)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2.5 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ExternalLink className="h-4 w-4" />
                {downloadingPurchase === getPurchaseKey(activePurchase) ? "Preparing download..." : "Download File"}
              </button>
              <button
                type="button"
                onClick={() => copyLicense(activePurchase.licenseKey)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              >
                <Copy className="h-4 w-4" />
                {copyingLicense === activePurchase.licenseKey ? "Copying..." : "Copy License"}
              </button>
              <Link
                href={`/api/invoice/${activePurchase.transactionId}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" /> Download Invoice
              </Link>
              <Link
                href={`/products/${activePurchase.templateId}`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" /> Open Product
              </Link>
              <Link
                href={`/products/${activePurchase.templateId}#reviews`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" /> Leave Review
              </Link>
              {activePurchase.previewUrl ? (
                <Link
                  href={`/preview/${activePurchase.templateId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
                >
                  <ExternalLink className="h-4 w-4" /> Live Preview
                </Link>
              ) : null}
              <Link
                href={activePurchase.documentationUrl || "/support"}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" /> {activePurchase.documentationUrl ? "Documentation" : "Support"}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
