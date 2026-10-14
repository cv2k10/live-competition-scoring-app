import { db } from "@/db";
import { competitions, criteria, contestants, judges, scores } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { CompetitionExportData, ExportScore } from "@/lib/types";

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

  const critIdToIndex = new Map<number, number>(critRows.map((c, i) => [c.id, i]));
  const ctIdToIndex = new Map<number, number>(ctRows.map((ct, i) => [ct.id, i]));
  const jdIdToIndex = new Map<number, number>(jdRows.map((j, i) => [j.id, i]));

  const mappedScores: ExportScore[] = [];
  for (const s of scoreRows) {
    const contestantIndex = ctIdToIndex.get(s.contestantId);
    const judgeIndex = jdIdToIndex.get(s.judgeId);
    const criterionIndex = critIdToIndex.get(s.criterionId);
    if (contestantIndex !== undefined && judgeIndex !== undefined && criterionIndex !== undefined) {
      mappedScores.push({
        contestantIndex,
        judgeIndex,
        criterionIndex,
        value: s.value,
      });
    }
  }

  // Sort scores cleanly by contestantIndex, judgeIndex, criterionIndex
  mappedScores.sort((a, b) => {
    if (a.contestantIndex !== b.contestantIndex) return a.contestantIndex - b.contestantIndex;
    if (a.judgeIndex !== b.judgeIndex) return a.judgeIndex - b.judgeIndex;
    return a.criterionIndex - b.criterionIndex;
  });

  const exportData: CompetitionExportData = {
    competition: {
      name: comp.name,
      status: comp.status,
      dropHighest: comp.dropHighest,
      dropLowest: comp.dropLowest,
    },
    criteria: critRows.map((c, i) => ({
      name: c.name,
      weight: c.weight,
      maxScore: c.maxScore,
      sort: c.sort ?? i,
    })),
    judges: jdRows.map((j) => ({
      name: j.name,
    })),
    contestants: ctRows.map((ct, i) => ({
      name: ct.name,
      sort: ct.sort ?? i,
    })),
    scores: mappedScores,
  };

  const filename = `${comp.name.replace(/[/\\?%*:|"<>]/g, "_")}_data.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
