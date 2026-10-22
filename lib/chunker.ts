export interface Chunk {
  content: string;
  tokenCount: number;
  index: number;
}

/**
 * Simple tokenizer: ~4 chars per token approximation.
 * Used for chunking decisions — not for actual model tokenization.
 */
export function approxTokenCount(text: string): number {
  return Math.max(1, Math.floor(text.length / 4));
}

/**
 * Split long documents into overlapping chunks based on paragraph boundaries,
 * then by token count. Default target: ~400 tokens per chunk.
 */
export function chunkText(text: string, targetTokens = 400, overlapTokens = 60): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer = "";
  let index = 0;

  const pushChunk = () => {
    if (!buffer.trim()) return;
    const content = buffer.trim();
    chunks.push({ content, tokenCount: approxTokenCount(content), index });
    index++;
    // keep tail overlap
    const tokens = buffer.trim().split(/\s+/).length;
    if (tokens > 0) {
      const words = buffer.trim().split(/\s+/);
      const overlap = words.slice(-Math.min(overlapTokens * 2, words.length)).join(" ");
      buffer = overlap;
    } else {
      buffer = "";
    }
  };

  for (const para of paragraphs) {
    const paraTokens = approxTokenCount(para);
    const bufTokens = approxTokenCount(buffer);

    if (bufTokens + paraTokens > targetTokens * 1.1 && buffer.trim()) {
      pushChunk();
    }
    buffer = buffer ? `${buffer}\n\n${para}` : para;
  }
  if (buffer.trim()) pushChunk();

  // Fallback: for very short docs that produce 1 huge chunk, split by sentences
  if (chunks.length === 1 && chunks[0].tokenCount > targetTokens * 2.5) {
    return splitBySentences(chunks[0].content, targetTokens);
  }

  return chunks;
}

function splitBySentences(text: string, targetTokens: number): Chunk[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: Chunk[] = [];
  let buffer = "";
  let index = 0;
  for (const s of sentences) {
    if (approxTokenCount(buffer) + approxTokenCount(s) > targetTokens && buffer.trim()) {
      chunks.push({ content: buffer.trim(), tokenCount: approxTokenCount(buffer), index: index++ });
      buffer = "";
    }
    buffer += (buffer ? " " : "") + s.trim();
  }
  if (buffer.trim()) chunks.push({ content: buffer.trim(), tokenCount: approxTokenCount(buffer), index });
  return chunks;
}
