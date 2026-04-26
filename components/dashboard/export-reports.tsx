"use client";

import { FileText, Download, Mail, Calendar } from "lucide-react";
import { useState } from "react";

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

  const handleExport = (format: "pdf" | "csv") => {
    console.log(`Exporting ${selectedReport} as ${format}`);
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Download className="h-5 w-5" /> Export & Reports
        </h3>
        <p className="mt-1 text-sm text-muted">Generate custom reports and export data</p>
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
              onClick={() => handleExport("pdf")}
              disabled={!selectedReport}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" /> Export as PDF
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={!selectedReport}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> Export as CSV
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="mt-8 rounded-lg border border-border bg-surface p-4">
        <h4 className="flex items-center gap-2 font-semibold text-foreground">
          <Calendar className="h-4 w-4" /> Scheduled Reports
        </h4>
        <p className="mt-2 text-sm text-muted">
          Set up automatic reports to be sent to your email daily, weekly, or monthly.
        </p>
        <button className="mt-4 flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground">
          <Mail className="h-4 w-4" /> Configure Email Reports
        </button>
      </div>
    </div>
  );
}
