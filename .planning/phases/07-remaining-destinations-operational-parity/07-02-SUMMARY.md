---
phase: 07-remaining-destinations-operational-parity
plan: 02
subsystem: ui
tags: [mobile, shared-components, i18n, pagination, react-hooks, tailwind]

# Dependency graph
requires:
  - phase: 06-mobile-shell-navigation-foundation
    provides: the mobile card language (MobileSectionLabel's origin in Dashboard), StickyActionBar sticky-in-flow discipline, the 42-table i18n registry with parity/orphan/quality gates, jsdom-docblock hook-test model
  - phase: 07-01 (platform chrome)
    provides: data-platform chrome layer and Fab, the components/mobile home for shared mobile primitives, platform.test.ts .test.ts jsdom precedent
provides:
  - MobileSectionLabel in components/mobile (single source for the six page mobile blocks' section headers)
  - useLoadMore + loadMoreWindow (the ONE client-side list pagination primitive; constant 20/20 window, hasMore-gated button, reset-on-filter via items identity)
  - ListToolbar (the ONE sticky-in-flow search + filter-chips composite; 44px input, chips slot, no fixed chrome)
  - The phase's nine i18n keys pre-seeded across all 42 tables (common.loadMore, common.search, settings.tabsNavigation, config.restoreChain.title/step1-5) with home.newBackupConfirm aligned to the one-at-a-time clause in every table
  - i18n.preseed.test.ts pinning the exact en copy until page plans 07-03..07-07 consume the keys
affects: [07-03 VMs+Flash mobile blocks, 07-04 Config+Receiver+Fleet mobile blocks, 07-05 Settings mobile block, 07-06 Runs sheet, 07-07 phase close]

# Actuals (#2632) — same scale as the plan's estimate (chars/4 over the realized diff).
actuals:
  tokens: 28900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Single-writer i18n pre-seed: a phase's COMPLETE new-key list lands in ONE plan-owned commit so parallel page plans stay key-neutral (phase 6 nav.mobileNavigation pattern)"
    - "Orphan-gate pin test: a test that names unconsumed pre-seeded keys keeps i18n.orphans.test.ts green until real sources reference them"
    - "Render-time state adjust for reset-on-identity (React's documented adjusting-state pattern; no stale frame, no effect deps)"

key-files:
  created:
    - web/src/components/mobile/MobileSectionLabel.tsx
    - web/src/lib/useLoadMore.ts
    - web/src/lib/useLoadMore.test.ts
    - web/src/components/mobile/ListToolbar.tsx
    - web/src/lib/i18n.preseed.test.ts
  modified:
    - web/src/pages/Dashboard.tsx
    - web/src/lib/i18n.ts
    - web/src/lib/locales/ (40 modules: ar..zh)

key-decisions:
  - "ListToolbar's placeholder arrives typed as TranslationKey and is resolved internally via useT - the toolbar owns no i18n keys, mirroring MobileSectionLabel's labelKey pattern"
  - "useLoadMore resets on items array IDENTITY change via render-time state adjust; consumers pass the FILTERED array so identity is the filter signal and slice/filter can never disagree"
  - "Phase 7 i18n keys pre-seeded in one commit (single-writer); i18n.preseed.test.ts pins the exact en copy and satisfies the orphan gate until the page plans consume the keys"
  - "useLoadMore.test.ts uses a jsdom docblock (.test.ts, not .dom.test.tsx) - pure logic + renderHook, following useVisibilityGate.test.ts and platform.test.ts"

patterns-established:
  - "loadMoreWindow(total, visible, threshold): the pure window-math fn, unit-proven directly, hook calls it for every append"
  - "Sticky-in-flow toolbar chrome: sidebar surface + one hairline on the edge that faces the content, direct child of the PAGE_SHELL column, overflow scrolling only inside leaves"
  - "Pre-seed block comments in every table: a phase comment naming the owning plan and pointing at the en block in i18n.ts"

requirements-completed: [LISTS-01]

coverage:
  - id: D1
    description: "MobileSectionLabel promoted verbatim to components/mobile; Dashboard imports it back (single source for all six page mobile blocks)"
    requirement: ""
    verification:
      - kind: other
        ref: "git grep 'function MobileSectionLabel' -> exactly 1 definition repo-wide; full vitest suite green (108 files / 2426 tests) incl. Dashboard dom tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dashboard carried fixes absorbed: mobile block's two 12px gaps normalized to the 8/16 stops; home.newBackupConfirm call site confirmed rendering t() verbatim"
    requirement: ""
    verification:
      - kind: other
        ref: "grep of Dashboard mobile block lines 2085-2355 + 2930-3100 -> zero gap-3 utilities; newBackupConfirm renders t(\"home.newBackupConfirm\") unchanged (Task 3 key edit needed no call-site change)"
        status: pass
    human_judgment: false
  - id: D3
    description: "useLoadMore + loadMoreWindow: constant 20/20 window (D-11), exactly one threshold per press clamped to [0,total], hasMore-gated button, reset on items identity change, no IntersectionObserver/scroll machinery"
    requirement: "LISTS-01"
    verification:
      - kind: unit
        ref: "web/src/lib/useLoadMore.test.ts#loadMoreWindow (pure) + web/src/lib/useLoadMore.test.ts#useLoadMore (hook) (15 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "ListToolbar sticky-in-flow search + chips composite: lifted search state, TranslationKey placeholder, 44px input, chips overflow scrolls inside the leaf"
    requirement: "LISTS-01"
    verification:
      - kind: other
        ref: "npx tsc --noEmit clean + npx eslint src/components/mobile/ListToolbar.tsx clean; full vitest suite green; grep shows no position:fixed / IntersectionObserver code (why-comments only)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nine phase 7 i18n keys pre-seeded across all 42 tables with faithful translations (no English verbatim in the 13 non-Latin locales, APP_KEY literal, no em dashes); home.newBackupConfirm aligned to the one-at-a-time clause everywhere (Carried Fix 3a)"
    requirement: "LISTS-01"
    verification:
      - kind: unit
        ref: "web/src/lib/i18n.preseed.test.ts + web/src/lib/i18n.parity.test.ts + web/src/lib/i18n.orphans.test.ts + web/src/lib/i18n.quality.test.ts (all pass in the full run)"
        status: pass
    human_judgment: false

# Metrics
duration: 36min
completed: 2026-09-13
status: complete
---

# Phase 7 Plan 02: Shared Mobile-Block Foundations Summary

**The mobile card language's shared primitives extracted and locked: MobileSectionLabel, useLoadMore (20/20 constant window), ListToolbar (sticky-in-flow search), and the phase's nine i18n keys pre-seeded across all 42 tables with the backup-confirm copy aligned to the one-at-a-time guard chain**

## Performance

- **Duration:** 36 min
- **Started:** 2026-09-13T10:15:28Z
- **Completed:** 2026-09-13T10:51:11Z
- **Tasks:** 3
- **Files modified:** 47

## Accomplishments
- MobileSectionLabel lives in components/mobile and Dashboard imports it back — one source for the section header of every destination's mobile block (07-03..07-07 consume it verbatim)
- useLoadMore/loadMoreWindow: the phase's only list pagination — constant threshold (never a growing step, D-11), hasMore-gated button, reset-on-filter through array identity, no infinite-scroll machinery by construction; 15 unit tests prove the window math and hook behavior
- ListToolbar: the ONE sticky-in-flow search + filter-chips composite (StickyActionBar discipline, never position:fixed; direct page-column child; 44px touch floor; lifted search state, chips ride existing filter primitives)
- The phase's complete nine-key i18n list landed in ONE commit across all 42 tables (en verbatim from the UI-SPEC Copywriting Contract; de in du-form house style; 40 modules faithfully translated, quality gate green) — page plans 07-03..07-07 stay key-neutral
- home.newBackupConfirm aligned in every table to the one-at-a-time stop/restart clause (Carried Fix 3a), matching the D-03 restore guard chain

## Task Commits

Each task was committed atomically:

1. **Task 1: MobileSectionLabel promotion + Dashboard carried fixes** - `ca447959` (feat)
2. **Task 2: useLoadMore + ListToolbar** - `52a0c3e8` (feat)
3. **Task 3: i18n pre-seed across all 42 tables** - `d6917a4e` (feat)

## Files Created/Modified
- `web/src/components/mobile/MobileSectionLabel.tsx` - shared section header of the mobile card language
- `web/src/lib/useLoadMore.ts` - loadMoreWindow pure fn + useLoadMore hook (client-side pagination primitive)
- `web/src/lib/useLoadMore.test.ts` - 15 tests: window math boundaries + hook behavior via renderHook
- `web/src/components/mobile/ListToolbar.tsx` - sticky-in-flow search + chips slot composite
- `web/src/lib/i18n.preseed.test.ts` - pins the exact en copy + 42-table presence of the pre-seeded keys (see Deviations)
- `web/src/pages/Dashboard.tsx` - imports MobileSectionLabel back; two 12px mobile gaps normalized to gap-2
- `web/src/lib/i18n.ts` - 9 new keys (en + de blocks with phase comments); home.newBackupConfirm aligned (en + de)
- `web/src/lib/locales/*.ts` (40 files) - 9 translated keys appended per module (phase 7 block); home.newBackupConfirm aligned per language

## Decisions Made
- **ListToolbar placeholder is typed TranslationKey, resolved internally** — the toolbar owns no i18n keys; consumers pass an existing domain key or the pre-seeded common.search (mirrors MobileSectionLabel's labelKey)
- **useLoadMore resets via render-time identity check** — React's documented adjusting-state pattern: no stale-slice frame an effect would paint, no dep array to drift; the stable-array consumer contract is asserted by a test
- **Single-writer i18n pre-seed + pin test** — all nine keys in one plan-owned commit so four parallel Wave-2 plans add zero keys; i18n.preseed.test.ts is the sanctioned orphan-gate reference and copy fence
- **jsdom docblock for useLoadMore.test.ts** — renderHook needs a document; the pure asserts are environment-independent (useVisibilityGate/platform.test precedent)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2/3 - Missing critical functionality / blocking] Added web/src/lib/i18n.preseed.test.ts**
- **Found during:** Task 3 (i18n pre-seed)
- **Issue:** The plan's nine pre-seeded keys have zero referencing sources until page plans 07-03..07-07 land — i18n.orphans.test.ts (the plan's own gate) fails on any key nobody renders, and the file list in the plan contained no mechanism to keep it green. Adding the keys to KNOWN_ORPHANS was forbidden (one-way ratchet; the plan itself rules it out).
- **Fix:** Created the pin test the orphan guard's own doc sanctions ("a key some test still names counts as used"): it names all nine keys (satisfying the gate), pins the exact en copy verbatim, asserts non-empty presence in de + all 40 tables, bans em dashes in the new values, and fences the aligned home.newBackupConfirm clauses. Header documents the ratchet (may only tighten) and that page-plan source references supersede its naming role.
- **Files modified:** web/src/lib/i18n.preseed.test.ts (created; outside the plan's files_modified list)
- **Verification:** Full vitest suite green — 108 files / 2426 tests, including parity (exact key set + placeholder tokens), orphans (zero orphans), and quality [338]/[339] gates
- **Committed in:** d6917a4e (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (missing critical functionality required by the plan's own gate)
**Impact on plan:** The deviation is additive (one test file) and required for the plan's stated verify to pass. No scope creep. Also recorded in .planning/WINDOWS.md as a `deviation` entry.

## Issues Encountered
- The temporary codemod's first run aborted on its own safety check (it expected exactly one home.newBackupConfirm line in i18n.ts but the file legitimately carries two, en + de inline); tightened the check to "exactly two" and re-ran clean. Codemod deleted before commit.
- Six drafted translations received post-codemod grammar fixes (fr elision l'APP_KEY; el/hr/sl/et/lt verb forms and word order in config.restoreChain.step3) before the gate run — part of authoring the faithful translations Task 3 requires.

## Known Stubs
None — every deliverable is a real implementation wired for consumption; the pre-seeded keys land unconsumed by design (single-writer pre-seed) with the pin test as their reference until 07-03..07-07 wire them.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 2 (07-03 VMs+Flash, 07-04 Config+Receiver+Fleet, 07-05 Settings) is unblocked: cards can import MobileSectionLabel, lists bind useLoadMore + ListToolbar, and every new-string slot resolves a pre-seeded key — no page plan needs to touch i18n
- config.restoreChain.title/step1-5 carry the D-03 guard-chain copy for 07-04's restore sheet verbatim
- i18n.preseed.test.ts may only tighten; when page plans reference the keys in source, the naming-only role lapses automatically while the copy pins stay

## Self-Check: PASSED
- All 5 created files exist on disk (verified by path)
- All 3 task commits exist in history: ca447959, 52a0c3e8, d6917a4e
- Full-suite gate green at close: 108 test files / 2426 tests passed; tsc --noEmit and eslint clean on touched files

---
*Phase: 07-remaining-destinations-operational-parity*
*Completed: 2026-09-13*
