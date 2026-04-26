export type TemplateCategory = string;

export type TemplateItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  categoryLabel: string;
  priceUsd: number;
  s3Key: string;
  previewUrl: string;
  documentationUrl: string;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  techStack: string;
  updatedLabel: string;
  screenMockupUrl: string;
  galleryImage1?: string | null;
  galleryImage2?: string | null;
  galleryImage3?: string | null;
  galleryImage4?: string | null;
  vendor: {
    slug: string;
    name: string;
    verified: boolean;
    bio: string;
    location: string;
  };
};

export type TemplateReview = {
  id: string;
  templateId: string;
  author: string;
  role: string;
  rating: number;
  dateLabel: string;
  comment: string;
};

export const mockTemplates: TemplateItem[] = [
  {
    id: "t-re-001",
    slug: "phnom-villa-pro",
    title: "Phnom Villa Pro",
    description: "Luxury real-estate listing template optimized for Khmer and English.",
    category: "real-estate",
    categoryLabel: "Real Estate",
    priceUsd: 49,
    s3Key: "templates/real-estate/phnom-villa-pro.zip",
    previewUrl: "https://example.com/previews/phnom-villa-pro",
    documentationUrl: "https://example.com/docs/phnom-villa-pro",
    rating: 4.9,
    reviewCount: 184,
    downloadCount: 3200,
    techStack: "Next.js",
    updatedLabel: "Updated 3 days ago",
    screenMockupUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=60",
    vendor: {
      slug: "boreycraft-studio",
      name: "BoreyCraft Studio",
      verified: true,
      bio: "Real-estate focused template studio crafting polished listing and property conversion experiences.",
      location: "Phnom Penh, Cambodia",
    },
  },
  {
    id: "t-pt-001",
    slug: "creator-profile-one",
    title: "Creator Profile One",
    description: "High-converting portfolio template with project storytelling sections.",
    category: "portfolio",
    categoryLabel: "Portfolio",
    priceUsd: 39,
    s3Key: "templates/portfolio/creator-profile-one.zip",
    previewUrl: "https://example.com/previews/creator-profile-one",
    documentationUrl: "https://example.com/docs/creator-profile-one",
    rating: 4.8,
    reviewCount: 122,
    downloadCount: 2100,
    techStack: "React",
    updatedLabel: "Updated this week",
    screenMockupUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&fit=crop&q=60",
    vendor: {
      slug: "studio-nine",
      name: "Studio Nine",
      verified: true,
      bio: "Portfolio specialists focused on creator branding, case studies, and conversion-led layouts.",
      location: "Siem Reap, Cambodia",
    },
  },
  {
    id: "t-ec-001",
    slug: "khmer-shopfront",
    title: "Khmer Shopfront",
    description: "Mobile-first e-commerce storefront for small merchants in Cambodia.",
    category: "e-commerce",
    categoryLabel: "E-commerce",
    priceUsd: 79,
    s3Key: "templates/ecommerce/khmer-shopfront.zip",
    previewUrl: "https://example.com/previews/khmer-shopfront",
    documentationUrl: "https://example.com/docs/khmer-shopfront",
    rating: 5,
    reviewCount: 231,
    downloadCount: 4100,
    techStack: "Shopify",
    updatedLabel: "Updated yesterday",
    screenMockupUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=60",
    vendor: {
      slug: "mekong-commerce-lab",
      name: "Mekong Commerce Lab",
      verified: true,
      bio: "Commerce systems team building storefronts for Cambodian SMEs and digital-first brands.",
      location: "Phnom Penh, Cambodia",
    },
  },
  {
    id: "t-wd-001",
    slug: "moonlight-invitation",
    title: "Moonlight Invitation",
    description: "Elegant wedding invitation microsite with timeline and RSVP flow.",
    category: "wedding",
    categoryLabel: "Wedding",
    priceUsd: 29,
    s3Key: "templates/wedding/moonlight-invitation.zip",
    previewUrl: "https://example.com/previews/moonlight-invitation",
    documentationUrl: "https://example.com/docs/moonlight-invitation",
    rating: 4.7,
    reviewCount: 94,
    downloadCount: 1650,
    techStack: "Framer",
    updatedLabel: "Updated 2 weeks ago",
    screenMockupUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=60",
    vendor: {
      slug: "everafter-digital",
      name: "EverAfter Digital",
      verified: true,
      bio: "Wedding and event web designers delivering elegant invitation and RSVP experiences.",
      location: "Battambang, Cambodia",
    },
  },
];

const extraCategoryPool: Array<{ slug: string; label: string }> = [
  { slug: "real-estate", label: "Real Estate" },
  { slug: "portfolio", label: "Portfolio" },
  { slug: "e-commerce", label: "E-commerce" },
  { slug: "wedding", label: "Wedding" },
  { slug: "education", label: "Education" },
  { slug: "restaurant", label: "Restaurant" },
  { slug: "healthcare", label: "Healthcare" },
  { slug: "travel", label: "Travel" },
  { slug: "saas", label: "SaaS" },
  { slug: "blog", label: "Blog" },
  { slug: "agency", label: "Agency" },
  { slug: "non-profit", label: "Non-profit" },
];

const stackPool = ["Next.js", "React", "Astro", "Vue", "SvelteKit", "Shopify"];
const imagePool = [
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1556155092-490a1ba16284?w=1200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=60",
];

const generatedTemplates: TemplateItem[] = Array.from({ length: 50 }).map((_, index) => {
  const i = index + 1;
  const category = extraCategoryPool[index % extraCategoryPool.length];
  const stack = stackPool[index % stackPool.length];
  const vendorIndex = (index % 8) + 1;

  return {
    id: `t-gen-${String(i).padStart(3, "0")}`,
    slug: `${category.slug}-starter-${i}`,
    title: `${category.label} Starter ${i}`,
    description: `Conversion-focused ${category.label.toLowerCase()} template with modern sections and mobile-first components.`,
    category: category.slug,
    categoryLabel: category.label,
    priceUsd: 24 + (index % 10) * 5,
    s3Key: `templates/${category.slug}/starter-${i}.zip`,
    previewUrl: `https://example.com/previews/${category.slug}-starter-${i}`,
    documentationUrl: `https://example.com/docs/${category.slug}-starter-${i}`,
    rating: 4.2 + (index % 8) * 0.1,
    reviewCount: 14 + index * 3,
    downloadCount: 200 + index * 57,
    techStack: stack,
    updatedLabel: index % 3 === 0 ? "Updated this week" : index % 2 === 0 ? "Updated yesterday" : "Updated 3 days ago",
    screenMockupUrl: imagePool[index % imagePool.length],
    vendor: {
      slug: `market-vendor-${vendorIndex}`,
      name: `Market Vendor ${vendorIndex}`,
      verified: index % 2 === 0,
      bio: `Template vendor specializing in ${category.label.toLowerCase()} storefront experiences.`,
      location: "Phnom Penh, Cambodia",
    },
  };
});

mockTemplates.push(...generatedTemplates);

export const mockReviews: TemplateReview[] = [
  {
    id: "r-001",
    templateId: "t-re-001",
    author: "Sokha V.",
    role: "Agency Owner",
    rating: 5,
    dateLabel: "2 days ago",
    comment: "The listing layout felt premium immediately and our demo inquiries improved after launch.",
  },
  {
    id: "r-002",
    templateId: "t-re-001",
    author: "Dara N.",
    role: "Marketing Lead",
    rating: 5,
    dateLabel: "Last week",
    comment: "Strong bilingual structure and easy sections for featured villas and neighborhood details.",
  },
  {
    id: "r-003",
    templateId: "t-pt-001",
    author: "Malis K.",
    role: "Designer",
    rating: 5,
    dateLabel: "3 days ago",
    comment: "The storytelling flow is clean and modern. Great baseline for a creative portfolio site.",
  },
  {
    id: "r-004",
    templateId: "t-ec-001",
    author: "Vannak T.",
    role: "Store Founder",
    rating: 5,
    dateLabel: "Yesterday",
    comment: "This feels closest to a real launch-ready online store. Mobile layout is especially strong.",
  },
  {
    id: "r-005",
    templateId: "t-ec-001",
    author: "Nika P.",
    role: "Brand Manager",
    rating: 4,
    dateLabel: "This week",
    comment: "Fast to customize and the structure for promotions and product cards is very useful.",
  },
  {
    id: "r-006",
    templateId: "t-wd-001",
    author: "Sreypov L.",
    role: "Event Planner",
    rating: 5,
    dateLabel: "2 weeks ago",
    comment: "Elegant and easy to personalize. Perfect for a polished invitation microsite.",
  },
];

export function getVendorBySlug(vendorSlug: string) {
  return mockTemplates.find((template) => template.vendor.slug === vendorSlug)?.vendor ?? null;
}

export function getTemplatesByVendorSlug(vendorSlug: string) {
  return mockTemplates.filter((template) => template.vendor.slug === vendorSlug);
}

export function getReviewsByTemplateId(templateId: string) {
  return mockReviews.filter((review) => review.templateId === templateId);
}
