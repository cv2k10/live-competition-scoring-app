import { db } from "@/db";
import { competitions, criteria, contestants, judges, scores } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const notFound = () =>
  Response.json({ error: "比赛不存在" }, { status: 404 });

export async function GET(_req: Request, ctx: Ctx) {
  const id = await parseId(ctx.params);
  if (id == null) return notFound();
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) return notFound();

  const [critRows, ctRows, jdRows, scoreRows] = await Promise.all([
    db
      .select()
      .from(criteria)
      .where(eq(criteria.competitionId, id))
      .orderBy(asc(criteria.sort)),
    db
      .select()
      .from(contestants)
      .where(eq(contestants.competitionId, id))
      .orderBy(asc(contestants.sort)),
    db
      .select()
      .from(judges)
      .where(eq(judges.competitionId, id))
      .orderBy(asc(judges.id)),
    db
      .select()
      .from(scores)
      .where(eq(scores.competitionId, id)),
  ]);

  return Response.json({
    competition: comp,
    criteria: critRows,
    contestants: ctRows,
    judges: jdRows,
    scores: scoreRows.map((s) => ({
      judgeId: s.judgeId,
      contestantId: s.contestantId,
      criterionId: s.criterionId,
      value: s.value,
    })),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const id = await parseId(ctx.params);
  if (id == null) return notFound();
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) return notFound();

  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof b.name === "string" && b.name.trim()) {
    patch.name = b.name.trim().slice(0, 40);
  }
  if (
    b.status === "setup" ||
    b.status === "live" ||
    b.status === "finished"
  ) {
    if (
      b.status === "live" &&
      comp.status === "setup" &&
      !(await db
        .select({ n: contestants.id })
        .from(contestants)
        .where(eq(contestants.competitionId, id))
        .limit(1)).length
    ) {
      return Response.json({ error: "至少需要 1 名选手才能开始" }, { status: 400 });
    }
    patch.status = b.status;
  }
  if (typeof b.dropHighest === "boolean") patch.dropHighest = b.dropHighest;
  if (typeof b.dropLowest === "boolean") patch.dropLowest = b.dropLowest;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const [row] = await db
    .update(competitions)
    .set(patch)
    .where(eq(competitions.id, id))
    .returning();
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = await parseId(ctx.params);
  if (id == null) return notFound();
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) return notFound();
  await db.delete(competitions).where(eq(competitions.id, id));
  return Response.json({ ok: true });
}
