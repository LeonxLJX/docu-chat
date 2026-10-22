import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth();
    const info = db.prepare("DELETE FROM documents WHERE id = ?").run(params.id);
    if (info.changes === 0) return fail("not found", 404);
    // chunks cascade via FK
    // embeddings cascade via FK
    return ok({ deleted: params.id });
  } catch (e: any) {
    return fail(e.message, e.status ?? 500);
  }
}
