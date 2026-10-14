"use client";

import { useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "./Toast";
import { DEMO_COMPETITION_DATA } from "@/lib/demo-data";
import { IconUpload, IconX, IconCheck } from "./icons";
import type { CompetitionExportData } from "@/lib/types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (comp: { id: number; name: string }) => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Parsing analysis
  const parseResult = useMemo(() => {
    const trimmed = jsonText.trim();
    if (!trimmed) return null;
    try {
      const data = JSON.parse(trimmed) as CompetitionExportData;
      if (!data || typeof data !== "object") {
        return { error: t.dashboard.invalidJson };
      }
      const name = data.competition?.name?.trim();
      if (!name) {
        return { error: t.dashboard.missingCompName };
      }
      return {
        data,
        name,
        criteria: Array.isArray(data.criteria) ? data.criteria.length : 0,
        judges: Array.isArray(data.judges) ? data.judges.length : 0,
        contestants: Array.isArray(data.contestants) ? data.contestants.length : 0,
        scores: Array.isArray(data.scores) ? data.scores.length : 0,
      };
    } catch {
      return { error: t.dashboard.invalidJson };
    }
  }, [jsonText, t]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setJsonText(text);
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  }

  function loadDemo() {
    setJsonText(JSON.stringify(DEMO_COMPETITION_DATA, null, 2));
  }

  async function handleImport() {
    if (!parseResult || "error" in parseResult) return;
    setImporting(true);
    try {
      const res = await fetch("/api/competitions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseResult.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "导入失败");
      }
      const created = await res.json();
      toast(t.dashboard.importSuccess);
      onSuccess(created);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="card relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col bg-[var(--card)] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gold-soft)] text-[var(--gold-deep)]">
              <IconUpload width={18} height={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">{t.dashboard.importModalTitle}</h2>
              <p className="text-xs text-[var(--muted)]">{t.dashboard.importModalSubtitle}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={onClose}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              isDragging
                ? "border-[var(--gold-deep)] bg-[var(--gold-soft)]"
                : "border-[var(--line)] hover:border-[var(--gold)]"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload width={14} height={14} />
                {t.dashboard.uploadFileLabel}
              </button>
              <span className="text-xs text-[var(--muted)]">/</span>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={loadDemo}
              >
                <IconCheck width={14} height={14} />
                {t.dashboard.loadDemoData}
              </button>
              {jsonText && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-xs text-[var(--muted)] hover:text-[var(--red)]"
                  onClick={() => setJsonText("")}
                >
                  {t.dashboard.clearInput}
                </button>
              )}
            </div>
          </div>

          {/* JSON Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--muted)]">
              {t.dashboard.pasteJsonLabel}
            </label>
            <textarea
              className="input h-52 w-full font-mono text-xs leading-relaxed"
              placeholder='{ "competition": { "name": "..." }, "criteria": [...], "judges": [...], "contestants": [...] }'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Parsing Feedback */}
          {parseResult && (
            <div>
              {"error" in parseResult ? (
                <div className="rounded-lg border border-[#e4b5ae] bg-[var(--red-soft)] p-3 text-xs font-semibold text-[var(--red)]">
                  {parseResult.error}
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold-soft)] p-3 text-xs font-semibold text-[var(--gold-deep)]">
                  {t.dashboard.parsedSummary({
                    name: parseResult.name,
                    criteria: parseResult.criteria,
                    judges: parseResult.judges,
                    contestants: parseResult.contestants,
                    scores: parseResult.scores,
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--line)]">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={importing}>
            {t.common.back}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!parseResult || "error" in parseResult || importing}
          >
            <IconUpload width={14} height={14} />
            {importing ? t.dashboard.importing : t.dashboard.importNow}
          </button>
        </div>
      </div>
    </div>
  );
}
