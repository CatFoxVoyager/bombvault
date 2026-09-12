---
phase: 06-maquette-screens
plan: 01
subsystem: ui
tags: [touch, selection-tree, media-queries, playwright, i18n, apg-treeview, react]

# Dependency graph
requires:
  - phase: 05-mobile-shell-navigation-foundation
    provides: Playwright real-binary harness (4 projects incl. mobile-iphone WebKit + mobile-android Chromium, wipe-then-boot webServer), the ONE SelectionTree with its APG state model and guarded Space-onToggle pipeline, DESKTOP_QUERY width axis in useMediaQuery
provides:
  - useIsCoarsePointer() hook + POINTER_COARSE_QUERY — a second, independent media axis (pointer capability) beside the width axis
  - SelectionTree interactionMode prop ("pointer" default | "touch") — tap-to-toggle, dedicated >=44x44 chevron zone, presentational checkbox, roving-on-tap, 14px full-row targets
  - common.expand / common.collapse i18n keys in en + de + all 40 locale modules
  - web/e2e/touch-tree.spec.ts — touch geometry gate (row >=44px, chevron >=44x44, disjoint hit zones, tap toggles both directions, expand never toggles) on both mobile projects
affects: [06-02, 06-03, 06-04, 06-05, phase-8 real-device validation]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 17500    # chars/4 over the realized diff (69,998 bytes, 48 files, +966/-11); estimate was 62000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-axis media model: width (DESKTOP_QUERY) drives chrome, pointer capability (POINTER_COARSE_QUERY) drives interaction mode — never cross the axes (D-11)"
    - "Interaction-mode-as-prop on the ONE component instead of a forked variant (D-01); render/handler layer branches, APG state model stays byte-identical"
    - "Touch checkbox = readOnly + pointer-events-none: exactly one live toggle surface per row (double-fire hazard, Pitfall 1)"
    - "Roving-on-tap reuses focusNode (the arrow-key primitive) — never re-implements focus/scroll (Pitfall 2)"
    - "e2e container domain staged at the Playwright route layer for the Docker-less harness (Go JSON shapes field-for-field)"

key-files:
  created:
    - web/src/components/SelectionTree.touch.dom.test.tsx
    - web/e2e/touch-tree.spec.ts
  modified:
    - web/src/lib/useMediaQuery.ts
    - web/src/lib/useMediaQuery.test.ts
    - web/src/components/SelectionTree.tsx
    - web/src/pages/Containers.tsx
    - web/src/lib/i18n.ts
    - web/src/lib/locales/*.ts (40 modules)
    - web/dist/index.html (rebuilt SPA)

key-decisions:
  - "interactionMode is a render/handler-only additive prop on the ONE SelectionTree; the APG state model (roving tabindex, Space-through-onToggle, aria-checked) is shared verbatim between modes (D-01)"
  - "useIsCoarsePointer rides (pointer: coarse) as a SECOND media axis — DESKTOP_QUERY remains the only width literal in useMediaQuery.ts, pinned by a source-assert guard (D-11)"
  - "In touch mode the checkbox is purely presentational (readOnly + pointer-events-none, onChange dropped): the row tap is the one toggle surface, so the desktop stopPropagation+native-toggle double-fire hazard cannot occur"
  - "Touch chevron carries a bv-convention-exception marker against the one-icon-badge-size house rule: it is a mandated >=44x44 touch tap target, not an icon badge"
  - "e2e spec stages the container domain at the route layer (Rule 3): the fresh-DB harness has no Docker, so no real container can ever exist to open the folders editor"

patterns-established:
  - "Touch twins pattern: a stateful includes-mirror harness so aria-checked round-trips are real state arithmetic (SelectionTree.touch.dom.test.tsx)"
  - "Pointer-default control test: every touch-mode suite asserts the default-props tree keeps desktop semantics (byte-identical guarantee, most observable form)"
  - "'Saved'-toast pacing in e2e: the drain's own completion signal gates the next tap, so interaction tests never race the busy guard"

requirements-completed: [SCRN-03]

coverage:
  - id: D1
    description: "useIsCoarsePointer() + POINTER_COARSE_QUERY exported from useMediaQuery.ts as an additive twin of useIsDesktop; DESKTOP_QUERY stays the only width literal (D-11)"
    requirement: SCRN-03
    verification:
      - kind: unit
        ref: "web/src/lib/useMediaQuery.test.ts#POINTER_COARSE_QUERY stays the one pointer-capability literal"
        status: pass
    human_judgment: false
  - id: D2
    description: "SelectionTree interactionMode touch semantics: row tap toggles through the guarded onToggle pipeline, double-tap round-trips, chevron expands without toggling, checkbox presentational, pointer default unchanged; existing dom/keyboard/selectionTree suites pass with zero assertion edits"
    requirement: SCRN-03
    verification:
      - kind: unit
        ref: "web/src/components/SelectionTree.touch.dom.test.tsx (11 tests incl. pointer-default control)"
        status: pass
      - kind: unit
        ref: "web/src/components/SelectionTree.dom.test.tsx + SelectionTree.keyboard.dom.test.tsx + src/lib/selectionTree.test.ts (unchanged, green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Roving-on-tap (tap moves the tabindex, Space then acts on the tapped row), 14px min-h-[2.75rem] touch rows with touch-manipulation/select-none, pointer rows keep min-h-8/min-h-7, retry Button >=44px in touch"
    requirement: SCRN-03
    verification:
      - kind: unit
        ref: "web/src/components/SelectionTree.touch.dom.test.tsx#roving-on-tap / full-row >=44px targets / retry notice control"
        status: pass
    human_judgment: false
  - id: D4
    description: "Touch geometry e2e on mobile-iphone + mobile-android: row box >=44px, chevron box >=44x44, chevron/label hit zones disjoint, tap toggles aria-checked both directions, chevron expand never toggles — 4 passed on WebKit + Chromium"
    requirement: SCRN-03
    verification:
      - kind: e2e
        ref: "web/e2e/touch-tree.spec.ts (playwright: --project=mobile-android --project=mobile-iphone → 4 passed)"
        status: pass
    human_judgment: false
  - id: D5
    description: "common.expand/common.collapse present in en + de inline blocks and all 40 locale modules; parity and orphans suites green (chevron consumes the keys)"
    requirement: SCRN-03
    verification:
      - kind: unit
        ref: "web/src/lib/i18n.parity.test.ts + web/src/lib/i18n.orphans.test.ts (green)"
        status: pass
    human_judgment: false
  - id: D6
    description: "FoldersEditor's tree mount derives interactionMode={coarsePointer ? 'touch' : 'pointer'} from useIsCoarsePointer; Files.tsx untouched (plan 06-05 owns it) — proven live by the e2e tree rendering touch mode on coarse devices"
    requirement: SCRN-03
    verification:
      - kind: e2e
        ref: "web/e2e/touch-tree.spec.ts (chevron button exists = touch-mode tell on the real /containers mount)"
        status: pass
    human_judgment: false

# Metrics
duration: 85min
completed: 2026-09-12
status: complete
---

# Phase 6 Plan 1: Touch SelectionTree Interaction Mode Summary

**The ONE SelectionTree gains an additive `interactionMode` prop — row tap toggles through the guarded Space pipeline, a dedicated >=44x44 labelled chevron expands — driven by a new `useIsCoarsePointer()` capability hook and pinned by touch dom twins plus a Playwright geometry gate on both mobile projects**

## Performance

- **Duration:** 85 min (incl. ~40 min of Windows e2e environment stalls, see Issues)
- **Started:** 2026-09-12T08:08:17Z
- **Completed:** 2026-09-12T09:33:00Z
- **Tasks:** 3 of 3
- **Files modified:** 48 (966 insertions, 11 deletions)

## Accomplishments

- `useIsCoarsePointer()` + `POINTER_COARSE_QUERY` in `useMediaQuery.ts`: the pointer-capability axis arrives as an additive twin of `useIsDesktop` (lazy MQL, useSyncExternalStore, Safari<14 fallback, windowless default false); a source-assert guard pins `(min-width:` to exactly one literal so width and pointer can never couple (D-11)
- `SelectionTree` accepts `interactionMode` (default "pointer"): in touch mode the full row is a >=44px toggle target (14px register, `touch-manipulation`, `select-none`) firing the EXACT Space guard (`!spec.unreachable && !busyPaths?.has(...)`), the leading glyph yields to a real labelled `h-11 w-11` chevron button (common.expand/collapse, stopPropagation), and the checkbox becomes `readOnly` + `pointer-events-none` — one live toggle surface, no double-fire, no dead zone (D-01/D-02)
- Roving-on-tap: the tap handler calls `focusNode(spec.path)` (the arrow-key primitive) before toggling, so Space after tapping row B acts on row B through the UNTOUCHED APG key map (Pitfall 2); the error-notice retry Button grows to >=44px in touch only
- i18n: common.expand / common.collapse in en + de inline and all 40 locale modules; parity and orphans suites green
- e2e gate `web/e2e/touch-tree.spec.ts` (mobile projects only): row box >=44px, chevron box >=44x44, chevron/label x-intervals disjoint, tap toggles both directions, expand never moves the check — **4 passed** on mobile-iphone (WebKit) and mobile-android (Chromium 360w)
- Tracer verified end-to-end under AUTO_MODE: the full Task 1 slice re-ran green after its commit before Task 2 began

## Task Commits

Each task was committed atomically:

1. **Task 1: Touch interaction mode for SelectionTree (tracer)** - `2ac4124e` (feat)
2. **Task 2: Roving-on-tap, full-row targets, notice-row touch sizing** - `e0c34f4b` (feat)
3. **Task 3: Touch geometry e2e on the mobile projects** - `2c77b29a` (test)

## Files Created/Modified

- `web/src/lib/useMediaQuery.ts` — POINTER_COARSE_QUERY + useIsCoarsePointer; two-axis header doc; useIsDesktop byte-identical
- `web/src/lib/useMediaQuery.test.ts` — guard tests: exact coarse query pinned, exactly one width literal in the file
- `web/src/components/SelectionTree.tsx` — interactionMode prop, touch row/checkbox/chevron seam, retry sizing, bv-convention-exception marker
- `web/src/pages/Containers.tsx` — FoldersEditor derives interactionMode from useIsCoarsePointer (Files.tsx untouched)
- `web/src/lib/i18n.ts` + `web/src/lib/locales/*.ts` — common.expand/collapse across all 42 locales (en, de inline + 40 modules)
- `web/src/components/SelectionTree.touch.dom.test.tsx` — 11 touch twins + pointer-default control (stateful mirror harness)
- `web/e2e/touch-tree.spec.ts` — the mobile-only geometry gate with route-staged container domain
- `web/dist/index.html` — rebuilt embedded SPA

## Decisions Made

- **Additive prop, never a fork** (D-01): the touch branch touches only className + onClick + checkbox wiring + chevron presence; the APG state model, key map, and roving computation are shared code paths — the existing suites pass with zero assertion edits, which is the proof
- **Pointer axis is a second media axis** (D-11): landscape phones (>=48rem CSS width) get desktop chrome AND the touch tree — correct by construction, no width-derived mode anywhere
- **Presentational checkbox with readOnly**: dropping onChange with `checked` set requires `readOnly` (React controlled-input warning); `pointer-events-none` lets real taps fall through to the row while jsdom clicks on the input prove no second pipeline exists
- **Task 1 touched-mode class string landed in final form**: the touch branch replaces (not stacks with) the depth min-heights, with the text-sm register deferred to Task 2 per plan sequencing — avoids shipping a knowingly-broken intermediate (conflicting min-height classes) inside the tracer commit
- **Exception marker over rule change**: the house `one-icon-badge-size` lint rule fired on the 44px chevron; resolved with the rule's own `bv-convention-exception` inline marker (reason: mandated touch tap target, measured by the e2e gate), not a config exception or disable comment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] e2e container domain staged at the Playwright route layer**
- **Found during:** Task 3 (touch-tree.spec.ts design)
- **Issue:** The verify command boots the real binary against the wipe-then-boot fresh DB; the harness has no Docker (and CI neither), so a fresh DB can never contain a container and the folders editor could never render — the planned spec was unrunnable as written
- **Fix:** `page.route` fulfillments for `/api/containers` (list), `/api/containers/plex/mounts` (Go JSON shapes field-for-field), `/api/browse*` (lazy listing) and the save PATCH (kept offline so the harness DB sees no spec writes), plus a boot-time `bombvault.advanced=1` localStorage seed (the folders chip is advanced+installed-only) and the display-prefs abort (locale stability, harness precedent)
- **Files modified:** web/e2e/touch-tree.spec.ts (header comment documents the boundary)
- **Verification:** 4 passed on mobile-iphone + mobile-android
- **Committed in:** 2c77b29a

**2. [Rule 1 - Bug] e2e fixture tripped the D-04 empty-selection guard**
- **Found during:** Task 3 (first e2e run)
- **Issue:** The mounts fixture had ONE selected mount; FoldersEditor's `onToggle` refuses (row shake + blocked warn line, no save — by contract) any toggle that would leave zero includes, so the first tap reverted instead of unchecking (aria-checked stuck "true" + `glim-shake`)
- **Fix:** Second served include in the fixture (two mounts, both selected) so every tap is a legal toggle; "Saved" toast used as the drain's completion signal to pace taps past the busy gate
- **Files modified:** web/e2e/touch-tree.spec.ts
- **Verification:** aria-checked round-trips both directions on both mobile projects
- **Committed in:** 2c77b29a

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both confined to the Task 3 test harness; no product code moved beyond the plan's file list. No scope creep.

## Issues Encountered

- **Windows e2e environment stalls (~40 min):** three Playwright runs hung — once in the documented webServer teardown (bombvault.exe survives; killed manually, port freed) and twice with worker processes never spawning. A `DEBUG=pw:*` run completed cleanly and the stall did not reproduce; the final verify ran green end-to-end. This matches the pre-existing STATE.md note ("local Playwright runs use a manually started webServer — Windows teardown hang"); no repo change made, watch for it in 06-02..06-05
- **Lint caught late:** the plan-level eslint gate ran before the Task 3 commit (not after Task 1) and flagged the chevron; fixed in-band via the sanctioned marker (see Decisions)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 06-02/06-03 (sheets, containers list/detail maquettes) mount on a tree that now behaves on touch: reuse `interactionMode={coarsePointer ? "touch" : "pointer"}` wherever a second SelectionTree mount appears (Files page stays pointer-default until 06-05)
- The e2e harness pattern for a Docker-less container domain (route-staged fixtures + advanced seed + Saved-toast pacing) is reusable for 06-03's container detail maquette specs
- The Windows Playwright stall/teardown behavior is the operational risk for the remaining e2e plans: budget for manual `taskkill` of a lingering `bombvault.exe` when the runner hangs after results print
- `bombvault.stale.exe` and stray `uat-*.png`/`ui-audit-*.png` files in the repo root predate this plan and were left untouched (out of scope)

## Self-Check: PASSED

- All key created files exist on disk (useMediaQuery.ts, SelectionTree.touch.dom.test.tsx, touch-tree.spec.ts, this SUMMARY)
- All three task commits exist in history: 2ac4124e, e0c34f4b, 2c77b29a
- Working tree clean of uncommitted plan sources at summary time (only .planning/ doc updates pending the metadata commit)

---
*Phase: 06-maquette-screens*
*Completed: 2026-09-12*
