"use client";

import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "shown"; total: number };

const SESSION_KEY = "lotto_visit_counted";

export function VisitorCounter() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyCounted = true;
    }

    const opts: RequestInit = alreadyCounted
      ? { method: "GET" }
      : { method: "POST" };

    fetch("/api/counter", opts)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { total: number }) => {
        if (!alreadyCounted) {
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* ignore private mode */
          }
        }
        setState({ kind: "shown", total: data.total });
      })
      .catch(() => setState({ kind: "hidden" }));
  }, []);

  if (state.kind === "hidden") return null;

  return (
    <span className="font-mono text-xs text-matrix-cyan/60">
      ผู้เยี่ยมชม{" "}
      {state.kind === "loading" ? (
        <span aria-hidden>. . .</span>
      ) : (
        state.total.toLocaleString("th-TH")
      )}{" "}
      คน
    </span>
  );
}
