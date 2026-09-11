---
phase: 05-mobile-shell-navigation-foundation
plan: 02
subsystem: ui
tags: [react, navigation, registry, useSyncExternalStore, tailwind, media-query, vitest]

# Dependency graph
requires:
  - phase: 05-mobile-shell-navigation-foundation (plan 01)
    provides: Playwright UAT harness foundation — the desktop-untouched e2e surface the new desktop-sidebar testid feeds
provides:
  - ONE pure nav registry: destinations()/barDestinations()/moreDestinations() in web/src/lib/navModel.ts, with 20 node-env guard tests
  - useIsDesktop() hook + DESKTOP_QUERY — the single JS home of the (min-width: 48rem) breakpoint literal — under a source-assert one-literal guard
  - Guarded desktop-default jsdom window.matchMedia stub wired via vitest setupFiles, landed in the same commit as the hook (Pitfall-1 coupling)
  - data-testid="desktop-sidebar" on the Sidebar root for phase-5 e2e specs
affects: [05-03 (bottom bar + More sheet consume barDestinations/moreDestinations), 05-04, 05-05 (e2e over the registry + testid), 05-06 (embedded build)]

# Actuals (#2632) — chars/4 over the realized diff (36,434 chars across 7 files), never a harness token count.
actuals:
  tokens: 9108
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: [] # no new runtime dependencies — React 19's built-in useSyncExternalStore only
  patterns:
    - useSyncExternalStore as the house browser-API-as-store shape (matchMedia), mirroring theme.ts:78-87 subscribe
    - source-assert guard tests (routedPages.test.ts style) pinning drift-prone literals

key-files:
  created:
    - web/src/lib/navModel.ts
    - web/src/lib/navModel.test.ts
    - web/src/lib/useMediaQuery.ts
    - web/src/lib/useMediaQuery.test.ts
    - web/src/lib/testSetup/matchMedia.ts
  modified:
    - web/src/components/Sidebar.tsx
    - web/vitest.config.ts

key-decisions:
  - "Registry imports icon components from ../components/navGlyphs — a documented, load-bearing exception to 'lib imports nothing from components' (see Deviations): single source of label AND icon data beats the criterion's letter"
  - "destinations(settings: Settings | null) — null (Sidebar's pre-boot state) behaves exactly like every gate off, matching SidebarProps and the old ?? false defaults"
  - "labelKey typed as TranslationKey (keyof typeof en) so a bad key is a compile error, not just a runtime test failure"
  - "Desktop default everywhere matchMedia is absent (stub answers min-width queries true; windowless snapshot true) so existing jsdom suites keep asserting the desktop layout they were written against"
  - "Guarded stub: installs only when window exists AND matchMedia is not already a function — node-env suites unaffected, per-file stubs (Settings.themeCard.dom.test.tsx) keep winning"

patterns-established:
  - "ONE-registry doctrine (SHELL-03): every chrome surface derives from destinations(settings); entries carry per-gate `enabled`, callers never receive pre-filtered lists"
  - "Source-assert guard: a node-env test reads source text to pin a literal whose duplication causes JS/CSS flicker, and fails with the why"
  - "Browser API as a store: useSyncExternalStore (subscribe/getSnapshot/getServerSnapshot), never listener-in-effect hooks (torn snapshots)"
  - "Guarded global test stubs via test.setupFiles: fill the missing browser API, defer to anything more specific"

requirements-completed: [SHELL-01, SHELL-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "ONE pure nav registry (destinations/barDestinations/moreDestinations) with full-order, never-prefilter, gate-adjacency, order-parity, and labelKey guards"
    requirement: SHELL-03
    verification:
      - kind: unit
        ref: "web/src/lib/navModel.test.ts (20 tests: full SIDEBAR_ORDER, unique routes, null-settings, it.each gate adjacency, bar/More order parity, EMPTY probe, no-hue-field shape)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Desktop Sidebar consumes the registry with byte-identical hue-counter (nextHue()) semantics and carries data-testid=\"desktop-sidebar\""
    requirement: SHELL-01
    verification:
      - kind: unit
        ref: "web/src/components/Sidebar.tabColor.dom.test.tsx#exact --item-hue position assertions (passes unchanged)"
        status: pass
      - kind: unit
        ref: "web/src/lib/navModel.test.ts#destinations — full ten-entry list in desktop Sidebar order"
        status: pass
    human_judgment: true
    rationale: "Tests prove hue-sequence and order semantics byte-for-byte, but 'the desktop sidebar renders exactly as before' has a residual visual dimension (spacing, icon rendering) that a human glance covers; 05-05's desktop-untouched e2e/UAT is the designed sign-off."
  - id: D3
    description: "useIsDesktop() + DESKTOP_QUERY as the single JS breakpoint literal, pinned to Tailwind md (48rem) by a source-assert one-literal guard"
    requirement: SHELL-01
    verification:
      - kind: unit
        ref: "web/src/lib/useMediaQuery.test.ts (3 tests; guard proven live — altered literal 48rem→64rem failed 2 tests with the explanatory why, then restored)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Guarded desktop-default jsdom window.matchMedia stub wired via vitest setupFiles in the same commit as useMediaQuery (Pitfall-1 coupling)"
    verification:
      - kind: unit
        ref: "full suite: 95 test files / 2264 tests passed with the stub wired, incl. app/Layout.displayPrefs.dom.test.tsx rendering the real Layout"
        status: pass
    human_judgment: false

# Metrics
duration: 16min
completed: 2026-09-11
status: complete
---

# Phase 5 Plan 2: Nav Registry Extraction Summary

**ONE pure nav registry (navModel.ts) now drives the desktop Sidebar with byte-identical hue-counter semantics, and useIsDesktop() lands the single (min-width: 48rem) breakpoint literal under a source-assert guard, with a guarded jsdom matchMedia stub wired in the same change**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-11T20:35:07Z
- **Completed:** 2026-09-11T20:53:00Z
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Extracted Sidebar's inline destination JSX into `web/src/lib/navModel.ts` — the ONE ordered registry (10 destinations, per-gate `enabled`, bar/More as one-line filter derivations) that the phase-5 mobile bar and More sheet will consume next.
- Rewired `Sidebar.tsx` to consume the registry with byte-identical `nextHue()` render-counter semantics (gates short-circuit BEFORE the counter, so hidden tabs never burn a rainbow slot — pinned by the unchanged `Sidebar.tabColor.dom.test.tsx`) and added `data-testid="desktop-sidebar"`.
- Landed `useMediaQuery.ts` (`DESKTOP_QUERY`, `useIsDesktop()` on `useSyncExternalStore`) with a node-env source-assert test that pins the exact Tailwind md literal and enforces the one-literal rule across src — proven live to fail with the why when the literal is altered.
- Landed the guarded desktop-default `window.matchMedia` stub (`web/src/lib/testSetup/matchMedia.ts`) wired via `test.setupFiles` in the SAME commit as the hook, so the first jsdom suite that renders the real Layout cannot hit "matchMedia is not a function".
- Full suite at close: 95 test files / 2264 tests passed; `tsc --noEmit` exit 0; `vite build` succeeded (`web/dist` left uncommitted per plan discipline — the final embedded build belongs to 05-06).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the ONE pure nav registry (navModel) with unit guards** - `dea95f80` (feat)
2. **Task 2: Sidebar consumes the navModel registry; desktop-sidebar testid** - `6bf37c22` (refactor)
3. **Task 3: useMediaQuery hook + one-literal guard + jsdom matchMedia stub** - `8f1c8dee` (feat)

**Plan metadata:** committed atomically with this SUMMARY (docs commit).

## Files Created/Modified

- `web/src/lib/navModel.ts` - the ONE pure ordered nav registry; never assigns hues (Sidebar's nextHue() counter stays render-time); documents the deliberate navGlyphs import exception
- `web/src/lib/navModel.test.ts` - 20 node-env guard tests: full order, never-prefiltered, null settings, gate adjacency, bar/More order parity, EMPTY probe, no-hue-field shape
- `web/src/lib/useMediaQuery.ts` - DESKTOP_QUERY (the single JS breakpoint literal) + useIsDesktop() on useSyncExternalStore, windowless-guarded, theme.ts subscribe shape
- `web/src/lib/useMediaQuery.test.ts` - source-assert guard: pins the exact literal, enforces the one-literal rule across src, self-guarded, fails with the why
- `web/src/lib/testSetup/matchMedia.ts` - guarded desktop-default matchMedia stub (installs only when missing; per-file stubs keep winning)
- `web/src/components/Sidebar.tsx` - consumes destinations(); renders mainList + Settings entry through the registry; hue-semantics comment preserved; desktop-sidebar testid
- `web/vitest.config.ts` - test.setupFiles wiring for the stub (same-change coupling)

## Decisions Made

- **navGlyphs import exception:** the acceptance criterion "navModel.ts imports nothing from web/src/components" is unsatisfiable together with the action spec requiring `icon` as a ComponentType (glyphs live in `components/navGlyphs.tsx`). Resolved in favor of the action spec — a single source of label AND icon data is the drift SHELL-03 exists to kill; an icon-key map would reintroduce it. Documented as a load-bearing exception in navModel.ts's header; in-repo precedent: `lib/useConfirm.tsx`→`components/ConfirmDialog`, `lib/toast.tsx`→`components/Toast`.
- **`Settings | null` signature:** widened from the plan's nominal `Settings` because `SidebarProps.settings` is `Settings | null` and dom tests pass partial fixtures; null = all gates off, matching the old `?? false` defaults exactly.
- **Typed labelKey:** `TranslationKey` (keyof typeof en) makes a bad nav key a compile error rather than only a test failure.
- **Desktop default when matchMedia is absent** (stub and windowless snapshot both answer true) keeps every existing jsdom suite asserting the desktop layout it was written against.
- **Guarded stub over unconditional stub:** setupFiles run for node-env suites too (window undefined) and per-file stubs must keep controlling what the OS "prefers" — the double guard (`window` exists AND `matchMedia` missing) makes the global stub a no-op everywhere else.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] labelKey typed as TranslationKey (was string)**
- **Found during:** Task 2 (Sidebar rewire); defect originated in Task 1's committed navModel.ts
- **Issue:** `tsc --noEmit` failed TS2345 at Sidebar.tsx:737 — `t(d.labelKey)` requires the translation-key union, but `NavDestination.labelKey` was typed `string`
- **Fix:** typed `labelKey: TranslationKey` (import type from `./i18n`); simplified the test's en-table lookup to `en[d.labelKey]`
- **Files modified:** web/src/lib/navModel.ts, web/src/lib/navModel.test.ts
- **Verification:** `tsc --noEmit` exit 0; full suite (2264 tests) green
- **Committed in:** `6bf37c22` (Task 2 commit — Task 1 was already committed)

### Plan-internal contradiction — resolved with documented rationale

**2. "navModel.ts imports nothing from web/src/components" vs. required icon ComponentType**
- **Found during:** Task 1
- **Issue:** the criterion and the action spec are mutually unsatisfiable (see Decisions Made)
- **Resolution:** followed the action spec; documented the single import edge as deliberate in navModel.ts's header banner
- **Impact:** no scope creep; every other criterion holds as written

**Total deviations:** 1 auto-fixed (Rule 1) + 1 documented conflict resolution
**Impact on plan:** both necessary for correctness/coherence; no scope creep.

## Issues Encountered

- **Broken npx/npm .cmd shims in the executor shell** (truncated PATH to cmd.exe children — known from 05-01): worked around with direct invocations (`node node_modules/vitest/vitest.mjs run`, `PATH="...nodejs-lts/current:$PATH" node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`). No repo change.
- **`git checkout` cannot restore an untracked file:** during the guard-failure proof, the sed-altered useMediaQuery.ts had no committed version to restore from — restored via Edit + grep, then re-ran the guard (3/3 pass) and tsc (exit 0).
- **`web/dist/index.html` rebuilt** by Task 2's build verify — left unstaged per the web/dist discipline (05-06 owns the final embedded build).

## Requirement Completion Note

`requirements-completed: [SHELL-01, SHELL-03]` records this plan's declaration verbatim. The shared-ID gate was checked with `requirements.ready-ids` and returned **0/2 ready**: SHELL-01 is co-declared by 05-05 and SHELL-03 by 05-03/05-05/05-06, none of which have SUMMARYs yet. Per the gate, `requirements.mark-complete` was intentionally NOT run — the IDs become markable when the last sibling declaring them completes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 05-03 can consume `barDestinations()`/`moreDestinations()` directly; structural order parity across gate flips is already guarded.
- `useIsDesktop()` is the chrome-switch primitive for Layout; `DESKTOP_QUERY` is the only sanctioned JS breakpoint home (guard enforces it).
- `data-testid="desktop-sidebar"` is live in the rendered markup (verified in the built bundle) for the desktop-untouched e2e spec.
- No blockers.

## Self-Check: PASSED

- All 7 files verified in `git diff --stat dea95f80~1 HEAD` (committed on docker-folders).
- Commits `dea95f80`, `6bf37c22`, `8f1c8dee` present in `git log`, each with exactly one `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer.
- Verification at close: vitest 95 files / 2264 tests passed; `tsc --noEmit` exit 0; source-assert guard proven live (altered literal → 2 failures with the why → restored → 3/3 pass).
- No tracked-file deletions in any task commit; `web/dist` and never-commit artifacts (.gsd/, .playwright-mcp/, uat-*.png, agent-history.json, milestone.lock) left untracked/unstaged.

---
*Phase: 05-mobile-shell-navigation-foundation*
*Completed: 2026-09-11*
