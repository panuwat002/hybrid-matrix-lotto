# Threat Model — Hybrid Matrix

Consolidated from the Newton/Frege/Turing peer review (see spec Appendix A)
and the Schneier/Grugq/Shortridge cyber-security panel (2026-08-11).

## Assets

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| `public/support-qr.png` (PromptPay QR — bank account link) | High (PII) | `public/`, git history |
| Committer identity in git commits | Med (PII) | git history |
| App availability | Low-Med | Vercel |
| User trust via disclaimers | Med | `/about`, `/privacy` |
| Engine formula | Low | `lib/engine/**` (open by design) |

## Adversaries

| Adversary | Goal | Cost/Benefit | Priority |
|-----------|------|--------------|----------|
| Casual scraper | Grab computed numbers | Low/Low | Ignore |
| Cost-DoS abuser | Spam `generateMatrix` to burn Vercel budget | Med/Med | Mitigate (rate limit) |
| Doxxer / stalker | Extract owner's name + bank association | Low/High | Mitigate (git scrub, careful commits) |
| Determined attacker with bounty | (there is no bounty) | — | N/A |

## Attack Surface

- `/` (public) — legal clickwrap, no PII
- `/about`, `/privacy` (public) — static docs
- `/dashboard` (cookie-gated) — Server Action target
- Server Actions: `confirmUnlock` (sets cookie, no auth needed), `generateMatrix` (cookie-checked, rate-limited)
- `public/*` static assets — cache-controlled by Next.js/Vercel
- Git history — permanent record of past commits

## Controls in Place

- HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS) — `next.config.js`
- Rate limit 20 req/min/IP on `generateMatrix` — `lib/actions/rateLimit.ts`
- Cookie hardened: `httpOnly`, `sameSite=lax`, `secure` in prod, `maxAge=4h`
- Server-only guards on engine + session (via `server-only` npm package + ESLint restricted imports)
- Golden snapshot regression tests
- `security.txt` for disclosure

## Known Residual Risks (documented, not fixed)

- **Cookie is not authentication** — bypassable via DevTools; by design of the MVP disclaimer flow. Documented on `/about`.
- **Rate limit is per-warm-instance** — under distributed load the effective cap is per Vercel instance, not global. Migration path: `@upstash/ratelimit` + Vercel KV.
- **Enumerability** — deterministic output means all possible dates can be precomputed. By design; disclosed on `/about`.
- **QR + committer identity in git history** — see `git-history-scrub-runbook.md` for optional cleanup before making the repo public.
- **Next.js 14.2.x has known advisories** fixed in 15.5.16+ — see `pnpm audit`. Upgrade is a separate task (major-version bump, breaking-change risk).

## Non-Assets (things we explicitly do NOT protect)

- The formula (transparent by design)
- Historical draw data (`lib/data/historical.json` — mock, deterministic)
- Dev-time configuration (`pnpm-workspace.yaml`, `.eslintrc.json`, etc.)
