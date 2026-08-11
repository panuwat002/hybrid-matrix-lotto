"use client";

import { useState } from "react";

type Props = { text: string };

export function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silently ignore
    }
  };

  return (
    <button
      onClick={copy}
      className="ml-2 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider border border-matrix-cyan/40 text-matrix-cyan hover:bg-matrix-cyan/10 transition"
      aria-label={`Copy ${text}`}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}
