import { eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, pageViews, purchases, templates, transactions, users } from "@/lib/db/schema";

export type DashboardAnalytics = {
  totalRevenueUsd: number;
  totalOrders: number;
  avgOrderValueUsd: number;
  conversionRatePct: number;
  totalCustomers: number;
  totalPageViews: number;
  topCategory: string;
  topCategoryRevenueUsd: number;
  fastestGrowingCategory: string;
  fastestGrowthPct: number;
  repeatBuyerRatePct: number;
  revenueByDay: Array<{
    label: string;
    value: number;
    change: number;
    changeDirection: "up" | "down";
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    percentage: number;
    value: number;
  }>;
  paymentMethods: Array<{
    name: string;
    amount: number;
    percentage: number;
    transactions: number;
    trend: string;
  }>;
  totalRefunds: number;
  refundRatePct: number;
  avgTransactionUsd: number;
  totalTransactions: number;
};

const DAY_MS = 86_400_000;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function dayKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function providerLabel(provider: string): string {
  const normalized = provider.toLowerCase();
  if (normalized.includes("aba")) return "ABA PayWay";
  if (normalized.includes("bakong") || normalized.includes("khqr")) return "Bakong KHQR";
  return provider.toUpperCase();
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  if (!db) {
    return {
      totalRevenueUsd: 0,
      totalOrders: 0,
      avgOrderValueUsd: 0,
      conversionRatePct: 0,
      totalCustomers: 0,
      totalPageViews: 0,
      topCategory: "No data",
      topCategoryRevenueUsd: 0,
      fastestGrowingCategory: "No data",
      fastestGrowthPct: 0,
      repeatBuyerRatePct: 0,
      revenueByDay: [],
      topProducts: [],
      categoryDistribution: [],
      paymentMethods: [],
      totalRefunds: 0,
      refundRatePct: 0,
      avgTransactionUsd: 0,
      totalTransactions: 0,
    };
  }

  const now = new Date();
  const start7 = new Date(now.getTime() - 7 * DAY_MS);
  const start14 = new Date(now.getTime() - 14 * DAY_MS);
  const start30 = new Date(now.getTime() - 30 * DAY_MS);
  const start60 = new Date(now.getTime() - 60 * DAY_MS);

  const [
    allTransactions,
    completedTransactions,
    recentPageViews,
    allTemplates,
    allCategories,
    completedPurchases,
    recentUsers,
  ] = await Promise.all([
    db
      .select({
        id: transactions.id,
        status: transactions.status,
        amount: transactions.amount,
        provider: transactions.provider,
        templateId: transactions.templateId,
        createdAt: transactions.createdAt,
        userEmail: transactions.userEmail,
      })
      .from(transactions),
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        provider: transactions.provider,
        templateId: transactions.templateId,
        createdAt: transactions.createdAt,
        userEmail: transactions.userEmail,
      })
      .from(transactions)
      .where(eq(transactions.status, "completed")),
    db
      .select({ createdAt: pageViews.createdAt })
      .from(pageViews)
      .where(gte(pageViews.createdAt, start60)),
    db
      .select({
        id: templates.id,
        title: templates.title,
        category: templates.category,
        categoryId: templates.categoryId,
      })
      .from(templates),
    db
      .select({ id: categories.id, title: categories.title })
      .from(categories),
    db
      .select({ userId: purchases.userId })
      .from(purchases)
      .where(eq(purchases.status, "COMPLETED")),
    db
      .select({ createdAt: users.createdAt, role: users.role })
      .from(users)
      .where(gte(users.createdAt, start60)),
  ]);

  const totalTransactions = allTransactions.length;
  const totalOrders = completedTransactions.length;
  const totalRevenueUsd = completedTransactions.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const avgOrderValueUsd = totalOrders > 0 ? totalRevenueUsd / totalOrders : 0;

  const pageViewsLast30 = recentPageViews.filter((row) => row.createdAt && row.createdAt >= start30).length;
  const pageViewsPrev30 = recentPageViews.filter(
    (row) => row.createdAt && row.createdAt >= start60 && row.createdAt < start30,
  ).length;
  const totalPageViews = recentPageViews.length;
  const conversionRatePct = totalPageViews > 0 ? (totalOrders / totalPageViews) * 100 : 0;

  const customerEmailSet = new Set(completedTransactions.map((row) => row.userEmail));
  const totalCustomers = customerEmailSet.size;

  const categoryById = new Map(allCategories.map((item) => [item.id, item.title]));
  const templateById = new Map(
    allTemplates.map((item) => {
      const categoryName = item.categoryId ? (categoryById.get(item.categoryId) ?? item.category) : item.category;
      return [
        item.id,
        {
          title: item.title,
          category: categoryName,
        },
      ] as const;
    }),
  );

  const revenueByCategory = new Map<string, number>();
  const categorySalesCurrent7 = new Map<string, number>();
  const categorySalesPrev7 = new Map<string, number>();
  const productAgg = new Map<string, { name: string; sales: number; revenue: number }>();
  const paymentCurrent30 = new Map<string, { amount: number; count: number }>();
  const paymentPrev30 = new Map<string, { amount: number; count: number }>();
  const revenueCurrent7ByDay = new Map<string, number>();

  for (const row of completedTransactions) {
    const amount = toNumber(row.amount);
    const createdAt = row.createdAt ? new Date(row.createdAt) : now;
    const template = templateById.get(row.templateId);
    const category = template?.category ?? "Uncategorized";

    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + amount);

    if (createdAt >= start7) {
      categorySalesCurrent7.set(category, (categorySalesCurrent7.get(category) ?? 0) + 1);
      const key = dayKey(createdAt);
      revenueCurrent7ByDay.set(key, (revenueCurrent7ByDay.get(key) ?? 0) + amount);
    } else if (createdAt >= start14) {
      categorySalesPrev7.set(category, (categorySalesPrev7.get(category) ?? 0) + 1);
    }

    const productName = template?.title ?? "Unknown Template";
    const existingProduct = productAgg.get(row.templateId);
    if (existingProduct) {
      existingProduct.sales += 1;
      existingProduct.revenue += amount;
    } else {
      productAgg.set(row.templateId, { name: productName, sales: 1, revenue: amount });
    }

    if (createdAt >= start30) {
      const provider = providerLabel(row.provider);
      const existingProvider = paymentCurrent30.get(provider);
      if (existingProvider) {
        existingProvider.amount += amount;
        existingProvider.count += 1;
      } else {
        paymentCurrent30.set(provider, { amount, count: 1 });
      }
    } else if (createdAt >= start60) {
      const provider = providerLabel(row.provider);
      const existingProvider = paymentPrev30.get(provider);
      if (existingProvider) {
        existingProvider.amount += amount;
        existingProvider.count += 1;
      } else {
        paymentPrev30.set(provider, { amount, count: 1 });
      }
    }
  }

  const topCategoryEntry = [...revenueByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCategoryEntry?.[0] ?? "No data";
  const topCategoryRevenueUsd = topCategoryEntry?.[1] ?? 0;

  let fastestGrowingCategory = "No data";
  let fastestGrowthPct = 0;
  const allGrowthCategories = new Set([...categorySalesCurrent7.keys(), ...categorySalesPrev7.keys()]);
  for (const category of allGrowthCategories) {
    const current = categorySalesCurrent7.get(category) ?? 0;
    const previous = categorySalesPrev7.get(category) ?? 0;
    const growth = pctChange(current, previous);
    if (growth > fastestGrowthPct) {
      fastestGrowthPct = growth;
      fastestGrowingCategory = category;
    }
  }

  const purchasesByUser = new Map<string, number>();
  for (const row of completedPurchases) {
    purchasesByUser.set(row.userId, (purchasesByUser.get(row.userId) ?? 0) + 1);
  }
  const repeatBuyerCount = [...purchasesByUser.values()].filter((count) => count > 1).length;
  const repeatBuyerRatePct = purchasesByUser.size > 0 ? (repeatBuyerCount / purchasesByUser.size) * 100 : 0;

  const revenueByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start7.getTime() + index * DAY_MS);
    const key = dayKey(date);
    const value = revenueCurrent7ByDay.get(key) ?? 0;
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      value,
    };
  }).map((day, idx, arr) => {
    const previous = idx === 0 ? 0 : arr[idx - 1].value;
    const raw = pctChange(day.value, previous);
    return {
      label: day.label,
      value: Number(day.value.toFixed(2)),
      change: Number(raw.toFixed(1)),
      changeDirection: raw >= 0 ? ("up" as const) : ("down" as const),
    };
  });

  const topProducts = [...productAgg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      sales: item.sales,
      revenue: Number(item.revenue.toFixed(2)),
    }));

  const categoryDistribution = [...revenueByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({
      name,
      percentage: totalRevenueUsd > 0 ? Number(((value / totalRevenueUsd) * 100).toFixed(1)) : 0,
      value: Number(value.toFixed(2)),
    }));

  const paymentMethods = [...paymentCurrent30.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, current]) => {
      const previous = paymentPrev30.get(name)?.amount ?? 0;
      const trendValue = pctChange(current.amount, previous);
      return {
        name,
        amount: Number(current.amount.toFixed(2)),
        percentage: totalRevenueUsd > 0 ? Number(((current.amount / totalRevenueUsd) * 100).toFixed(1)) : 0,
        transactions: current.count,
        trend: `${trendValue >= 0 ? "+" : ""}${trendValue.toFixed(1)}%`,
      };
    });

  // Refund pipeline is not modeled yet in the current schema.
  const totalRefunds = 0;
  const refundRatePct = 0;
  const avgTransactionUsd = totalTransactions > 0
    ? allTransactions.reduce((sum, row) => sum + toNumber(row.amount), 0) / totalTransactions
    : 0;

  void pageViewsPrev30;
  void recentUsers;

  return {
    totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
    totalOrders,
    avgOrderValueUsd: Number(avgOrderValueUsd.toFixed(2)),
    conversionRatePct: Number(conversionRatePct.toFixed(2)),
    totalCustomers,
    totalPageViews,
    topCategory,
    topCategoryRevenueUsd: Number(topCategoryRevenueUsd.toFixed(2)),
    fastestGrowingCategory,
    fastestGrowthPct: Number(fastestGrowthPct.toFixed(1)),
    repeatBuyerRatePct: Number(repeatBuyerRatePct.toFixed(1)),
    revenueByDay,
    topProducts,
    categoryDistribution,
    paymentMethods,
    totalRefunds,
    refundRatePct,
    avgTransactionUsd: Number(avgTransactionUsd.toFixed(2)),
    totalTransactions,
  };
}
