---
phase: 06-maquette-screens
plan: 07
subsystem: ui
tags: [mobile, i18n, accessibility, desktop-untouched, e2e, phase-close, playwright]

# Dependency graph
requires:
  - phase: 06-06
    provides: the completed maquette surfaces this plan seals (mobile Home, sticky bars, coverage cards)
  - phase: 05
    provides: desktop-untouched.spec.ts 10-route loop, BottomNav nav landmark site, i18n parity pipeline (42 tables), 05-UI-REVIEW finding 2
  - phase: 06-01/06-04
    provides: touch-tree.spec.ts, tap-popovers.spec.ts, run-detail-visibility.spec.ts (the phase's five new specs the close gate runs)
provides:
  - nav.mobileNavigation bound in all 42 locale tables (en + de inline + 40 modules) with aria-label on the BottomNav <nav> — 05-UI-REVIEW finding 2 absorbed
  - max-md leakage pass in desktop-untouched.spec.ts: /dashboard, /containers, /files assert absence of every phone-only surface at >=48rem (StickyActionBar chrome, w-full.bg-accent trigger, back row, Save-bar count line, emptyRule card) plus the dashboard grid positive check
  - committed web/dist index.html (placeholder -> built SPA) with the binary rebuilt after the build (T-06-01 closed)
  - phase-close proof: full vitest green, full Playwright green on all four projects, npm ci green with package-lock.json unchanged, zero frozen paths in the phase diff
affects: [phase-7-m3-navpill-indicator, phase-8-real-device-validation]

# Actuals (#2632)
actuals:
  tokens: 9900
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Absence assertions for leakage guards: role/text-based first (getByRole count 0, getByText count 0) so a restyle cannot silently outdate the guard; the one class-signature check is StickyActionBar's exact chrome combo, verified as the only occurrence in src/
    - i18n key addition as a 42-table sweep (one-shot codemod script, per-language translations, parity + orphans tests as the fence)
    - Source-assert test pinning an e2e-verified accessibility attribute (mobileShellSource.test.ts) so the fix cannot drift quietly

key-files:
  created: []
  modified:
    - web/src/lib/i18n.ts
    - web/src/lib/locales/ (40 modules, nav.mobileNavigation each)
    - web/src/components/mobile/BottomNav.tsx
    - web/src/app/mobileShellSource.test.ts
    - web/e2e/desktop-untouched.spec.ts
    - web/e2e/touch-tree.spec.ts (deviation fix)
    - web/e2e/run-detail-visibility.spec.ts (deviation fix)
    - web/dist/index.html

key-decisions:
  - "MAQUETTE_ROUTES uses /dashboard, not the plan's literal /: the redirect is deliberately excluded by the file's own 10-route discipline and /dashboard is the loop's canonical destination form (documented in the file header)"
  - "Leakage battery is asserted identically on all three maquette routes, role/text-based wherever possible; the single class-signature check (div.sticky.bottom-0.z-10.bg-carbon-sidebar) was verified app-wide as unique to StickyActionBar when the pass landed"
  - "All 40 locale modules received real translations for nav.mobileNavigation (scripted one-shot insert before each table's export tail), not English fallbacks — parity enforces the key set, translation quality is kept honest per language"
  - "The two stale mobile e2e entry points were rerouted to the phase's own stacked-detail flow (tap /^plex/ card, 'plex, Back' confirms) instead of weakening any assertion — the contracts under test (touch geometry; hidden-page poll stop + return-refetch reconcile) are unchanged"

patterns-established:
  - "max-md leakage pass: per-page absence battery over every phone-only affordance, added to the desktop-untouched loop so a future leak fails CI by page name"
  - "42-table i18n sweep pattern: inline en/de blocks carry the why-comment; module tables carry a pointer comment back to it"

requirements-completed: [SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, PRIM-02, PRIM-03, PRIM-04, FLOW-03]

coverage:
  - id: D1
    description: "The BottomNav <nav> carries aria-label={t(\"nav.mobileNavigation\")} — 05-UI-REVIEW finding 2 absorbed; exactly one nav landmark mounts at a time and it is named"
    requirement: SCRN-01
    verification:
      - kind: unit
        ref: "web/src/app/mobileShellSource.test.ts (source assert pinning the attribute + why-comment)"
        status: pass
      - kind: unit
        ref: "web/src/lib/i18n.parity.test.ts + i18n.orphans.test.ts (exact key set across 42 tables; the key is rendered)"
        status: pass
      - kind: e2e
        ref: "full Playwright run: mobile pages render navigation \"Mobile navigation\" landmark (visible in the run's error-context snapshots and mobile-shell.spec.ts green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "nav.mobileNavigation exists in en, de, and all 40 locale modules with per-language translations; parity (exact key sets) and orphans (every key rendered) green"
    requirement: PRIM-02
    verification:
      - kind: unit
        ref: "cd web && node node_modules/vitest/vitest.mjs run (full suite: 104 files / 2376 tests green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "max-md leakage pass: at >=48rem all three maquette pages assert absence of StickyActionBar chrome, w-full.bg-accent trigger, 'New backup'/'Save folders' triggers, back row, 'folders handed to restic' line and emptyRule card; dashboard grid + Customize pencil positively present"
    requirement: SCRN-02
    verification:
      - kind: e2e
        ref: "web/e2e/desktop-untouched.spec.ts 'desktop untouched of phase 6 mobile chrome at *' + 'desktop dashboard keeps the customizable grid chrome' (green on desktop-1280 + desktop-768 in the full run)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The pre-existing 10-route desktop-invariance loop is unchanged (zero removed lines in the diff) and stays green on both desktop projects"
    requirement: PRIM-03
    verification:
      - kind: e2e
        ref: "web/e2e/desktop-untouched.spec.ts 'desktop untouched at *' (10 routes x 2 desktop projects, green in the full run)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phase-close gate: full vitest green; full Playwright green on all four projects (89 passed / 79 skipped / 0 failed) including touch-tree, tap-popovers, run-detail-visibility, maquette-screens, home-trigger, narrow-viewport backstop and the extended desktop-untouched loop; npm ci green with package-lock.json unchanged; tsc --noEmit + vite build green; web/dist committed and the binary rebuilt after the build"
    requirement: PRIM-04
    verification:
      - kind: unit
        ref: "cd web && node node_modules/vitest/vitest.mjs run — 104 files / 2376 tests green"
        status: pass
      - kind: e2e
        ref: "cd web && node node_modules/@playwright/test/cli.js test (all four projects: 89 passed / 79 skipped / 0 failed, EXIT 0)"
        status: pass
      - kind: gate
        ref: "node <npm>/npm-cli.js ci (exit 0; package-lock.json and package.json unchanged); node node_modules/typescript/bin/tsc --noEmit clean; node node_modules/vite/bin/vite.js build green; go build + go vet green after the build"
        status: pass
    human_judgment: false
  - id: D6
    description: "SCRN-05 judged under the recorded substitution contract: honest stat tiles fed only by frozen-Run fields + buildLogLines activity log, no fabricated per-file triad counts"
    requirement: SCRN-05
    verification:
      - kind: e2e
        ref: "web/e2e/run-detail-visibility.spec.ts 'hidden page stops the run poll; return refetches first and reconciles the finished run' (green on both mobile projects after the entry-point reroute)"
        status: pass
      - kind: unit
        ref: "RunDetailSheet.dom.test.tsx + lib suites (substitute tiles/activity-log semantics, part of the 2376-test green run)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Desktop >=48rem byte-identical across the whole phase: zero mobile-only markup leaks (D3/D4) and the frozen surfaces (router.tsx, lib/api.ts, lib/progress.ts, internal/**) absent from the phase diff"
    requirement: SCRN-03
    verification:
      - kind: gate
        ref: "git diff --name-only 9fa1ced4..HEAD — 0 matches for router.tsx / lib/api.ts / lib/progress.ts / internal/**; package-lock.json absent"
        status: pass
    human_judgment: false

# Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale mobile entry points in touch-tree.spec.ts and run-detail-visibility.spec.ts**
- **Found during:** Task 3 (phase-close full-suite gate — its first full four-project run caught what 06-05/06-06's targeted verifications could not)
- **Issue:** 06-05's stacked-detail redesign moved both specs' doors on the phone containers page: the list-level "Backup folders" chip and the list-level "Back up now" button no longer exist below 48rem (both live inside the plex card's stacked detail now). Both specs failed on BOTH mobile projects (30s tap timeouts; 5s toBeVisible misses).
- **Fix:** Rerouted both entry points to the maquette-screens.spec.ts flow (tap `/^plex/` card, `plex, Back` confirms the stack). Zero assertions weakened — the touch-geometry contract and the poll-stop/reconcile contract are byte-identical.
- **Files modified:** web/e2e/touch-tree.spec.ts, web/e2e/run-detail-visibility.spec.ts
- **Commit:** c5088867

### Environmental adaptations (not plan deviations)
- npm/npx .cmd wrappers are broken on this machine (recorded in STATE.md): `npm ci` ran via `node <npm-global>/npm-cli.js ci` (npm 11.13.0, exit 0) and the build via the documented direct invocations (`node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`).
- The Windows Playwright teardown wedge recurred on every suite run (tests complete, summary buffered while bombvault.exe stays alive); the documented `taskkill //F //IM bombvault.exe` playbook was applied after each run — all three runs then flushed their real results (28 passed targeted; 6 passed fix-verify; 89 passed / 79 skipped / 0 failed full).

## Auth Gates

None.

## Known Stubs

None — this plan adds an i18n key + attribute, e2e assertions, and the built dist; no data paths introduced.

# Metrics
duration: 45m
completed: 2026-09-12T19:10:00Z
status: complete

## Self-Check: PASSED

- All 7 key files exist on disk; 40/40 locale modules carry nav.mobileNavigation; en/de inline blocks present (i18n.ts).
- All 4 plan commits found in git log: 1d4ee59d (Task 1), 6142eb40 (Task 2), c5088867 (Rule 1 fix), d2797304 (dist phase close).
- Gate numbers re-verified from run logs: vitest 104 files / 2376 tests green; Playwright full run EXIT 0 (89 passed / 79 skipped / 0 failed); npm ci exit 0; tsc clean; vite build green; binary rebuilt after build.
