"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconX } from "./icons";

export type ToastKind = "ok" | "err";
type ToastItem = { id: number; msg: string; kind: ToastKind };
type Listener = (t: ToastItem) => void;

let listeners: Listener[] = [];
let seq = 0;

export function toast(msg: string, kind: ToastKind = "ok") {
  const t: ToastItem = { id: ++seq, msg, kind };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const l: Listener = (t) => {
      setItems((s) => [...s.slice(-3), t]);
      setTimeout(() => {
        setItems((s) => s.filter((x) => x.id !== t.id));
      }, 2800);
    };
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-in flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-lg ${
            t.kind === "ok"
              ? "bg-[var(--ink)] text-[#f5f3ec]"
              : "bg-[var(--red)] text-white"
          }`}
        >
          {t.kind === "ok" ? (
            <IconCheck width={15} height={15} className="text-[var(--gold)]" />
          ) : (
            <IconX width={15} height={15} />
          )}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
