import { db } from "@/db";
import { competitions, criteria } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

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
  if (comp.status !== "setup") {
    return Response.json(
      { error: "比赛开始或结束后不能修改评分标准" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(criteria)
    .where(and(eq(criteria.id, cid), eq(criteria.competitionId, id)));
  if (!existing) {
    return Response.json({ error: "评分标准不存在" }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) {
    patch.name = b.name.trim().slice(0, 12);
  }
  if (b.weight != null) {
    const w = Math.round(Number(b.weight));
    if (!Number.isFinite(w) || w < 0 || w > 1000) {
      return Response.json({ error: "权重需在 0 – 1000 之间" }, { status: 400 });
    }
    patch.weight = w;
  }
  if (b.maxScore != null) {
    const m = Number(b.maxScore);
    if (!Number.isFinite(m) || m <= 0 || m > 100) {
      return Response.json({ error: "满分需在 0.5 – 100 之间" }, { status: 400 });
    }
    patch.maxScore = m;
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const [row] = await db
    .update(criteria)
    .set(patch)
    .where(eq(criteria.id, cid))
    .returning();
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
  if (comp.status !== "setup") {
    return Response.json(
      { error: "比赛开始或结束后不能修改评分标准" },
      { status: 400 },
    );
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(criteria)
    .where(eq(criteria.competitionId, id));
  if (Number(n) <= 1) {
    return Response.json({ error: "至少保留 1 项评分标准" }, { status: 400 });
  }

  const deleted = await db
    .delete(criteria)
    .where(and(eq(criteria.id, cid), eq(criteria.competitionId, id)))
    .returning();
  if (deleted.length === 0) {
    return Response.json({ error: "评分标准不存在" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
