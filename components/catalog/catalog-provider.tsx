"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockTemplates, type TemplateCategory, type TemplateItem } from "@/lib/data/mock-templates";

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
  createTemplate: (input: TemplateInput) => TemplateItem;
  updateTemplate: (id: string, patch: Partial<TemplateItem>) => void;
  deleteTemplate: (id: string) => void;
  restoreTemplate: (id: string) => void;
};

type CatalogStoragePayload = {
  customItems: TemplateItem[];
  overrideItems: TemplateItem[];
  hiddenIds: string[];
};

const STORAGE_KEY = "analite_catalog_v1";

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

function parsePayload(raw: string | null): CatalogStoragePayload {
  if (!raw) {
    return { customItems: [], overrideItems: [], hiddenIds: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CatalogStoragePayload>;
    return {
      customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
      overrideItems: Array.isArray(parsed.overrideItems) ? parsed.overrideItems : [],
      hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [],
    };
  } catch {
    return { customItems: [], overrideItems: [], hiddenIds: [] };
  }
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [customItems, setCustomItems] = useState<TemplateItem[]>([]);
  const [overrideItems, setOverrideItems] = useState<TemplateItem[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    const payload = parsePayload(window.localStorage.getItem(STORAGE_KEY));
    setCustomItems(payload.customItems);
    setOverrideItems(payload.overrideItems);
    setHiddenIds(payload.hiddenIds);
  }, []);

  useEffect(() => {
    const payload: CatalogStoragePayload = { customItems, overrideItems, hiddenIds };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [customItems, overrideItems, hiddenIds]);

  const items = useMemo(() => {
    const hidden = new Set(hiddenIds);
    const overrides = new Map(overrideItems.map((item) => [item.id, item]));

    const baseItems = mockTemplates
      .filter((item) => !hidden.has(item.id))
      .map((item) => overrides.get(item.id) ?? item);

    return [...baseItems, ...customItems];
  }, [customItems, overrideItems, hiddenIds]);

  function createTemplate(input: TemplateInput) {
    const now = new Date();
    const id = `t-custom-${now.getTime()}`;
    const slug = normalizeSlug(input.title) || `template-${now.getTime()}`;

    const newItem: TemplateItem = {
      id,
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      categoryLabel: categoryLabel(input.category),
      priceUsd: Math.max(0, Number(input.priceUsd) || 0),
      s3Key: input.zipFileKey.trim() || `templates/custom/${slug}.zip`,
      previewUrl: "https://example.com/previews/custom-template",
      documentationUrl: "https://example.com/docs/custom-template",
      rating: 4.6,
      reviewCount: 0,
      downloadCount: 0,
      techStack: input.techStack.trim() || "Next.js",
      updatedLabel: "Updated just now",
      screenMockupUrl: input.screenMockupUrl.trim() || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=60",
      vendor: {
        slug: normalizeSlug(input.vendorName) || "custom-vendor",
        name: input.vendorName.trim() || "Custom Vendor",
        verified: false,
        bio: "Custom marketplace listing",
        location: input.vendorLocation.trim() || "Cambodia",
      },
    };

    setCustomItems((current) => [newItem, ...current]);
    return newItem;
  }

  function updateTemplate(id: string, patch: Partial<TemplateItem>) {
    setCustomItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index === -1) return current;
      const clone = [...current];
      clone[index] = { ...clone[index], ...patch };
      return clone;
    });

    const baseItem = mockTemplates.find((item) => item.id === id);
    if (baseItem) {
      setOverrideItems((current) => {
        const merged = { ...baseItem, ...(current.find((item) => item.id === id) ?? {}), ...patch };
        const next = current.filter((item) => item.id !== id);
        return [merged, ...next];
      });
      setHiddenIds((current) => current.filter((itemId) => itemId !== id));
    }
  }

  function deleteTemplate(id: string) {
    setCustomItems((current) => current.filter((item) => item.id !== id));

    if (mockTemplates.some((item) => item.id === id)) {
      setHiddenIds((current) => (current.includes(id) ? current : [id, ...current]));
      setOverrideItems((current) => current.filter((item) => item.id !== id));
    }
  }

  function restoreTemplate(id: string) {
    setHiddenIds((current) => current.filter((itemId) => itemId !== id));
    setOverrideItems((current) => current.filter((item) => item.id !== id));
  }

  const value = useMemo(
    () => ({ items, createTemplate, updateTemplate, deleteTemplate, restoreTemplate }),
    [items],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within CatalogProvider.");
  }

  return context;
}
