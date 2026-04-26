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
            setDbItems(data.items);
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
