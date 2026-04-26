"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  return <SessionProvider session={initialSession}>{children}</SessionProvider>;
}
