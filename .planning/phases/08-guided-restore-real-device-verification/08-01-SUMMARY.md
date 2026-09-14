---
phase: 08
plan: 01
subsystem: web-recovery
tags: [guided-restore, mobile-flow, recovery, i18n, e2e, tracer]
requires:
  - phase-05 mobile shell (Layout chrome switch, StickyActionBar, StepBadge vocabulary)
  - phase-07 destination patterns (includeHidden:true rule, dual-direction battery template)
  - Recovery.tsx desktop stepper (D-02 shared handlers, D-10 hue engine)
provides:
  - Recovery D-01 double gate (desktop stepper max-md:hidden + mobile flow behind !isDesktop)
  - MobileRecoveryFlow tracer vertical (6-step chip/badge/bar flow, one shared fire path)
  - recovery.mobile.stepOf + common.continue pre-seeded across all 42 locale tables
  - guided-restore.spec.ts (API-parity phone choreography) + /recovery in the dual-direction battery
affects:
  - 08-02 (config-restore body: Step 2 mobile slot is stubbed to the sanctioned skip)
  - 08-03+ (remaining mobile flow plans extend MobileRecoveryFlow, not Recovery.tsx mount)
tech-stack:
  added: []
  patterns:
    - matchMedia stub by mutating the module cache's shared MediaQueryList objects
    - collapse-reserved hue literals (3/4) at the mobile call site, no nextHue()
    - recorded-call-multiset API parity in e2e (route handlers append labels, tail asserts the set)
key-files:
  created:
    - web/src/pages/Recovery.mobile.dom.test.tsx
    - web/e2e/guided-restore.spec.ts
  modified:
    - web/src/lib/i18n.ts
    - web/src/lib/locales/*.ts (40 tables, key-aligned)
    - web/src/lib/i18n.preseed.test.ts
    - web/src/pages/Recovery.tsx
    - web/e2e/desktop-untouched.spec.ts
key-decisions:
  - Mobile flow re-hosts the SAME handlers (checkReadable/connectPreview/runDiscover/fireKitDownload) — a tap is never a second fire path (D-02)
  - CloudCredsDisclosure gets fixed hue literals 3/4 at the mobile call site; a stray nextHue() there would shift desktop identity on viewport cross
  - Desktop half stays mounted under max-md:hidden at every width — jsdom (CSS never applies) is what makes the hue assertions possible
  - Step 2 mobile body is the sanctioned skip only; the full config-restore narration is Plan 02
  - e2e parity counts the shell's own settings GETs (Layout mount fetch + bv:settings-changed refetch) — identical on desktop, so parity holds
actuals:
  tokens: 24400
  tasks: 3
  commits: 3
requirements-progressed: [SCRN-06, VERIFY-03, VERIFY-04]
requirements-completed: []
status: complete
---

# Phase 8 Plan 1: Guided-Restore Tracer Summary

Recovery's mobile guided-restore tracer: the desktop stepper double-gated behind max-md:hidden, a six-step MobileRecoveryFlow firing the identical guarded handlers, pre-seeded i18n, and a jsdom twin + API-parity e2e proving both sides of the gate.

## What Was Built

- **Task 1 (1d664c5a)** — i18n pre-seed: `recovery.mobile.stepOf` ("Step {n} of {total}") and `common.continue` added to all 42 locale tables in one plan-owned commit; the phase-8 block of `i18n.preseed.test.ts` (extended, Rule 3) pins the exact en copy, the de value, 40-locale non-emptiness, and the no-em-dash rule.
- **Task 2 (b42b40fe)** — the tracer vertical in Recovery.tsx: the desktop stepper wrapped in `max-md:hidden` (D-01's always-rendered half), and `{!isDesktop && <MobileRecoveryFlow/>}` mounting the phone flow behind exactly one gate. Six steps — check (read-only #44 probes), config (sanctioned skip), attach (EncryptionStatus + FolderBrowser fields + disclosures, `Connect & preview`), discover, review (empty branch resolves), kit (download + Done→"/") — each step rendered only when `gateTo(n)` holds, with a StickyActionBar whose action set IS the gate state. Step badges speak the phase-5 spike vocabulary; the position chip renders stepOf with tabular numerals.
- **Task 3 (6a9cf933)** — the proof layer. `Recovery.mobile.dom.test.tsx` (5 tests): the desktop-first-8 hue sequence survives the mobile block (fresh-mount carriers [0,1,2,5,6,7] + reserved 3/4 asserted via the two-click disclosure expansion; foreign tail pinned at mod-8 aliasing), the full gating chain walk, Back preserving completed step state, and the kit gate's no-bar-at-all shape. `guided-restore.spec.ts`: the phone choreography on the real binary (wiped fresh DB) with route-layer Go-JSON staging field-for-field from frozen api.ts, a recorded call multiset asserting API parity with the desktop fire path, the full-object PUT body, the kit download's suggested filename, and the desktop leakage needles. `desktop-untouched.spec.ts`: /recovery joins the dual-direction battery — chip + sticky-bar signatures absent on desktop while the stepper's headings resolve; the inverse on mobile.

## Decisions Made

- **One fire path (D-02):** the mobile bar buttons call the same `checkReadable` / `connectPreview` / `runDiscover` / `fireKitDownload` the desktop cards call. The e2e multiset makes a second fire path loud: 21 recorded calls, each accounted for (flow 19 + shell 2).
- **Reserved hues:** the mobile Step 3 re-hosts CloudCredsDisclosure with fixed literals 3/4 — the same indices desktop evaluation order hands it — because a `nextHue()` at the mobile mount site would shift desktop identity whenever the viewport crossed 48rem.
- **Desktop half always mounted:** `max-md:hidden` keeps the stepper in the DOM under jsdom (CSS never applies there), which is precisely what lets the dom test assert hue identity on a mobile stub — and `includeHidden:true` is what asserts the same mount in a real browser.
- **Parity counts the shell:** the two extra `GET /api/settings` are Layout's mount fetch and its `bv:settings-changed` refetch (fired by connectPreview) — verified by call-order instrumentation, identical on desktop, so the multiset stays an honest parity statement.
- **Plan-02 boundary:** mobile Step 2 renders the skip resolution only; the config-restore body (source toggle, path browser, phase narration) is Plan 02's.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] i18n pre-seed needed an orphan-guard reference**
- **Found during:** Task 1
- **Issue:** the two new keys would be 42x orphans (`i18n.orphans.test.ts`) until Task 2 consumed them; the plan's pre-seed commit alone would fail the suite.
- **Fix:** extended `i18n.preseed.test.ts` (the phase-7 file's own documented role) with a phase-8 block naming the keys — the orphan guard's sanctioned escape hatch — and pinning exact copy.
- **Files modified:** web/src/lib/i18n.preseed.test.ts
- **Commit:** 1d664c5a

**2. [Rule 3 - Blocking] e2e harness served a stale embedded SPA**
- **Found during:** Task 3 verification
- **Issue:** bombvault.exe embedded the pre-Task-2 web/dist, so the mobile flow never rendered in e2e and every /recovery assertion ran against the old tree (8 failures across all four projects).
- **Fix:** rebuilt the SPA (`npm run build` — no install) and the binary (`go build -o bombvault.exe ./cmd/bombvault`) before re-running; restored the committed `web/dist/index.html` placeholder before committing so the task commit stays test-only.
- **Files modified:** none in the commit (local build artifacts only; binary + dist are untracked/ignored)
- **Commit:** (environment fix, no diff)

## Verification Results

- `cd web && npx vitest run` — **110 files / 2456 tests passed** (full suite, plan mandate).
- `npx playwright test e2e/guided-restore.spec.ts e2e/desktop-untouched.spec.ts` — **all 8 /recovery tests passed** (both mobile walks incl. API parity + kit download; both desktop leakage tests; all four dual-direction battery tests); the remaining 56 battery slots are by-design project skips, 0 failures. (Run 3's log lists every test `ok`; the runner process was killed by a session restart before the summary line — per-test results are on the record.)
- The known Windows webServer teardown hang recurred; the orphaned bombvault.exe was killed after each run (never through docker; local process only).

## Requirement Status

SCRN-06, VERIFY-03 and VERIFY-04 were NOT marked complete in REQUIREMENTS.md: the `requirements.ready-ids` gate blocks all three because sibling plans declare them too (SCRN-06 also in 08-02/08-03, VERIFY-03 in 08-03, VERIFY-04 in 08-04) and none of those has a SUMMARY yet. The IDs stay open until the last declaring plan lands — this plan progressed them (the tracer vertical is real and verified) without closing them.

## Collaboration Notes

- Estimates vs actuals: plan estimated 55000 tokens / 3 tasks; realized diff is ~3140 changed lines across 46 files ≈ 24400 tokens (chars/4) — under estimate, mostly because Task 2 re-hosts existing components rather than writing new ones.
- The task-observer log carried no open observations for this session's skills; none were written (no generalizable friction beyond what the deviations above already record).

## Self-Check: PASSED

- web/src/pages/Recovery.mobile.dom.test.tsx — committed (6a9cf933), exists, 5/5 passing.
- web/e2e/guided-restore.spec.ts — committed (6a9cf933), exists, 4/4 project-runs passing.
- web/e2e/desktop-untouched.spec.ts — committed (6a9cf933), exists, /recovery block green both directions.
- web/src/lib/i18n.ts + 40 locale tables + i18n.preseed.test.ts — committed (1d664c5a), parity suite green.
- web/src/pages/Recovery.tsx — committed (b42b40fe), tracer gate green end-to-end.
- All three commit hashes found in `git log`; trailer count 1 on each.
