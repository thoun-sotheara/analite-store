import { NextRequest, NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin";
import {
  getDashboardCustomers,
  getDashboardRevenueBreakdown,
  getDashboardRevenueChart,
  getDashboardVendors,
} from "@/lib/db/dashboard-data";

type ReportType = "sales" | "customer" | "vendor" | "payment";

function toStartDate(range: string): Date | null {
  const now = new Date();
  if (range === "last-7") return new Date(now.getTime() - 7 * 86_400_000);
  if (range === "last-30") return new Date(now.getTime() - 30 * 86_400_000);
  if (range === "last-90") return new Date(now.getTime() - 90 * 86_400_000);
  if (range === "ytd") return new Date(now.getFullYear(), 0, 1);
  return null;
}

export async function GET(request: NextRequest) {
  const gate = await requireAdminRoute();
  if (!gate.ok) {
    return gate.response;
  }

  const reportType = (request.nextUrl.searchParams.get("type") ?? "sales") as ReportType;
  const range = request.nextUrl.searchParams.get("range") ?? "last-30";
  const startDate = toStartDate(range);

  if (!["sales", "customer", "vendor", "payment"].includes(reportType)) {
    return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }

  if (reportType === "sales") {
    const chart = await getDashboardRevenueChart();
    const rows = chart.daily.filter((row) => {
      if (!startDate) return true;
      const day = new Date(`${row.date}T00:00:00.000Z`);
      return day >= startDate;
    });

    return NextResponse.json({
      reportType,
      range,
      generatedAt: new Date().toISOString(),
      rows,
      columns: ["date", "revenue", "orders"],
      filename: `sales-${range}`,
    });
  }

  if (reportType === "customer") {
    const customers = await getDashboardCustomers();
    return NextResponse.json({
      reportType,
      range,
      generatedAt: new Date().toISOString(),
      rows: customers.recentCustomers,
      columns: ["name", "email", "purchases", "totalSpent", "joinDate", "status"],
      filename: `customers-${range}`,
    });
  }

  if (reportType === "vendor") {
    const vendors = await getDashboardVendors();
    return NextResponse.json({
      reportType,
      range,
      generatedAt: new Date().toISOString(),
      rows: vendors,
      columns: ["name", "email", "slug", "productCount", "totalRevenueUsd", "isVerified", "createdAt"],
      filename: `vendors-${range}`,
    });
  }

  const breakdown = await getDashboardRevenueBreakdown();
  return NextResponse.json({
    reportType,
    range,
    generatedAt: new Date().toISOString(),
    rows: breakdown.providers,
    columns: ["provider", "revenue", "orders", "percentage"],
    filename: `payments-${range}`,
  });
}
