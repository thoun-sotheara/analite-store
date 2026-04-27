"use client";

import { Check, X, Mail, Shield, TrendingUp, Plus, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type DbVendor = {
  id: string;
  email: string;
  name: string | null;
  slug: string | null;
  isVendorVerified: boolean;
  createdAt: string;
  profile: {
    id: string;
    displayName: string;
    bio: string | null;
    location: string | null;
    websiteUrl: string | null;
    isVerified: boolean;
  } | null;
  productCount?: number;
  totalRevenueUsd?: number;
};

type AddVendorForm = {
  email: string;
  name: string;
  slug: string;
  displayName: string;
  bio: string;
  location: string;
  websiteUrl: string;
};

const blankForm: AddVendorForm = {
  email: "",
  name: "",
  slug: "",
  displayName: "",
  bio: "",
  location: "",
  websiteUrl: "",
};

export function VendorManagement() {
  const [vendors, setVendors] = useState<DbVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddVendorForm>(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeVendor, setActiveVendor] = useState<string | null>(null);
  const [analyticsVendor, setAnalyticsVendor] = useState<DbVendor | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/vendors", { cache: "no-store" }),
        fetch("/api/dashboard/vendors", { cache: "no-store" }),
      ]);

      if (adminRes.ok) {
        const adminVendors = (await adminRes.json()) as DbVendor[];
        const analytics = analyticsRes.ok
          ? (await analyticsRes.json()) as Array<{ id: string; productCount: number; totalRevenueUsd: number }>
          : [];
        const analyticsById = new Map(analytics.map((row) => [row.id, row]));

        setVendors(adminVendors.map((vendor) => {
          const metric = analyticsById.get(vendor.id);
          return {
            ...vendor,
            productCount: metric?.productCount ?? 0,
            totalRevenueUsd: metric?.totalRevenueUsd ?? 0,
          };
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Auto-generate slug from displayName
  function handleDisplayNameChange(value: string) {
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setForm((f) => ({ ...f, displayName: value, slug: autoSlug, name: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isVerified: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error ?? "Failed to create vendor");
      } else {
        setStatusMessage(`Vendor "${form.displayName}" created.`);
        setForm(blankForm);
        setShowForm(false);
        fetchVendors();
      }
    } catch {
      setStatusMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const verifiedCount = vendors.filter((v) => v.isVendorVerified).length;

  return (
    <div id="vendor-management" className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6 scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Shield className="h-5 w-5" /> Vendor Management
          </h3>
          <p className="mt-1 text-sm text-muted">Add and manage marketplace vendors</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100">
            ✓ {verifiedCount} Verified
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setStatusMessage(""); }}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Add Vendor Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-blue-800">New Vendor Account</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Display Name *</label>
              <input
                required
                value={form.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g. Analite Studio"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="vendor@example.com"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Slug * (auto-filled)</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="analite-studio"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Phnom Penh, Cambodia"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Website URL</label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://example.com"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Bio</label>
              <textarea
                rows={2}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Short description of this vendor..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          {statusMessage && (
            <p className="text-xs font-medium text-red-600">{statusMessage}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {submitting ? "Creating..." : "Create Vendor"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setStatusMessage(""); }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {statusMessage && !showForm && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {statusMessage}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors...
          </div>
        ) : vendors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
            No vendor records yet. Use &quot;Add Vendor&quot; to create the first one.
          </div>
        ) : vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => setActiveVendor(activeVendor === vendor.id ? null : vendor.id)}
            className={`cursor-pointer rounded-lg border p-4 transition ${
              activeVendor === vendor.id
                ? "border-blue-300 bg-blue-50"
                : "border-border bg-surface hover:border-border/80"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">
                    {vendor.profile?.displayName ?? vendor.name ?? vendor.email}
                  </h4>
                  {vendor.isVendorVerified && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-3 sm:flex sm:gap-6 text-sm">
                  <div>
                    <p className="text-muted">Email</p>
                    <p className="font-medium text-foreground">{vendor.email}</p>
                  </div>
                  {vendor.profile?.location && (
                    <div>
                      <p className="text-muted">Location</p>
                      <p className="font-medium text-foreground">{vendor.profile.location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted">Slug</p>
                    <p className="font-medium text-foreground font-mono">{vendor.slug ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted">ID</p>
                    <p className="font-medium text-foreground font-mono text-xs truncate max-w-[140px]">{vendor.id}</p>
                  </div>
                </div>

                {vendor.profile?.bio && (
                  <p className="mt-2 text-xs text-muted line-clamp-2">{vendor.profile.bio}</p>
                )}
                <p className="mt-1.5 text-xs text-muted">
                  Joined {new Date(vendor.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const subject = encodeURIComponent(`Marketplace update for ${vendor.profile?.displayName ?? vendor.name ?? vendor.email}`);
                    window.location.href = `mailto:${vendor.email}?subject=${subject}`;
                  }}
                  className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition hover:border-foreground"
                >
                  <Mail className="h-3.5 w-3.5" /> Message
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAnalyticsVendor(vendor);
                  }}
                  className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition hover:border-foreground"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Analytics
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {analyticsVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAnalyticsVendor(null)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-foreground">Vendor Analytics</h4>
            <p className="mt-1 text-sm text-muted">{analyticsVendor.profile?.displayName ?? analyticsVendor.name ?? analyticsVendor.email}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Products</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{analyticsVendor.productCount ?? 0}</p>
              </article>
              <article className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Revenue</p>
                <p className="mt-2 text-xl font-semibold text-foreground">${(analyticsVendor.totalRevenueUsd ?? 0).toFixed(2)}</p>
              </article>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              <p>Email: {analyticsVendor.email}</p>
              <p className="mt-1">Slug: {analyticsVendor.slug ?? "Not assigned"}</p>
              <p className="mt-1">Verified: {analyticsVendor.isVendorVerified ? "Yes" : "No"}</p>
            </div>
            <button
              type="button"
              onClick={() => setAnalyticsVendor(null)}
              className="mt-4 rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:bg-surface"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
