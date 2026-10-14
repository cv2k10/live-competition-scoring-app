"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, fmt } from "@/lib/api";
import type { Board } from "@/lib/types";
import { BrandBar } from "@/components/BrandBar";
import { useI18n } from "@/lib/i18n";
import { IconMonitor, IconClipboard, IconRefresh, IconTrophy, IconArrowLeft } from "@/components/icons";

const RANK_COLORS = ["var(--d-gold)", "#cfc9b8", "#d08a4f"];

export default function LivePage() {
  const { id } = useParams() as { id: string };
  const { t } = useI18n();
  const [board, setBoard] = useState<Board | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const prevTotals = useRef<Record<string, number | null>>({});
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await api<Board>(`/api/competitions/${id}/board`);
      const changed = new Set<number>();
      for (const c of b.contestants) {
        const k = String(c.id);
        const pv = prevTotals.current[k];
        if (pv !== c.total && (pv !== undefined || c.total !== null)) {
          changed.add(c.id);
        }
        prevTotals.current[k] = c.total;
      }
      if (changed.size > 0) {
        setFlash(changed);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(new Set()), 1200);
      }
      setBoard(b);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    let unmounted = false;
    const run = async () => {
      try {
        const b = await api<Board>(`/api/competitions/${id}/board`);
        if (unmounted) return;
        const changed = new Set<number>();
        for (const c of b.contestants) {
          const k = String(c.id);
          const pv = prevTotals.current[k];
          if (pv !== c.total && (pv !== undefined || c.total !== null)) {
            changed.add(c.id);
          }
          prevTotals.current[k] = c.total;
        }
        if (changed.size > 0) {
          setFlash(changed);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(new Set()), 1200);
        }
        setBoard(b);
        setErr(null);
      } catch (e) {
        if (!unmounted) setErr((e as Error).message);
      }
    };

    void run();
    const t = setInterval(run, 2000);
    return () => {
      unmounted = true;
      clearInterval(t);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [id]);

  const comp = board?.competition;
  const isLive = comp?.status === "live";
  const isFinished = comp?.status === "finished";
  const expected = board ? board.totalJudges * board.contestants.length : 0;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--d-bg)", color: "var(--d-text)" }}
    >
      <BrandBar
        dark
        right={
          <>
            <Link href={`/c/${id}/judge`} className="dbtn !h-9 text-[13px]">
              <IconClipboard width={14} height={14} />
              {t.live.judgePortal}
            </Link>
            <Link href={`/c/${id}`} className="dbtn !h-9 text-[13px]">
              <IconMonitor width={14} height={14} />
              {t.live.manageBtn}
            </Link>
          </>
        }
      />

      {!board ? (
        <main className="mx-auto max-w-5xl px-4 pt-24 text-center">
          {err ? (
            <div className="mx-auto max-w-md rounded-xl border border-[var(--d-line)] bg-[var(--d-card)] p-8">
              <p className="font-bold text-[#f0938a]">{err}</p>
              <button className="dbtn mt-4" onClick={load}>
                <IconRefresh width={14} height={14} />
                {t.common.retry}
              </button>
            </div>
          ) : (
            <p className="text-[var(--d-muted)]">{t.live.loadingLive}</p>
          )}
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
          {/* 标题区 */}
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2.5">
                {isLive ? (
                  <span
                    className="badge"
                    style={{ background: "rgba(242,186,78,.14)", color: "var(--d-gold)" }}
                  >
                    <span className="live-dot" style={{ background: "var(--d-gold)" }} />
                    {t.live.liveBadge}
                  </span>
                ) : isFinished ? (
                  <span
                    className="badge"
                    style={{ background: "var(--d-gold)", color: "#241a05" }}
                  >
                    <IconTrophy width={13} height={13} />
                    {t.live.finishedBadge}
                  </span>
                ) : (
                  <span
                    className="badge"
                    style={{ background: "var(--d-card2)", color: "var(--d-muted)" }}
                  >
                    {t.live.upcomingBadge}
                  </span>
                )}
                <span className="text-xs font-semibold text-[var(--d-muted)] tnum">
                  {t.live.maxPossible(fmt(board.possible))} · {t.live.scoreCount(board.scoreCount, expected || 0)}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {comp!.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--d-muted)]">
                {isFinished
                  ? t.live.subtitleFinished
                  : isLive
                    ? t.live.subtitleLive
                    : t.live.subtitleUpcoming}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* 排名 */}
            <section>
              {board.contestants.length === 0 ? (
                <div
                  className="grid place-items-center rounded-2xl border border-dashed border-[var(--d-line)] py-24 text-center"
                >
                  <div>
                    <p className="text-lg font-bold">{t.live.noContestants}</p>
                    <p className="mt-1 text-sm text-[var(--d-muted)]">
                      {t.live.noContestantsTip}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {board.contestants.map((c) => {
                    const rank = c.rank;
                    const top = rank != null && rank <= 3;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 sm:gap-4 sm:px-4 ${
                          flash.has(c.id) ? "row-flash" : ""
                        }`}
                        style={{
                          background: top ? "var(--d-card)" : "transparent",
                          borderColor: top ? "var(--d-line)" : "transparent",
                        }}
                      >
                        {/* 名次 */}
                        <div className="w-11 flex-none text-center sm:w-14">
                          {rank != null ? (
                            <span
                              className="font-display tnum text-2xl font-bold sm:text-3xl"
                              style={{ color: rank <= 3 ? RANK_COLORS[rank - 1] : "var(--d-muted)" }}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="font-display text-2xl text-[var(--d-line)]">·</span>
                          )}
                          {rank === 1 && (
                            <IconTrophy
                              width={16}
                              height={16}
                              className="mx-auto mt-0.5"
                              style={{ color: "var(--d-gold)" }}
                            />
                          )}
                        </div>

                        {/* 姓名 + 明细 */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold sm:text-xl">{c.name}</p>
                          <div className="mt-1 hidden flex-wrap gap-1.5 md:flex">
                            {c.perCriterion.map((p) => (
                              <span
                                key={p.criterionId}
                                className="tnum rounded-md px-2 py-0.5 text-[11px] font-semibold"
                                style={{
                                   background: "var(--d-card2)",
                                   color: p.avg != null ? "var(--d-text)" : "var(--d-muted)",
                                }}
                              >
                                {p.name} {p.avg != null ? p.avg.toFixed(2) : t.live.pendingScore}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 md:hidden">
                            <span className="text-[11px] font-semibold text-[var(--d-muted)]">
                              {t.live.scoredOfJudges(c.scoredBy, board.totalJudges)}
                            </span>
                          </div>
                        </div>

                        {/* 总分 + 进度 */}
                        <div className="flex-none text-right">
                          <span
                            key={c.total == null ? "none" : c.total.toFixed(2)}
                            className={`pop-num font-display tnum text-2xl font-bold sm:text-4xl ${
                              c.total == null ? "text-[var(--d-line)]" : ""
                            }`}
                          >
                            {c.total == null ? "—" : c.total.toFixed(2)}
                          </span>
                          <div className="mt-1.5 flex items-center justify-end gap-2">
                            <div
                              className="hidden h-1.5 w-24 overflow-hidden rounded-full md:block"
                              style={{ background: "var(--d-line)" }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  background: "var(--d-gold)",
                                  width: `${
                                    board.totalJudges
                                      ? (c.scoredBy / board.totalJudges) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="hidden text-[11px] font-semibold text-[var(--d-muted)] tnum md:block">
                              {c.scoredBy}/{board.totalJudges}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 评委进度 */}
            <aside>
              <div
                className="rounded-2xl border p-4"
                style={{ background: "var(--d-card)", borderColor: "var(--d-line)" }}
              >
                <h2 className="font-display mb-3 text-sm font-bold text-[var(--d-muted)]">
                  {t.live.judgesProgressTitle}
                </h2>
                {board.judges.length === 0 ? (
                  <p className="text-sm text-[var(--d-muted)]">{t.live.noJudgesLive}</p>
                ) : (
                  <div className="space-y-3">
                    {board.judges.map((j) => {
                      const pct =
                        board.contestants.length > 0
                          ? (j.done / board.contestants.length) * 100
                          : 0;
                      const done = j.done === board.contestants.length && board.contestants.length > 0;
                      return (
                        <div key={j.id}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className={`truncate font-semibold ${done ? "text-[var(--d-gold)]" : ""}`}>
                              {j.name}
                            </span>
                            <span className="tnum text-xs font-semibold text-[var(--d-muted)]">
                              {j.done}/{board.contestants.length}
                            </span>
                          </div>
                          <div
                            className="h-1.5 overflow-hidden rounded-full"
                            style={{ background: "var(--d-line)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                background: done ? "var(--d-gold)" : "#4a4660",
                                width: `${pct}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className="mt-4 flex items-center justify-between rounded-2xl border p-4"
                style={{ background: "var(--d-card)", borderColor: "var(--d-line)" }}
              >
                <div>
                  <p className="text-xs font-semibold text-[var(--d-muted)]">{t.live.rulesTitle}</p>
                  <p className="mt-1 text-sm font-bold">
                    {comp!.dropHighest || comp!.dropLowest
                      ? [comp!.dropHighest ? t.live.dropHighestTag : null, comp!.dropLowest ? t.live.dropLowestTag : null]
                          .filter(Boolean)
                          .join(" · ")
                      : t.live.allCountTag}
                    {" · "}
                    {t.live.weightedTag}
                  </p>
                </div>
                <Link href="/" className="dbtn !h-9" style={{ color: "var(--d-muted)" }}>
                  <IconArrowLeft width={14} height={14} />
                  {t.live.homeBtn}
                </Link>
              </div>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
