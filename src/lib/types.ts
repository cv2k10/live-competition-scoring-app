export type CompetitionStatus = "setup" | "live" | "finished";

export interface Competition {
  id: number;
  name: string;
  status: CompetitionStatus;
  dropHighest: boolean;
  dropLowest: boolean;
  createdAt: string | Date;
}

export interface CompetitionSummary extends Competition {
  contestantCount: number;
  judgeCount: number;
}

export interface Criterion {
  id: number;
  competitionId: number;
  name: string;
  weight: number;
  maxScore: number;
  sort: number;
}

export interface Contestant {
  id: number;
  competitionId: number;
  name: string;
  sort: number;
}

export interface Judge {
  id: number;
  competitionId: number;
  name: string;
}

export interface ScoreRow {
  judgeId: number;
  contestantId: number;
  criterionId: number;
  value: number;
}

export interface CompetitionDetail {
  competition: Competition;
  criteria: Criterion[];
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRow[];
}

export interface BoardCriterionAvg {
  criterionId: number;
  name: string;
  avg: number | null;
  count: number;
}

export interface BoardContestant {
  id: number;
  name: string;
  sort: number;
  rank: number | null;
  total: number | null;
  scoredBy: number;
  perCriterion: BoardCriterionAvg[];
}

export interface BoardJudge {
  id: number;
  name: string;
  done: number;
}

export interface Board {
  competition: Competition;
  possible: number;
  scoreCount: number;
  contestants: BoardContestant[];
  judges: BoardJudge[];
  totalJudges: number;
}
