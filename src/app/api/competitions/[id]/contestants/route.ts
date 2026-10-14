import { db } from "@/db";
import { competitions, contestants } from "@/db/schema";
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

  const b = await req.json().catch(() => ({}));
  let names: string[] = Array.isArray(b.names)
    ? b.names.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];
  if (names.length === 0 && typeof b.name === "string" && b.name.trim()) {
    names = [b.name.trim()];
  }
  names = names.slice(0, 100).map((n) => n.slice(0, 30));
  if (names.length === 0) {
    return Response.json({ error: "请输入选手姓名" }, { status: 400 });
  }

  const [{ m }] = await db
    .select({ m: sql<number>`coalesce(max(sort), -1)` })
    .from(contestants)
    .where(eq(contestants.competitionId, id));
  const start = Number(m) + 1;

  const rows = names.map((name, i) => ({
    competitionId: id,
    name,
    sort: start + i,
  }));
  await db.insert(contestants).values(rows);
  return Response.json({ ok: true, added: rows.length }, { status: 201 });
}
