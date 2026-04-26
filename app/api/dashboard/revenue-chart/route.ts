import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin";
import { getDashboardRevenueChart } from "@/lib/db/dashboard-data";

export async function GET() {
  const gate = await requireAdminRoute();
  if (!gate.ok) return gate.response;

  const payload = await getDashboardRevenueChart();
  return NextResponse.json(payload);
}
