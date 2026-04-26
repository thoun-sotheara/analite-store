"use client";

export type HelpReport = {
  id: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  createdAtMs: number;
  status: "new" | "reviewed";
};

export async function appendHelpReport(report: Omit<HelpReport, "id" | "createdAt" | "createdAtMs">) {
  const res = await fetch("/api/support/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: report.email,
      subject: report.subject,
      message: report.message,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to submit support ticket");
  }
}

// No-op stub kept for backward compatibility — real-time is handled by polling in the admin UI
export function subscribeHelpReports(_callback: (reports: HelpReport[]) => void): () => void {
  return () => {};
}
