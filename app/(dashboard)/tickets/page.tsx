"use client";

import { useEffect, useState } from "react";

interface Ticket {
  id: string;
  visitor_id: string | null;
  contact_email: string | null;
  subject: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

export default function TicketsPage() {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function refresh() {
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/tickets${q}`);
    if (res.ok) setTickets(await res.json());
  }

  useEffect(() => { refresh(); }, [filter]);

  async function act(id: string, action: "resolve" | "reopen" | "delete") {
    if (action === "delete") {
      if (!confirm("Delete this ticket forever?")) return;
      await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/tickets/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
    }
    refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Tickets Inbox</h1>
      <p className="text-slate-500 mb-6">
        Every time a visitor asks for a human agent, a ticket is created here. Reply to them
        outside Docu-Chat (your email, Gumroad messages, etc.) and mark it resolved when done.
      </p>

      <div className="flex gap-2 mb-4">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm font-medium capitalize ${
              filter === f ? "bg-brand-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No tickets yet. When visitors ask your widget for a human, they'll show up here.
          </div>
        )}
        {tickets.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`shrink-0 text-xs px-2 py-1 rounded font-medium ${
                    t.status === "open"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {t.status}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.subject}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(t.created_at).toLocaleString()}
                    {t.visitor_id && <> · visitor {t.visitor_id.slice(0, 10)}…</>}
                    {t.contact_email && <> · <a className="text-brand-600 hover:underline" href={`mailto:${t.contact_email}`}>{t.contact_email}</a></>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {t.status === "open" ? (
                  <button
                    className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded font-medium"
                    onClick={() => act(t.id, "resolve")}
                  >
                    Mark resolved
                  </button>
                ) : (
                  <button
                    className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded font-medium"
                    onClick={() => act(t.id, "reopen")}
                  >
                    Reopen
                  </button>
                )}
                <button
                  className="text-xs text-slate-400 hover:text-red-600 px-2"
                  onClick={() => act(t.id, "delete")}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
              {t.message}
            </p>
            {t.status === "resolved" && t.resolved_at && (
              <div className="mt-3 text-xs text-slate-400">Resolved {new Date(t.resolved_at).toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
