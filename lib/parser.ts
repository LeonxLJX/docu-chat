import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { remark } from "remark";
import strip from "strip-markdown";

export interface ExtractedDoc {
  text: string;
  metadata: { mime: string; size: number; name: string };
}

/** Extract plain text from various file types. */
export async function extractText(filePath: string, mime: string): Promise<ExtractedDoc> {
  const buf = fs.readFileSync(filePath);
  let text = "";

  if (mime.includes("pdf")) {
    const data = await pdfParse(buf);
    text = data.text;
  } else if (mime.includes("docx")) {
    const res = await mammoth.extractRawText({ buffer: buf });
    text = res.value;
  } else if (mime.includes("markdown") || filePath.endsWith(".md")) {
    const vfile = await remark().use(strip).process(buf.toString("utf-8"));
    text = vfile.toString();
  } else if (mime.includes("text") || /\.(txt|csv|json)$/.test(filePath)) {
    text = buf.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${mime}`);
  }

  return {
    text: text.trim(),
    metadata: { mime, size: buf.length, name: path.basename(filePath) },
  };
}
