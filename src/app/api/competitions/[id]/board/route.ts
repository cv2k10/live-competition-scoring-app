import { db } from "@/db";
import { competitions, criteria, contestants, judges, scores } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { aggregateBoard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }

  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) {
    return Response.json({ error: "比赛不存在" }, { status: 404 });
  }

  const [critRows, ctRows, jdRows, scoreRows] = await Promise.all([
    db.select().from(criteria).where(eq(criteria.competitionId, id)),
    db
      .select()
      .from(contestants)
      .where(eq(contestants.competitionId, id))
      .orderBy(asc(contestants.sort)),
    db.select().from(judges).where(eq(judges.competitionId, id)),
    db
      .select({
        judgeId: scores.judgeId,
        contestantId: scores.contestantId,
        criterionId: scores.criterionId,
        value: scores.value,
      })
      .from(scores)
      .where(eq(scores.competitionId, id)),
  ]);

  return Response.json(
    aggregateBoard(comp, ctRows, critRows, jdRows, scoreRows),
  );
}
