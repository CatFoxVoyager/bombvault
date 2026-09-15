---
phase: 06-maquette-screens
plan: 05
subsystem: ui
tags: [mobile, sticky-action-bar, save-bar, stacked-detail, coverage-cards, run-deep-link, e2e, scrn-02, scrn-03, scrn-04, flow-03]
requirements-completed: [SCRN-02, SCRN-03, SCRN-04, FLOW-03]
requires:
  - 06-01/06-02 mobile primitives (D-01 touch tree, BottomSheet, ConfirmSheet fail tone)
  - 06-03 TapPopover (FilterPopover below the breakpoint) + touch conventions
  - 06-04 RunDetailSheet `<run open onClose/>` hosting contract + lib/runDisplay vocabulary
  - FROZEN web/src/app/router.tsx / web/src/lib/api.ts / web/src/lib/progress.ts / internal/** (consumed, never modified)
  - desktop FoldersEditor serialized queue semantics (queueRef) — the ONE save path, mobile only flushes it
provides:
  - StickyActionBar (web/src/components/mobile/StickyActionBar.tsx) — the shared sticky-in-flow bar; 06-06's Home trigger zone is the named consumer
  - SaveBarState publish contract — editor publishes `{ ticked, inFlight, shakeNonce }` through a stable setState; the bar derives everything; flushRef exposes the flush (SAVE_FLUSH_KEY row)
  - Locally-stacked container detail (D-04) — list hidden-not-unmounted, scroll captured at open and restored on Back; no route (router.tsx frozen)
  - Coverage-card patterns — MobileContainerCard / MobileFileSetCard (rainbowAt hueVars, folders.previewPaths count line, aria-hidden identity bar)
  - FLOW-03 seam — useBackupWatch optional `onRun` (baseline-id correlation reports the run every poll) + BackupButton/FileSetBackupButton `onRunCorrelated` passthrough; desktop callers omit and are unchanged
  - PAGE_SHELL_RESPONSIVE constant (lib/pageShell.ts) + eslint page-uses-page-shell exception data for Containers.tsx/Files.tsx
  - web/e2e/maquette-screens.spec.ts — 5 scenarios + stageContainerDomain/stageFilesDomain route-staging helpers
  - i18n keys common.back, folders.handedToRestic, files.emptyRule in en/de inline + all 40 locale modules
affects: [06-06, phase-8 real-device validation]
tech-stack:
  added: []
  patterns:
    - publish-contract Save bar — the editor owns the queue and publishes derived state via a stable useState setter; the bar derives everything and its Save press only calls flushRef (zero new save mechanism)
    - flush as mirror re-send — the flush desc has pre === sent === live, so a zero-delta flush reverts nothing and a failure only shakes the bar; a mid-flight flush fills only an ABSENT pendingDescRef slot (a pending toggle's revert recipe is never displaced)
    - hidden-not-unmounted stacked detail — the list stays mounted under the detail so scroll position survives Back without a route
    - baseline-id correlation callback — onRun ref-mirrors into the poll closure; consumers deep-link component-local sheets with zero new trigger code paths
    - route-layer e2e staging of unavailable domains on the real binary (touch-tree Rule 3 precedent, reused)
key-files:
  created:
    - web/src/components/mobile/StickyActionBar.tsx
    - web/src/components/mobile/StickyActionBar.dom.test.tsx
    - web/e2e/maquette-screens.spec.ts
  modified:
    - web/src/pages/Containers.tsx
    - web/src/pages/Files.tsx
    - web/src/components/SelectionTree.tsx
    - web/src/components/BackupButton.tsx
    - web/src/lib/backupWatch.ts
    - web/src/lib/pageShell.ts
    - web/eslint.config.js
    - web/src/lib/i18n.ts
    - web/src/lib/locales/*.ts (40 modules)
    - web/dist/index.html
decisions:
  - The Save bar is a PUBLISH contract, not a props contract: the editor passes the same `setSaveState` function it already owns (stable identity, exhaustive-deps-safe) and the bar renders from `{ ticked, inFlight, shakeNonce }`. The flush travels a sibling ref (flushRef) so the bar's Save press drains the editor's EXISTING serialized queue — SCRN-03 mandates one desktop-identical save path, so the bar never owns queue state.
  - The flush description re-sends the live mirror (pre === sent === live): a zero-delta flush PATCHes the same selection the queue last drained, so success reverts nothing, and a failure shakes only the bar while the desktop live-save path toasts as always. A mid-flight flush fills ONLY an absent pending slot, never displacing a pending toggle's revert recipe.
  - FLOW-03's seam is the hook, not the trigger: useBackupWatch is the only holder of the correlated run record at correlation time, so an optional `onRun` callback (ref-mirrored like every other fresh-closure arg) reports the run on every poll that finds it. The open/close decision stays the consumer's — a dismissed sheet must never re-open — and desktop callers omit the prop for byte-identical behavior.
  - The e2e fires no backup: the trigger is the desktop BackupButton component itself (semantics pinned by BackupButton.dom.test.tsx; run-detail-visibility.spec.ts already drives the real trigger end-to-end), and firing here would need run-recording staging that proves nothing new. The spec header documents the scope.
  - Desktop byte-identity is asserted, not assumed: the desktop-1280 e2e scenario asserts the stacked view, the Save-bar count line and the filled full-width trigger signature exist NOWHERE in the DOM on either page, and the full dom suite (2375 tests) stays green.
metrics:
  duration: 2h38m
  completed: 2026-09-12
  tasks: 3
  commits: 4
actuals:
  tokens: 44020
  tasks: 3
  commits: 4
status: complete
---

# Phase 6 Plan 5: Phone maquette surfaces — stacked detail, Save bar, coverage cards, run deep-link Summary

Phone surfaces for containers and file sets on the real shell: a locally-stacked container detail whose Back restores the list scroll, the shared sticky-in-flow Save bar that flushes the desktop-identical queue with a live "handed to restic" count, a coverage-card files list, and FLOW-03 run deep-links through useBackupWatch's new onRun correlation seam — all pinned by a 5-scenario e2e on the real binary (9 passed / 6 skipped, desktop leakage guard included).

## Accomplishments

- **StickyActionBar (Task 1, tracer)**: the ONE shared sticky-in-flow bar — `sticky bottom-0` direct child of the page column, `bg-carbon-sidebar` + `border-t`, padded by `max(0.75rem, var(--safe-area-bottom))` (never fixed, never in a Card; sticky resolves against main#bv-main). Dom suite pins the in-flow discipline and the 44px floors.
- **Stacked container detail (Task 2, SCRN-02/D-04)**: component-local `openContainer` state; the card list stays MOUNTED beneath the detail (hidden swap), scroll captured from #bv-main at open and restored after Back. Back row = chevron + visible `common.back` label, >=44px, aria-label naming the container. The SAME FoldersEditor (one tree, one queue, zero forks) renders full available height via SelectionTree's new `viewportClassName` prop (default clamp untouched for every existing mount), advanced-gated as on desktop.
- **The Save bar (Task 2, SCRN-03/D-03)**: row 1 = the live `folders.handedToRestic` count ({n} invariant, tabular) + in-flight spinner; row 2 = the filled accent Save button (`folders.save`, >=44px, w-full) whose press FLUSHES the desktop queue through flushRef — success toasts, failure toasts AND shakes (`shakeNonce` remounts the Button for the shake). The bar renders below the expanded editor only; no CACHEDIR row in the files variant (RESTIC-01 deferral respected).
- **Coverage cards (Task 2, SCRN-04)**: one MobileFileSetCard per set — accentSoft icon avatar, name + mono path, the honest ticked-count line (`folders.previewPaths` over splitFlatSet of the stored selection), four-status Badge, last-backup line, decorative aria-hidden identity bar; the `files.emptyRule` outline card closes the list. Tap expands the FULL FileSetRow below the card with the editor already open — same touch tree, same Save bar.
- **FLOW-03 (Task 3)**: `useBackupWatch` gains optional `onRun` — the baseline-id match IS the correlation contract, so the hook reports the run at identification and on every later poll (running → terminal renders truthfully without the sheet polling itself). BackupButton and FileSetBackupButton pass it through as `onRunCorrelated`; the container detail and the files list host `<RunDetailSheet run open onClose/>` component-locally (D-05), with a dismissal latch so a closed sheet never re-opens. ZERO new trigger code paths — desktop callers omit the props.
- **Responsive rhythm + page shell**: both page roots adopt `PAGE_SHELL_RESPONSIVE` (gap-6 md:gap-10 max-w-6xl); desktop values unchanged by construction; eslint exceptions declared in data, not disable comments.
- **e2e (Task 3)**: maquette-screens.spec.ts — 5 scenarios on the real wiped-DB binary across mobile-android + mobile-iphone + desktop-1280: (1) card tap stacks + Back restores the list scroll, (2) row tap toggles with the Save-bar count following live, (3) the Save press flushes to the success toast, (4) coverage card count line + expand to the editor tree, (5) desktop-1280 asserts NO stacked view / Save-bar count / filled full-width trigger on either page.
- **i18n**: common.back, folders.handedToRestic, files.emptyRule in en + de inline and all 40 locale modules (parity + orphans ratchets green).

## Coverage

| Deliverable | Verification |
| --- | --- |
| SCRN-02 / D-04 stacked detail, scroll-preserving Back | e2e scenario 1 (both mobile projects): grow-and-scroll the list, settle, tap → detail with scroller reset to 0, Back → scrollTop === captured; list stays mounted (the mechanism itself) |
| SCRN-03 / D-03 Save bar live count | e2e scenario 2: "2 folders handed to restic" on the served baseline → row tap → aria-checked false → "1 folders handed to restic" |
| SCRN-03 / D-03 flush-through-save + toast | e2e scenario 3: Save press with no pending edits re-sends the live mirror, PATCH resolves, "Saved" toast visible; bar semantics (spinner, shake, 44px) pinned by StickyActionBar.dom.test.tsx |
| SCRN-04 coverage cards + emptyRule | e2e scenario 4: photos card visible with "2 paths" line (splitFlatSet derivation), emptyRule outline card present, tap → aria-expanded true + the editor tree visible |
| FLOW-03 trigger + run deep-link | BackupButton.dom.test.tsx (trigger semantics unchanged, 5/5 standalone re-run), full lib suites green, hosting typechecked and mounted on both surfaces; real-trigger end-to-end already owned by 06-04's run-detail-visibility.spec.ts (scope note in the spec header) |
| Desktop >=48rem byte-identity | e2e scenario 5 (desktop-1280): "plex, Back" / handed-to-restic / `button.w-full.bg-accent` counts all 0 on /containers and /files; full dom suite 2375 tests green |
| i18n parity | i18n parity + orphans tests green (99/99 at Task 2 verify; full suite green at completion) |

## Verification

- `vitest run` (full) — 104 files / 2375 tests green, run AFTER all source edits
- `node node_modules/vitest/vitest.mjs run src/components/BackupButton.dom.test.tsx` — 5/5 (the plan's named verify line, re-run standalone post-commit)
- `tsc --noEmit` — clean (re-run against the committed tree)
- `eslint` — clean on backupWatch.ts, BackupButton.tsx, Containers.tsx, Files.tsx (e2e spec sits outside the src flat-config glob, same as every existing e2e spec)
- `vite build` + `go build ./cmd/bombvault` — completed BEFORE the e2e (the binary embeds the final SPA; only the e2e spec itself changed afterwards)
- `playwright test e2e/maquette-screens.spec.ts --project=mobile-android --project=mobile-iphone --project=desktop-1280` — 9 passed / 6 skipped / 0 failed
- Frozen check: no router.tsx / lib/api.ts / lib/progress.ts / internal/** path in any plan diff; zero new npm dependencies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mobile list needs mounts it doesn't have yet — N+1 fetch with a module cache**
- **Found during:** Task 2
- **Issue:** The stacked detail needs the container's mounts to build the tree, but the card list only has the containers payload; fetching per-open would re-stagger the tree on every open and back.
- **Fix:** getContainerMounts per card (installed only), cached in a module-level map keyed by container name with a nonce ref invalidation so remounts reuse the fetch.
- **Files modified:** web/src/pages/Containers.tsx
- **Commit:** c45b5893

**2. [Rule 3 - Blocking] PAGE_SHELL_RESPONSIVE + eslint exceptions in data**
- **Found during:** Task 2
- **Issue:** The responsive rhythm (gap-6 md:gap-10) is not the desktop PAGE_SHELL value, and the page-uses-page-shell rule demands a bare Identifier constant.
- **Fix:** Added `PAGE_SHELL_RESPONSIVE` to lib/pageShell.ts (why-commented) and declared the Containers.tsx/Files.tsx exceptions in eslint.config.js data per the house rule (never a disable comment).
- **Files modified:** web/src/lib/pageShell.ts, web/eslint.config.js
- **Commit:** c45b5893

**3. [Rule 2 - Missing critical] Save-bar state reset on open/toggle**
- **Found during:** Task 2
- **Issue:** The page-level saveState would otherwise show a stale count/spinner from a previously expanded set when another card expands.
- **Fix:** toggleExpanded resets saveState to `{ ticked: 0, inFlight: false, shakeNonce: 0 }` before swapping; the freshly-mounted editor publishes its own state on mount.
- **Files modified:** web/src/pages/Files.tsx
- **Commit:** c45b5893

**4. [Rule 3 - Blocking] useBackupWatch had no way to report the correlated run**
- **Found during:** Task 3
- **Issue:** FLOW-03 wants the sheet opened AT correlation, but the hook resolved the run internally and only surfaced success/failure — no seam existed.
- **Fix:** Optional `onRun?: (run: Run) => void`, ref-mirrored like the hook's other fresh-closure args, called after the baseline-id match on EVERY resolving poll; BackupButton/FileSetBackupButton pass through `onRunCorrelated`. Additive; desktop callers omit it.
- **Files modified:** web/src/lib/backupWatch.ts, web/src/components/BackupButton.tsx, web/src/pages/Containers.tsx, web/src/pages/Files.tsx
- **Commit:** 19f05132

**5. [Rule 1 - Bug, test-side] e2e staged the wrong file-set list route**
- **Found during:** Task 3 verify
- **Issue:** The spec staged `**/api/files/sets` but `listFileSets()` fetches GET `/api/files` (api.ts listFileSets) — scenario 4 saw the real empty DB and failed.
- **Fix:** Route glob corrected to `**/api/files`; the regex `/api/files/sets/{id}` PATCH route was already correct (whole-URL matching keeps them disjoint).
- **Files modified:** web/e2e/maquette-screens.spec.ts
- **Commit:** 19f05132

**6. [Rule 1 - Bug, test-side] Scroll assertion raced Playwright's tap auto-scroll**
- **Found during:** Task 3 verify
- **Issue:** Scenario 1 asserted the pre-tap scrollTop (300) was restored, but tap() auto-scrolls the target into view BEFORE the click — the page faithfully captured and restored 328. Product correct, test wrong.
- **Fix:** `scrollIntoViewIfNeeded()` first, read the settled value, tap (no further auto-scroll possible), assert `toBe(captured)`.
- **Files modified:** web/e2e/maquette-screens.spec.ts
- **Commit:** 19f05132

### Recorded interpretations (planned-text readings, not fixes)

- **Card meta is the single count line**: the plan's "coverage line over the set's selection encoding" renders as one honest `folders.previewPaths` line ({n} replaced with splitFlatSet's include count) — no fabricated percentage, matching the SCRN-04 "count line is the accessible statement" truth.
- **Back-row chevron is an inline mirrored svg**: web/src/components/glyphs.tsx is a generated file (header forbids hand edits), so the detail's back row inlines the ChevronLeft path with a `rotate-180`-free mirror for RTL-symmetric rendering.
- **Files expansion renders the FULL FileSetRow** (editor already open) under the tapped card rather than a second bespoke mobile editor — SCRN-04 mandates "the SAME touch tree + Save bar, no fork"; the row is desktop's own component in touch mode.
- **SAVE_FLUSH_KEY twin const in Files.tsx**: the flush row key is duplicated (Containers/Files) like the existing scrub-regex twins — each page's editor owns its row namespace; a shared export would couple the two pages' Save-bar rows for no behavioral gain.
- **Dismissal latch semantics**: `sheetDismissed` is a ref (not state) — once closed, later polls of the same watch refresh `sheetRun` but never re-open; the terminal outcome still toasts from the trigger. Documented at both host sites.
- **"Filled full-width trigger" = the Save button's signature** (`button.w-full.bg-accent`): the backup trigger is the desktop BackupButton presented in-flow — forcing IT full-width would fight the Button width-stage's inline `--btn-w-*` style. The e2e leakage guard asserts exactly the Save-button signature.
- **No backup fired in the e2e** (scope note in the spec header): trigger semantics are pinned by BackupButton.dom.test.tsx and run-detail-visibility.spec.ts drives the real trigger; firing here would need run-recording staging proving nothing new. This records the partial deferral of 06-04's "host-sheet e2e lands with 06-05" handoff item — the host wiring itself is typechecked and mounted; the sheet's hidden/return behavior remains covered by that spec's poll-chain scenarios.

## Known Stubs

None. Every surface renders real server-derived state through the existing editors; nothing is placeholder, unwired, or mocked in product code (e2e route-staging mocks live only in the test harness, mirroring the Go JSON shapes field-for-field, per the touch-tree precedent).

## Handoff to 06-06 (Dashboard glanceable)

- **StickyActionBar is ready for the Home trigger zone**: `<StickyActionBar className=...>` renders rows; the Save-bar pattern to copy is the publish contract — the surface owns state and passes a stable setState + a `flushRef` for actions; the bar derives everything and never owns queue/business state.
- **The onRun seam is the Dashboard trigger's correlation hook**: `useBackupWatch({ ..., onRun })` fires at baseline-id correlation (deep-link moment) and on every later poll with the refreshed record. BackupButton/FileSetBackupButton expose it as `onRunCorrelated` — a glanceable "Backup now" can open any sheet component-locally with `<RunDetailSheet run open onClose/>`; keep a `sheetDismissed` ref latch so polls never re-open a closed sheet.
- **Coverage-card patterns to reuse**: hueVars(rainbowAt(index)) identity bar (track bg-carbon-surface2 + accent fill, aria-hidden — the text line is the accessible statement), accentSoft icon avatar, folders.previewPaths-style honest count line, four-status Badge with text label. MobileContainerCard/MobileFileSetCard in Containers.tsx/Files.tsx are the models.
- **PAGE_SHELL_RESPONSIVE exists** (lib/pageShell.ts) for any page restructured below 48rem; declare per-page exceptions in eslint.config.js data if a page needs the responsive variant (Containers/Files pattern).
- **e2e staging helpers**: stageContainerDomain/stageFilesDomain in maquette-screens.spec.ts stage whole domains at the route layer on the real binary (display-prefs abort cuts boot-look; `**/api/files` is the LIST route, `/api/files/sets/{id}` the per-set write; whole-URL globs keep them disjoint). Mobile blocks are JSX-gated on `!isDesktop`; jsdom matchMedia answers desktop, so mobile blocks are e2e-only.
- **Windows Playwright playbook (reconfirmed twice)**: the runner wedges at webServer teardown after tests complete — `taskkill //F //IM bombvault.exe` unsticks it and the buffered list output flushes; test-results staying EMPTY = zero failures. Rebuild bombvault.exe after any web/dist change or the e2e runs the stale embedded SPA.

## Self-Check: PASSED

All created files exist on disk (StickyActionBar.tsx + dom suite, maquette-screens.spec.ts, and the modified pages/lib/locales); all three task commits verified in git history (915a74b7, c45b5893, 19f05132); all 40 locale modules carry the three new keys (en/de inline in i18n.ts).
