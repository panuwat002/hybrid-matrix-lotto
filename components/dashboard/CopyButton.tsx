"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/events";

type CopyKind = "prize1" | "adjacent" | "front3" | "back3" | "back2";

type Props = {
  text: string;
  kind: CopyKind;
  size?: "sm" | "lg";
};
type State = "idle" | "copied" | "failed";

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-2 py-1 text-[10px]",
  lg: "px-3 py-1.5 text-xs",
};

export function CopyButton({ text, kind, size = "sm" }: Props) {
  const [state, setState] = useState<State>("idle");

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
      trackEvent("number_copied", { kind });
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
      className={`ml-2 rounded border font-mono uppercase tracking-wider transition ${SIZE_CLASSES[size]} ${tone}`}
      aria-label={`Copy ${text}`}
    >
      {label}
    </button>
  );
}
