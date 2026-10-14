"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, copyText } from "@/lib/api";
import type { CompetitionDetail, Contestant } from "@/lib/types";
import { toast } from "@/components/Toast";
import { BrandBar, StatusBadge } from "@/components/BrandBar";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconClipboard,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconTrophy,
} from "@/components/icons";

export default function JudgePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t } = useI18n();

  const [detail, setDetail] = useState<CompetitionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [judgeId, setJudgeId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("j");
      if (p && Number.isInteger(Number(p))) return Number(p);
    }
    return null;
  });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const initedFor = useRef<string | null>(null);

  const load = useCallback(() => {
    api<CompetitionDetail>(`/api/competitions/${id}`)
      .then((d) => {
        setDetail(d);
        setLoadError(null);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  /* 初始化当前评委的分数（切换评委才重置，轮询刷新不打断输入） */
  useEffect(() => {
    if (!detail || judgeId == null) {
      initedFor.current = null;
      return;
    }
    const key = `${id}:${judgeId}`;
    if (initedFor.current === key) return;
    initedFor.current = key;
    const m: Record<string, string> = {};
    for (const s of detail.scores) {
      if (s.judgeId === judgeId) m[`${s.contestantId}:${s.criterionId}`] = String(s.value);
    }
    setVals(m);
  }, [detail, judgeId, id]);

  const judge = useMemo(
    () => detail?.judges.find((j) => j.id === judgeId) ?? null,
    [detail, judgeId],
  );

  const isLive = detail?.competition.status === "live";

  /* 某选手是否已填完整 */
  const isComplete = useCallback(
    (ct: Contestant) => {
      if (!detail) return false;
      return detail.criteria.every((c) => {
        const raw = (vals[`${ct.id}:${c.id}`] ?? "").trim();
        if (raw === "") return false;
        const v = Number(raw);
        return Number.isFinite(v) && v >= 0 && v <= c.maxScore;
      });
    },
    [detail, vals],
  );

  const completedCount = useMemo(() => {
    if (!detail) return 0;
    return detail.contestants.filter(isComplete).length;
  }, [detail, isComplete]);

  async function selectJudge(jid: number) {
    setJudgeId(jid);
    history.replaceState(null, "", `/c/${id}/judge?j=${jid}`);
  }

  function switchJudge() {
    setJudgeId(null);
    setVals({});
    history.replaceState(null, "", `/c/${id}/judge`);
  }

  async function copyMyLink() {
    if (judgeId == null) return;
    const ok = await copyText(`${window.location.origin}/c/${id}/judge?j=${judgeId}`);
    toast(ok ? t.judge.myLinkCopied : t.judge.myLinkFailed, ok ? "ok" : "err");
  }

  async function submit(ct: Contestant) {
    if (!detail || judgeId == null) return;
    const values: Record<string, number> = {};
    for (const c of detail.criteria) {
      const raw = (vals[`${ct.id}:${c.id}`] ?? "").trim();
      if (raw === "") {
        toast(t.judge.missingScoreErr(c.name), "err");
        return;
      }
      const v = Number(raw);
      if (!Number.isFinite(v)) {
        toast(t.judge.invalidScoreErr(c.name), "err");
        return;
      }
      if (v < 0 || v > c.maxScore) {
        toast(t.judge.scoreRangeErr(c.name, c.maxScore), "err");
        return;
      }
      values[String(c.id)] = v;
    }
    setSubmittingId(ct.id);
    try {
      await api(`/api/competitions/${id}/scores`, {
        method: "POST",
        body: JSON.stringify({ judgeId, contestantId: ct.id, values }),
      });
      toast(t.judge.scoreSuccess(ct.name));
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setSubmittingId(null);
    }
  }

  /* ---------------- 渲染 ---------------- */

  if (loadError) {
    return (
      <div className="min-h-screen">
        <BrandBar />
        <main className="mx-auto max-w-3xl px-4 pt-16">
          <div className="card border-[#e4b5ae] bg-[var(--red-soft)] p-6 text-center">
            <p className="font-semibold text-[var(--red)]">{loadError}</p>
            <button className="btn btn-primary mt-4" onClick={load}>
              <IconRefresh width={15} height={15} />
              {t.common.retry}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen">
        <BrandBar />
        <main className="mx-auto max-w-3xl px-4 pt-10 space-y-4">
          <div className="card h-10 w-56 animate-pulse bg-[var(--line-soft)]" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card h-24 animate-pulse bg-[var(--line-soft)]" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const comp = detail.competition;

  /* 选择评委视图 */
  if (judgeId == null || !judge) {
    return (
      <div className="min-h-screen">
        <BrandBar
          right={
            <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/c/${id}`)}>
              <IconArrowLeft width={15} height={15} />
              {t.judge.setupNav}
            </button>
          }
        />
        <main className="mx-auto max-w-3xl px-4 pt-12">
          <div className="fade-up mb-8 text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gold-soft)]">
              <IconClipboard width={26} height={26} className="text-[var(--gold-deep)]" />
            </span>
            <h1 className="font-display text-2xl font-bold">{comp.name}</h1>
            <div className="mt-2 flex items-center justify-center gap-2">
              <StatusBadge status={comp.status} />
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t.judge.identityPrompt}
            </p>
          </div>

          {detail.judges.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[var(--muted)]">
              {t.judge.noJudgesHere.split("设置页")[0]}
              <a className="font-bold text-[var(--gold-deep)] underline" href={`/c/${id}`}>
                {t.judge.setupPageLink}
              </a>
              {t.judge.noJudgesHere.split("设置页")[1] ?? ""}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.judges.map((j) => (
                <button
                  key={j.id}
                  className="card fade-up flex h-24 flex-col items-center justify-center gap-2 transition hover:border-[var(--gold)] hover:shadow-md"
                  onClick={() => selectJudge(j.id)}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--gold-soft)] text-base font-bold text-[var(--gold-deep)]">
                    {j.name.slice(0, 1)}
                  </span>
                  <span className="max-w-full truncate px-3 text-sm font-bold">{j.name}</span>
                </button>
              ))}
            </div>
          )}

          {!isLive && (
            <p className="mt-6 text-center text-xs font-semibold text-[var(--muted)]">
              {comp.status === "setup" ? t.judge.setupStatusNote : t.judge.finishedStatusNote}
            </p>
          )}
        </main>
      </div>
    );
  }

  /* 评分面板 */
  return (
    <div className="min-h-screen">
      <BrandBar
        right={
          <>
            <button className="btn btn-ghost btn-sm" onClick={copyMyLink}>
              <IconCopy width={14} height={14} />
              {t.judge.myLink}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={switchJudge}>
              <IconArrowLeft width={14} height={14} />
              {t.judge.switchJudge}
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
        <div className="fade-up mb-5 flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-soft)] text-lg font-bold text-[var(--gold-deep)]">
            {judge.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold">{judge.name}</h1>
            <p className="text-xs font-semibold text-[var(--muted)]">
              {comp.name} · {t.judge.contestantsCount(detail.contestants.length)}
            </p>
          </div>
          <StatusBadge status={comp.status} />
        </div>

        {!isLive && (
          <div className="fade-up mb-5 rounded-xl border border-[var(--line)] bg-[var(--gold-soft)] p-3 text-sm font-semibold text-[var(--gold-deep)]">
            {comp.status === "setup"
              ? t.judge.notLiveNoticeSetup
              : t.judge.notLiveNoticeFinished}
          </div>
        )}

        {/* 进度 */}
        <div className="card fade-up mb-5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">
              {t.judge.completedStat(completedCount, detail.contestants.length)}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">
              {t.judge.canUpdateNote}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
            <div
              className="h-full rounded-full bg-[var(--gold)] transition-all duration-500"
              style={{
                width: `${
                  detail.contestants.length
                    ? (completedCount / detail.contestants.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          {completedCount === detail.contestants.length &&
            detail.contestants.length > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--green)]">
                <IconTrophy width={16} height={16} />
                {t.judge.allDoneMessage}
              </p>
            )}
        </div>

        {detail.criteria.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--muted)]">
            {t.judge.noCriteriaTip}
          </div>
        ) : (
          <div className="space-y-4">
            {detail.contestants.map((ct, i) => {
              const complete = isComplete(ct);
              return (
                <section key={ct.id} className="card fade-up p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="font-display grid h-8 w-8 flex-none place-items-center rounded-lg bg-[var(--ink)] text-sm font-bold text-[var(--gold)]">
                      {i + 1}
                    </span>
                    <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold">
                      {ct.name}
                    </h2>
                    {complete && (
                      <span className="badge bg-[var(--green-soft)] text-[var(--green)]">
                        <IconCheck width={12} height={12} />
                        {t.judge.submittedBadge}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.criteria.map((c) => (
                      <label key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--paper)] px-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{c.name}</span>
                          <span className="text-xs font-semibold text-[var(--muted)]">
                            {t.judge.scoreRuleTip(c.maxScore, c.weight)}
                          </span>
                        </span>
                        <input
                          className="score-input"
                          type="number"
                          inputMode="decimal"
                          step={0.1}
                          min={0}
                          max={c.maxScore}
                          disabled={!isLive}
                          placeholder="—"
                          value={vals[`${ct.id}:${c.id}`] ?? ""}
                          onChange={(e) =>
                            setVals((s) => ({ ...s, [`${ct.id}:${c.id}`]: e.target.value }))
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    className={`btn mt-4 w-full sm:w-auto ${complete ? "btn-ghost" : "btn-gold"}`}
                    disabled={!isLive || submittingId === ct.id}
                    onClick={() => submit(ct)}
                  >
                    {submittingId === ct.id ? (
                      t.judge.submitting
                    ) : complete ? (
                      <>
                        <IconRefresh width={15} height={15} />
                        {t.judge.updateScore}
                      </>
                    ) : (
                      <>
                        <IconCheck width={15} height={15} />
                        {t.judge.submitScore}
                      </>
                    )}
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
