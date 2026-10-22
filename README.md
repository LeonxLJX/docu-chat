# Docu-Chat

> Self-hosted AI support bot for digital product sellers.
> Upload your docs — get an embeddable chat widget — route tricky questions to a human when needed.

You **own everything**. Your code runs on your own Railway (or any) instance, your LLM bills only what you actually use, and none of your product docs leave your machine.

---

## The problem

You sell templates, guides, plugins, or courses on Gumroad, Lemon Squeezy, Shopify, or your own site. Every day, buyers ask the same 10 questions in your inbox — *"Does this work on Mac?"* *"How do I install?"* *"Can I get a refund?"*

Answering each one manually sucks. Intercom Fin and Zendesk Answer Bot are $55–$74/month and **you can't self-host them**.

## Docu-Chat fixes it

1. Upload your FAQ, product manual, or PDF tutorials.
2. We chunk and embed them locally.
3. Drop a single `<script>` tag into your **Gumroad Thank You page** or **any HTML site**.
4. Buyers ask — your bot answers instantly from your own docs.
5. If the bot doesn't know, or the buyer clicks **"Talk to a human"**, a ticket lands in your inbox and you reply directly.

**One-time $49 license. Zero per-message fees. Your only running cost is Railway (~$5/mo) + your own OpenAI key (~$5–$15/mo for a typical shop).**

### vs. alternatives

| Tool                  | Monthly cost (starter) | Yearly (starter) | Self-hostable? | Per-seat fee? | Your docs leave your server? |
| --------------------- | ---------------------- | ---------------- | -------------- | ------------- | ---------------------------- |
| Intercom Fin          | $74                    | $888             | No             | No            | Yes                          |
| Zendesk Answer Bot    | $55                    | $660             | No             | No            | Yes                          |
| Front AI              | $60                    | $720             | No             | Yes           | Yes                          |
| **Docu-Chat**         | **~$15**               | **~$180**        | **Yes**        | **No**        | **No**                       |

A single Gumroad template ($29–$99) pays back a year of Docu-Chat.

---

## What you get

### Admin dashboard (you log in here)

| Page             | What it does                                                                           |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Documents**    | Upload PDF / DOCX / Markdown / TXT / CSV / JSON. Auto chunk + embed + vectorize.       |
| **Tickets**      | "Talk to human" inbox. Every ticket from your widget is here — open/resolve/reopen.   |
| **Chat Logs**    | Full conversation history: what each visitor asked and what the bot replied.           |
| **Settings**     | OpenAI key, model selection, system prompt, widget appearance (title, colors, theme).|
| **License**      | Paste your $49 Lemon Squeezy key. Verified via official API. Unlocks embed snippet.    |

### Embeddable widget (your buyers see this)

- Floating chat bubble on any HTML page.
- Light / dark theme, configurable brand color.
- Anonymous per-visitor id — no sign-up needed.
- **AI answers from your docs** via RAG pipeline.
- **"Talk to a human" button** — opens a small contact form, creates a ticket in your dashboard.
- **Smart mode**: if a buyer types *"talk to human"*, *"contact support"*, *"找人工"* or similar, the bot skips RAG and creates a ticket immediately.
- Typing indicator, scrollable history, Enter-to-send.

### API surface (all under `/api`)

| Method | Path                              | Auth      | Purpose                                                    |
| ------ | --------------------------------- | --------- | ---------------------------------------------------------- |
| POST   | `/api/auth/login`                 | None      | Admin session cookie (HttpOnly, 7-day TTL)                 |
| POST   | `/api/auth/logout`                | Cookie    | Destroy session                                            |
| GET    | `/api/documents`                  | Cookie    | List docs + chunk counts                                   |
| POST   | `/api/documents`                  | Cookie    | Multipart upload → async chunk + embed + store              |
| DELETE | `/api/documents/:id`              | Cookie    | Delete doc + cascade chunks/embeddings                     |
| GET    | `/api/settings`                   | Cookie    | Read settings (OpenAI key is **masked** in response)       |
| POST   | `/api/settings`                   | Cookie    | Save settings                                              |
| POST   | `/api/license`                    | Cookie    | Verify Lemon Squeezy license key via official API          |
| GET    | `/api/embed`                      | Cookie    | **Licensed only** — generate the `<script>` snippet        |
| GET    | `/api/tickets`                    | Cookie    | List tickets (filterable by `?status=open|resolved`)       |
| POST   | `/api/tickets`                    | **None**  | Public — widget creates a ticket ("talk to human")          |
| POST   | `/api/tickets/:id`                | Cookie    | `{ action: "resolve" | "reopen" }`                        |
| DELETE | `/api/tickets/:id`                | Cookie    | Delete ticket                                              |
| GET    | `/api/chat-logs`                  | Cookie    | Recent conversations                                       |
| GET    | `/api/chat`                       | **None**  | Health ping — tells widget if instance is ready            |
| POST   | `/api/chat`                       | **None**  | Widget calls this for every question (CORS: `*`)           |

`/api/chat` is intentionally public and CORS-permissive — it's the widget's endpoint.

### Architecture

```
Your instance (Railway $5/mo, or any Node host)
├── Next.js 14 App Router
├── SQLite with WAL mode + foreign keys
│   ├── sqlite-vec extension  → vector similarity search (fast path)
│   └── Pure JS cosine fallback → works even without the native extension
├── bcryptjs admin auth + session cookies
└── /api/chat — CORS: * — called directly from buyers' browsers

Your LLM provider (you pay directly)
├── text-embedding-3-small  → embeddings (fractions of a cent, one-time per upload)
└── gpt-4o-mini              → chat answers ($5–$15/mo for a typical shop)
```

---

## RAG pipeline

Every upload → every answer:

1. **Extract** — `lib/parser.ts`: PDF (`pdf-parse`), DOCX (`mammoth`), Markdown (`remark` + `strip-markdown`), plain text.
2. **Chunk** — `lib/chunker.ts`: paragraph-boundary splits targeting ~400 tokens with 60-token overlap at boundaries. Falls back to sentence-splitting for tiny or enormous docs.
3. **Embed** — `lib/openai.ts`: `text-embedding-3-small`, batched 100-at-a-time to keep latency tight.
4. **Store** — `lib/vectorStore.ts`: vectors saved as `float32` little-endian BLOBs in SQLite `embeddings.vector`.
5. **Retrieve** — `lib/vectorStore.ts::search`: query embedded, then ranked by `vec_cosine_similarity` (sqlite-vec) or in-memory cosine (fallback). Top-5.
6. **Generate** — `lib/rag.ts`: chunks stuffed into system prompt context → `gpt-4o-mini` → answer written to `chat_logs`.

sqlite-vec is loaded via `db.loadExtension(require.resolve("sqlite-vec"))`. If the extension isn't installed (e.g. you skipped the `npm install sqlite-vec` step), the code falls back to 100% TypeScript cosine similarity with identical results — just a few ms slower on very large KB sizes.

---

## Deploy in 5 minutes

### 1. Push this repo to GitHub

```bash
git clone https://github.com/<you>/docu-chat.git
cd docu-chat
cp .env.example .env.local
# edit .env.local — set ADMIN_EMAIL and ADMIN_PASSWORD
git add .
git commit -m "first deploy"
git push origin main
```

### 2. Create a Railway project

1. New Project → **Deploy from GitHub repo** → pick your `docu-chat` repo.
2. Railway reads `railway.json` and `Dockerfile` automatically — no build command needed.
3. Go to **Variables** and set:

```
NODE_ENV=production
ADMIN_EMAIL=you@yourshop.com
ADMIN_PASSWORD=<a strong one>
DB_PATH=/data/docuchat.db          # ← must live on persistent volume
LEMON_SQUEEZY_API_KEY=              # optional — blank = demo mode (accepts any ≥8-char key)
LEMON_SQUEEZY_PRODUCT_ID=           # optional — restrict license key to one product
```

4. **Mount a persistent volume** at `/data` in Railway. Without this, every restart wipes your knowledge base.

That's it. Wait for the build (~2 min), then open the URL.

### 3. First run

1. Open your instance URL → you'll land on the login page.
2. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. Go to **Settings** → paste your OpenAI API key (starts with `sk-`). Click Save.
4. Go to **Documents** → upload your PDF / FAQ markdown. Wait 1–2 minutes for processing (watch the Status column flip from `processing` to `ready`).
5. Paste the instance URL + `/api/chat` into Postman with body `{ "question": "Does this work on Mac?" }` — you should get an answer.

### 4. Activate a license (paid feature)

Skip this to test everything internally. To generate the embed snippet you need a $49 license from the seller's Lemon Squeezy store:

1. Buy the license → you'll receive a key like `4a7e-...`
2. Back in **Settings → License** → paste it → click **Activate**.
3. The dashboard badge flips to **✓ Licensed**.
4. Click **"Get embed snippet"** → copy the `<script>` tag → paste it into your Gumroad Thank You page / Shopify product page / any HTML.

The snippet looks like this:

```html
<!-- Docu-Chat AI Support Widget -->
<script>
  window.__DOCU_CHAT_CFG__ = {
    origin: "https://your-instance.up.railway.app",
    title: "Need help?",
    welcome: "Hi! Ask me anything about this product.",
    placeholder: "Type your question...",
    theme: "light",
    brandColor: "#2563eb"
  };
  (function(){
    var s=document.createElement('script');
    s.src='https://your-instance.up.railway.app/widget.js';
    s.async=true;
    document.head.appendChild(s);
  })();
</script>
```

Drop it into **any HTML page** — the widget works everywhere. CORS is already configured.

---

## Run locally (Mac/Linux/Windows with WSL)

```bash
cp .env.example .env.local
# edit ADMIN_PASSWORD
npm install          # needs python3 + make + g++ for better-sqlite3 (or Docker below)
npm run dev          # http://localhost:3000
```

If `npm install` fails native modules on Windows, skip them and use Docker locally:

```bash
docker build -t docu-chat .
docker run -p 3000:3000 \
  -e ADMIN_EMAIL=admin@test.com \
  -e ADMIN_PASSWORD=secret \
  -v $(pwd)/data:/app/data \
  docu-chat
```

The `-v $(pwd)/data:/app/data` bind-mount keeps your SQLite file across container restarts.

---

## "Talk to human" — how it works

### Buyers' side
- **Click the button**: a small form overlay opens (email optional, subject, message). Submit → ticket created instantly → buyer sees a confirmation.
- **Type a phrase** during chat: *"talk to human"*, *"contact support"*, *"can I speak to someone"*, *"找人工"*, *"客服"* → the chat route detects it, skips RAG entirely, creates a ticket, and replies with a reassurance message.

### Your side
Open **Tickets** in the sidebar. You see every ticket with status (`open` / `resolved`), visitor id, optional contact email, subject, message, and timestamp. Filter tabs: **Open**, **Resolved**, **All**. When you've dealt with it (via your own email / Gumroad messages), click **Mark resolved**. That's it.

---

## OpenAI key — who pays?

**You, the seller.** Docu-Chat has no usage-based fees — your own API key is stored **only in your own SQLite database**. We never see it, we never touch it, and we don't bill you.

Real-world monthly cost for a small shop:

| Component          | Cost                                        |
| ------------------ | ------------------------------------------- |
| Embeddings upload  | ~$0.01 per 100 pages (one-time per upload) |
| Chat answers       | ~$0.03 per 1000 questions                   |
| **Typical month**  | **$5 – $15 total**                          |

Want to use a non-OpenAI provider? The `openai` SDK honors `OPENAI_BASE_URL` env var — point it at any compatible endpoint (Together, Groq, OpenRouter, etc.) and set `chat_model` to whatever model they expose.

---

## Security

| Concern                | Mitigation                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| Admin password         | bcryptjs, cost 10. Plaintext never stored. First-user bootstrap only when `users` table is empty. |
| Session cookies        | HttpOnly, SameSite=Lax, 7-day TTL, row-level expiry check on every request.|
| OpenAI API key leakage | `/api/settings` GET returns masked `sk-...abcd`. Full key only written to DB from POST body. |
| `/api/chat` exposure   | Intentionally public. If you want it private, put a reverse proxy with basic auth in front. |
| Chat log PII           | We don't log raw IPs or any personally identifiable info beyond a random per-browser uuid (`visitor_id`). |
| Dependency supply chain| `package-lock.json` committed. No remote-loading runtime JS beyond your own `/widget.js`. |

---

## Directory layout

```
app/
├── layout.tsx                  # root layout, boots admin bootstrap
├── page.tsx                    # redirect → /documents or /login
├── globals.css                 # Tailwind
├── login/page.tsx
├── (dashboard)/
│   ├── layout.tsx              # sidebar with open-tickets badge
│   ├── documents/page.tsx      # upload + list + delete
│   ├── tickets/page.tsx        # open/resolved inbox
│   ├── logs/page.tsx           # chat history
│   └── settings/page.tsx       # OpenAI key, widget look, license, embed snippet
└── api/
    ├── auth/{login,logout}/route.ts
    ├── chat/route.ts           # public — RAG + talk-to-human detection
    ├── chat-logs/route.ts      # admin
    ├── documents/route.ts + [id]/route.ts
    ├── tickets/route.ts        # GET=admin, POST=public
    ├── tickets/[id]/route.ts   # resolve / reopen / delete
    ├── settings/route.ts       # admin — masks OpenAI key on GET
    ├── license/route.ts        # admin → Lemon Squeezy /v1/licenses/verify
    └── embed/route.ts          # admin + licensed → generates <script> snippet
components/
lib/
├── db.ts             # SQLite singleton + full schema (users, settings, docs, chunks, embeddings, sessions, chat_logs, tickets)
├── auth.ts           # bootstrap admin, bcrypt, session cookies, requireAuth(), isLicensed()
├── http.ts           # jsonParseSafe, ok(), fail() response helpers
├── parser.ts         # PDF / DOCX / Markdown / TXT / CSV / JSON extraction
├── chunker.ts        # paragraph-boundary + token target + overlap
├── openai.ts         # client + embedTexts() batcher
├── vectorStore.ts    # sqlite-vec vec_cosine_similarity + pure-TS cosine fallback
├── rag.ts            # answer pipeline → embeds, retrieves, prompts, logs
└── license.ts        # POST https://api.lemonsqueezy.com/v1/licenses/verify
public/widget.js      # single-file embeddable widget (no build step, zero deps)
middleware.ts          # CORS on /api/chat (Access-Control-Allow-Origin: *)
scripts/init-db.mjs   # one-shot schema seeder for CI / pre-seed
Dockerfile            # multi-stage, native-deps stage for better-sqlite3 + sqlite-vec
railway.json          # one-click Railway deploy
```

---

## FAQ

### What file types are supported?
PDF, DOCX, Markdown, TXT, CSV, JSON. Extend `lib/parser.ts` to add more.

### Can I use a cheaper LLM?
Yes. `gpt-4o-mini` is the default — ~$0.15 per million input tokens. Swap to `gpt-3.5-turbo` (~$0.50/M) if you prefer, or any OpenAI-compatible endpoint via `OPENAI_BASE_URL`.

### What happens when my SQLite file gets corrupted?
SQLite WAL mode is enabled by default. Railway snapshots your volume nightly — restore from there if needed. For extra safety, set up a simple cron job that does `cp /data/docuchat.db /data/backup-$(date).db`.

### Can this run on Vercel?
Technically yes for the API routes, but Vercel's ephemeral filesystem means your SQLite file is wiped on every cold start. **Use Railway, Fly.io, Render, or any host with a writable persistent disk.** The Dockerfile makes this trivial.

### Do I need a Lemon Squeezy account to use Docu-Chat?
Only if you want to **sell** Docu-Chat (as a distributor). For your own shop, just buy a single $49 license key from wherever you bought this code. In development the license check runs in **demo mode** (blank `LEMON_SQUEEZY_API_KEY`) and accepts any key ≥ 8 characters.

### How do I change my admin password?
Delete the `users` table row directly: `rm /data/docuchat.db*`, or set a new `ADMIN_EMAIL` + `ADMIN_PASSWORD` and restart — bootstrap only creates a user when the table is empty.

### Why no user authentication for buyers?
Anonymous is faster for buyers and is the default expectation for support widgets. We log a random per-browser `visitor_id` so you can correlate multiple messages from the same person in Tickets.

---

## Roadmap

- [ ] Webhook receiver — Slack/Discord/Push notification on new tickets
- [ ] FTS5 hybrid search (BM25 + vector reranking) for more accurate retrieval
- [ ] Per-document metadata filtering ("only search docs tagged 'refund'")
- [ ] Rate limiting on `/api/chat` (Redis-backed or in-memory token bucket)
- [ ] Multi-admin support (currently single-user)
- [ ] Slack/Intercom two-way sync for tickets

---

## License

**MIT © Docu-Chat contributors.**

You may use, modify, and sell this commercially. Attribution in your README is appreciated but not required.
