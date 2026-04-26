import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER", "VENDOR"]);

export const purchaseStatusEnum = pgEnum("purchase_status", ["COMPLETED", "PENDING"]);

export const purchaseCurrencyEnum = pgEnum("purchase_currency", ["USD", "KHR"]);
export const reviewRatingEnum = pgEnum("review_rating", ["1", "2", "3", "4", "5"]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
]);

export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "new",
  "in_review",
  "resolved",
  "closed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 180 }),
  role: userRoleEnum("role").default("USER").notNull(),
  slug: varchar("slug", { length: 80 }).unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: varchar("location", { length: 120 }),
  isVendorVerified: boolean("is_vendor_verified").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authCredentials = pgTable("auth_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userEmail: varchar("user_email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userEmail: varchar("user_email", { length: 320 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 90 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  iconSlug: varchar("icon_slug", { length: 40 }),
  displayOrder: integer("display_order").default(0).notNull(),
});

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  s3Key: text("s3_key").notNull(),
  previewUrl: text("preview_url"),
  categoryId: uuid("category_id").references(() => categories.id),
  vendorId: uuid("vendor_id").references(() => users.id),
  category: varchar("category", { length: 90 }).notNull(),
  slug: varchar("slug", { length: 120 }).unique(),
  techStack: varchar("tech_stack", { length: 200 }),
  screenMockupUrl: text("screen_mockup_url"),
  galleryImage1: text("gallery_image_1"),
  galleryImage2: text("gallery_image_2"),
  galleryImage3: text("gallery_image_3"),
  galleryImage4: text("gallery_image_4"),
  documentationUrl: text("documentation_url"),
  downloadCount: integer("download_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  status: purchaseStatusEnum("status").default("PENDING").notNull(),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull(),
  currency: purchaseCurrencyEnum("currency").default("USD").notNull(),
  licenseKey: uuid("license_key").defaultRandom().notNull().unique(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  bankRef: varchar("bank_ref", { length: 120 }),
  exchangeRate: integer("exchange_rate"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userEmail: varchar("user_email", { length: 320 }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  bankRef: varchar("bank_ref", { length: 120 }).unique(),
  provider: varchar("provider", { length: 32 }).notNull(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  khqrPayload: text("khqr_payload"),
  signature: text("signature"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references(() => purchases.id),
  rating: reviewRatingEnum("rating").notNull(),
  comment: text("comment"),
  authorName: varchar("author_name", { length: 120 }),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const downloadActivities = pgTable("download_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references(() => purchases.id),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  sessionIdHash: varchar("session_id_hash", { length: 128 }).notNull(),
  downloadUrl: text("download_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vendorProfiles = pgTable("vendor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  bio: text("bio"),
  location: varchar("location", { length: 120 }),
  avatarUrl: text("avatar_url"),
  websiteUrl: text("website_url"),
  isVerified: boolean("is_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  displayName: varchar("display_name", { length: 180 }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: varchar("location", { length: 120 }),
  websiteUrl: text("website_url"),
  timezone: varchar("timezone", { length: 80 }),
  phone: varchar("phone", { length: 40 }),
  favoriteCategory: varchar("favorite_category", { length: 90 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("wishlists_user_template_unique").on(table.userId, table.templateId)],
);

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userEmail: varchar("user_email", { length: 254 }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  subject: varchar("subject", { length: 300 }).notNull(),
  message: text("message").notNull(),
  status: supportTicketStatusEnum("status").default("new").notNull(),
  adminNote: text("admin_note"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pageViews = pgTable("page_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  referrer: varchar("referrer", { length: 300 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const storeSettings = pgTable("store_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type Template = typeof templates.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type User = typeof users.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type DownloadActivity = typeof downloadActivities.$inferSelect;
export type AuthCredential = typeof authCredentials.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Wishlist = typeof wishlists.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;
export type StoreSetting = typeof storeSettings.$inferSelect;
