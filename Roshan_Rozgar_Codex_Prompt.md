# Codex instruction — Roshan Rozgar implementation

Use with Codex opened on the local machine with access to `/Users/hf/Documents/CUI-Web`.

## Goal
Implement and TEST Roshan Rozgar, a mobile-first voice-first marketplace connecting Islamabad/Rawalpindi households and trade workers, guided by `docs/PRD.md`. Optimize for the official hackathon's five outcomes and working end-to-end demo.

## Mandatory first steps
1. Open `/Users/hf/Documents/CUI-Web`; inspect all existing files, package files, git status/log and project structure. Do not assume the directory is empty, and do not destroy unrelated work.
2. Read `docs/PRD.md` and the source problem statement if available locally. Identify which features are truly functional, simulated, missing or broken. Inspect the provided Figma Make link only if accessible; do not claim it is an editable Figma Design file.
3. Confirm local runtime, scripts, installed dependencies, backend/database availability and credentials **without printing secret values**.
4. Preserve any commits/code already present, and ensure hackathon originality rules are respected. Never fabricate a compliant commit history.
5. Produce a compact prioritized execution plan, then **implement** it. Do not stop after planning.

## Priority order: vertical slice, not breadth
- P0: working worker profile creation with real recording, server-side Urdu transcription and user-confirmed extraction; trade/areas, publish, persisted availability.
- P0: customer search/filter by area+trade+computed free-now, worker profile and actual persisted reviews.
- P0: persistent job request, role-authenticated participant-only voice/message exchange, versioned worker scope/PKR/materials proposal, explicit current-version customer acceptance.
- P0: atomic immediate booking with DB uniqueness guarantee; active worker cannot be double-booked. Show conflict without losing pending request.
- P0: worker start/mark-done, customer completes, one authorized review, profile stats refresh.
- P1 only after P0: Urdu RTL / Roman Urdu + English LTR polish, dynamic TTS, detailed errors. P2 defer maps, payments, complex chat, notifications.

## Architecture and security
Adapt existing stack if suitable, otherwise React+TS+Vite+Tailwind + Supabase Auth/Postgres/Private Storage/Edge functions. Keep all AI and database secret keys server-side. Implement reliable authorization, private voice note access, limit upload size, no invented verification badges, no made-up worker location/distance, no hard-coded 'AI success'. If external services unavailable, complete independent components and clearly document what's blocked/mocked. Never pass a fake AI flow off as live.

## Work loop
For each vertical slice: implement -> run typecheck/lint/tests -> fix -> commit only eligible code -> report verified evidence. Add automated tests for booking concurrency, stale proposal, idempotent accept, reviewer authorization, completion and persisted reload. Use two independent customer sessions in the final manual demo. No blanket claims of passing tests unless actually run.

## Deliverables
- Working mobile-sized web app.
- DB schema/migrations/seed, or correctly documented local persistent fallback.
- A clean README with setup, run, stack, AI/coding tools, seeded/mock disclosure, limitations and asset credits.
- `docs/DEMO_SCRIPT.md` with Aslam ceiling-fan story and PKR 1,500 materials excluded.
- `.env.example` with names only; `.gitignore` excludes secrets; public repository only when user authorizes remote operations.
- Final report: implemented, tests actually run/results, remaining issues, blocked external configuration and exact reproduction commands.

Do not claim access to the local workspace unless Codex truly has that access. Do not fabricate user research, AI results, security or commit history.
