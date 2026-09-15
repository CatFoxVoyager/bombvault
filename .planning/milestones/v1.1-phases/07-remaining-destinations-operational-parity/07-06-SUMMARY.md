---
phase: 07-remaining-destinations-operational-parity
plan: 06
subsystem: web-spa-mobile-lists
tags: [lists-01, list-ergonomics, mobile, toolbar, load-more, containers, files, activity-log]
requires:
  - 07-02 (useLoadMore + ListToolbar foundations)
provides:
  - Containers mobile list on shared-state ListToolbar + useLoadMore
  - Files sets list with shared search + load-more + carried header flex-wrap fix
  - ActivityLog mobile variant (internal double gate) mounted in the Dashboard mobile block
  - useLoadMore live-feed preserveKey extension
affects:
  - 07-07 (remaining lists repeat the retrofit shape)
  - 07-08 (narrow-locale sweep asserts the carried Files fix stays dead)
tech-stack:
  added: []
  patterns:
    - one state, two presentations (mobile toolbar binds desktop-owned filter state)
    - live-feed preserveKey for lists whose array identity changes without a filter change
key-files:
  created:
    - web/e2e/list-ergonomics.spec.ts
  modified:
    - web/src/pages/Containers.tsx
    - web/src/pages/Files.tsx
    - web/src/components/ActivityLog.tsx
    - web/src/pages/Dashboard.tsx
    - web/src/lib/useLoadMore.ts
    - web/src/lib/useLoadMore.test.ts
    - web/e2e/maquette-screens.spec.ts
    - web/e2e/tap-popovers.spec.ts
    - web/dist/index.html
decisions:
  - useLoadMore gained an optional preserveKey (3rd param): the activity log's merged array re-merges on every poll/SSE/tick, and strict identity reset would collapse the reader's page every few seconds; same-key identity change is a refresh, key change rewinds, absent key = wave-1 semantics untouched
  - Files sets list got a NEW set-name search state bound only to the mobile toolbar via common.search — the desktop sets list has no search-like state to bind (audited first per the plan's own instruction)
  - Files header action row and ms-auto column keep min-width:auto ON PURPOSE — the mutation-checked min-w-0 variant pushes the squeezed items-end column out the LEFT edge (x=-3 at 390px de); the real page-pan culprit was the header row's shrink-0, removed instead
  - Dashboard's mobile ActivityLog mount passes NO hueIndex — the rainbow counter is desktop-grid-scoped and a second draw would shift every later block's hue
  - FilterPopover retired from mobile Containers — the two tap-popovers tests riding it were retargeted to the Accent card's Preset 1 swatch (the only fresh-DB-live mobile TapPopover surface)
metrics:
  duration: 3h22m
  completed: 2026-09-13
status: complete
actuals:
  tokens: 22230
  tasks: 3
  commits: 4
---

# Phase 07 Plan 06: Retrofit LISTS-01 Onto the Existing Long Lists Summary

Containers' mobile card list, the Files sets list, and the ActivityLog (reaching mobile via the Dashboard block) all gained the sticky-in-flow search + filter chips toolbar, constant-threshold load-more, and >=44px rows — with the carried Files header flex-wrap fix landed and regression-asserted; desktop above 48rem is byte-identical everywhere.

## What Was Built

- **Task 1 — Containers (e6c41492, tracer):** ListToolbar bound to the page's OWN search/filterKey/schedule/backup/sort state (the exact state the desktop FilterPopover reads — one predicate, two presentations), useLoadMore over the section-gated rendered card array, hasMore-gated 44px Load more, filter.noMatch empty card, desktop controls row kept via `max-md:hidden` (jsdom dom suites see the desktop DOM unchanged). Five mobile e2e scenarios in the new list-ergonomics.spec.ts.
- **Task 2 — Files (f5c14dfe):** the carried 06-UI-REVIEW header flex-wrap fix (restored + mutation-proven: de-unfixed FAIL 749ms, de-fixed PASS 744ms), plus the sets list retrofit: shared common.search toolbar over a new set-name filter state, useLoadMore, honest no-match card, load-more 20→40→absent, never auto-loads.
- **Task 3 — ActivityLog + Dashboard (81f339a1):** internal `isDesktop` double gate — desktop variant (auto-follow scroller, filter selects) byte-identical; mobile variant with MobileSectionLabel, ListToolbar re-presenting the existing day/domain/type filter state, divide-y >=44px rows, useLoadMore with the new preserveKey (the log re-merges every 10s poll/SSE push/60s tick). Dashboard's mobile block mounts it below MobileRepoHealthCard with the same dayFilter props (no hueIndex — the rainbow counter stays desktop-grid-scoped).

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Containers mobile list — shared-state toolbar + load-more (tracer) | e6c41492 | Containers.tsx, list-ergonomics.spec.ts, dist/index.html |
| 2 | Files sets list — shared search + load-more + carried header fix | f5c14dfe | Files.tsx, list-ergonomics.spec.ts, dist/index.html |
| 3 | ActivityLog mobile variant + Dashboard mobile mount | 81f339a1 | ActivityLog.tsx, Dashboard.tsx, useLoadMore.ts, useLoadMore.test.ts, list-ergonomics.spec.ts, dist/index.html |
| — | e2e retarget fallout fix | 950855df | maquette-screens.spec.ts, tap-popovers.spec.ts |

## Verification

- vitest full suite: 109 files / 2434 tests passed (incl. 4 new useLoadMore live-feed tests)
- list-ergonomics.spec.ts: 28 passed / 0 failed / 28 skipped on the real binary (26 mobile runs + 2 desktop guards)
- tap-popovers.spec.ts: 8/8 after retarget; maquette-screens green on both device projects
- `tsc --noEmit` clean; eslint clean (one pre-existing warn-only exhaustive-deps warning in ActivityLog.tsx :278 — untouched code, house convention)
- Source checks: no IntersectionObserver/scroll listeners in the retrofitted files; position:fixed only in ListToolbar's why-comment; no second filter state for Containers (the `filter` state at Files.tsx :303 belongs to the add/edit dialog tree, not the sets list)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Files header page-pan: removed `shrink-0` from the header action row**
- **Found during:** Task 2 (German 360px F4 mutation check failed at x=-3)
- **Issue:** the header row's `shrink-0` rendered it at max-content width (393px de buttons > 358px content), so its inner flex-wrap never engaged and main#bv-main became horizontally scrollable; the F4 tap's scroll-into-view panned the whole page -3px. (The first hypothesis — min-w-0 squeeze on the ms-auto column — was mutation-checked out: removing min-w-0 changed nothing; the column keeps min-width:auto deliberately.)
- **Fix:** removed `shrink-0` so the row wraps within the content box; why-comment at the site
- **Files modified:** web/src/pages/Files.tsx
- **Commit:** f5c14dfe

**2. [Rule 1 - Bug] useLoadMore live-feed preserveKey extension (files outside the plan's list)**
- **Found during:** Task 3
- **Issue:** the hook's reset-on-identity contract collapses the activity log's mobile window on every poll/SSE/tick re-merge — precisely the "where was that row" instability D-11 exists to prevent
- **Fix:** optional `preserveKey` param: same-key identity change = refresh (window kept, slice clamps on shrink), key change = rewind, absent = strict wave-1 semantics; 4 new unit tests
- **Files modified:** web/src/lib/useLoadMore.ts, web/src/lib/useLoadMore.test.ts (not in the plan's files_modified list — justified: the hook is this plan's declared pagination mechanism and the extension is required for its Task 3 to be correct)
- **Commit:** 81f339a1

**3. [test-bug] F4 locator substring collision — `exact: true`**
- **Found during:** Task 2
- **Issue:** `getByRole("button", { name: "Jetzt sichern" })` substring-matched the bulk bar's "Alle jetzt sichern"; `.first()` picked the wrong button
- **Fix:** `exact: true` + comment
- **Files modified:** web/e2e/list-ergonomics.spec.ts
- **Commit:** f5c14dfe

**4. [Rule 1 - fallout] e2e specs invalidated by the intentional UX replacement (950855df, files outside the plan's list)**
- **Found during:** final full-suite verification (8 deterministic failures)
- **Issue:** (a) tap-popovers ×2 tests tapped the Containers mobile FilterPopover, which LISTS-01 retired; (b) maquette-screens' scroll-intact test broke because the new ~150px toolbar chrome defeats its minimal-scrollIntoViewIfNeeded determinism trick — tap() re-centers the scroller between capture and click, so the handler correctly records the settled post-auto-scroll position (probe-proven: restore fired with captured=0). Baseline run at 713bc6b3 proves both specs passed pre-plan → plan fallout, not pre-existing.
- **Fix:** (a) retargeted to the Accent card's "Preset 1" swatch — the only mobile TapPopover surface live on a fresh DB (the rainbow palette swatches are `disabled={!rainbow.on}`); (b) the test now centers the card itself and asserts full visibility before capturing
- **Files modified:** web/e2e/tap-popovers.spec.ts, web/e2e/maquette-screens.spec.ts
- **Commit:** 950855df

## Auth Gates

None.

## Known Stubs

None — every surface is wired to the shared state and the real API pipeline.

## Deferred Issues

- **platform-chrome.spec.ts :135/:166 (2 failures, mobile-android):** `input[type='checkbox']` not visible on /vms. PRE-EXISTING — decisive baseline run at 713bc6b3 reproduces exactly these 2 failures (the 07-03 VMs retrofit moved the multi-select checkbox out of the always-visible mobile surface). Out of 07-06's scope boundary; full write-up in `deferred-items.md`.

## TDD Gate Compliance

Plan type is `execute` (not `tdd`); Task 1 ran as a tracer with production-quality commit. No RED/GREEN gates required; no skipped tests left behind.

## Self-Check: PASSED

- All 10 touched files exist in the working tree and in their commits (git log verified below)
- Commits e6c41492, f5c14dfe, 81f339a1, 950855df all present on docker-folders
- Full verification chain re-run after the final fix commit: list-ergonomics 28 passed / 0 failed, tap-popovers 8/8, maquette-screens green on both device projects
