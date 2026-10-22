import { NextRequest } from "next/server";
import { requireAuth, isLicensed } from "@/lib/auth";
import db from "@/lib/db";
import { jsonParseSafe, fail, ok } from "@/lib/http";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { extractText } from "@/lib/parser";
import { chunkText } from "@/lib/chunker";
import { storeEmbeddings, deleteDocumentChunks } from "@/lib/vectorStore";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function GET() {
  try {
    requireAuth();
    const docs = db
      .prepare("SELECT id, name, mime_type, size, status, error, created_at FROM documents ORDER BY created_at DESC")
      .all() as any[];

    const counts = db
      .prepare(
        `SELECT d.id, COUNT(c.id) AS chunk_count
         FROM documents d LEFT JOIN chunks c ON c.document_id = d.id
         GROUP BY d.id`
      )
      .all() as { id: string; chunk_count: number }[];
    const countMap = new Map(counts.map((c) => [c.id, c.chunk_count]));
    return ok(docs.map((d) => ({ ...d, chunkCount: countMap.get(d.id) ?? 0 })));
  } catch (e: any) {
    return fail(e.message ?? "unauthorized", e.status ?? 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth();

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return fail("file is required");

    const supported = /pdf|docx|text|markdown|plain|csv|json/;
    if (!supported.test(file.type) && !/\.(pdf|docx|md|txt|csv|json)$/i.test(file.name)) {
      return fail("unsupported file type");
    }

    const docId = uuidv4();
    const ext = path.extname(file.name) || ".bin";
    const filePath = path.join(UPLOAD_DIR, `${docId}${ext}`);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buf);

    const insert = db.prepare(
      "INSERT INTO documents (id, name, mime_type, size, status) VALUES (?, ?, ?, ?, 'processing')"
    );
    insert.run(docId, file.name, file.type, buf.length);

    // Fire-and-forget processing so the response returns fast
    processDocument(docId, filePath, file.type).catch((err) => {
      console.error("[doc] processing failed", err);
      db.prepare("UPDATE documents SET status='error', error=? WHERE id=?").run(
        (err as Error).message.slice(0, 500),
        docId
      );
    });

    return ok({ id: docId, name: file.name, status: "processing" });
  } catch (e: any) {
    return fail(e.message ?? "upload failed", e.status ?? 500);
  }
}

async function processDocument(docId: string, filePath: string, mime: string) {
  const { text } = await extractText(filePath, mime);
  if (!text.trim()) throw new Error("document yielded empty text");

  const chunks = chunkText(text, 400, 60);
  await storeEmbeddings(docId, chunks);
  db.prepare("UPDATE documents SET status='ready' WHERE id=?").run(docId);
}
