"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { LibraryItem } from "@/lib/library/get-library-items";
import type { AppUserProfile } from "@/lib/profile/user-profile";

type ProfilePanelProps = {
  email: string;
  initialProfile: AppUserProfile;
  purchases: LibraryItem[];
};

export function ProfilePanel({ email, initialProfile, purchases }: ProfilePanelProps) {
  const [profile, setProfile] = useState<AppUserProfile>(initialProfile);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
    setProfile((current) => ({ ...current, avatarUrl: initialProfile.avatarUrl }));
  }

  const avatarSource = profile.avatarUrl || initialProfile.avatarUrl;
  const avatarFallback = (profile.displayName || email || "U").trim().charAt(0).toUpperCase();

  async function saveProfile() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string; profile?: AppUserProfile };
      if (!response.ok || !payload.ok || !payload.profile) {
        setNotice(payload.message ?? "Unable to save profile right now.");
        return;
      }

      setProfile(payload.profile);
      setNotice(payload.message ?? "Profile updated.");
    } catch {
      setNotice("Unable to save profile right now.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    setNotice("");
    if (!currentPassword || !newPassword) {
      setNotice("Enter both current and new password.");
      return;
    }

    if (newPassword.length < 8) {
      setNotice("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice("New passwords do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setNotice(payload.message ?? "Unable to update password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(payload.message ?? "Password updated.");
    } catch {
      setNotice("Unable to update password right now.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Your Profile</h1>
          <p className="mt-2 text-sm text-muted">Manage account details, security, and your purchases.</p>
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="elevated-card rounded-lg p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Profile Setup</h2>
          <div className="mt-5 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-4">
              {avatarSource ? (
                // eslint-disable-next-line @next/next/no-img-element
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetAvatar}
                    className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-slate-100"
                  >
                    Use Google Photo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm text-muted" htmlFor="profile-email">Email</label>
            <input id="profile-email" value={email} readOnly className="rounded-md border border-border px-3 py-2 text-sm outline-none" />

            <label className="text-sm text-muted" htmlFor="profile-name">Display Name</label>
            <input
              id="profile-name"
              value={profile.displayName}
              onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
              className="rounded-md border border-border px-3 py-2 text-sm outline-none"
            />

            <label className="text-sm text-muted" htmlFor="profile-location">Location</label>
            <input
              id="profile-location"
              value={profile.location}
              onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))}
              className="rounded-md border border-border px-3 py-2 text-sm outline-none"
            />

            <label className="text-sm text-muted" htmlFor="profile-website">Website</label>
            <input
              id="profile-website"
              value={profile.website}
              onChange={(event) => setProfile((current) => ({ ...current, website: event.target.value }))}
              className="rounded-md border border-border px-3 py-2 text-sm outline-none"
            />

            <label className="text-sm text-muted" htmlFor="profile-timezone">Timezone</label>
            <input
              id="profile-timezone"
              value={profile.timezone}
              onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))}
              placeholder="Asia/Phnom_Penh"
              className="rounded-md border border-border px-3 py-2 text-sm outline-none"
            />

            <label className="text-sm text-muted" htmlFor="profile-phone">Phone</label>
            <input
              id="profile-phone"
              value={profile.phone}
              onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Optional"
              className="rounded-md border border-border px-3 py-2 text-sm outline-none"
            />

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

            <label className="text-sm text-muted" htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              value={profile.bio}
              onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
              rows={4}
              className="rounded-md border border-border px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            <div className="mt-3 grid gap-3">
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
          {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
        </article>

        <article className="elevated-card rounded-lg p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Your Purchases</h2>
          <div className="mt-3 rounded-md border border-border bg-white p-3 text-xs text-muted">
            <p>Purchase count: {purchases.length}</p>
            <p className="mt-1">Account email: {email}</p>
          </div>
          {purchases.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No purchases yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {purchases.map((item) => (
                <div key={item.transactionId} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted">Transaction: {item.transactionId}</p>
                  <p className="mt-1 text-xs text-muted">License: {item.licenseKey}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
