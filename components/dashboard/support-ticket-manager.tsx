"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MessageSquare, Plus } from "lucide-react";
import { readHelpReports, type HelpReport } from "@/lib/support/help-reports";

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdDate: string;
  updatedDate: string;
  replies: number;
};

const tickets: SupportTicket[] = [
  {
    id: "TKT-001",
    subject: "Cannot download template file",
    description: "Getting 404 error when trying to download purchased template",
    status: "Open",
    priority: "High",
    category: "Downloads",
    createdDate: "2026-04-23",
    updatedDate: "2026-04-23",
    replies: 0,
  },
  {
    id: "TKT-002",
    subject: "Invoice not received",
    description: "Did not receive invoice email after purchase",
    status: "In Progress",
    priority: "Medium",
    category: "Billing",
    createdDate: "2026-04-22",
    updatedDate: "2026-04-23",
    replies: 2,
  },
  {
    id: "TKT-003",
    subject: "License key clarification",
    description: "Need to know if I can use the license on multiple projects",
    status: "Resolved",
    priority: "Low",
    category: "Licensing",
    createdDate: "2026-04-21",
    updatedDate: "2026-04-21",
    replies: 1,
  },
];

const statusColors: Record<TicketStatus, { bg: string; text: string }> = {
  Open: { bg: "bg-red-50", text: "text-red-700" },
  "In Progress": { bg: "bg-yellow-50", text: "text-yellow-700" },
  Resolved: { bg: "bg-green-50", text: "text-green-700" },
  Closed: { bg: "bg-gray-50", text: "text-gray-700" },
};

const priorityColors: Record<TicketPriority, string> = {
  Low: "text-blue-600",
  Medium: "text-yellow-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

export function SupportTicketManager() {
  const [statusFilter, setStatusFilter] = useState<"All" | TicketStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | TicketPriority>("All");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [helpReports, setHelpReports] = useState<HelpReport[]>([]);

  useEffect(() => {
    const syncReports = () => setHelpReports(readHelpReports());
    syncReports();
    window.addEventListener("analite-help-reports-updated", syncReports as EventListener);
    return () => window.removeEventListener("analite-help-reports-updated", syncReports as EventListener);
  }, []);

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const statusMatch = statusFilter === "All" || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === "All" || ticket.priority === priorityFilter;
      return statusMatch && priorityMatch;
    });
  }, [statusFilter, priorityFilter]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Support Tickets</h2>
          <p className="mt-1 text-sm text-muted">Create and manage customer support issues</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {showCreateForm && (
        <div className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-4">
          <input
            type="text"
            placeholder="Ticket subject"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
          />
          <textarea
            placeholder="Describe the issue..."
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
            rows={3}
          />
          <select className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none">
            <option>Select category...</option>
            <option>Billing</option>
            <option>Downloads</option>
            <option>Licensing</option>
            <option>Technical</option>
            <option>Other</option>
          </select>
          <div className="flex gap-3">
            <button className="rounded-md bg-foreground px-4 py-2 text-sm text-white">Submit</button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | TicketStatus)}
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "All" | TicketPriority)}
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        >
          <option value="All">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      <div className="mt-5 space-y-3" data-stagger="true">
        {helpReports.length > 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">User Problem Reports ({helpReports.length})</p>
            <p className="mt-1 text-xs text-blue-700">Submitted from Help page and visible to admin here.</p>
            <div className="mt-3 space-y-2">
              {helpReports.slice(0, 4).map((report) => (
                <div key={report.id} className="rounded-md border border-blue-200 bg-white p-3">
                  <p className="text-sm font-medium text-foreground">{report.subject}</p>
                  <p className="mt-1 text-xs text-muted">{report.email}</p>
                  <p className="mt-1 text-xs text-muted line-clamp-2">{report.message}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {visibleTickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`cursor-pointer rounded-lg border border-border p-4 transition hover:border-foreground ${statusColors[ticket.status].bg}`}
            onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-muted">{ticket.id}</span>
                  <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                  <span className={`rounded-full border border-border px-2 py-1 text-xs font-medium ${statusColors[ticket.status].text}`}>
                    {ticket.status}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-foreground">{ticket.subject}</h3>
                <p className="mt-1 text-sm text-muted">{ticket.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                  <span>Category: {ticket.category}</span>
                  <span>Created: {ticket.createdDate}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {ticket.replies} replies
                  </span>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 flex-shrink-0 text-muted transition-transform ${expandedTicket === ticket.id ? "rotate-180" : ""}`} />
            </div>
            {expandedTicket === ticket.id && (
              <div className="mt-4 space-y-3 border-t border-border pt-4 animate-fade-up">
                <div>
                  <p className="text-xs font-semibold text-foreground">Ticket Details</p>
                  <p className="mt-2 text-sm text-muted">ID: {ticket.id}</p>
                  <p className="mt-1 text-sm text-muted">Status: {ticket.status}</p>
                  <p className="mt-1 text-sm text-muted">Priority: {ticket.priority}</p>
                  <p className="mt-1 text-sm text-muted">Last Updated: {ticket.updatedDate}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground">Add Reply</button>
                  <button className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground">Resolve Ticket</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {visibleTickets.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted">No tickets found matching your filters</p>
        </div>
      )}
    </section>
  );
}
