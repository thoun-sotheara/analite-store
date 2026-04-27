"use client";

import { FileText, Download, Mail, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

type ReportType = {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
};

const reportTypes: ReportType[] = [
  {
    id: "sales",
    name: "Sales Report",
    description: "Detailed sales metrics, revenue trends, top products",
    icon: FileText,
  },
  {
    id: "customer",
    name: "Customer Report",
    description: "Customer acquisition, retention, lifetime value",
    icon: FileText,
  },
  {
    id: "vendor",
    name: "Vendor Report",
    description: "Vendor performance, ratings, commission payouts",
    icon: FileText,
  },
  {
    id: "payment",
    name: "Payment Report",
    description: "Payment methods, transaction details, refunds",
    icon: FileText,
  },
];

export function ExportReports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("last-30");
  const [statusMessage, setStatusMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState("weekly");
  const [scheduleReport, setScheduleReport] = useState("sales");
  const [scheduledReports, setScheduledReports] = useState<Array<{ id: string; email: string; frequency: string; report: string }>>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("analite_scheduled_reports");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Array<{ id: string; email: string; frequency: string; report: string }>;
      if (Array.isArray(parsed)) {
        setScheduledReports(parsed);
      }
    } catch {
      setScheduledReports([]);
    }
  }, []);

  function saveSchedules(next: Array<{ id: string; email: string; frequency: string; report: string }>) {
    setScheduledReports(next);
    window.localStorage.setItem("analite_scheduled_reports", JSON.stringify(next));
  }

  function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
    const header = columns.join(",");
    const lines = rows.map((row) => columns.map((key) => {
      const raw = row[key];
      const value = raw == null ? "" : String(raw);
      return `"${value.replace(/"/g, '""')}"`;
    }).join(","));

    return [header, ...lines].join("\n");
  }

  function triggerFileDownload(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printReportAsPdf(columns: string[], rows: Array<Record<string, unknown>>, title: string) {
    const popup = window.open("", "_blank", "width=1000,height=700");
    if (!popup) {
      setStatusMessage("Popup blocked. Allow popups to export PDF.");
      return;
    }

    const tableHead = columns.map((column) => `<th>${column}</th>`).join("");
    const tableRows = rows
      .map((row) => `<tr>${columns.map((column) => `<td>${String(row[column] ?? "")}</td>`).join("")}</tr>`)
      .join("");

    popup.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1 { margin-bottom: 8px; }
            p { color: #6b7280; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead><tr>${tableHead}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  async function handleExport(format: "pdf" | "csv") {
    if (!selectedReport) {
      return;
    }

    setStatusMessage("");
    setIsExporting(true);
    try {
      const response = await fetch(`/api/dashboard/reports?type=${selectedReport}&range=${dateRange}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        rows?: Array<Record<string, unknown>>;
        columns?: string[];
        filename?: string;
        error?: string;
      };

      if (!response.ok || !payload.rows || !payload.columns || !payload.filename) {
        setStatusMessage(payload.error ?? "Unable to generate report.");
        return;
      }

      if (format === "csv") {
        const csv = toCsv(payload.rows, payload.columns);
        triggerFileDownload(csv, `${payload.filename}.csv`, "text/csv;charset=utf-8;");
      } else {
        const reportName = reportTypes.find((report) => report.id === selectedReport)?.name ?? "Dashboard Report";
        printReportAsPdf(payload.columns, payload.rows, `${reportName} (${dateRange})`);
      }

      setStatusMessage(`Report exported as ${format.toUpperCase()}.`);
    } catch {
      setStatusMessage("Unable to generate report.");
    } finally {
      setIsExporting(false);
    }
  }

  function addSchedule() {
    const normalizedEmail = scheduleEmail.trim();
    if (!normalizedEmail) {
      setStatusMessage("Enter an email to schedule reports.");
      return;
    }

    const next = [
      {
        id: `${Date.now()}`,
        email: normalizedEmail,
        frequency: scheduleFrequency,
        report: scheduleReport,
      },
      ...scheduledReports,
    ];

    saveSchedules(next);
    setStatusMessage("Scheduled report saved.");
    setScheduleEmail("");
  }

  function removeSchedule(id: string) {
    const next = scheduledReports.filter((item) => item.id !== id);
    saveSchedules(next);
  }

  return (
    <div id="export-reports" className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6 scroll-mt-24">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Download className="h-5 w-5" /> Export & Reports
        </h3>
        <p className="mt-1 text-sm text-muted">Generate custom reports and export data</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted">
          <li>Select a report type.</li>
          <li>Choose a date range.</li>
          <li>Click Export as CSV or Export as PDF.</li>
        </ol>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Report Selection */}
        <div>
          <label className="block text-sm font-semibold text-foreground">Select Report Type</label>
          <div className="mt-3 space-y-2">
            {reportTypes.map((report) => (
              <label
                key={report.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-surface"
              >
                <input
                  type="radio"
                  name="report"
                  value={report.id}
                  checked={selectedReport === report.id}
                  onChange={() => setSelectedReport(report.id)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-medium text-foreground">{report.name}</p>
                  <p className="text-xs text-muted">{report.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div>
          <div>
            <label className="block text-sm font-semibold text-foreground">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none"
            >
              <option value="last-7">Last 7 Days</option>
              <option value="last-30">Last 30 Days</option>
              <option value="last-90">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={!selectedReport || isExporting}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" /> {isExporting ? "Preparing..." : "Export as PDF"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={!selectedReport || isExporting}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> {isExporting ? "Preparing..." : "Export as CSV"}
            </button>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">{statusMessage}</p>
      ) : null}

      {/* Scheduled Reports */}
      <div className="mt-8 rounded-lg border border-border bg-surface p-4">
        <h4 className="flex items-center gap-2 font-semibold text-foreground">
          <Calendar className="h-4 w-4" /> Scheduled Reports
        </h4>
        <p className="mt-2 text-sm text-muted">Set up automatic reports to be sent to your email daily, weekly, or monthly.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            type="email"
            value={scheduleEmail}
            onChange={(event) => setScheduleEmail(event.target.value)}
            placeholder="ops@example.com"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          <select
            value={scheduleFrequency}
            onChange={(event) => setScheduleFrequency(event.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select
            value={scheduleReport}
            onChange={(event) => setScheduleReport(event.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none"
          >
            {reportTypes.map((report) => (
              <option key={report.id} value={report.id}>{report.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={addSchedule}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
        >
          <Mail className="h-4 w-4" /> Save Schedule
        </button>

        <div className="mt-4 space-y-2">
          {scheduledReports.length === 0 ? (
            <p className="text-xs text-muted">No scheduled reports configured yet.</p>
          ) : scheduledReports.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">
                {item.report} report, {item.frequency}, sent to {item.email}
              </p>
              <button
                type="button"
                onClick={() => removeSchedule(item.id)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition hover:bg-slate-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
