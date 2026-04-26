import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = postgres(DATABASE_URL, { prepare: false });

const DEFAULT_CATEGORIES = [
  { slug: "real-estate",  title: "Real Estate",  description: "Property listing and agency templates",          display_order: 1 },
  { slug: "portfolio",    title: "Portfolio",    description: "Personal and creative portfolio templates",      display_order: 2 },
  { slug: "e-commerce",   title: "E-Commerce",   description: "Online store and product listing templates",     display_order: 3 },
  { slug: "wedding",      title: "Wedding",      description: "Wedding invitation and event templates",         display_order: 4 },
  { slug: "saas",         title: "SaaS",         description: "Software as a service landing pages",           display_order: 5 },
  { slug: "education",    title: "Education",    description: "Course, school, and learning platform templates",display_order: 6 },
  { slug: "restaurant",   title: "Restaurant",   description: "Food, cafe, and restaurant menu templates",      display_order: 7 },
  { slug: "blog",         title: "Blog",         description: "Blog, news, and article site templates",        display_order: 8 },
  { slug: "agency",       title: "Agency",       description: "Digital agency and studio templates",           display_order: 9 },
  { slug: "healthcare",   title: "Healthcare",   description: "Medical, clinic, and wellness templates",       display_order: 10 },
];

try {
  for (const cat of DEFAULT_CATEGORIES) {
    await sql`
      INSERT INTO categories (id, slug, title, description, display_order)
      VALUES (gen_random_uuid(), ${cat.slug}, ${cat.title}, ${cat.description}, ${cat.display_order})
      ON CONFLICT (slug) DO NOTHING
    `;
  }

  const rows = await sql`SELECT slug, title FROM categories ORDER BY display_order`;
  console.log(`✓ ${rows.length} categories in DB:`);
  rows.forEach(r => console.log(`  - ${r.slug}: ${r.title}`));

  // Show templates too
  const templates = await sql`SELECT id, title, is_active FROM templates ORDER BY created_at DESC LIMIT 20`;
  console.log(`\n✓ ${templates.length} templates in DB:`);
  templates.forEach(t => console.log(`  - [${t.is_active ? 'active' : 'inactive'}] ${t.title} (${t.id})`));
} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
