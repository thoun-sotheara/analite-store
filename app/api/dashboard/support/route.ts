import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin";
import { getDashboardSupport } from "@/lib/db/dashboard-data";

export async function GET() {
  const gate = await requireAdminRoute();
  if (!gate.ok) return gate.response;

  const payload = await getDashboardSupport();
  return NextResponse.json(payload);
}
