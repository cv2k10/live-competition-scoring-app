import { db } from "@/db";
import { competitions, contestants } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; cid: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: idStr, cid: cidStr } = await ctx.params;
  const id = Number(idStr);
  const cid = Number(cidStr);
  if (!Number.isInteger(id) || !Number.isInteger(cid)) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "姓名不能为空" }, { status: 400 });
  }

  const [row] = await db
    .update(contestants)
    .set({ name: name.slice(0, 30) })
    .where(and(eq(contestants.id, cid), eq(contestants.competitionId, id)))
    .returning();
  if (!row) {
    return Response.json({ error: "选手不存在" }, { status: 404 });
  }
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: idStr, cid: cidStr } = await ctx.params;
  const id = Number(idStr);
  const cid = Number(cidStr);
  if (!Number.isInteger(id) || !Number.isInteger(cid)) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }

  const deleted = await db
    .delete(contestants)
    .where(and(eq(contestants.id, cid), eq(contestants.competitionId, id)))
    .returning();
  if (deleted.length === 0) {
    return Response.json({ error: "选手不存在" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
