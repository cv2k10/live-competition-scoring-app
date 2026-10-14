import { db } from "@/db";
import { competitions, judges } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  const name = String(b.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "请输入评委姓名" }, { status: 400 });
  }

  const [row] = await db
    .insert(judges)
    .values({ competitionId: id, name: name.slice(0, 20) })
    .returning();
  return Response.json(row, { status: 201 });
}
