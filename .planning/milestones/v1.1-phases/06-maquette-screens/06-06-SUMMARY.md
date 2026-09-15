---
phase: 06-maquette-screens
plan: 06
subsystem: ui
tags: [mobile, scrn-01, flow-03, dashboard, sticky-action-bar, useConfirm, useBackupWatch, i18n, playwright]

# Dependency graph
requires:
  - phase: 06-04
    provides: RunDetailSheet (component-local hosting contract), lib/runDisplay shared vocabulary, visibility gate
  - phase: 06-05
    provides: StickyActionBar primitive, useBackupWatch onRun seam + sheetDismissed latch, ConfirmSheet via useConfirm, e2e staging helpers, PAGE_SHELL_RESPONSIVE
  - phase: 06-02
    provides: p-4 mobile gutter rhythm, fail-toned ConfirmSheet presentation
provides:
  - SCRN-01 mobile Home: identity, next run, tappable recent runs (top 4, >=44px), repo health with offsite-blue age chip, in the contracted block order below 48rem
  - FLOW-03 Home thumb-zone trigger: consequence ConfirmSheet -> backupEverythingNow via BackupButton semantics -> RunDetailSheet deep-link on baseline-id correlation
  - home.newBackup + home.newBackupConfirm bound in all 42 locale tables (en, de inline + 40 modules)
  - worstRpoStatus/worstRpoLabel/nextBackupFireAt/scheduleDomainLabel shared derivations (SummaryTier and mobile cards cannot disagree)
  - web/e2e/home-trigger.spec.ts green on all four Playwright projects
affects: [06-07, phase-8-real-device-validation]

# Actuals (#2632)
actuals:
  tokens: 25322
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useBackupWatch with progressKey "" (honest no-key watch: the everything parent publishes no SSE entry; run-poll belt resolves)
    - Double gate for phone-only surfaces: !isDesktop JSX gate + max-md hidden class (Containers.tsx precedent, now on three Dashboard surfaces)
    - Shared derivation functions over /api/schedule/next + /api/status (one source of truth, two surfaces)
    - StickyActionBar as LAST DIRECT CHILD of the page column (D-06; nothing between bar and main#bv-main)

key-files:
  created:
    - web/e2e/home-trigger.spec.ts
  modified:
    - web/src/pages/Dashboard.tsx
    - web/src/lib/i18n.ts
    - web/src/lib/locales/ (40 modules, home.* block each)
    - web/eslint.config.js
    - web/src/lib/pageShell.ts
    - web/src/index.css
    - web/dist/index.html

key-decisions:
  - "Mobile blocks REPLACE the desktop grid below md (max-md:hidden grid + !isDesktop-gated blocks) - exactly one surface renders at any width; jsdom stays desktop so all existing dom tests see the desktop page"
  - "Task 1 adds ZERO i18n keys: all mobile copy reuses existing keys (dashboard.summaryNextBackup/recentRuns/storageTitle, run.kindBackup, dashboard.rpo*, dashboard.noOffsite, ransomware.replicationNever); Task 2 owns the i18n commit"
  - "Offsite blue stays text-only (--color-statusOffsite class on the age chip, OffsiteIndicator line language: arrow + relative age) - index.css token-scope comment updated to name both sanctioned consumers"
  - "Everything-trigger outcome toasts mirror BackupButton minus container-specific copy: success = Done (+ snapshot id when the parent carries one), error = toast + glim-shake; cancelled/skipped stay silent because the deep-linked sheet already shows the run record"
  - "Pencil, editing controls and hidden-cards tray are max-md:hidden: the phone's fixed block order has nothing to customize"

patterns-established:
  - "worstRpoStatus/worstRpoLabel: the four-status repo health derivation shared by SummaryTier and the mobile repo-health card"
  - "nextBackupFireAt: the #177/#186-aware next-fire derivation, one source for the summary cell and the mobile next-run card"
  - "e2e home staging: stateful /api/runs route where the correlated run appears only AFTER the POST arms it (baseline-id contract proven, not assumed)"

requirements-completed: [SCRN-01, FLOW-03]

coverage:
  - id: D1
    description: "Mobile Home renders identity -> next run -> recent runs (top 4, >=44px rows) -> repo health in the SCRN-01 order, glanceable with the trigger inside the initial 360x800 viewport"
    requirement: SCRN-01
    verification:
      - kind: e2e
        ref: "web/e2e/home-trigger.spec.ts#Home is glanceable: blocks in order, offsite chip, trigger in the thumb zone"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recent-run row tap opens the 06-04 RunDetailSheet for that run via component-local state (no route)"
    requirement: SCRN-01
    verification:
      - kind: e2e
        ref: "web/e2e/home-trigger.spec.ts#a recent-run row tap opens that run's detail sheet"
        status: pass
    human_judgment: false
  - id: D3
    description: "Repo-health card: four-status badge + label, dedup/snapshot line, offsite-copy age chip in the offsite token (never a fifth status hue)"
    requirement: SCRN-01
    verification:
      - kind: e2e
        ref: "web/e2e/home-trigger.spec.ts#Home is glanceable: blocks in order, offsite chip, trigger in the thumb zone"
        status: pass
    human_judgment: false
  - id: D4
    description: "Thumb-zone trigger: consequence ConfirmSheet (T-06-02), Cancel keeps the server untouched, confirm fires the everything pass through BackupButton semantics and deep-links the correlated run into the RunDetailSheet"
    requirement: FLOW-03
    verification:
      - kind: e2e
        ref: "web/e2e/home-trigger.spec.ts#Confirm fires the everything pass; the correlated run deep-links into the run sheet"
        status: pass
      - kind: e2e
        ref: "web/e2e/home-trigger.spec.ts#trigger tap presents the consequence confirm; Cancel keeps the server untouched"
        status: pass
      - kind: unit
        ref: "web/src/components/BackupButton.dom.test.tsx (the shared semantics this consumer reuses)"
        status: pass
    human_judgment: false
  - id: D5
    description: "home.newBackup + home.newBackupConfirm exist with the plan-bound en/de copy in all 42 tables; parity (exact key sets + placeholder tokens) and orphans (every key rendered) green"
    requirement: FLOW-03
    verification:
      - kind: unit
        ref: "web/src/lib/i18n.parity.test.ts"
        status: pass
      - kind: unit
        ref: "web/src/lib/i18n.orphans.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Desktop >=48rem byte-identical: no mobile blocks, no sticky trigger, no w-full.bg-accent control; full vitest suite and desktop-untouched e2e green"
    requirement: SCRN-01
    verification:
      - kind: e2e
        ref: "web/e2e/home-trigger.spec.ts#desktop Home: no mobile blocks, no sticky trigger"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-untouched.spec.ts --project=desktop-1280 --project=desktop-768 (20 passed after Task 1, re-verified after commit)"
        status: pass
      - kind: unit
        ref: "cd web && npx vitest run (104 files / 2375 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 1h58m
completed: 2026-09-12
status: complete
---

# Phase 06 Plan 06: Maquette Screens - Home (SCRN-01) + Thumb-zone Trigger (FLOW-03) Summary

**The phone Home now reads glanceably in the maquette's four-block order and starts a Backup Everything pass from the thumb zone through a consequence confirm that lands the user inside the live run sheet - with desktop byte-identical and all four Playwright projects green.**

## Performance

- **Duration:** 1h58m (wall; includes ~40m of the documented Windows Playwright teardown wedge across three runs)
- **Started:** 2026-09-12T16:14:30Z
- **Completed:** 2026-09-12T18:12:00Z
- **Tasks:** 3 completed (tracer + 2 auto)
- **Files modified:** 48 (5 in Task 1, 43 in Task 2, 1 in Task 3)

## Accomplishments

- **Task 1 (tracer, 5378f5b0):** Dashboard below 48rem renders the SCRN-01 Home in the contracted order - identity header (theme-switching wordmark pair + BombVault brand, 20px h1, 12px subtitle), next-run card (accentSoft IconBackupNow avatar, schedule name, kind/time meta, accentSoft countdown chip), recent runs (top 4, >=44px rows with four-status text Badges, relative-time + bytes meta, scrubbed runReason lines, tap opens the component-local RunDetailSheet), repo health (four-status Badge + worst-RPO label, raw/dedup/snapshots line, offsite-blue copy-age chip in the OffsiteIndicator line language). Desktop grid untouched above md (max-md:hidden + !isDesktop gates).
- **Task 2 (d9fabfb2):** The 06-05 StickyActionBar is the page column's last direct child below the breakpoint, holding the surface's ONE solid-accent control (w-full, 44px, home.newBackup). Press -> useConfirm presents the fail-toned sheet with the consequence-naming home.newBackupConfirm copy; confirm -> backupEverythingNow through useBackupWatch (baseline ids seeded BEFORE firing; {ok:true,started:true} never read for outcomes; progressKey honestly "" because the everything parent publishes no SSE key); correlation deep-links the live run into the RunDetailSheet (dismissal latch guards re-opening, not record refresh). Keys bound in en + de + all 40 locale modules in the same commit.
- **Task 3 (b3c55a70):** e2e/home-trigger.spec.ts pins glanceability (trigger in the thumb zone without scroll at 360x800), block order, the offsite chip, the Cancel-keeps-server-untouched path, the full trigger -> confirm -> correlated-run -> run-sheet trace, row tap -> sheet, and the desktop-1280/768 max-md leakage guard. Green on all four projects (10 passed, 10 intended skips).

## Task Commits

Each task was committed atomically:

1. **Task 1: Mobile Dashboard block order** - `5378f5b0` (feat)
2. **Task 2: Thumb-zone New-backup trigger** - `d9fabfb2` (feat)
3. **Task 3: Home trigger e2e** - `b3c55a70` (test)

**Plan metadata:** docs commit (this SUMMARY + STATE/ROADMAP/REQUIREMENTS).

## Files Created/Modified

- `web/src/pages/Dashboard.tsx` - the mobile Home blocks + shared derivations + trigger wiring + component-local sheet host
- `web/src/lib/i18n.ts` - home.newBackup / home.newBackupConfirm in the en and de inline tables (with T-06-02 why-comments)
- `web/src/lib/locales/*.ts` (40) - the same keys, house-style comment, translations per language
- `web/eslint.config.js` - Dashboard.tsx declared in the page-uses-page-shell exceptions data (PAGE_SHELL_RESPONSIVE)
- `web/src/lib/pageShell.ts` - PAGE_SHELL_RESPONSIVE doc lists Dashboard as the third consumer
- `web/src/index.css` - offsite token scope comment names both sanctioned consumers (was "ONE consumer")
- `web/dist/index.html` - rebuilt (embedded SPA); bombvault.exe rebuilt locally for e2e
- `web/e2e/home-trigger.spec.ts` - the four-project contract

## Decisions Made

- **Mobile blocks replace, not stack:** the desktop customizable grid is max-md:hidden below md and the four blocks are JSX-gated on !isDesktop - the Containers.tsx mount precedent. jsdom answers desktop, so the existing dom suite keeps testing the desktop page and the mobile surface stays e2e-pinned.
- **Zero new keys in Task 1:** the plan's truths gave Task 2 the i18n commit; every Task 1 string reuses a verified existing key (dashboard.storageTitle serves as the repo-health section label).
- **One source of truth for shared derivations:** worstRpoStatus/worstRpoLabel/nextBackupFireAt/scheduleDomainLabel are extracted so SummaryTier's cells and the mobile cards cannot disagree on screen - the file's own stated principle for /api/schedule/next.
- **progressKey: "" is the honest key:** the everything PARENT run publishes no SSE entry of its own (RunDetailSheet.progressKeyFor returns null for it), so the watch resolves via the run-poll belt exactly like a target whose key never appears.
- **Offsite blue stays text-only:** the chip is `text-statusOffsite` on the "arrow + relative age" line, per the domain-identity rule - no offsite background token invented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored a desktop-grid comment my own edit had truncated**
- **Found during:** Task 1 (self-review of the diff before committing)
- **Issue:** The edit that reworded the grid comment's "below md stacks" sentence had cut the comment off mid-sentence, losing the col-span/drag-and-drop explanation.
- **Fix:** Restored the full original tail after the new max-md:hidden sentence.
- **Files modified:** web/src/pages/Dashboard.tsx
- **Verification:** tsc --noEmit clean; comment content diffed against HEAD~1
- **Committed in:** 5378f5b0 (part of Task 1 commit)

### Documented interpretations (in-plan judgment calls, recorded for the verifier)

**2. Offsite token-scope comment updated** - index.css said the offsite text token had ONE consumer; the phase contract sanctions the repo-health age chip as the second. The comment now names both (ActivityLog colorFor + this chip). File: web/src/index.css, in 5378f5b0.

**3. dashboard.storageTitle reused as the repo-health section label** - Task 1 binds no new keys, so the card's section label reuses the existing "Storage" key rather than introducing a Home-specific one. If a later pass wants a distinct label, it is an i18n-only change.

**4. Desktop-only chrome gated off the phone** - the customize pencil, editing controls and hidden-cards tray carry max-md:hidden: the phone's fixed block order has nothing to edit. This is SCRN-01's fixed-order contract applied to the remaining desktop chrome.

---

**Total deviations:** 1 auto-fixed (Rule 1) + 3 documented interpretations
**Impact on plan:** No scope creep. All four truths verified; acceptance criteria met on every task.

## Issues Encountered

- **Windows Playwright teardown wedge (3x):** the run completes all tests, then hangs killing the webServer; stdout stays pipe-buffered until exit. Playbook applied each time (taskkill //F //IM bombvault.exe -> teardown unsticks -> buffered output flushes; test-results empty = zero failures). Recorded so 06-07 budgets wall time for it.
- **First desktop-untouched run measured 46.1m** because the full vitest suite and builds were stacked onto it during the wait; the clean re-run took 6.7m. Lesson: do not overlap local vitest/build work with a Playwright run on this machine.
- **TS6133 (nextBackupAt declared but never read)** after extracting nextBackupFireAt - SummaryTier only needs the moment; fixed by destructuring only `ms`. (Rule 1, part of Task 1's natural iteration, same commit.)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **06-07 (final plan in phase):** Home surface is complete and pinned; the More sheet / nav aria-label work and any remaining screens can reuse: the double gate pattern (!isDesktop + max-md:hidden), the sheetDismissed latch host, the home-trigger staging helpers (stageHome with the stateful /api/runs arming), and the teardown-wedge playbook.
- **Handoff notes carried from this plan:** bottom-nav aria-labels and the max-md leakage sweep are 06-07 scope; all suites left green (vitest 2375, desktop-untouched 20/20 at both projects, home-trigger 10 passed / 10 intended skips); web/dist/index.html committed and bombvault.exe rebuilt locally.
- **Phase 8 note:** real-device validation should re-check the thumb-zone bar against the BottomNav spacing and the confirm sheet's keyboard-free presentation on real phones.

## Self-Check: PASSED

- All 7 key files exist on disk (Dashboard.tsx, home-trigger.spec.ts, i18n.ts, eslint.config.js, pageShell.ts, index.css, dist/index.html)
- home.newBackupConfirm present in all 40 locale modules + en + de (42 tables total)
- All 3 task commit hashes in git log: 5378f5b0, d9fabfb2, b3c55a70
- Working tree clean; frozen files (api.ts / router.tsx / progress.ts / internal/**) untouched across all three commits (verified via `git diff --name-only aab32097..HEAD`)

---
*Phase: 06-maquette-screens*
*Completed: 2026-09-12*
