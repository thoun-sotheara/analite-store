import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER", "VENDOR"]);

export const purchaseStatusEnum = pgEnum("purchase_status", ["COMPLETED", "PENDING"]);

export const purchaseCurrencyEnum = pgEnum("purchase_currency", ["USD", "KHR"]);
export const reviewRatingEnum = pgEnum("review_rating", ["1", "2", "3", "4", "5"]);

export const templateCategoryEnum = pgEnum("template_category", [
  "real-estate",
  "portfolio",
  "e-commerce",
  "wedding",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 180 }),
  role: userRoleEnum("role").default("USER").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 90 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
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
  category: templateCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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

export type Template = typeof templates.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type User = typeof users.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type DownloadActivity = typeof downloadActivities.$inferSelect;
