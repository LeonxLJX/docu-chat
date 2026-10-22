import db, { hasVectorSearch } from "./db";
import { embedTexts } from "./openai";

const EMBEDDING_DIM = 1536; // text-embedding-3-small

function float32Blob(vec: number[]): Buffer {
  const buf = Buffer.alloc(vec.length * 4);
  for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i], i * 4);
  return buf;
}

function blobToFloat32(buf: Buffer): number[] {
  const out: number[] = [];
  for (let i = 0; i < buf.length; i += 4) out.push(buf.readFloatLE(i));
  return out;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    nA = 0,
    nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const denom = Math.sqrt(nA) * Math.sqrt(nB);
  return denom === 0 ? 0 : dot / denom;
}

export interface StoredChunk {
  chunkId: number;
  documentId: string;
  content: string;
  score: number;
}

/** Store embeddings for chunks. Batch-friendly. */
export async function storeEmbeddings(
  documentId: string,
  chunks: { content: string; tokenCount: number; index: number }[]
) {
  // Save chunk text rows first
  const insertChunk = db.prepare(
    "INSERT INTO chunks (document_id, content, token_count, chunk_index) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction((list: typeof chunks) => {
    const ids: number[] = [];
    for (const c of list) {
      const info = insertChunk.run(documentId, c.content, c.tokenCount, c.index);
      ids.push(Number(info.lastInsertRowid));
    }
    return ids;
  });
  const chunkRowIds = tx(chunks);

  // Generate embeddings in batches of 100
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += 100) {
    const batch = chunks.slice(i, i + 100);
    const embs = await embedTexts(batch.map((c) => c.content));
    vectors.push(...embs);
  }

  // Store embedding blobs
  const insertEmb = db.prepare(
    "INSERT INTO embeddings (chunk_id, vector, dims) VALUES (?, ?, ?)"
  );
  const embTx = db.transaction(() => {
    for (let i = 0; i < chunkRowIds.length; i++) {
      insertEmb.run(chunkRowIds[i], float32Blob(vectors[i]), EMBEDDING_DIM);
    }
  });
  embTx();
}

/** Vector similarity search — sqlite-vec if available, fallback = in-memory cosine */
export async function search(query: string, topK = 5): Promise<StoredChunk[]> {
  const [qVec] = await embedTexts([query]);

  if (hasVectorSearch()) {
    return searchWithVec(qVec, topK);
  }
  return searchFallback(qVec, topK);
}

function searchWithVec(qVec: number[], topK: number): StoredChunk[] {
  // sqlite-vec expects a JSON array or blob. Use JSON for portability.
  const rows = db
    .prepare(
      `SELECT e.chunk_id, c.document_id, c.content,
              vec_cosine_similarity(e.vector, ?) AS score
       FROM embeddings e
       JOIN chunks c ON c.id = e.chunk_id
       ORDER BY score DESC
       LIMIT ?`
    )
    .all(JSON.stringify(qVec), topK) as {
    chunk_id: number;
    document_id: string;
    content: string;
    score: number;
  }[];

  return rows.map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    content: r.content,
    score: Number(r.score),
  }));
}

function searchFallback(qVec: number[], topK: number): StoredChunk[] {
  const rows = db
    .prepare(
      `SELECT e.chunk_id, e.vector, c.document_id, c.content
       FROM embeddings e
       JOIN chunks c ON c.id = e.chunk_id`
    )
    .all() as { chunk_id: number; vector: Buffer; document_id: string; content: string }[];

  const scored = rows.map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    content: r.content,
    score: cosineSimilarity(qVec, blobToFloat32(r.vector)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function deleteDocumentChunks(docId: string) {
  db.prepare("DELETE FROM chunks WHERE document_id = ?").run(docId);
  // embeddings cascade via FK
}
