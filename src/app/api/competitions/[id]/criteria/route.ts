import { db } from "@/db";
import { competitions, criteria } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
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

  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "请输入评分标准名称" }, { status: 400 });
  }
  const weight = Math.round(Number(b.weight));
  const maxScore = Number(b.maxScore);
  if (!Number.isFinite(weight) || weight < 0 || weight > 1000) {
    return Response.json({ error: "权重需在 0 – 1000 之间" }, { status: 400 });
  }
  if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 100) {
    return Response.json({ error: "满分需在 0.5 – 100 之间" }, { status: 400 });
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(criteria)
    .where(eq(criteria.competitionId, id));

  const [row] = await db
    .insert(criteria)
    .values({
      competitionId: id,
      name: name.slice(0, 12),
      weight: Number.isFinite(weight) ? weight : 100,
      maxScore,
      sort: Number(n),
    })
    .returning();
  return Response.json(row, { status: 201 });
}
