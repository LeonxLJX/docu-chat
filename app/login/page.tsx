"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Login failed");
    router.push("/documents");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl p-8 shadow-md border border-slate-200">
        <h1 className="text-2xl font-bold mb-1">Docu-Chat</h1>
        <p className="text-slate-500 mb-6">Sign in to manage your knowledge base.</p>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded py-2 font-medium"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-6 text-xs text-slate-500">
          Default credentials from <code className="bg-slate-100 px-1 rounded">ADMIN_EMAIL</code> /{" "}
          <code className="bg-slate-100 px-1 rounded">ADMIN_PASSWORD</code> env vars.
        </p>
      </form>
    </div>
  );
}
