"use client";

import { useEffect, useState } from "react";

interface Log {
  id: string;
  visitor_id: string | null;
  question: string;
  answer: string;
  sources: string;
  created_at: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  async function refresh() {
    const res = await fetch("/api/chat-logs");
    if (res.ok) setLogs(await res.json());
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Chat Logs</h1>
      <p className="text-slate-500 mb-6">Everything your visitors asked — and what the bot replied.</p>
      <div className="space-y-3">
        {logs.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No conversations yet.
          </div>
        )}
        {logs.map((l) => (
          <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs text-slate-500 mb-2">
              {new Date(l.created_at).toLocaleString()}
              {l.visitor_id && <> · visitor {l.visitor_id.slice(0, 10)}…</>}
            </div>
            <div className="text-sm font-medium text-slate-900 mb-1">Q: {l.question}</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">A: {l.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
