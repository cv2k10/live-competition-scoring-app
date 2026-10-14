import { Pool } from "pg";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as path from "node:path";
import * as fs from "node:fs";

const databaseUrl = process.env.DATABASE_URL;

export type AppDb = ReturnType<typeof drizzleNodePg>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPglite?: PGlite;
  __arenaNextJsDb?: AppDb;
  __arenaSchemaInitialized?: boolean;
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup',
  drop_highest BOOLEAN NOT NULL DEFAULT FALSE,
  drop_lowest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS criteria (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 100,
  max_score REAL NOT NULL DEFAULT 10,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS contestants (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS judges (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  judge_id INTEGER NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS scores_judge_contestant_criterion ON scores(judge_id, contestant_id, criterion_id);
CREATE INDEX IF NOT EXISTS scores_competition_idx ON scores(competition_id);
`;

function createDb() {
  if (databaseUrl) {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }

    return drizzleNodePg(pool);
  }

  // Fallback to embedded PGlite for zero-config local testing
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath =
    process.env.PG_IN_MEMORY === "true"
      ? undefined
      : path.join(dataDir, "pglite");

  const client =
    globalForDb.__arenaNextJsPglite ??
    new PGlite(dbPath);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPglite = client;
  }

  if (!globalForDb.__arenaSchemaInitialized) {
    client.exec(SCHEMA_SQL).catch((err) => {
      console.error("[PGlite] Schema initialization error:", err);
    });
    globalForDb.__arenaSchemaInitialized = true;
  }

  return drizzlePglite(client) as unknown as AppDb;
}

export function getDb(): AppDb {
  if (globalForDb.__arenaNextJsDb) {
    return globalForDb.__arenaNextJsDb;
  }
  const instance = createDb();
  globalForDb.__arenaNextJsDb = instance;
  return instance;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const targetDb = getDb();
    const value = Reflect.get(targetDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(targetDb);
    }
    return value;
  },
});

export const pool = globalForDb.__arenaNextJsPostgresqlPool;
