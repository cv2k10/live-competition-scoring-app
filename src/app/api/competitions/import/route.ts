import { db } from "@/db";
import { competitions, criteria, contestants, judges, scores } from "@/db/schema";
import type { CompetitionExportData, CompetitionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: CompetitionExportData;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "无效的 JSON 数据 (Invalid JSON)" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "数据格式错误 (Invalid payload)" }, { status: 400 });
  }

  const compData = body.competition;
  const name = String(compData?.name || "").trim();
  if (!name) {
    return Response.json({ error: "缺少比赛名称 (Missing competition name)" }, { status: 400 });
  }

  const validStatuses: CompetitionStatus[] = ["setup", "live", "finished"];
  const status: CompetitionStatus = validStatuses.includes(compData.status)
    ? compData.status
    : "setup";

  const dropHighest = Boolean(compData.dropHighest);
  const dropLowest = Boolean(compData.dropLowest);

  // 1. Create competition
  const [comp] = await db
    .insert(competitions)
    .values({
      name: name.slice(0, 100),
      status,
      dropHighest,
      dropLowest,
    })
    .returning();

  // 2. Insert criteria
  const rawCriteria = Array.isArray(body.criteria) ? body.criteria : [];
  const insertedCriteria: Array<{ id: number }> = [];

  if (rawCriteria.length === 0) {
    const [c] = await db
      .insert(criteria)
      .values({
        competitionId: comp.id,
        name: "综合得分",
        weight: 100,
        maxScore: 10,
        sort: 0,
      })
      .returning();
    insertedCriteria.push(c);
  } else {
    for (let i = 0; i < rawCriteria.length; i++) {
      const c = rawCriteria[i];
      const [inserted] = await db
        .insert(criteria)
        .values({
          competitionId: comp.id,
          name: String(c.name || `标准 ${i + 1}`).trim().slice(0, 40),
          weight: Math.max(1, Number(c.weight) || 100),
          maxScore: Math.max(1, Number(c.maxScore) || 10),
          sort: typeof c.sort === "number" ? c.sort : i,
        })
        .returning();
      insertedCriteria.push(inserted);
    }
  }

  // 3. Insert contestants
  const rawContestants = Array.isArray(body.contestants) ? body.contestants : [];
  const insertedContestants: Array<{ id: number }> = [];

  for (let i = 0; i < rawContestants.length; i++) {
    const ct = rawContestants[i];
    const ctName = String(ct.name || `选手 ${i + 1}`).trim().slice(0, 50);
    const [inserted] = await db
      .insert(contestants)
      .values({
        competitionId: comp.id,
        name: ctName,
        sort: typeof ct.sort === "number" ? ct.sort : i,
      })
      .returning();
    insertedContestants.push(inserted);
  }

  // 4. Insert judges
  const rawJudges = Array.isArray(body.judges) ? body.judges : [];
  const insertedJudges: Array<{ id: number }> = [];

  for (let i = 0; i < rawJudges.length; i++) {
    const j = rawJudges[i];
    const jName = String(j.name || `评委 ${i + 1}`).trim().slice(0, 30);
    const [inserted] = await db
      .insert(judges)
      .values({
        competitionId: comp.id,
        name: jName,
      })
      .returning();
    insertedJudges.push(inserted);
  }

  // 5. Insert scores
  const rawScores = Array.isArray(body.scores) ? body.scores : [];
  const scoreRowsToInsert: Array<{
    competitionId: number;
    contestantId: number;
    judgeId: number;
    criterionId: number;
    value: number;
  }> = [];

  const seenScoreKeys = new Set<string>();

  for (const s of rawScores) {
    if (
      typeof s.contestantIndex !== "number" ||
      typeof s.judgeIndex !== "number" ||
      typeof s.criterionIndex !== "number" ||
      typeof s.value !== "number" ||
      isNaN(s.value)
    ) {
      continue;
    }

    const ct = insertedContestants[s.contestantIndex];
    const jd = insertedJudges[s.judgeIndex];
    const cr = insertedCriteria[s.criterionIndex];

    if (!ct || !jd || !cr) {
      continue;
    }

    const key = `${jd.id}:${ct.id}:${cr.id}`;
    if (seenScoreKeys.has(key)) {
      continue;
    }
    seenScoreKeys.add(key);

    scoreRowsToInsert.push({
      competitionId: comp.id,
      contestantId: ct.id,
      judgeId: jd.id,
      criterionId: cr.id,
      value: s.value,
    });
  }

  if (scoreRowsToInsert.length > 0) {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < scoreRowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = scoreRowsToInsert.slice(i, i + CHUNK_SIZE);
      await db.insert(scores).values(chunk);
    }
  }

  return Response.json(
    {
      id: comp.id,
      name: comp.name,
      counts: {
        criteria: insertedCriteria.length,
        contestants: insertedContestants.length,
        judges: insertedJudges.length,
        scores: scoreRowsToInsert.length,
      },
    },
    { status: 201 }
  );
}
