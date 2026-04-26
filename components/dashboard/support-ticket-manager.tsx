"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageSquare, RefreshCw } from "lucide-react";

type DbTicket = {
  id: string;
  userEmail: string;
  subject: string;
  message: string;
  status: "new" | "in_review" | "resolved" | "closed";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export function SupportTicketManager() {
  const [statusFilter, setStatusFilter] = useState<"All" | DbTicket["status"]>("All");
  const [query, setQuery] = useState("");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [dbTickets, setDbTickets] = useState<DbTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const fetchDbTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/tickets");
      if (res.ok) {
        const data = await res.json() as DbTicket[];
        setDbTickets(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => { void fetchDbTickets(); }, [fetchDbTickets]);

  async function updateTicketStatus(id: string, status: DbTicket["status"]) {
    const res = await fetch("/api/support/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) void fetchDbTickets();
  }

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dbTickets.filter((ticket) => {
      const statusMatch = statusFilter === "All" || ticket.status === statusFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${ticket.subject} ${ticket.userEmail} ${ticket.message}`.toLowerCase().includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [dbTickets, query, statusFilter]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Support Tickets</h2>
          <p className="mt-1 text-sm text-muted">Review and resolve real customer support submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            <MessageSquare className="h-4 w-4" /> Open Support Page
          </Link>
          <button
            onClick={() => void fetchDbTickets()}
            disabled={loadingTickets}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:border-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loadingTickets ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ticket subject, email, or message..."
          className="min-w-[260px] flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | DbTicket["status"])}
          className="rounded-md border border-border px-3 py-2 text-sm outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="new">New</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="mt-5 space-y-3" data-stagger="true">
        {loadingTickets ? <p className="text-sm text-muted">Loading tickets...</p> : null}

        {visibleTickets.map((ticket) => {
          const statusLabel = ticket.status === "in_review"
            ? "In Review"
            : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
          const statusClasses =
            ticket.status === "resolved"
              ? "bg-green-50 text-green-700"
              : ticket.status === "closed"
                ? "bg-slate-100 text-slate-700"
                : ticket.status === "in_review"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-700";

          return (
          <div
            key={ticket.id}
            className="cursor-pointer rounded-lg border border-border p-4 transition hover:border-foreground"
            onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-muted">{ticket.id}</span>
                  <span className={`rounded-full border border-border px-2 py-1 text-xs font-medium ${statusClasses}`}>
                    {statusLabel}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-foreground">{ticket.subject}</h3>
                <p className="mt-1 text-sm text-muted line-clamp-2">{ticket.message}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                  <span>Email: {ticket.userEmail}</span>
                  <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Admin note: {ticket.adminNote ? "Yes" : "No"}
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
                  <p className="mt-1 text-sm text-muted">Status: {statusLabel}</p>
                  <p className="mt-1 text-sm text-muted">Resolved: {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : "Not yet"}</p>
                  {ticket.adminNote ? <p className="mt-1 text-sm text-muted">Admin note: {ticket.adminNote}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ticket.status === "new" ? (
                    <button
                      onClick={() => void updateTicketStatus(ticket.id, "in_review")}
                      className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                    >
                      Mark In Review
                    </button>
                  ) : null}
                  {ticket.status === "in_review" ? (
                    <button
                      onClick={() => void updateTicketStatus(ticket.id, "resolved")}
                      className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                    >
                      Resolve Ticket
                    </button>
                  ) : null}
                  {ticket.status !== "closed" ? (
                    <button
                      onClick={() => void updateTicketStatus(ticket.id, "closed")}
                      className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:border-foreground"
                    >
                      Close Ticket
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {!loadingTickets && visibleTickets.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted">No tickets found matching your filters</p>
        </div>
      )}
    </section>
  );
}
