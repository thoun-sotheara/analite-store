import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import { resolveRoleFromEmail } from "@/lib/auth/role";

export async function requireAdminRoute() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; email?: string } | undefined;
  const resolvedRole = user?.role ?? resolveRoleFromEmail(user?.email ?? "");
  if (!user || resolvedRole !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
  };
}
