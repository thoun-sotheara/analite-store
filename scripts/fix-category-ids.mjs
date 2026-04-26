import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// Delete all categories (no FK dependencies since there are 0 templates)
// then re-insert so gen_random_uuid() generates proper RFC-compliant UUIDs
await sql`DELETE FROM categories`;

const rows = await sql`
  INSERT INTO categories (slug, title, description, icon_slug, display_order) VALUES
  ('real-estate','Real Estate','Property listing and agency templates','building-2',1),
  ('portfolio','Portfolio','Personal and creative portfolio templates','layout-dashboard',2),
  ('e-commerce','E-Commerce','Online store and product listing templates','shopping-bag',3),
  ('wedding','Wedding','Wedding invitation and event templates','heart',4),
  ('saas','SaaS','Software as a service landing pages',null,5),
  ('education','Education','Course, school, and learning platform templates',null,6),
  ('restaurant','Restaurant','Food, cafe, and restaurant menu templates',null,7),
  ('blog','Blog','Blog, news, and article site templates',null,8),
  ('agency','Agency','Digital agency and studio templates',null,9),
  ('healthcare','Healthcare','Medical, clinic, and wellness templates',null,10)
  RETURNING id, slug
`;

console.log("Fixed category UUIDs:");
rows.forEach(r => console.log(` ${r.slug}: ${r.id}`));
