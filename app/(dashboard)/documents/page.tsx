"use client";

import { useEffect, useRef, useState } from "react";

interface Doc {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  status: "processing" | "ready" | "error";
  error?: string;
  created_at: string;
  chunkCount: number;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocs(await res.json());
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  async function handleUpload(f: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    await fetch("/api/documents", { method: "POST", body: fd });
    fileRef.current!.value = "";
    setUploading(false);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this document? All chunks & embeddings will be removed.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Documents</h1>
      <p className="text-slate-500 mb-6">Upload PDFs, Word docs, markdown, or plain text. We'll chunk, embed, and make them searchable by your chat bot.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold mb-3">Upload</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.md,.txt,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
          className="block"
        />
        {uploading && <p className="text-sm text-slate-500 mt-2">Uploading...</p>}
        <p className="text-xs text-slate-500 mt-2">
          Supported: PDF, DOCX, Markdown, TXT, CSV, JSON. Max size depends on Railway disk (default ~1GB).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Chunks</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No documents yet.</td></tr>
            )}
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-slate-500">{fmtSize(d.size)}</td>
                <td className="px-4 py-3 text-slate-500">{d.chunkCount}</td>
                <td className="px-4 py-3">
                  <StatusPill status={d.status} error={d.error} />
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(d.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-red-600 hover:underline" onClick={() => remove(d.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status, error }: { status: string; error?: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    processing: { cls: "bg-amber-100 text-amber-700", label: "Processing" },
    ready: { cls: "bg-green-100 text-green-700", label: "Ready" },
    error: { cls: "bg-red-100 text-red-700", label: `Error: ${error ?? ""}` },
  };
  const m = map[status] ?? { cls: "bg-slate-100 text-slate-700", label: status };
  return <span className={`text-xs px-2 py-1 rounded ${m.cls}`}>{m.label}</span>;
}
