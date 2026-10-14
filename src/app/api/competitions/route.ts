import { db } from "@/db";
import { competitions, contestants, judges, criteria } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(competitions)
    .orderBy(desc(competitions.createdAt));

  const [ctCounts, jdCounts] = await Promise.all([
    db
      .select({
        competitionId: contestants.competitionId,
        n: sql<number>`count(*)`,
      })
      .from(contestants)
      .groupBy(contestants.competitionId),
    db
      .select({
        competitionId: judges.competitionId,
        n: sql<number>`count(*)`,
      })
      .from(judges)
      .groupBy(judges.competitionId),
  ]);

  const ctMap = new Map(ctCounts.map((r) => [r.competitionId, Number(r.n)]));
  const jdMap = new Map(jdCounts.map((r) => [r.competitionId, Number(r.n)]));

  return Response.json(
    rows.map((r) => ({
      ...r,
      contestantCount: ctMap.get(r.id) ?? 0,
      judgeCount: jdMap.get(r.id) ?? 0,
    })),
  );
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "请输入比赛名称" }, { status: 400 });
  }
  const [row] = await db
    .insert(competitions)
    .values({ name: name.slice(0, 40) })
    .returning();
  await db.insert(criteria).values({
    competitionId: row.id,
    name: "综合得分",
    weight: 100,
    maxScore: 10,
    sort: 0,
  });
  return Response.json(row, { status: 201 });
}
