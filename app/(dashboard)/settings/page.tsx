"use client";

import { useEffect, useState } from "react";

interface SettingsState {
  openai_api_key?: string | null;
  openai_configured?: boolean;
  chat_model?: string | null;
  system_prompt?: string | null;
  widget_title?: string | null;
  widget_welcome?: string | null;
  widget_placeholder?: string | null;
  widget_theme?: string | null;
  widget_brand_color?: string | null;
  license_verified?: boolean;
  is_licensed?: boolean;
}

export default function SettingsPage() {
  const [s, setS] = useState<SettingsState>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<string>("");
  const [embedSnippet, setEmbedSnippet] = useState("");
  const [embedLoading, setEmbedLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setS(d);
      setLoading(false);
    });
  }, []);

  async function save() {
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    setMsg(res.ok ? "Saved ✓" : data.error || "Error");
    if (res.ok) setTimeout(() => setMsg(""), 2000);
  }

  async function activateLicense() {
    setLicenseStatus("Verifying...");
    const res = await fetch("/api/license", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    });
    const data = await res.json();
    if (data.valid) {
      setLicenseStatus(`✓ License valid (expires ${data.expiresAt ?? "never"})`);
      setS({ ...s, license_verified: true, is_licensed: true });
    } else {
      setLicenseStatus(`✗ ${data.error || "Invalid license"}`);
    }
  }

  async function showEmbed() {
    setEmbedLoading(true);
    const res = await fetch("/api/embed");
    const data = await res.json();
    setEmbedLoading(false);
    if (!res.ok) return setEmbedSnippet(`// Error: ${data.error}`);
    setEmbedSnippet(data.embedSnippet);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* OpenAI */}
      <Card title="OpenAI (your key)">
        <Field label="API Key" hint="Starts with sk-... Kept in your own DB. Never sent to us.">
          <input
            className="w-full border border-slate-300 rounded px-3 py-2"
            type="password"
            value={s.openai_api_key || ""}
            onChange={(e) => setS({ ...s, openai_api_key: e.target.value })}
            placeholder={s.openai_configured ? "(masked — leave empty to keep current)" : "sk-..."}
          />
        </Field>
        <Field label="Chat model">
          <select
            className="w-full border border-slate-300 rounded px-3 py-2"
            value={s.chat_model || "gpt-4o-mini"}
            onChange={(e) => setS({ ...s, chat_model: e.target.value })}
          >
            <option value="gpt-4o-mini">gpt-4o-mini (cheap, fast)</option>
            <option value="gpt-4o">gpt-4o (better, more expensive)</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
        </Field>
        <Field label="System prompt" hint="Persona + instructions the bot always follows.">
          <textarea
            className="w-full border border-slate-300 rounded px-3 py-2 h-24"
            value={s.system_prompt || ""}
            onChange={(e) => setS({ ...s, system_prompt: e.target.value })}
          />
        </Field>
      </Card>

      {/* License */}
      <Card title="License">
        <div className="flex gap-3 items-start">
          <input
            className="flex-1 border border-slate-300 rounded px-3 py-2 font-mono text-sm"
            placeholder="Lemon Squeezy license key (e.g. 4a7e-...)"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
          />
          <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded font-medium" onClick={activateLicense}>
            Activate
          </button>
        </div>
        {licenseStatus && <p className="mt-2 text-sm">{licenseStatus}</p>}
        <p className="mt-3 text-xs text-slate-500">
          Buy a $49 license from the seller's Lemon Squeezy store. Licensed unlocks the embed widget snippet.
        </p>
      </Card>

      {/* Widget look */}
      <Card title="Widget appearance">
        <Field label="Title">
          <input className="w-full border border-slate-300 rounded px-3 py-2" value={s.widget_title || ""} onChange={(e) => setS({ ...s, widget_title: e.target.value })} />
        </Field>
        <Field label="Welcome message">
          <input className="w-full border border-slate-300 rounded px-3 py-2" value={s.widget_welcome || ""} onChange={(e) => setS({ ...s, widget_welcome: e.target.value })} />
        </Field>
        <Field label="Placeholder">
          <input className="w-full border border-slate-300 rounded px-3 py-2" value={s.widget_placeholder || ""} onChange={(e) => setS({ ...s, widget_placeholder: e.target.value })} />
        </Field>
        <Field label="Theme">
          <select className="w-full border border-slate-300 rounded px-3 py-2" value={s.widget_theme || "light"} onChange={(e) => setS({ ...s, widget_theme: e.target.value })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <Field label="Brand color">
          <input className="w-full border border-slate-300 rounded px-3 py-2" value={s.widget_brand_color || ""} onChange={(e) => setS({ ...s, widget_brand_color: e.target.value })} placeholder="#2563eb" />
        </Field>
      </Card>

      <div className="flex items-center gap-4">
        <button onClick={save} className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded font-medium">
          Save settings
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>

      {/* Embed snippet */}
      <Card title="Embed on your site (licensed only)">
        <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded font-medium disabled:opacity-60" disabled={!s.is_licensed} onClick={showEmbed}>
          {embedLoading ? "Generating..." : "Get embed snippet"}
        </button>
        {!s.is_licensed && <p className="text-xs text-amber-600 mt-2">Activate your license first.</p>}
        {embedSnippet && (
          <pre className="mt-4 bg-slate-900 text-slate-100 rounded p-4 text-xs overflow-auto max-w-full whitespace-pre-wrap break-all">{embedSnippet}</pre>
        )}
        {embedSnippet && (
          <button
            className="mt-2 text-xs text-slate-500 hover:text-slate-700"
            onClick={() => navigator.clipboard.writeText(embedSnippet)}
          >
            Copy to clipboard
          </button>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-semibold text-lg mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}
