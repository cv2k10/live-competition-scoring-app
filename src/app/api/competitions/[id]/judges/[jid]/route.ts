import { db } from "@/db";
import { competitions, judges } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; jid: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: idStr, jid: jidStr } = await ctx.params;
  const id = Number(idStr);
  const jid = Number(jidStr);
  if (!Number.isInteger(id) || !Number.isInteger(jid)) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }

  const deleted = await db
    .delete(judges)
    .where(and(eq(judges.id, jid), eq(judges.competitionId, id)))
    .returning();
  if (deleted.length === 0) {
    return Response.json({ error: "评委不存在" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
