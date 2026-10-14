"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { CompetitionSummary } from "@/lib/types";
import { toast } from "@/components/Toast";
import { BrandBar, StatusBadge } from "@/components/BrandBar";
import { useI18n } from "@/lib/i18n";
import {
  IconMonitor,
  IconClipboard,
  IconPlus,
  IconTrash,
  IconMic,
  IconUsers,
  IconBolt,
} from "@/components/icons";

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [comps, setComps] = useState<CompetitionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    api<CompetitionSummary[]>("/api/competitions")
      .then((rows) => {
        setComps(rows);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    const n = name.trim();
    if (!n) {
      toast(t.dashboard.enterNamePrompt, "err");
      return;
    }
    setCreating(true);
    try {
      const row = await api<{ id: number }>("/api/competitions", {
        method: "POST",
        body: JSON.stringify({ name: n }),
      });
      toast(t.dashboard.compCreated);
      router.push(`/c/${row.id}`);
    } catch (e) {
      toast((e as Error).message, "err");
      setCreating(false);
    }
  }

  function askDelete(id: number) {
    if (confirmId === id) {
      setConfirmId(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      api(`/api/competitions/${id}`, { method: "DELETE" })
        .then(() => {
          toast(t.dashboard.compDeleted);
          load();
        })
        .catch((e: Error) => toast(e.message, "err"));
    } else {
      setConfirmId(id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmId(null), 2600);
    }
  }

  const liveCount = comps?.filter((c) => c.status === "live").length ?? 0;

  return (
    <div className="min-h-screen">
      <BrandBar
        right={
          comps && comps.length > 0 ? (
            <span className="text-xs font-semibold text-[var(--muted)]">
              {t.dashboard.totalComps(comps.length)}
              {liveCount > 0 && (
                <span className="ml-2 text-[var(--gold-deep)]">
                  {t.dashboard.liveComps(liveCount)}
                </span>
              )}
            </span>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="fade-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {t.dashboard.title}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              {t.dashboard.subtitle}
            </p>
          </div>
        </div>

        {/* 创建栏 */}
        <div className="card fade-up mb-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <input
            className="input sm:max-w-sm"
            placeholder={t.dashboard.newCompPlaceholder}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button className="btn btn-primary" onClick={create} disabled={creating}>
            <IconPlus width={15} height={15} />
            {creating ? t.dashboard.creating : t.dashboard.createBtn}
          </button>
        </div>

        {error && (
          <div className="card mb-6 border-[#e4b5ae] bg-[var(--red-soft)] p-4 text-sm font-semibold text-[var(--red)]">
            {error}
          </div>
        )}

        {/* 列表 */}
        {comps === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="card h-24 animate-pulse bg-[var(--line-soft)]" />
            ))}
          </div>
        ) : comps.length === 0 ? (
          <div className="card grid place-items-center px-6 py-20 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gold-soft)]">
              <IconBolt width={26} height={26} className="text-[var(--gold-deep)]" />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold">{t.dashboard.emptyTitle}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t.dashboard.emptySubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comps.map((c) => (
              <div key={c.id} className="card fade-up flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/c/${c.id}`}
                      className="font-display truncate text-lg font-bold hover:text-[var(--gold-deep)]"
                    >
                      {c.name}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1">
                      <IconMic width={13} height={13} />
                      {t.dashboard.contestantsCount(c.contestantCount)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconUsers width={13} height={13} />
                      {t.dashboard.judgesCount(c.judgeCount)}
                    </span>
                    <span>
                      {new Date(c.createdAt).toLocaleDateString(
                        locale === "zh" ? "zh-CN" : "en-US",
                        {
                          month: "numeric",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/c/${c.id}`} className="btn btn-ghost btn-sm">
                    {t.dashboard.setupBtn}
                  </Link>
                  <Link href={`/c/${c.id}/judge`} className="btn btn-ghost btn-sm">
                    <IconClipboard width={14} height={14} />
                    {t.dashboard.judgeBtn}
                  </Link>
                  <Link href={`/c/${c.id}/live`} className="btn btn-gold btn-sm">
                    <IconMonitor width={14} height={14} />
                    {t.dashboard.liveBtn}
                  </Link>
                  <button
                    className={`btn btn-sm ${
                      confirmId === c.id ? "btn-danger" : "btn-ghost"
                    }`}
                    onClick={() => askDelete(c.id)}
                    title={confirmId === c.id ? t.dashboard.confirmDeleteTitle : t.dashboard.deleteTitle}
                  >
                    <IconTrash width={14} height={14} />
                    {confirmId === c.id ? t.common.confirmDelete : ""}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
