export type HelpReport = {
  id: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "new" | "reviewed";
};

export const HELP_REPORTS_KEY = "analite_help_reports_v1";

export function readHelpReports(): HelpReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HELP_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HelpReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHelpReports(reports: HelpReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HELP_REPORTS_KEY, JSON.stringify(reports));
  window.dispatchEvent(new CustomEvent("analite-help-reports-updated"));
}

export function appendHelpReport(report: HelpReport) {
  const current = readHelpReports();
  writeHelpReports([report, ...current]);
}
