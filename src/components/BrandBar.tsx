"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconBolt } from "./icons";
import { useI18n, LanguageToggle } from "@/lib/i18n";

export function BrandBar({ right, dark }: { right?: ReactNode; dark?: boolean }) {
  const { t } = useI18n();

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={
        dark
          ? { borderColor: "var(--d-line)", background: "rgba(20,19,26,.88)" }
          : undefined
      }
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          style={dark ? { color: "var(--d-text)" } : undefined}
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-[9px]"
            style={dark ? { background: "var(--d-card2)" } : undefined}
          >
            <IconBolt width={16} height={16} className="text-[var(--gold)]" />
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight">
            {t.common.brandName}
            <span
              className="ml-1.5"
              style={dark ? { color: "var(--d-gold)" } : undefined}
            >
              {t.common.brandLive}
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {right}
          <LanguageToggle dark={dark} />
        </div>
      </div>
    </header>
  );
}

export function StatusBadge({ status }: { status: "setup" | "live" | "finished" }) {
  const { t } = useI18n();

  if (status === "live") {
    return (
      <span className="badge bg-[var(--gold-soft)] text-[var(--gold-deep)]">
        <span className="live-dot" />
        {t.common.live}
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="badge bg-[var(--line-soft)] text-[var(--muted)]">
        {t.common.finished}
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--line-soft)] text-[var(--ink-soft)]">
      {t.common.setup}
    </span>
  );
}
