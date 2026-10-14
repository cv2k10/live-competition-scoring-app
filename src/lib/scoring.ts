import type {
  Board,
  BoardContestant,
  BoardJudge,
  Competition,
  Contestant,
  Criterion,
  Judge,
  ScoreRow,
} from "./types";

/**
 * 汇总所有评委的打分，计算每位选手的实时总分与排名。
 * - 每项标准分别取所有评委的分数；
 * - 按规则去掉最高 / 最低分（至少 3 个分数才去）；
 * - 求平均后按权重（%）累加为总分。
 */
export function aggregateBoard(
  competition: Competition,
  contestants: Contestant[],
  criteria: Criterion[],
  judges: Judge[],
  scores: ScoreRow[],
): Board {
  const values = new Map<number, Map<number, number[]>>();
  const judgeTouched = new Map<string, Set<number>>();

  for (const s of scores) {
    let cm = values.get(s.contestantId);
    if (!cm) {
      cm = new Map();
      values.set(s.contestantId, cm);
    }
    let arr = cm.get(s.criterionId);
    if (!arr) {
      arr = [];
      cm.set(s.criterionId, arr);
    }
    arr.push(s.value);

    const k = `${s.judgeId}:${s.contestantId}`;
    let set = judgeTouched.get(k);
    if (!set) {
      set = new Set();
      judgeTouched.set(k, set);
    }
    set.add(s.criterionId);
  }

  const possible = criteria.reduce(
    (a, c) => a + c.maxScore * (c.weight / 100),
    0,
  );

  const rows: BoardContestant[] = contestants.map((ct) => {
    const cm = values.get(ct.id);
    const perCriterion = criteria.map((c) => {
      const vals = cm?.get(c.id) ?? [];
      let avg: number | null = null;
      if (vals.length > 0) {
        let arr = [...vals];
        if (competition.dropHighest && vals.length >= 3) {
          arr.splice(arr.indexOf(Math.max(...arr)), 1);
        }
        if (competition.dropLowest && vals.length >= 3) {
          arr.splice(arr.indexOf(Math.min(...arr)), 1);
        }
        avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      }
      return { criterionId: c.id, name: c.name, avg, count: vals.length };
    });

    const done = perCriterion.filter((p) => p.avg !== null);
    const total = done.length
      ? done.reduce((sum, p) => {
          const c = criteria.find((x) => x.id === p.criterionId)!;
          return sum + (p.avg as number) * (c.weight / 100);
        }, 0)
      : null;

    let scoredBy = 0;
    for (const j of judges) {
      if ((judgeTouched.get(`${j.id}:${ct.id}`)?.size ?? 0) > 0) scoredBy++;
    }

    return {
      id: ct.id,
      name: ct.name,
      sort: ct.sort,
      rank: null,
      total,
      scoredBy,
      perCriterion,
    };
  });

  const ranked = rows
    .filter((r) => r.total !== null)
    .sort((a, b) => (b.total as number) - (a.total as number));
  ranked.forEach((r, i) => {
    r.rank = i + 1;
  });
  const unordered = rows
    .filter((r) => r.total === null)
    .sort((a, b) => a.sort - b.sort);

  const judgesAgg: BoardJudge[] = judges.map((j) => {
    let doneCount = 0;
    for (const ct of contestants) {
      const set = judgeTouched.get(`${j.id}:${ct.id}`);
      if (set && criteria.length > 0 && set.size === criteria.length) {
        doneCount++;
      }
    }
    return { id: j.id, name: j.name, done: doneCount };
  });

  return {
    competition,
    possible,
    scoreCount: scores.length,
    contestants: [...ranked, ...unordered],
    judges: judgesAgg,
    totalJudges: judges.length,
  };
}
