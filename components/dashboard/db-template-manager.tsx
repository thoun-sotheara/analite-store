"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Plus, Loader2, Check, X, Tag } from "lucide-react";

type Vendor = {
  id: string;
  email: string;
  name: string | null;
  profile: { displayName: string } | null;
};

type DbTemplate = {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  priceUsd: string;
  techStack: string | null;
  isActive: boolean;
  downloadCount: number;
  viewCount: number;
  vendorId: string | null;
  categoryId: string | null;
  createdAt: string;
};

type TemplateForm = {
  title: string;
  description: string;
  slug: string;
  priceUsd: string;
  previewUrl: string;
  documentationUrl: string;
  techStack: string;
  category: string;
  categoryId: string;
  vendorId: string;
  isActive: boolean;
};

const blankForm: TemplateForm = {
  title: "",
  description: "",
  slug: "",
  priceUsd: "49.00",
  previewUrl: "",
  documentationUrl: "",
  techStack: "Next.js",
  category: "e-commerce",
  categoryId: "",
  vendorId: "",
  isActive: true,
};

type CategoryOption = {
  id: string;
  slug: string;
  title: string;
};

export function DbTemplateManager() {
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TemplateForm>(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [seeding, setSeeding] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TemplateForm, string>>>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>(["", "", "", ""]);

  function validateForm(): Partial<Record<keyof TemplateForm, string>> {
    const errors: Partial<Record<keyof TemplateForm, string>> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    else if (form.title.length > 180) errors.title = "Title must be under 180 characters";
    if (!form.slug.trim()) errors.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = "Use only lowercase letters, numbers, and hyphens";
    if (!form.priceUsd.trim()) errors.priceUsd = "Price is required";
    else if (!/^\d+(\.\d{1,2})?$/.test(form.priceUsd)) errors.priceUsd = "Enter a valid price (e.g. 49.00)";
    else if (parseFloat(form.priceUsd) <= 0) errors.priceUsd = "Price must be greater than 0";
    if (!form.categoryId && categories.length > 0) errors.category = "Please select a category";
    return errors;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, vRes, cRes] = await Promise.all([
        fetch("/api/admin/templates"),
        fetch("/api/admin/vendors"),
        fetch("/api/admin/categories"),
      ]);
      if (tRes.ok) setTemplates(await tRes.json());
      if (vRes.ok) setVendors(await vRes.json());
      if (cRes.ok) {
        const cats = await cRes.json() as { id: string; slug: string; title: string }[];
        const mapped = cats.map((c) => ({ id: c.id, slug: c.slug, title: c.title }));
        setCategories(mapped);
        if (mapped.length > 0) {
          setForm((f) => ({
            ...f,
            category: mapped[0].slug,
            categoryId: mapped[0].id,
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-generate slug from title
  function handleTitleChange(value: string) {
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setForm((f) => ({ ...f, title: value, slug: autoSlug }));
  }

  function handleCategoryChange(slug: string) {
    const cat = categories.find((c) => c.slug === slug);
    setForm((f) => ({ ...f, category: slug, categoryId: cat?.id ?? "" }));
  }

  function handleGalleryFileChange(index: number, file: File | null) {
    const newFiles = [...galleryFiles];
    newFiles[index] = file;
    setGalleryFiles(newFiles);

    if (!file) {
      const newUrls = [...galleryPreviewUrls];
      newUrls[index] = "";
      setGalleryPreviewUrls(newUrls);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newUrls = [...galleryPreviewUrls];
    newUrls[index] = previewUrl;
    setGalleryPreviewUrls(newUrls);
  }

  async function seedCategories() {
    setSeeding(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/seed-categories", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatusType("success");
        setStatusMessage(`${data.seeded} categories ready.`);
        fetchData();
      } else {
        setStatusType("error");
        setStatusMessage(data.error ?? "Failed to seed categories");
      }
    } catch {
      setStatusType("error");
      setStatusMessage("Network error seeding categories.");
    } finally {
      setSeeding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage("");
    setCreatedId(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    if (!zipFile) {
      setStatusType("error");
      setStatusMessage("Template ZIP file is required.");
      setSubmitting(false);
      return;
    }

    if (!imageFile) {
      setStatusType("error");
      setStatusMessage("Mockup image file is required.");
      setSubmitting(false);
      return;
    }

    setFormErrors({});

    try {
      const payload = new FormData();
      payload.set("title", form.title);
      payload.set("description", form.description || "");
      payload.set("slug", form.slug);
      payload.set("priceUsd", form.priceUsd);
      payload.set("previewUrl", form.previewUrl || "");
      payload.set("documentationUrl", form.documentationUrl || "");
      payload.set("techStack", form.techStack || "");
      payload.set("category", form.category);
      payload.set("categoryId", form.categoryId || "");
      payload.set("vendorId", form.vendorId || "");
      payload.set("isActive", String(form.isActive));
      payload.set("zipFile", zipFile);
      payload.set("imageFile", imageFile);
      
      // Add gallery images
      galleryFiles.forEach((file, index) => {
        if (file) {
          payload.set(`galleryImage${index + 1}`, file);
        }
      });

      const res = await fetch("/api/admin/templates", {
        method: "POST",
        body: payload,
      });
      const data = await res.json() as { error?: string; issues?: Record<string, string[]> };
      if (!res.ok) {
        setStatusType("error");
        if (data.issues) {
          const fieldErrors = Object.entries(data.issues)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
            .join(" | ");
          setStatusMessage(`Validation failed — ${fieldErrors}`);
        } else {
          setStatusMessage(data.error ?? "Failed to create template");
        }
      } else {
        setStatusType("success");
        const newId = (data as { id?: string }).id ?? null;
        setCreatedId(newId);
        setStatusMessage(`Template "${form.title}" added to database.`);
        setForm(blankForm);
        setZipFile(null);
        setImageFile(null);
        setImagePreviewUrl("");
        setGalleryFiles([null, null, null, null]);
        setGalleryPreviewUrls(["", "", "", ""]);
        setShowForm(false);
        fetchData();
      }
    } catch {
      setStatusType("error");
      setStatusMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Package className="h-5 w-5" /> Database Templates
          </h3>
          <p className="mt-1 text-sm text-muted">
            Add real templates directly to PostgreSQL. These will power the live store.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            {templates.length} in DB
          </span>
          <button
            type="button"
            onClick={seedCategories}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
            {categories.length === 0 ? "Seed Categories" : "Rebuild Categories"}
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setStatusMessage(""); }}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Add Template
          </button>
        </div>
      </div>

      {/* Status message — always visible */}
      {statusMessage && (
        <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${
          statusType === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {statusMessage}
          {statusType === "success" && createdId && (
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`/products/${createdId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded bg-green-700 px-2 py-0.5 text-xs text-white hover:bg-green-800"
              >
                View in Store ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Add Template Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-blue-800">New Template Record</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Modern Real Estate Pro"
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.title ? "border-red-400 bg-red-50" : "border-border"}`}
              />
              {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Slug * (auto-filled)</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                pattern="[a-z0-9-]+"
                placeholder="modern-real-estate-pro"
                className={`w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.slug ? "border-red-400 bg-red-50" : "border-border"}`}
              />
              {formErrors.slug && <p className="mt-1 text-xs text-red-600">{formErrors.slug}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Price (USD) *</label>
              <input
                required
                value={form.priceUsd}
                onChange={(e) => setForm((f) => ({ ...f, priceUsd: e.target.value }))}
                pattern="\d+(\.\d{1,2})?"
                placeholder="49.00"
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.priceUsd ? "border-red-400 bg-red-50" : "border-border"}`}
              />
              {formErrors.priceUsd && <p className="mt-1 text-xs text-red-600">{formErrors.priceUsd}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Category *</label>
              {categories.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  No categories found. Click &quot;Seed Categories&quot; above first.
                </div>
              ) : (
              <select
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title}</option>
                ))}
              </select>
              )}
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Vendor</label>
              <select
                value={form.vendorId}
                onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— No vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.profile?.displayName ?? v.name ?? v.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Tech Stack */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tech Stack</label>
              <input
                value={form.techStack}
                onChange={(e) => setForm((f) => ({ ...f, techStack: e.target.value }))}
                placeholder="Next.js, Tailwind CSS"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* ZIP upload */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Template ZIP File *</label>
              <input
                required
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {zipFile ? <p className="mt-1 text-xs text-muted">Selected: {zipFile.name}</p> : null}
            </div>

            {/* Preview URL */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Preview URL</label>
              <input
                type="url"
                value={form.previewUrl}
                onChange={(e) => setForm((f) => ({ ...f, previewUrl: e.target.value }))}
                placeholder="https://demo.example.com"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Mockup image upload */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Mockup Image File *</label>
              <input
                required
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setImageFile(selected);
                  if (!selected) {
                    setImagePreviewUrl("");
                    return;
                  }
                  setImagePreviewUrl(URL.createObjectURL(selected));
                }}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {imageFile ? <p className="mt-1 text-xs text-muted">Selected: {imageFile.name}</p> : null}
            </div>

            {/* Gallery images upload (optional) */}
            {[0, 1, 2, 3].map((index) => (
              <div key={`gallery-${index}`}>
                <label className="block text-xs font-medium text-foreground mb-1">Gallery Image {index + 1} (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleGalleryFileChange(index, e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {galleryFiles[index] ? <p className="mt-1 text-xs text-muted">Selected: {galleryFiles[index]?.name}</p> : null}
              </div>
            ))}

            {/* Documentation URL */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Docs URL</label>
              <input
                type="url"
                value={form.documentationUrl}
                onChange={(e) => setForm((f) => ({ ...f, documentationUrl: e.target.value }))}
                placeholder="https://docs.example.com"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this template..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="isActive" className="text-sm text-foreground">Active (visible in store)</label>
            </div>

            <div className="sm:col-span-2 rounded-md border border-border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Preview Before Upload</p>
              <p className="mt-1 text-sm font-medium text-foreground">{form.title || "Template title preview"}</p>
              <p className="mt-1 text-xs text-muted">{form.description || "Template description preview"}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full border border-border px-2 py-0.5">Category: {form.category || "-"}</span>
                <span className="rounded-full border border-border px-2 py-0.5">Price: ${form.priceUsd || "0.00"}</span>
                <span className="rounded-full border border-border px-2 py-0.5">Stack: {form.techStack || "-"}</span>
              </div>
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="Template preview" className="mt-3 h-40 w-full rounded-md border border-border object-cover" />
              ) : null}
              {form.previewUrl ? (
                <a href={form.previewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs text-blue-700 hover:underline">
                  Open live preview URL
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || categories.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {submitting ? "Saving..." : "Save to Database"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setStatusMessage(""); }}
              className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* Template list */}
      <div className="mt-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
            No templates in the database yet. Use &quot;Add Template&quot; above to add the first one.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Title</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Category</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Price</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Tech</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Views</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">DLs</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface transition">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted font-mono">{t.slug}</p>
                    </td>
                    <td className="px-3 py-2.5 text-muted capitalize">{t.category}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">${t.priceUsd}</td>
                    <td className="px-3 py-2.5 text-muted">{t.techStack ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{t.viewCount ?? 0}</td>
                    <td className="px-3 py-2.5 text-muted">{t.downloadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── CategoryManager ──────────────────────────────────────────────────────────
type NewCatForm = { slug: string; title: string; description: string; iconSlug: string; displayOrder: string };
const blankCat: NewCatForm = { slug: "", title: "", description: "", iconSlug: "", displayOrder: "0" };

export function CategoryManager() {
  const [categories, setCategories] = useState<(CategoryOption & { description?: string; displayOrder?: number })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewCatForm>(blankCat);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function handleTitleChange(value: string) {
    const autoSlug = value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    setForm((f) => ({ ...f, title: value, slug: autoSlug }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          title: form.title,
          description: form.description || undefined,
          iconSlug: form.iconSlug || undefined,
          displayOrder: Number(form.displayOrder) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusType("error");
        setStatusMsg(data.error ?? "Failed");
      } else {
        setStatusType("success");
        setStatusMsg(`Category "${form.title}" added.`);
        setForm(blankCat);
        setShowForm(false);
        fetchCategories();
      }
    } catch {
      setStatusType("error");
      setStatusMsg("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete category "${title}"? Templates using this category will keep their category slug.`)) return;
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    fetchCategories();
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Tag className="h-5 w-5" /> Category Management
          </h3>
          <p className="mt-1 text-sm text-muted">
            Add unlimited categories. Templates will use the category slug.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setStatusMsg(""); }}
          className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add Category
        </button>
      </div>

      {statusMsg && !showForm && (
        <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${statusType === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {statusMsg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">New Category</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g. SaaS" className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Slug * (auto)</label>
              <input required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} pattern="[a-z0-9-]+" placeholder="saas" className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Icon slug (Lucide name)</label>
              <input value={form.iconSlug} onChange={(e) => setForm((f) => ({ ...f, iconSlug: e.target.value }))} placeholder="layout-grid" className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Display order</label>
              <input type="number" min="0" value={form.displayOrder} onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description..." className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          {statusMsg && <p className="text-xs text-red-600">{statusMsg}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {submitting ? "Saving..." : "Save Category"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-2">
        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">No categories yet.</div>
        ) : categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <div>
              <span className="font-medium text-foreground">{cat.title}</span>
              <span className="ml-2 font-mono text-xs text-muted">{cat.slug}</span>
              {cat.description && <p className="mt-0.5 text-xs text-muted">{cat.description}</p>}
            </div>
            <button
              onClick={() => handleDelete(cat.id, cat.title)}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
