"use client";

import { useMemo, useState } from "react";
import { useCatalog } from "@/components/catalog/catalog-provider";
import type { TemplateCategory, TemplateItem } from "@/lib/data/mock-templates";

type Draft = {
  title: string;
  description: string;
  category: string;
  priceUsd: string;
  techStack: string;
  screenMockupUrl: string;
  zipFileKey: string;
  vendorName: string;
  vendorLocation: string;
};

const initialDraft: Draft = {
  title: "",
  description: "",
  category: "e-commerce",
  priceUsd: "49",
  techStack: "Next.js",
  screenMockupUrl: "",
  zipFileKey: "",
  vendorName: "",
  vendorLocation: "",
};

export function ProductCrudManager() {
  const { items, createTemplate, updateTemplate, deleteTemplate, restoreTemplate } = useCatalog();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const ordered = useMemo(
    () => [...items].sort((a, b) => b.downloadCount - a.downloadCount),
    [items],
  );

  const totalPages = Math.max(1, Math.ceil(ordered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleItems = ordered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  function onImageSelected(file: File | null) {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setDraft((current) => ({ ...current, screenMockupUrl: localPreview }));
  }

  function onZipSelected(file: File | null) {
    if (!file) return;
    const key = `uploads/${Date.now()}-${file.name}`;
    setDraft((current) => ({ ...current, zipFileKey: key }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.screenMockupUrl || !draft.zipFileKey) {
      setStatusMessage("Image and zip file are required.");
      return;
    }

    const payload = {
      title: draft.title,
      description: draft.description,
      category: draft.category,
      priceUsd: Number(draft.priceUsd),
      techStack: draft.techStack,
      screenMockupUrl: draft.screenMockupUrl,
      zipFileKey: draft.zipFileKey,
      vendorName: draft.vendorName,
      vendorLocation: draft.vendorLocation,
    };

    if (editingId) {
      updateTemplate(editingId, {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        categoryLabel:
          payload.category
            .split("-")
            .filter(Boolean)
            .map((word) => word[0]?.toUpperCase() + word.slice(1))
            .join(" "),
        priceUsd: Math.max(0, payload.priceUsd || 0),
        techStack: payload.techStack,
        screenMockupUrl: payload.screenMockupUrl,
        s3Key: payload.zipFileKey,
        updatedLabel: "Updated just now",
        vendor: {
          slug: payload.vendorName.toLowerCase().replace(/\s+/g, "-") || "custom-vendor",
          name: payload.vendorName || "Custom Vendor",
          verified: false,
          bio: "Seller updated vendor profile",
          location: payload.vendorLocation || "Cambodia",
        },
      });
      setStatusMessage("Product updated successfully.");
    } else {
      createTemplate(payload);
      setStatusMessage("Product created successfully.");
    }

    setDraft(initialDraft);
    setEditingId(null);
    setCurrentPage(1);
  }

  function startEdit(item: TemplateItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      description: item.description,
      category: item.category,
      priceUsd: String(item.priceUsd),
      techStack: item.techStack,
      screenMockupUrl: item.screenMockupUrl,
      zipFileKey: item.s3Key,
      vendorName: item.vendor.name,
      vendorLocation: item.vendor.location,
    });
    setStatusMessage(`Editing ${item.title}`);
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Product CRUD Center</h2>
          <p className="mt-1 text-sm text-muted">
            Use this panel to create, edit, delete, and restore marketplace items.
          </p>
        </div>
        <p className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          Total Live Items: {items.length}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
        <input
          required
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="Template title"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        />
        <input
          required
          value={draft.priceUsd}
          onChange={(event) => setDraft((current) => ({ ...current, priceUsd: event.target.value }))}
          placeholder="Price in USD"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          inputMode="numeric"
        />
        <textarea
          required
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          placeholder="Template description"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none md:col-span-2"
          rows={3}
        />
        <input
          value={draft.category}
          onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as TemplateCategory }))}
          placeholder="Category slug (e.g. saas, education)"
          list="category-suggestions"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        />
        <datalist id="category-suggestions">
          <option value="e-commerce" />
          <option value="real-estate" />
          <option value="portfolio" />
          <option value="wedding" />
          <option value="saas" />
          <option value="education" />
          <option value="restaurant" />
        </datalist>
        <input
          value={draft.techStack}
          onChange={(event) => setDraft((current) => ({ ...current, techStack: event.target.value }))}
          placeholder="Tech stack"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        />
        <input
          value={draft.vendorName}
          onChange={(event) => setDraft((current) => ({ ...current, vendorName: event.target.value }))}
          placeholder="Vendor name"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        />
        <input
          value={draft.vendorLocation}
          onChange={(event) => setDraft((current) => ({ ...current, vendorLocation: event.target.value }))}
          placeholder="Vendor location"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-muted">Product Image (required)</label>
          <input
            required={!editingId}
            type="file"
            accept="image/*"
            onChange={(event) => onImageSelected(event.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          {draft.screenMockupUrl ? <p className="mt-1 text-xs text-muted">Image selected.</p> : null}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-muted">Zip File (required)</label>
          <input
            required={!editingId}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={(event) => onZipSelected(event.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          {draft.zipFileKey ? <p className="mt-1 break-all text-xs text-muted">{draft.zipFileKey}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800">
            {editingId ? "Update Product" : "Create Product"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(initialDraft);
                setStatusMessage("Edit cancelled.");
              }}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {statusMessage ? <p className="mt-3 text-sm text-muted">{statusMessage}</p> : null}

      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="pb-3 pr-3 font-medium">Item</th>
              <th className="pb-3 pr-3 font-medium">Category</th>
              <th className="pb-3 pr-3 font-medium">Price</th>
              <th className="pb-3 pr-3 font-medium">Performance</th>
              <th className="pb-3 pr-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id} className="border-t border-border align-top">
                <td className="py-3 pr-3">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted">{item.id}</p>
                </td>
                <td className="py-3 pr-3 text-muted">{item.categoryLabel}</td>
                <td className="py-3 pr-3 text-foreground">${item.priceUsd.toFixed(2)}</td>
                <td className="py-3 pr-3 text-muted">{item.downloadCount} downloads</td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTemplate(item.id);
                        setStatusMessage(`${item.title} deleted.`);
                      }}
                      className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs text-red-700"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        restoreTemplate(item.id);
                        setStatusMessage(`${item.title} restored to original.`);
                      }}
                      className="rounded-md border border-border px-2.5 py-1 text-xs text-muted"
                    >
                      Restore
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 md:hidden" data-stagger="true">
        {visibleItems.map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted">{item.id}</p>
              </div>
              <p className="text-sm font-medium text-foreground">${item.priceUsd.toFixed(2)}</p>
            </div>
            <p className="mt-2 text-xs text-muted">{item.categoryLabel} • {item.downloadCount} downloads</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTemplate(item.id);
                  setStatusMessage(`${item.title} deleted.`);
                }}
                className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs text-red-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  restoreTemplate(item.id);
                  setStatusMessage(`${item.title} restored to original.`);
                }}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted"
              >
                Restore
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
        >
          Back
        </button>
        {Array.from({ length: totalPages }).map((_, index) => {
          const page = index + 1;
          return (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`rounded-md border px-3 py-1.5 text-xs ${page === safePage ? "border-foreground bg-foreground text-white" : "border-border text-foreground"}`}
            >
              {page}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
        >
          Next
        </button>
      </div>
    </section>
  );
}
