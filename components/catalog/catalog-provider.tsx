"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { TemplateCategory, TemplateItem } from "@/lib/data/mock-templates";

type TemplateInput = {
  title: string;
  description: string;
  category: TemplateCategory;
  priceUsd: number;
  techStack: string;
  screenMockupUrl: string;
  zipFileKey: string;
  vendorName: string;
  vendorLocation: string;
};

type CatalogContextValue = {
  items: TemplateItem[];
  isLoading: boolean;
  createTemplate: (input: TemplateInput) => TemplateItem;
  updateTemplate: (id: string, patch: Partial<TemplateItem>) => void;
  deleteTemplate: (id: string) => void;
  restoreTemplate: (id: string) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

function categoryLabel(category: TemplateCategory) {
  return category
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeItem(item: Partial<TemplateItem>): TemplateItem {
  const id = (typeof item.id === "string" && item.id.trim()) || "";
  const title = (typeof item.title === "string" && item.title.trim()) || "Untitled template";
  const category = (typeof item.category === "string" && item.category.trim()) || "general";

  return {
    id,
    slug: (typeof item.slug === "string" && item.slug.trim()) || id,
    title,
    description: (typeof item.description === "string" && item.description) || "",
    category,
    categoryLabel: (typeof item.categoryLabel === "string" && item.categoryLabel) || categoryLabel(category),
    priceUsd: toNumber(item.priceUsd),
    s3Key: (typeof item.s3Key === "string" && item.s3Key) || "",
    previewUrl: (typeof item.previewUrl === "string" && item.previewUrl) || "",
    documentationUrl: (typeof item.documentationUrl === "string" && item.documentationUrl) || "",
    rating: toNumber(item.rating),
    reviewCount: toNumber(item.reviewCount),
    downloadCount: toNumber(item.downloadCount),
    viewCount: toNumber(item.viewCount),
    techStack: (typeof item.techStack === "string" && item.techStack) || "Next.js",
    updatedLabel: (typeof item.updatedLabel === "string" && item.updatedLabel) || "Recently updated",
    screenMockupUrl: (typeof item.screenMockupUrl === "string" && item.screenMockupUrl) || "/placeholder-product.svg",
    galleryImage1: item.galleryImage1 ?? null,
    galleryImage2: item.galleryImage2 ?? null,
    galleryImage3: item.galleryImage3 ?? null,
    galleryImage4: item.galleryImage4 ?? null,
    vendor: {
      slug: (typeof item.vendor?.slug === "string" && item.vendor.slug) || "analite",
      name: (typeof item.vendor?.name === "string" && item.vendor.name) || "Analite Studio",
      verified: Boolean(item.vendor?.verified),
      bio: (typeof item.vendor?.bio === "string" && item.vendor.bio) || "",
      location: (typeof item.vendor?.location === "string" && item.vendor.location) || "Cambodia",
    },
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [dbItems, setDbItems] = useState<TemplateItem[] | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCatalog = () => {
      fetch("/api/catalog", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { items?: TemplateItem[] } | null) => {
          if (!active) return;
          if (Array.isArray(data?.items)) {
            setDbItems(
              data.items
                .map((item) => normalizeItem(item))
                .filter((item) => item.id.length > 0),
            );
            return;
          }
          setDbItems((prev) => prev ?? []);
        })
        .catch(() => {
          if (!active) return;
          // Keep last known list on transient network/API errors.
          setDbItems((prev) => prev ?? []);
        });
    };

    fetchCatalog();

    // Near real-time sync for view/download counters and newly added templates.
    const interval = window.setInterval(fetchCatalog, 10_000);
    const onFocus = () => fetchCatalog();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchCatalog();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const items = useMemo(() => dbItems ?? [], [dbItems]);
  const isLoading = dbItems === null;

  function createTemplate(input: TemplateInput): TemplateItem {
    const slug = normalizeSlug(input.title) || "template";
    const category = input.category;
    throw new Error(
      `Local catalog mutations are disabled. Use the database-backed dashboard to create \"${slug}\" in category \"${categoryLabel(category)}\".`,
    );
  }

  function updateTemplate(id: string, _patch: Partial<TemplateItem>) {
    throw new Error(`Local catalog mutations are disabled. Use the database-backed dashboard to update template ${id}.`);
  }

  function deleteTemplate(id: string) {
    throw new Error(`Local catalog mutations are disabled. Use the database-backed dashboard to delete template ${id}.`);
  }

  function restoreTemplate(id: string) {
    throw new Error(`Local catalog mutations are disabled. Use the database-backed dashboard to restore template ${id}.`);
  }

  const value: CatalogContextValue = { items, isLoading, createTemplate, updateTemplate, deleteTemplate, restoreTemplate };
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used within CatalogProvider.");
  return context;
}
