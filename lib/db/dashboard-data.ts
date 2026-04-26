import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  purchases,
  reviews,
  supportTickets,
  templates,
  transactions,
  users,
  vendorProfiles,
} from "@/lib/db/schema";

const DAY_MS = 86_400_000;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function toIsoDay(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function formatRelative(input: Date): string {
  const deltaMs = Date.now() - input.getTime();
  const mins = Math.floor(deltaMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export type DashboardStats = {
  totalRevenueUsd: number;
  totalOrders: number;
  totalUsers: number;
  totalTemplates: number;
};

export type DashboardRevenueChart = {
  daily: Array<{ date: string; revenue: number; orders: number }>;
  byCategory: Array<{ category: string; revenue: number; orders: number }>;
  byProvider: Array<{ provider: string; revenue: number; orders: number }>;
};

export type DashboardTopProduct = {
  templateId: string;
  title: string;
  revenue: number;
  orders: number;
  downloads: number;
};

export type DashboardCustomers = {
  totalCustomers: number;
  repeatBuyers: number;
  recentSignups: number;
  recentCustomers: Array<{
    userId: string;
    name: string;
    email: string;
    purchases: number;
    totalSpent: number;
    joinDate: string;
    status: "active" | "new";
  }>;
};

export type DashboardActivityEvent = {
  id: string;
  type: "sale" | "support" | "review";
  title: string;
  description: string;
  timestamp: string;
};

export type DashboardInventoryItem = {
  id: string;
  name: string;
  category: string;
  views: number;
  downloads: number;
  rating: number;
  revenue: number;
  status: "active" | "inactive";
};

export type DashboardVendorRow = {
  id: string;
  email: string;
  name: string;
  slug: string | null;
  productCount: number;
  totalRevenueUsd: number;
  isVerified: boolean;
  createdAt: string;
};

export type DashboardRevenueBreakdown = {
  providers: Array<{ provider: string; revenue: number; orders: number; percentage: number }>;
  totalRevenueUsd: number;
  totalTransactions: number;
  avgTransactionUsd: number;
};

export type DashboardSupport = {
  openTickets: number;
  recentTickets: Array<{
    id: string;
    email: string;
    subject: string;
    status: string;
    createdAt: string;
  }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!db) {
    return { totalRevenueUsd: 0, totalOrders: 0, totalUsers: 0, totalTemplates: 0 };
  }

  const [completedTransactions, allUsers, allTemplates] = await Promise.all([
    db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(eq(transactions.status, "completed")),
    db.select({ id: users.id }).from(users),
    db.select({ id: templates.id }).from(templates),
  ]);

  const totalRevenueUsd = completedTransactions.reduce((sum, row) => sum + toNumber(row.amount), 0);

  return {
    totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
    totalOrders: completedTransactions.length,
    totalUsers: allUsers.length,
    totalTemplates: allTemplates.length,
  };
}

export async function getDashboardRevenueChart(): Promise<DashboardRevenueChart> {
  if (!db) {
    return { daily: [], byCategory: [], byProvider: [] };
  }

  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * DAY_MS);

  const [recentTransactions, templateRows] = await Promise.all([
    db
      .select({
        amount: transactions.amount,
        provider: transactions.provider,
        createdAt: transactions.createdAt,
        templateId: transactions.templateId,
      })
      .from(transactions)
      .where(and(eq(transactions.status, "completed"), gte(transactions.createdAt, start30))),
    db.select({ id: templates.id, category: templates.category }).from(templates),
  ]);

  const categoryByTemplateId = new Map(templateRows.map((row) => [row.id, row.category]));

  const dailyAgg = new Map<string, { revenue: number; orders: number }>();
  const categoryAgg = new Map<string, { revenue: number; orders: number }>();
  const providerAgg = new Map<string, { revenue: number; orders: number }>();

  for (const row of recentTransactions) {
    const amount = toNumber(row.amount);
    const createdAt = row.createdAt ? new Date(row.createdAt) : now;

    const day = toIsoDay(createdAt);
    const dayItem = dailyAgg.get(day) ?? { revenue: 0, orders: 0 };
    dayItem.revenue += amount;
    dayItem.orders += 1;
    dailyAgg.set(day, dayItem);

    const category = categoryByTemplateId.get(row.templateId) ?? "Uncategorized";
    const categoryItem = categoryAgg.get(category) ?? { revenue: 0, orders: 0 };
    categoryItem.revenue += amount;
    categoryItem.orders += 1;
    categoryAgg.set(category, categoryItem);

    const provider = row.provider.toUpperCase();
    const providerItem = providerAgg.get(provider) ?? { revenue: 0, orders: 0 };
    providerItem.revenue += amount;
    providerItem.orders += 1;
    providerAgg.set(provider, providerItem);
  }

  const daily = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(start30.getTime() + i * DAY_MS);
    const key = toIsoDay(date);
    const item = dailyAgg.get(key) ?? { revenue: 0, orders: 0 };
    return {
      date: key,
      revenue: Number(item.revenue.toFixed(2)),
      orders: item.orders,
    };
  });

  const byCategory = [...categoryAgg.entries()]
    .map(([category, item]) => ({
      category,
      revenue: Number(item.revenue.toFixed(2)),
      orders: item.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const byProvider = [...providerAgg.entries()]
    .map(([provider, item]) => ({
      provider,
      revenue: Number(item.revenue.toFixed(2)),
      orders: item.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { daily, byCategory, byProvider };
}

export async function getDashboardTopProducts(): Promise<DashboardTopProduct[]> {
  if (!db) {
    return [];
  }

  const [templateRows, completedTransactions] = await Promise.all([
    db
      .select({
        id: templates.id,
        title: templates.title,
        downloads: templates.downloadCount,
      })
      .from(templates),
    db
      .select({
        templateId: transactions.templateId,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(eq(transactions.status, "completed")),
  ]);

  const productMap = new Map<string, DashboardTopProduct>(
    templateRows.map((row) => [
      row.id,
      {
        templateId: row.id,
        title: row.title,
        revenue: 0,
        orders: 0,
        downloads: row.downloads,
      },
    ]),
  );

  for (const row of completedTransactions) {
    const product = productMap.get(row.templateId);
    if (!product) continue;
    product.revenue += toNumber(row.amount);
    product.orders += 1;
  }

  return [...productMap.values()]
    .sort((a, b) => (b.revenue === a.revenue ? b.downloads - a.downloads : b.revenue - a.revenue))
    .slice(0, 5)
    .map((item) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) }));
}

export async function getDashboardCustomers(): Promise<DashboardCustomers> {
  if (!db) {
    return {
      totalCustomers: 0,
      repeatBuyers: 0,
      recentSignups: 0,
      recentCustomers: [],
    };
  }

  const start30 = new Date(Date.now() - 30 * DAY_MS);

  const [userRows, completedPurchases] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users),
    db
      .select({
        userId: purchases.userId,
        paidAmount: purchases.paidAmount,
      })
      .from(purchases)
      .where(eq(purchases.status, "COMPLETED")),
  ]);

  const purchasesByUser = new Map<string, { count: number; totalSpent: number }>();
  for (const row of completedPurchases) {
    const entry = purchasesByUser.get(row.userId) ?? { count: 0, totalSpent: 0 };
    entry.count += 1;
    entry.totalSpent += toNumber(row.paidAmount);
    purchasesByUser.set(row.userId, entry);
  }

  const totalCustomers = purchasesByUser.size;
  const repeatBuyers = [...purchasesByUser.values()].filter((item) => item.count > 1).length;
  const recentSignups = userRows.filter((user) => user.createdAt >= start30).length;

  const recentCustomers = userRows
    .filter((user) => purchasesByUser.has(user.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((user) => {
      const agg = purchasesByUser.get(user.id) ?? { count: 0, totalSpent: 0 };
      return {
        userId: user.id,
        name: user.name ?? user.email.split("@")[0],
        email: user.email,
        purchases: agg.count,
        totalSpent: Number(agg.totalSpent.toFixed(2)),
        joinDate: user.createdAt.toISOString(),
        status: user.createdAt >= start30 ? ("new" as const) : ("active" as const),
      };
    });

  return {
    totalCustomers,
    repeatBuyers,
    recentSignups,
    recentCustomers,
  };
}

export async function getDashboardActivity(): Promise<DashboardActivityEvent[]> {
  if (!db) {
    return [];
  }

  const [purchaseRows, reviewRows, ticketRows, templateRows, userRows] = await Promise.all([
    db
      .select({
        id: purchases.id,
        userId: purchases.userId,
        templateId: purchases.templateId,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .where(eq(purchases.status, "COMPLETED"))
      .orderBy(desc(purchases.createdAt))
      .limit(20),
    db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        templateId: reviews.templateId,
        rating: reviews.rating,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(20),
    db
      .select({
        id: supportTickets.id,
        userEmail: supportTickets.userEmail,
        subject: supportTickets.subject,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
      })
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt))
      .limit(20),
    db.select({ id: templates.id, title: templates.title }).from(templates),
    db.select({ id: users.id, email: users.email, name: users.name }).from(users),
  ]);

  const templateTitleById = new Map(templateRows.map((row) => [row.id, row.title]));
  const userById = new Map(userRows.map((row) => [row.id, row]));

  const salesEvents = purchaseRows.map((row) => {
    const user = userById.get(row.userId);
    const templateName = templateTitleById.get(row.templateId) ?? "template";
    return {
      createdAtMs: row.createdAt.getTime(),
      id: `sale-${row.id}`,
      type: "sale" as const,
      title: "Sale completed",
      description: `${user?.name ?? user?.email ?? "A customer"} purchased ${templateName}`,
      timestamp: formatRelative(row.createdAt),
    };
  });

  const reviewEvents = reviewRows.map((row) => {
    const user = userById.get(row.userId);
    const templateName = templateTitleById.get(row.templateId) ?? "template";
    return {
      createdAtMs: row.createdAt.getTime(),
      id: `review-${row.id}`,
      type: "review" as const,
      title: "New review submitted",
      description: `${user?.name ?? user?.email ?? "A customer"} left ${row.rating}/5 on ${templateName}`,
      timestamp: formatRelative(row.createdAt),
    };
  });

  const supportEvents = ticketRows.map((row) => ({
    createdAtMs: row.createdAt.getTime(),
    id: `support-${row.id}`,
    type: "support" as const,
    title: "Support ticket update",
    description: `${row.userEmail}: ${row.subject} (${row.status.replace("_", " ")})`,
    timestamp: formatRelative(row.createdAt),
  }));

  return [...salesEvents, ...reviewEvents, ...supportEvents]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 20)
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      timestamp: item.timestamp,
    }));
}

export async function getDashboardInventory(): Promise<DashboardInventoryItem[]> {
  if (!db) {
    return [];
  }

  const [templateRows, completedTransactions, reviewRows] = await Promise.all([
    db
      .select({
        id: templates.id,
        title: templates.title,
        category: templates.category,
        viewCount: templates.viewCount,
        downloadCount: templates.downloadCount,
        isActive: templates.isActive,
      })
      .from(templates),
    db
      .select({ templateId: transactions.templateId, amount: transactions.amount })
      .from(transactions)
      .where(eq(transactions.status, "completed")),
    db
      .select({ templateId: reviews.templateId, rating: reviews.rating })
      .from(reviews)
      .where(eq(reviews.isVisible, true)),
  ]);

  const revenueByTemplate = new Map<string, number>();
  for (const row of completedTransactions) {
    revenueByTemplate.set(row.templateId, (revenueByTemplate.get(row.templateId) ?? 0) + toNumber(row.amount));
  }

  const ratingsByTemplate = new Map<string, { sum: number; count: number }>();
  for (const row of reviewRows) {
    const current = ratingsByTemplate.get(row.templateId) ?? { sum: 0, count: 0 };
    current.sum += toNumber(row.rating);
    current.count += 1;
    ratingsByTemplate.set(row.templateId, current);
  }

  return templateRows
    .map((row) => {
      const ratingAgg = ratingsByTemplate.get(row.id);
      const rating = ratingAgg && ratingAgg.count > 0 ? ratingAgg.sum / ratingAgg.count : 0;
      return {
        id: row.id,
        name: row.title,
        category: row.category,
        views: row.viewCount,
        downloads: row.downloadCount,
        rating: Number(rating.toFixed(1)),
        revenue: Number((revenueByTemplate.get(row.id) ?? 0).toFixed(2)),
        status: row.isActive ? ("active" as const) : ("inactive" as const),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getDashboardVendors(): Promise<DashboardVendorRow[]> {
  if (!db) {
    return [];
  }

  const [vendorUsers, profileRows, templateRows, completedTransactions] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        slug: users.slug,
        isVendorVerified: users.isVendorVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "VENDOR")),
    db.select({ userId: vendorProfiles.userId, slug: vendorProfiles.slug }).from(vendorProfiles),
    db.select({ id: templates.id, vendorId: templates.vendorId }).from(templates),
    db
      .select({ templateId: transactions.templateId, amount: transactions.amount })
      .from(transactions)
      .where(eq(transactions.status, "completed")),
  ]);

  const vendorIdByTemplateId = new Map(
    templateRows.filter((row) => !!row.vendorId).map((row) => [row.id, row.vendorId as string]),
  );

  const templateCountByVendor = new Map<string, number>();
  for (const row of templateRows) {
    if (!row.vendorId) continue;
    templateCountByVendor.set(row.vendorId, (templateCountByVendor.get(row.vendorId) ?? 0) + 1);
  }

  const revenueByVendor = new Map<string, number>();
  for (const row of completedTransactions) {
    const vendorId = vendorIdByTemplateId.get(row.templateId);
    if (!vendorId) continue;
    revenueByVendor.set(vendorId, (revenueByVendor.get(vendorId) ?? 0) + toNumber(row.amount));
  }

  const profileByUserId = new Map(profileRows.map((row) => [row.userId, row]));

  return vendorUsers
    .map((vendor) => {
      const profile = profileByUserId.get(vendor.id);
      return {
        id: vendor.id,
        email: vendor.email,
        name: vendor.name ?? vendor.email.split("@")[0],
        slug: vendor.slug ?? profile?.slug ?? null,
        productCount: templateCountByVendor.get(vendor.id) ?? 0,
        totalRevenueUsd: Number((revenueByVendor.get(vendor.id) ?? 0).toFixed(2)),
        isVerified: vendor.isVendorVerified,
        createdAt: vendor.createdAt.toISOString(),
      };
    })
    .sort((a, b) => b.totalRevenueUsd - a.totalRevenueUsd);
}

export async function getDashboardRevenueBreakdown(): Promise<DashboardRevenueBreakdown> {
  if (!db) {
    return {
      providers: [],
      totalRevenueUsd: 0,
      totalTransactions: 0,
      avgTransactionUsd: 0,
    };
  }

  const completedTransactions = await db
    .select({ amount: transactions.amount, provider: transactions.provider })
    .from(transactions)
    .where(eq(transactions.status, "completed"));

  const totalRevenueUsd = completedTransactions.reduce((sum, row) => sum + toNumber(row.amount), 0);

  const byProvider = new Map<string, { revenue: number; orders: number }>();
  for (const row of completedTransactions) {
    const provider = row.provider.toUpperCase();
    const current = byProvider.get(provider) ?? { revenue: 0, orders: 0 };
    current.revenue += toNumber(row.amount);
    current.orders += 1;
    byProvider.set(provider, current);
  }

  const providers = [...byProvider.entries()]
    .map(([provider, item]) => ({
      provider,
      revenue: Number(item.revenue.toFixed(2)),
      orders: item.orders,
      percentage: totalRevenueUsd > 0 ? Number(((item.revenue / totalRevenueUsd) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    providers,
    totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
    totalTransactions: completedTransactions.length,
    avgTransactionUsd: completedTransactions.length > 0
      ? Number((totalRevenueUsd / completedTransactions.length).toFixed(2))
      : 0,
  };
}

export async function getDashboardSupport(): Promise<DashboardSupport> {
  if (!db) {
    return { openTickets: 0, recentTickets: [] };
  }

  const recentTickets = await db
    .select({
      id: supportTickets.id,
      email: supportTickets.userEmail,
      subject: supportTickets.subject,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .orderBy(desc(supportTickets.createdAt))
    .limit(10);

  const openStatuses = ["new", "in_review"] as const;
  const openRows = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(inArray(supportTickets.status, openStatuses));

  return {
    openTickets: openRows.length,
    recentTickets: recentTickets.map((row) => ({
      id: row.id,
      email: row.email,
      subject: row.subject,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
