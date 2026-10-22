import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isLicensed } from "@/lib/auth";
import db from "@/lib/db";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) redirect("/login");

  // Quick counts for sidebar badges
  const openTickets = (
    db.prepare("SELECT COUNT(*) AS c FROM tickets WHERE status='open'").get() as { c: number }
  ).c;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="text-xl font-bold text-brand-600 mb-8">Docu-Chat</div>
        <nav className="space-y-1">
          <a href="/documents" className="block px-3 py-2 rounded hover:bg-slate-100">Documents</a>
          <a href="/tickets" className="block px-3 py-2 rounded hover:bg-slate-100">
            Tickets
            {openTickets > 0 && (
              <span className="ml-2 inline-block text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {openTickets}
              </span>
            )}
          </a>
          <a href="/logs" className="block px-3 py-2 rounded hover:bg-slate-100">Chat Logs</a>
          <a href="/settings" className="block px-3 py-2 rounded hover:bg-slate-100">Settings</a>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Signed in as</div>
          <div className="text-sm font-medium truncate">{session.email}</div>
          <div
            className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
              isLicensed() ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isLicensed() ? "✓ Licensed" : "Trial"}
          </div>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button className="text-xs text-slate-500 hover:text-red-600">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
