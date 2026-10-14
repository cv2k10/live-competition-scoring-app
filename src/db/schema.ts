import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const competitions = sqliteTable("competitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  status: text("status", { enum: ["setup", "live", "finished"] })
    .notNull()
    .default("setup"),
  dropHighest: integer("drop_highest", { mode: "boolean" })
    .notNull()
    .default(false),
  dropLowest: integer("drop_lowest", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const criteria = sqliteTable(
  "criteria",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    weight: integer("weight").notNull().default(100),
    maxScore: real("max_score").notNull().default(10),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("criteria_competition_idx").on(t.competitionId)],
);

export const contestants = sqliteTable(
  "contestants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("contestants_competition_idx").on(t.competitionId)],
);

export const judges = sqliteTable(
  "judges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("judges_competition_idx").on(t.competitionId)],
);

export const scores = sqliteTable(
  "scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    judgeId: integer("judge_id")
      .notNull()
      .references(() => judges.id, { onDelete: "cascade" }),
    contestantId: integer("contestant_id")
      .notNull()
      .references(() => contestants.id, { onDelete: "cascade" }),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteria.id, { onDelete: "cascade" }),
    value: real("value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("scores_judge_contestant_criterion").on(
      t.judgeId,
      t.contestantId,
      t.criterionId,
    ),
    index("scores_competition_idx").on(t.competitionId),
  ],
);
