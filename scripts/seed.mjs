/**
 * Phase 2 seed script — categories + store settings
 * Run: node scripts/seed.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "real-estate",
    title: "Real Estate",
    description: "Professional templates for real estate agencies, property listings, and agents.",
    icon_slug: "building-2",
    display_order: 1,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "portfolio",
    title: "Portfolio",
    description: "Clean, modern portfolio templates for designers, developers, and creatives.",
    icon_slug: "layout-dashboard",
    display_order: 2,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "e-commerce",
    title: "E-Commerce",
    description: "Full-featured online store templates ready for launch.",
    icon_slug: "shopping-bag",
    display_order: 3,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    slug: "wedding",
    title: "Wedding",
    description: "Elegant wedding and event templates for couples and planners.",
    icon_slug: "heart",
    display_order: 4,
  },
];

// ─── Store Settings ───────────────────────────────────────────────────────────
const storeSettings = [
  { key: "store_name", value: "Analite Kit" },
  { key: "store_tagline", value: "Premium Template Marketplace" },
  { key: "default_currency", value: "USD" },
  { key: "aba_enabled", value: "true" },
  { key: "bakong_enabled", value: "true" },
  { key: "maintenance_mode", value: "false" },
  { key: "featured_template_ids", value: "[]" },
  { key: "support_email", value: "support@analite.store" },
  { key: "vendor_email", value: "vendors@analite.store" },
  { key: "billing_email", value: "billing@analite.store" },
];

async function seed() {
  console.log("Seeding categories...");
  for (const cat of categories) {
    await sql`
      INSERT INTO categories (id, slug, title, description, icon_slug, display_order)
      VALUES (${cat.id}, ${cat.slug}, ${cat.title}, ${cat.description}, ${cat.icon_slug}, ${cat.display_order})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        icon_slug = EXCLUDED.icon_slug,
        display_order = EXCLUDED.display_order
    `;
    console.log(" ✓", cat.title);
  }

  console.log("\nSeeding store settings...");
  for (const setting of storeSettings) {
    await sql`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES (${setting.key}, ${setting.value}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `;
    console.log(" ✓", setting.key, "=", setting.value);
  }

  console.log("\nSeed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
}).finally(() => sql.end());
