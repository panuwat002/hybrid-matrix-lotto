"use client";

import { useState } from "react";

type Props = { text: string };
type State = "idle" | "copied" | "failed";

export function CopyButton({ text }: Props) {
  const [state, setState] = useState<State>("idle");

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    } finally {
      setTimeout(() => setState("idle"), 1600);
    }
  };

  const label =
    state === "copied" ? "COPIED" : state === "failed" ? "FAILED" : "COPY";
  const tone =
    state === "failed"
      ? "border-red-500/60 text-red-300 hover:bg-red-500/10"
      : "border-matrix-cyan/40 text-matrix-cyan hover:bg-matrix-cyan/10";

  return (
    <button
      onClick={copy}
      className={`ml-2 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${tone}`}
      aria-label={`Copy ${text}`}
    >
      {label}
    </button>
  );
}
