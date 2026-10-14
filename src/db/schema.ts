import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  real,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["setup", "live", "finished"] })
    .notNull()
    .default("setup"),
  dropHighest: boolean("drop_highest").notNull().default(false),
  dropLowest: boolean("drop_lowest").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const criteria = pgTable(
  "criteria",
  {
    id: serial("id").primaryKey(),
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

export const contestants = pgTable(
  "contestants",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("contestants_competition_idx").on(t.competitionId)],
);

export const judges = pgTable(
  "judges",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("judges_competition_idx").on(t.competitionId)],
);

export const scores = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
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
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
