"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, copyText } from "@/lib/api";
import type { CompetitionDetail } from "@/lib/types";
import { toast } from "@/components/Toast";
import { BrandBar, StatusBadge } from "@/components/BrandBar";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconLink,
  IconPlay,
  IconFlag,
  IconMonitor,
  IconClipboard,
  IconCheck,
  IconMic,
  IconUsers,
  IconRefresh,
} from "@/components/icons";

type ConfirmState = { kind: "contestant" | "judge" | "criterion" | "comp"; id: number } | null;

export default function SetupPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t } = useI18n();

  const [detail, setDetail] = useState<CompetitionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [bulk, setBulk] = useState("");
  const [newJudge, setNewJudge] = useState("");
  const [critName, setCritName] = useState("");
  const [critWeight, setCritWeight] = useState("100");
  const [critMax, setCritMax] = useState("10");

  const load = useCallback(() => {
    api<CompetitionDetail>(`/api/competitions/${id}`)
      .then((d) => {
        setDetail(d);
        setLoadError(null);
        if (!nameEdited) {
          setName(d.competition.name);
        }
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [id, nameEdited]);

  useEffect(() => {
    load();
  }, [load]);

  const comp = detail?.competition;
  const editableCriteria = comp?.status === "setup";

  /* 每位评委已完成的人数 */
  const judgeProgress = useMemo(() => {
    const m = new Map<number, number>();
    if (!detail) return m;
    const byPair = new Map<string, Set<number>>();
    for (const s of detail.scores) {
      const k = `${s.judgeId}:${s.contestantId}`;
      let st = byPair.get(k);
      if (!st) {
        st = new Set();
        byPair.set(k, st);
      }
      st.add(s.criterionId);
    }
    for (const j of detail.judges) {
      let n = 0;
      for (const ct of detail.contestants) {
        const st = byPair.get(`${j.id}:${ct.id}`);
        if (st && detail.criteria.length > 0 && st.size === detail.criteria.length) n++;
      }
      m.set(j.id, n);
    }
    return m;
  }, [detail]);

  /* 每位选手已收到多少评委的分 */
  const ctScoredBy = useMemo(() => {
    const m = new Map<number, number>();
    if (!detail) return m;
    const byPair = new Map<string, Set<number>>();
    for (const s of detail.scores) {
      const k = `${s.judgeId}:${s.contestantId}`;
      let st = byPair.get(k);
      if (!st) {
        st = new Set();
        byPair.set(k, st);
      }
      st.add(s.criterionId);
    }
    for (const ct of detail.contestants) {
      let n = 0;
      for (const j of detail.judges) {
        if ((byPair.get(`${j.id}:${ct.id}`)?.size ?? 0) > 0) n++;
      }
      m.set(ct.id, n);
    }
    return m;
  }, [detail]);

  function armConfirm(kind: NonNullable<ConfirmState>["kind"], cid: number) {
    if (confirm && confirm.kind === kind && confirm.id === cid) {
      doDelete(kind, cid);
      setConfirm(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    } else {
      setConfirm({ kind, id: cid });
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirm(null), 2600);
    }
  }

  function doDelete(kind: NonNullable<ConfirmState>["kind"], cid: number) {
    const path =
      kind === "comp"
        ? `/api/competitions/${id}`
        : kind === "contestant"
          ? `/api/competitions/${id}/contestants/${cid}`
          : kind === "judge"
            ? `/api/competitions/${id}/judges/${cid}`
            : `/api/competitions/${id}/criteria/${cid}`;
    api(path, { method: "DELETE" })
      .then(() => {
        if (kind === "comp") {
          toast(t.dashboard.compDeleted);
          router.push("/");
          return;
        }
        toast(t.setup.compDeletedMsg);
        load();
      })
      .catch((e: Error) => toast(e.message, "err"));
  }

  async function saveName() {
    const n = name.trim();
    if (!detail || !comp) return;
    if (!n) {
      toast(t.setup.compNameEmpty, "err");
      return;
    }
    if (n === comp.name) return;
    try {
      await api(`/api/competitions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: n }),
      });
      setNameEdited(false);
      toast(t.setup.compNameSaved);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function patchComp(patch: Record<string, unknown>, msg?: string) {
    try {
      await api(`/api/competitions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (msg) toast(msg);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function addContestants() {
    const names = bulk
      .split(/[\n,，、;；\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (names.length === 0) {
      toast(t.setup.enterContestantName, "err");
      return;
    }
    try {
      const res = await api<{ added: number }>(`/api/competitions/${id}/contestants`, {
        method: "POST",
        body: JSON.stringify({ names }),
      });
      setBulk("");
      toast(t.setup.contestantsAdded(res.added));
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function addJudge() {
    const n = newJudge.trim();
    if (!n) {
      toast(t.setup.enterJudgeName, "err");
      return;
    }
    try {
      await api(`/api/competitions/${id}/judges`, {
        method: "POST",
        body: JSON.stringify({ name: n }),
      });
      setNewJudge("");
      toast(t.setup.judgeAddedMsg);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function addCriterion() {
    const n = critName.trim();
    if (!n) {
      toast(t.setup.critNameEmpty, "err");
      return;
    }
    try {
      await api(`/api/competitions/${id}/criteria`, {
        method: "POST",
        body: JSON.stringify({ name: n, weight: Number(critWeight) || 100, maxScore: Number(critMax) || 10 }),
      });
      setCritName("");
      setCritWeight("100");
      setCritMax("10");
      toast(t.setup.critAddedMsg);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function patchCriterion(cid: number, patch: Record<string, unknown>) {
    try {
      await api(`/api/competitions/${id}/criteria/${cid}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function renameContestant(cid: number, n: string) {
    const v = n.trim();
    if (!v) return;
    try {
      await api(`/api/competitions/${id}/contestants/${cid}`, {
        method: "PATCH",
        body: JSON.stringify({ name: v }),
      });
      toast(t.setup.contestantRenamed);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  async function copyJudgeLink(judgeId: number) {
    const ok = await copyText(`${window.location.origin}/c/${id}/judge?j=${judgeId}`);
    toast(ok ? t.setup.judgePersonalLinkCopied : t.setup.judgePersonalLinkFailed, ok ? "ok" : "err");
  }

  async function copyLink(path: string, msg: string) {
    const ok = await copyText(`${window.location.origin}${path}`);
    toast(ok ? msg : t.common.copyFailed, ok ? "ok" : "err");
  }

  /* ---------------- render ---------------- */

  if (loadError) {
    return (
      <div className="min-h-screen">
        <BrandBar right={<Link href="/" className="btn btn-ghost btn-sm">{t.common.back}</Link>} />
        <main className="mx-auto max-w-6xl px-4 pt-16">
          <div className="card border-[#e4b5ae] bg-[var(--red-soft)] p-6 text-center">
            <p className="font-semibold text-[var(--red)]">{loadError}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="btn btn-ghost" onClick={load}>
                <IconRefresh width={15} height={15} />
                {t.common.retry}
              </button>
              <Link href="/" className="btn btn-primary">
                {t.common.back}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!detail || !comp) {
    return (
      <div className="min-h-screen">
        <BrandBar />
        <main className="mx-auto max-w-6xl px-4 pt-10">
          <div className="card h-10 w-64 animate-pulse bg-[var(--line-soft)]" />
          <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
            <div className="card h-64 animate-pulse bg-[var(--line-soft)]" />
            <div className="card h-64 animate-pulse bg-[var(--line-soft)]" />
          </div>
        </main>
      </div>
    );
  }

  const canStart = detail.contestants.length > 0 && detail.judges.length > 0;

  return (
    <div className="min-h-screen">
      <BrandBar
        right={
          <>
            <Link href={`/c/${id}/judge`} className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <IconClipboard width={14} height={14} />
              {t.setup.judgeEntranceBtn}
            </Link>
            <Link href={`/c/${id}/live`} className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <IconMonitor width={14} height={14} />
              {t.setup.liveScreenBtn}
            </Link>
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8">
        {/* 标题行 */}
        <div className="fade-up mb-6 flex flex-wrap items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/")}>
            <IconArrowLeft width={15} height={15} />
            {t.setup.allComps}
          </button>
          <StatusBadge status={comp.status} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {comp.status === "setup" && (
              <button
                className="btn btn-gold"
                disabled={!canStart}
                onClick={() =>
                  comp.status === "setup" &&
                  patchComp({ status: "live" }, t.setup.compStartedMsg)
                }
                title={!canStart ? t.setup.startCompNote : ""}
              >
                <IconPlay width={15} height={15} />
                {t.setup.startComp}
              </button>
            )}
            {comp.status === "live" && (
              <button
                className="btn btn-danger"
                onClick={() => patchComp({ status: "finished" }, t.setup.compFinishedMsg)}
              >
                <IconFlag width={15} height={15} />
                {t.setup.finishComp}
              </button>
            )}
            {comp.status === "finished" && (
              <button className="btn btn-ghost" onClick={() => patchComp({ status: "live" }, t.setup.compReopenedMsg)}>
                <IconRefresh width={15} height={15} />
                {t.setup.reopenComp}
              </button>
            )}
            {comp.status !== "live" && (
              <button
                className={`btn btn-sm ${confirm?.kind === "comp" ? "btn-danger" : "btn-ghost"}`}
                onClick={() => armConfirm("comp", comp.id)}
              >
                <IconTrash width={14} height={14} />
                {confirm?.kind === "comp" ? t.common.confirmDelete : t.common.delete}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* 左列：基本信息 + 规则 */}
          <div className="space-y-5">
            <section className="card fade-up p-5">
              <h2 className="label">{t.setup.compName}</h2>
              <input
                className="input"
                value={name}
                maxLength={40}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameEdited(true);
                }}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{t.setup.dropHighest}</p>
                    <p className="text-xs text-[var(--muted)]">{t.setup.dropRuleTip}</p>
                  </div>
                  <button
                    className="switch"
                    role="switch"
                    aria-checked={comp.dropHighest}
                    onClick={() => patchComp({ dropHighest: !comp.dropHighest })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{t.setup.dropLowest}</p>
                    <p className="text-xs text-[var(--muted)]">{t.setup.dropRuleTip}</p>
                  </div>
                  <button
                    className="switch"
                    role="switch"
                    aria-checked={comp.dropLowest}
                    onClick={() => patchComp({ dropLowest: !comp.dropLowest })}
                  />
                </div>
              </div>
            </section>

            <section className="card fade-up p-5">
              <h2 className="label">{t.setup.quickLinks}</h2>
              <div className="space-y-2">
                <Link href={`/c/${id}/judge`} className="btn btn-primary w-full">
                  <IconClipboard width={15} height={15} />
                  {t.setup.judgeEntranceBtn}
                </Link>
                <Link href={`/c/${id}/live`} className="btn btn-gold w-full">
                  <IconMonitor width={15} height={15} />
                  {t.setup.liveScreenBtn}
                </Link>
                <button
                  className="btn btn-ghost w-full"
                  onClick={() => copyLink(`/c/${id}/judge`, t.setup.judgeLinkCopied)}
                >
                  <IconLink width={15} height={15} />
                  {t.setup.copyJudgeLinkBtn}
                </button>
                <button
                  className="btn btn-ghost w-full"
                  onClick={() => copyLink(`/c/${id}/live`, t.setup.liveLinkCopied)}
                >
                  <IconLink width={15} height={15} />
                  {t.setup.copyLiveLinkBtn}
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                {t.setup.judgeExplainer}
              </p>
            </section>
          </div>

          {/* 右列 */}
          <div className="space-y-5">
            {/* 评分标准 */}
            <section className="card fade-up p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-bold">{t.setup.criteriaTitle}</h2>
                {!editableCriteria && (
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {t.setup.criteriaLockedTip}
                  </span>
                )}
              </div>
              <div>
                {detail.criteria.map((c) => (
                  <div key={c.id} className="row-item">
                    <span className="font-display w-6 text-center text-sm font-bold text-[var(--gold-deep)]">
                      {c.sort + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.name}</span>
                    {editableCriteria ? (
                      <>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                          {t.setup.weight}
                          <input
                            className="input h-8 w-16 text-center text-sm"
                            type="number"
                            min={0}
                            max={1000}
                            defaultValue={c.weight}
                            key={`w${c.id}-${c.weight}`}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== c.weight && Number.isFinite(v) && v >= 0)
                                patchCriterion(c.id, { weight: Math.round(v) });
                            }}
                          />
                          %
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                          {t.setup.maxScore}
                          <input
                            className="input h-8 w-16 text-center text-sm"
                            type="number"
                            min={1}
                            max={100}
                            step={0.5}
                            defaultValue={c.maxScore}
                            key={`m${c.id}-${c.maxScore}`}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== c.maxScore && Number.isFinite(v) && v > 0)
                                patchCriterion(c.id, { maxScore: v });
                            }}
                          />
                        </label>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {t.setup.weight} {c.weight}% · {t.setup.maxScore} {c.maxScore}
                      </span>
                    )}
                    {editableCriteria && (
                      <button
                        className={`btn btn-sm ${
                          confirm?.kind === "criterion" && confirm.id === c.id
                            ? "btn-danger"
                            : "btn-ghost"
                        } ${detail.criteria.length <= 1 ? "invisible" : ""}`}
                        onClick={() => armConfirm("criterion", c.id)}
                      >
                        {confirm?.kind === "criterion" && confirm.id === c.id ? (
                          t.setup.confirmCritDelete
                        ) : (
                          <IconTrash width={14} height={14} />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editableCriteria && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-[var(--line)] pt-4">
                  <input
                    className="input h-9 flex-1 text-sm"
                    placeholder={t.setup.newCritPlaceholder}
                    value={critName}
                    maxLength={20}
                    onChange={(e) => setCritName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCriterion()}
                  />
                  <input
                    className="input h-9 w-20 text-center text-sm"
                    type="number"
                    min={0}
                    max={1000}
                    value={critWeight}
                    onChange={(e) => setCritWeight(e.target.value)}
                    title={`${t.setup.weight} %`}
                  />
                  <input
                    className="input h-9 w-20 text-center text-sm"
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={critMax}
                    onChange={(e) => setCritMax(e.target.value)}
                    title={t.setup.maxScore}
                  />
                  <button className="btn btn-primary h-9" onClick={addCriterion}>
                    <IconPlus width={14} height={14} />
                    {t.setup.addCritBtn}
                  </button>
                </div>
              )}
            </section>

            {/* 选手 */}
            <section className="card fade-up p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display inline-flex items-center gap-2 text-base font-bold">
                  <IconMic width={16} height={16} className="text-[var(--gold-deep)]" />
                  {t.setup.contestantsTitle}
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {t.setup.contestantsCount(detail.contestants.length)}
                  </span>
                </h2>
              </div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <textarea
                  className="input flex-1"
                  rows={2}
                  placeholder={t.setup.bulkPlaceholder}
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                />
                <button className="btn btn-primary self-start sm:self-auto" onClick={addContestants}>
                  <IconPlus width={15} height={15} />
                  {t.setup.addContestantBtn}
                </button>
              </div>
              {detail.contestants.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">
                  {t.setup.noContestantsTip}
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-1">
                  {detail.contestants.map((ct, i) => (
                    <div key={ct.id} className="row-item">
                      <span className="font-display w-7 text-center text-sm font-bold text-[var(--muted)]">
                        {i + 1}
                      </span>
                      <input
                        className="input h-9 flex-1 border-transparent bg-transparent text-sm font-bold hover:border-[var(--line)]"
                        defaultValue={ct.name}
                        key={`n${ct.id}-${ct.name}`}
                        maxLength={30}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== ct.name) renameContestant(ct.id, v);
                        }}
                      />
                      <span
                        className={`badge ${
                          (ctScoredBy.get(ct.id) ?? 0) > 0
                            ? "bg-[var(--green-soft)] text-[var(--green)]"
                            : "bg-[var(--line-soft)] text-[var(--muted)]"
                        }`}
                      >
                        {t.setup.scoredProgress(ctScoredBy.get(ct.id) ?? 0, detail.judges.length)}
                      </span>
                      <button
                        className={`btn btn-sm ${
                          confirm?.kind === "contestant" && confirm.id === ct.id
                            ? "btn-danger"
                            : "btn-ghost"
                        }`}
                        onClick={() => armConfirm("contestant", ct.id)}
                      >
                        {confirm?.kind === "contestant" && confirm.id === ct.id ? (
                          t.common.confirm
                        ) : (
                          <IconTrash width={14} height={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 评委 */}
            <section className="card fade-up p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display inline-flex items-center gap-2 text-base font-bold">
                  <IconUsers width={16} height={16} className="text-[var(--gold-deep)]" />
                  {t.setup.judgesTitle}
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {t.setup.judgesCount(detail.judges.length)}
                  </span>
                </h2>
              </div>
              <div className="mb-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder={t.setup.judgeNamePlaceholder}
                  value={newJudge}
                  maxLength={20}
                  onChange={(e) => setNewJudge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addJudge()}
                />
                <button className="btn btn-primary" onClick={addJudge}>
                  <IconPlus width={15} height={15} />
                  {t.setup.addJudgeBtn}
                </button>
              </div>
              {detail.judges.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">
                  {t.setup.noJudgesTip}
                </p>
              ) : (
                <div>
                  {detail.judges.map((j) => (
                    <div key={j.id} className="row-item">
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[var(--gold-soft)] text-xs font-bold text-[var(--gold-deep)]">
                        {j.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{j.name}</span>
                      <span
                        className={`badge ${
                          (judgeProgress.get(j.id) ?? 0) === detail.contestants.length &&
                          detail.contestants.length > 0
                            ? "bg-[var(--green-soft)] text-[var(--green)]"
                            : "bg-[var(--line-soft)] text-[var(--muted)]"
                        }`}
                      >
                        {(judgeProgress.get(j.id) ?? 0) === detail.contestants.length &&
                        detail.contestants.length > 0 ? (
                          <>
                            <IconCheck width={12} height={12} /> {t.setup.allCompleted}
                          </>
                        ) : (
                          t.setup.scoredProgress(judgeProgress.get(j.id) ?? 0, detail.contestants.length)
                        )}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => copyJudgeLink(j.id)}
                        title={t.setup.judgeLinkTitle}
                      >
                        <IconLink width={14} height={14} />
                        {t.setup.judgeLinkBtn}
                      </button>
                      <button
                        className={`btn btn-sm ${
                          confirm?.kind === "judge" && confirm.id === j.id ? "btn-danger" : "btn-ghost"
                        }`}
                        onClick={() => armConfirm("judge", j.id)}
                      >
                        {confirm?.kind === "judge" && confirm.id === j.id ? (
                          t.common.confirm
                        ) : (
                          <IconTrash width={14} height={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
