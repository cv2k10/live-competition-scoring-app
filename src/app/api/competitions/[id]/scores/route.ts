import { db } from "@/db";
import { competitions, criteria, contestants, judges, scores } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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
  if (comp.status !== "live") {
    return Response.json(
      {
        error:
          comp.status === "setup" ? "比赛尚未开始，无法提交评分" : "比赛已结束，无法提交评分",
      },
      { status: 400 },
    );
  }

  const b = await req.json().catch(() => ({}));
  const judgeId = Number(b.judgeId);
  const contestantId = Number(b.contestantId);
  const values = (b.values ?? {}) as Record<string, unknown>;

  if (!Number.isInteger(judgeId) || !Number.isInteger(contestantId)) {
    return Response.json({ error: "参数无效" }, { status: 400 });
  }

  const [judge] = await db
    .select()
    .from(judges)
    .where(and(eq(judges.id, judgeId), eq(judges.competitionId, id)));
  if (!judge) {
    return Response.json({ error: "评委不存在" }, { status: 404 });
  }
  const [ct] = await db
    .select()
    .from(contestants)
    .where(and(eq(contestants.id, contestantId), eq(contestants.competitionId, id)));
  if (!ct) {
    return Response.json({ error: "选手不存在" }, { status: 404 });
  }

  const crits = await db
    .select()
    .from(criteria)
    .where(eq(criteria.competitionId, id));

  let n = 0;
  for (const c of crits) {
    const raw = values[String(c.id)] ?? values[c.id];
    if (raw == null || raw === "") continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const clamped = Math.min(Math.max(v, 0), c.maxScore);
    await db
      .insert(scores)
      .values({
        competitionId: id,
        judgeId,
        contestantId,
        criterionId: c.id,
        value: clamped,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [scores.judgeId, scores.contestantId, scores.criterionId],
        set: { value: clamped, updatedAt: new Date() },
      });
    n++;
  }

  if (n === 0) {
    return Response.json({ error: "未解析到有效分数" }, { status: 400 });
  }
  return Response.json({ ok: true, count: n });
}
