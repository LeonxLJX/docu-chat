# Docu-Chat

> Self-hosted AI support bot for digital product sellers.
> Upload your docs — get an embeddable chat widget. One $49 license, zero per-message costs.

**You own everything.** Your code runs on your Railway instance, your customers chat through a widget you embed on Gumroad / Lemon Squeezy. Your LLM bills only what you actually use.

---

## What it does

1. **Upload** your product manual, FAQ, Refund policy, PDF tutorials, markdown changelog.
2. We **chunk + embed** them locally (SQLite + sqlite-vec).
3. You get a `<script>` snippet → drop it on your **Gumroad Thank You page**, your **own blog**, or any HTML site.
4. Your buyers ask questions → **RAG** retrieves your answers → replies in seconds.

No server costs from us. No per-seat fees. The widget endpoint is public by design.

## Architecture

```
Your instance (Railway, $5-$10/mo)
├── Next.js 14 (App Router)
├── SQLite + WAL
│   ├── sqlite-vec for vector similarity (auto-falls back to in-process cosine)
│   └── FTS5-ready for future hybrid search
└── Embedded widget endpoint (/api/chat — CORS: *)

Your customers' LLM bill (OpenAI)
├── text-embedding-3-small → chunks
└── gpt-4o-mini → chat answers
```

## Why this over Intercom / Zendesk / Fin

| Tool              | Monthly (starter) | Yearly (starter) | Self-hostable? | Per-message |
| ----------------- | ----------------- | ---------------- | -------------- | ----------- |
| Intercom Fin      | $74               | $888             | No             | No          |
| Zendesk Answer Bot| $55               | $660             | No             | No          |
| **Docu-Chat**     | ~$15 (Railway+LLM)| ~$180            | **Yes**        | **Yes**     |

Plus — **you control the data.** No third party sees your product docs.

---

## One-minute local run

```bash
cp .env.example .env.local     # edit ADMIN_PASSWORD
npm install
npm run dev
# open http://localhost:3000 → sign in → upload a PDF → paste /api/chat into Postman
```

## Deploy to Railway

1. Push this repo to GitHub.
2. New Railway project → "Deploy from GitHub repo".
3. Railway reads `railway.json` and `Dockerfile` automatically.
4. Set env vars in Railway **Variables**:

```
NODE_ENV=production
ADMIN_EMAIL=you@yourshop.com
ADMIN_PASSWORD=<strong pw>
DB_PATH=/data/docuchat.db        # ← must be on a mounted volume!
LEMON_SQUEEZY_API_KEY=          # optional, only if you want server-side license verify
LEMON_SQUEEZY_PRODUCT_ID=       # optional
```

5. **Mount a persistent volume** at `/data` in Railway. Without it, every restart wipes your knowledge base.
6. After first deploy, open the app URL → sign in → paste your **OpenAI API key** in Settings → upload a document.

## OpenAI Key — who pays?

**You, the seller.** Docu-Chat never charges for usage. A small shop gets by on:

- Embeddings: fractions of a cent per upload (one-time).
- Chat answers: $5–$15/month for a few hundred buyer questions.

If OpenAI blocks your region, swap to any compatible provider by changing `chat_model` and setting `OPENAI_BASE_URL` via Next.js env override — the `openai` SDK honors it.

## License — how does it work?

The embed snippet is a **paid feature** (your $49 Lemon Squeezy license). Unlicensed instances work fully for internal testing — the `/api/chat` endpoint is live, you just can't generate the `<script>` to embed elsewhere.

Verify flow:

```
You paste license key in Settings → /api/license → Docu-Chat calls Lemon Squeezy /v1/licenses/verify
  → on success: settings.license_verified = "true"
  → /api/embed returns the snippet
```

In dev, set `LEMON_SQUEEZY_API_KEY` blank — the verify endpoint runs in demo mode and accepts any key ≥ 8 chars.

## API surface

All routes are under `/api`:

| Method | Path                        | Auth | Purpose                                  |
| ------ | --------------------------- | ---- | ---------------------------------------- |
| POST   | `/api/auth/login`           | No   | Admin session cookie                     |
| POST   | `/api/auth/logout`          | Cookie | Session destroy                        |
| GET    | `/api/documents`            | Cookie | List uploaded docs + chunk counts      |
| POST   | `/api/documents`            | Cookie | multipart file upload → async process   |
| DELETE | `/api/documents/:id`        | Cookie | Delete doc + cascade chunks/embeddings |
| GET    | `/api/settings`             | Cookie | Read masked settings                    |
| POST   | `/api/settings`            | Cookie | Save settings (OpenAI key stored)       |
| POST   | `/api/license`              | Cookie | Activate Lemon Squeezy key              |
| GET    | `/api/embed`                | Cookie | **Licensed only** — generate embed JS   |
| GET    | `/api/chat`                 | **No** | Health ping                              |
| POST   | `/api/chat`                 | **No** | Widget asks → RAG → LLM → answer        |

`/api/chat` uses `Access-Control-Allow-Origin: *` (see `middleware.ts`) so your embeddable widget on Gumroad can call it.

## Chunking + RAG pipeline

1. File → `lib/parser.ts` (PDF, DOCX via `mammoth`, Markdown via `remark/strip-markdown`, plain text).
2. Plain text → `lib/chunker.ts` (paragraph-boundary + ~400-token target + 60-token overlap).
3. Chunks → `lib/openai.ts` → `text-embedding-3-small` (batches of 100).
4. Vectors → `lib/vectorStore.ts` → `embeddings.vector` BLOB (`float32` little-endian).
5. Query time → `lib/rag.ts`:
   - Embed user question
   - `vec_cosine_similarity` top-K (sqlite-vec) or in-memory cosine (fallback)
   - Stuff retrieved chunks into system prompt context
   - `gpt-4o-mini` → answer
   - Append to `chat_logs`

sqlite-vec is loaded via `db.loadExtension(require.resolve('sqlite-vec'))` if installed — otherwise we run a pure-TS cosine scan. Both give identical results, just different performance characteristics.

## Security notes

- Admin login uses `bcryptjs` with cost 10.
- Session cookie: `HttpOnly`, `SameSite=Lax`, 7-day TTL, row-level expiry.
- OpenAI API key is returned **masked** (`sk-...abcd`) on GET — the client never sees full value.
- `/api/chat` is intentionally public — it's the widget endpoint. If you want it private, gate it behind a reverse proxy.
- We don't sanitize chat answers server-side (LLM output). Display as-is in your widget.

## Directory layout

```
app/
├── layout.tsx                # root layout, boots admin bootstrap
├── page.tsx                  # redirect → /documents or /login
├── globals.css               # Tailwind
├── login/page.tsx
├── (dashboard)/
│   ├── layout.tsx            # sidebar + session guard
│   ├── documents/page.tsx    # upload + list + delete
│   └── settings/page.tsx     # OpenAI key, widget look, license, embed
└── api/
    ├── auth/
    │   ├── login/route.ts
    │   └── logout/route.ts
    ├── chat/route.ts
    ├── documents/route.ts + [id]/route.ts
    ├── settings/route.ts
    ├── license/route.ts
    └── embed/route.ts
components/
lib/
├── db.ts            # SQLite schema + singleton
├── auth.ts          # sessions, password hashing, bootstrap admin
├── http.ts          # JSON parsing, response helpers
├── parser.ts        # PDF/DOCX/MD/TXT extraction
├── chunker.ts       # paragraph + token chunker
├── openai.ts        # client + embeddings factory
├── vectorStore.ts   # sqlite-vec + fallback cosine
├── rag.ts           # answer pipeline
└── license.ts       # Lemon Squeezy verify
public/widget.js     # single-file embeddable widget
middleware.ts        # CORS for /api/chat
```

## FAQ

### What file types are supported?
PDF, DOCX, Markdown, TXT, CSV, JSON. Add more to `lib/parser.ts`.

### Can I use a different LLM?
Yes. Set `chat_model` to anything the OpenAI SDK accepts. For non-OpenAI providers, set `OPENAI_BASE_URL` env var to their compatible endpoint.

### Can I self-host on something besides Railway?
Any Node 18+ host with a writable disk. Dockerfile is multi-stage — push to Fly.io, Render, Coolify, whatever. Just make sure the SQLite file lives on **persistent storage** or it vanishes on restart.

### What about user auth for my customers?
None needed. The widget is anonymous — we log `visitor_id` (random uuid per browser) in `chat_logs`.

### How do I reset my admin password?
Delete the `users` table row directly, or set a new `ADMIN_EMAIL` + `ADMIN_PASSWORD` env and re-bind — bootstrap runs once at startup when the table is empty.

## License

**MIT © Docu-Chat contributors.**

You may sell this as a commercial hosted service, fork it privately, or embed it. If you build on it, a one-line attribution in your README is appreciated but not required.
