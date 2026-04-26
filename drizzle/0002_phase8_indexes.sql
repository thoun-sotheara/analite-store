CREATE INDEX IF NOT EXISTS "templates_category_idx" ON "templates" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_vendor_id_idx" ON "templates" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_user_id_idx" ON "purchases" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_transaction_id_idx" ON "purchases" ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_template_id_idx" ON "reviews" ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wishlists_user_id_idx" ON "wishlists" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_status_created_at_idx" ON "support_tickets" ("status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_template_created_at_idx" ON "page_views" ("template_id", "created_at");