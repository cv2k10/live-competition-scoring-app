import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup',
  drop_highest INTEGER NOT NULL DEFAULT 0,
  drop_lowest INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 100,
  max_score REAL NOT NULL DEFAULT 10,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contestants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS judges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  judge_id INTEGER NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS scores_judge_contestant_criterion ON scores(judge_id, contestant_id, criterion_id);
CREATE INDEX IF NOT EXISTS scores_competition_idx ON scores(competition_id);
CREATE INDEX IF NOT EXISTS criteria_competition_idx ON criteria(competition_id);
CREATE INDEX IF NOT EXISTS contestants_competition_idx ON contestants(competition_id);
CREATE INDEX IF NOT EXISTS judges_competition_idx ON judges(competition_id);
`;

let schemaInitialized = false;

export function getDb(): AppDb {
  try {
    const ctx = getCloudflareContext();
    const d1 = (ctx.env as { DB?: any })?.DB;
    if (d1) {
      if (!schemaInitialized) {
        d1.exec(SCHEMA_SQL).catch((err: unknown) => {
          console.error("[D1] Auto-init schema error:", err);
        });
        schemaInitialized = true;
      }
      return drizzle(d1, { schema });
    }
  } catch {
    // Outside request context (e.g. build phase)
  }

  return drizzle({} as any, { schema });
}

export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const targetDb = getDb();
    const value = Reflect.get(targetDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(targetDb);
    }
    return value;
  },
});
