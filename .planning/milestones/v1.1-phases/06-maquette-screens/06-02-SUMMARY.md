---
phase: 06-maquette-screens
plan: 02
subsystem: ui
tags: [bottom-sheet, confirm-dialog, useConfirm, responsive, mobile, touch, react, i18n-reuse]

# Dependency graph
requires:
  - phase: 05-mobile-shell-navigation-foundation
    provides: BottomSheet primitive (PRIM-01 portal/Escape/Tab-trap/focus-restore mechanism), DESKTOP_QUERY + useIsDesktop (the ONE width authority), safe-area custom properties, desktop-untouched e2e gate + Playwright real-binary harness
provides:
  - BottomSheet additive extensions: fullHeight (h-dvh, D-05), footer slot (flex-none chrome row after the scroll body), tone surface union (default/fail/warn), 44px close hit box, inset-clamped side padding (05-UI-REVIEW findings 1 + 6 absorbed once at the primitive)
  - ConfirmSheet — the mobile presentation half of useConfirm (PRIM-03/D-07): fail/warn-toned sheet, destructive confirm stacked on top, safe cancel in the thumb-default bottom slot, no default-focused destructive control
  - useConfirm presentation swap branching on useIsDesktop inside the existing portal — every confirm() call site inherits the mobile sheet with zero per-site changes
  - Layout scroller responsive rhythm p-4 md:p-6 (mobile gutter 16px, desktop byte-identical)
affects: [06-03, 06-04 (RunDetailSheet consumes fullHeight + footer), 06-05, 06-06 (sticky bars span the p-4 gutter), phase-8 real-device validation]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 10300    # chars/4 over the realized product diff (41,046 bytes, 7 files, +630/-23); estimate was 48000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentation-swap at the stateful hook: ONE useConfirm promise API, the component inside the portal branches on useIsDesktop (D-07) — call sites never learn the viewport exists"
    - "Closed tone union on BottomSheet (default/fail/warn) instead of a className pass-through — two competing bg-* utilities resolve by stylesheet order, which no call site can reason about (Button.tsx TONE_TABLE doctrine)"
    - "Stacked sheet actions invert desktop order deliberately: destructive on TOP (away from the thumb arc), safe cancel LAST (thumb-default slot, UI-SPEC PRIM-03)"
    - "Benign double-settle: useConfirm's and BottomSheet's document Escape listeners both fire on one keypress; settle() nulls its resolver so the promise resolves exactly once (asserted in tests)"
    - "Controlled matchMedia stub for hook-swap tests: module-level MQL cache means per-test re-stubs never reach an already-created list — the stub creates stable objects whose matches is a live getter, flipped with listener notification"

key-files:
  created:
    - web/src/components/mobile/ConfirmSheet.tsx
    - web/src/components/mobile/ConfirmSheet.dom.test.tsx
  modified:
    - web/src/components/mobile/BottomSheet.tsx
    - web/src/components/mobile/BottomSheet.dom.test.tsx
    - web/src/lib/useConfirm.tsx
    - web/src/app/Layout.tsx
    - web/dist/index.html (rebuilt embedded SPA)

key-decisions:
  - "BottomSheet grew a closed `tone` union prop in Task 1 (Rule 3): ConfirmSheet needs a toned panel surface and Task 2's file list excluded BottomSheet.tsx — a className pass-through would pit two bg-* utilities against stylesheet order"
  - "Inset clamp maps each PHYSICAL side against its OWN safe-area inset (pl->left, pr->right), not the plan's literal start/end wording: env() insets are physical and never flip with writing direction, so the physical mapping is the correct one under RTL too"
  - "ConfirmSheet supports the warn tone, not just fail (Rule 2): useConfirm passes pending.tone ?? 'fail' and RestoreCancelButton's light branch uses warn — a fail-only sheet would recolor warn confirmations red on mobile"
  - "dialogRef stays null in the sheet branch: BottomSheet runs its own FOCUSABLE_SELECTOR Tab trap, so useConfirm's trap no-ops instead of fighting it; the Escape double-dispatch is settled once by the resolveRef guard"
  - "No aria-describedby slot on the sheet (deliberate gap, documented in ConfirmSheet's header): BottomSheet has no described-by prop yet; the desktop card keeps its described message, the sheet announces title + visible message"

patterns-established:
  - "Controlled matchMedia test stub (ConfirmSheet.dom.test.tsx): the reusable answer to useMediaQuery's module-level MQL cache for any future hook-swap test"
  - "Class-token presence assertions for styling contracts in jsdom (documented exception to no-class-snapshots, inherited from BottomSheet.dom.test.tsx)"
  - "Desktop-discriminator assertions: aria-describedby presence + bg-carbon-surface absence/presence distinguish the branches without visual geometry"

requirements-completed: [PRIM-03]

coverage:
  - id: D1
    description: "BottomSheet fullHeight/footer/tone are purely additive — absent props render the Phase 5 sheet exactly (MoreSheet untouched)"
    requirement: PRIM-03
    verification:
      - kind: unit
        ref: "web/src/components/mobile/BottomSheet.dom.test.tsx#keeps the capped panel by default and switches to h-dvh only with fullHeight"
        status: pass
      - kind: unit
        ref: "web/src/components/mobile/MoreSheet.dom.test.tsx (existing consumer suite, unchanged, green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Footer slot renders after the scroll body in chrome language (bg-carbon-sidebar + top hairline) with the safe-area bottom inset; absent footer = no element"
    requirement: PRIM-03
    verification:
      - kind: unit
        ref: "web/src/components/mobile/BottomSheet.dom.test.tsx#renders an optional footer after the scroll body, chrome-styled and safe-area padded"
        status: pass
    human_judgment: false
  - id: D3
    description: "05-UI-REVIEW findings 1 + 6 absorbed at the primitive: header/body/footer sides clamp max(1rem, own inset); close button h-11 w-11 (44px floor, sanctioned exception marker)"
    requirement: PRIM-03
    verification:
      - kind: unit
        ref: "web/src/components/mobile/BottomSheet.dom.test.tsx#clamps header and body side padding to the safe-area insets / #gives the close button the 44px touch hit box"
        status: pass
    human_judgment: false
  - id: D4
    description: "Below 48rem every useConfirm confirmation renders as the fail-toned ConfirmSheet; at >=48rem the desktop ConfirmDialog renders unchanged (byte-identical guarantee); the swap lives inside the existing portal on useIsDesktop"
    requirement: PRIM-03
    verification:
      - kind: unit
        ref: "web/src/components/mobile/ConfirmSheet.dom.test.tsx#below 48rem the same pending request renders the fail-toned ConfirmSheet / #at/above 48rem renders the ConfirmDialog card, unchanged"
        status: pass
      - kind: e2e
        ref: "web/e2e/desktop-untouched.spec.ts --project=desktop-1280 (10 passed on the rebuilt dist incl. the swap + responsive padding)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Destructive control never default-focused; every dismissal (Escape, scrim, close, cancel) settles cancel-safe; confirm resolves true only on its own activation; Escape resolves exactly once"
    requirement: PRIM-03
    verification:
      - kind: unit
        ref: "web/src/components/mobile/ConfirmSheet.dom.test.tsx#the sheet branch never default-focuses the destructive control / #Escape resolves false EXACTLY once / #resolves every close path"
        status: pass
    human_judgment: false
  - id: D6
    description: "useConfirm promise API untouched; zero per-call-site changes (BackupButton, RestoreAction absent from the diff) and their suites pass unchanged; no confirm-in-confirm chain (one sheet, one decision)"
    requirement: PRIM-03
    verification:
      - kind: unit
        ref: "git diff 2c77b29a..HEAD contains no call-site files; src/components/BackupButton.dom.test.tsx + src/components/restore/RestoreAction.confirm.dom.test.tsx + src/components/ConfirmDialog.test.ts green (59/59 with the new suites)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Layout scroller main padding p-4 md:p-6 with truthful comment updates; full vitest (2340/2340), tsc --noEmit, vite build, eslint, and the desktop-untouched e2e gate all pass"
    requirement: PRIM-03
    verification:
      - kind: e2e
        ref: "web/e2e/desktop-untouched.spec.ts --project=desktop-1280 (10 passed) + full vitest run (100 files / 2340 tests) + tsc --noEmit + vite build"
        status: pass
    human_judgment: false

# Metrics
duration: 60min
completed: 2026-09-12
status: complete
---

# Phase 6 Plan 2: Confirm Sheet + Responsive Shell Summary

**ONE useConfirm promise API now wears two faces — the desktop ConfirmDialog card byte-identically at/above 48rem, a fail-toned ConfirmSheet below it with the destructive control stacked away from the thumb — on a BottomSheet primitive extended additively (fullHeight, footer slot, 44px close, inset-clamped padding) and a scroller whose mobile gutter tightens to p-4**

## Performance

- **Duration:** 60 min (incl. one Windows Playwright boot stall, see Issues)
- **Started:** 2026-09-12T09:35:00Z (approx.; session resumed once at context compaction mid-Task 1)
- **Completed:** 2026-09-12T10:30:00Z
- **Tasks:** 3 of 3
- **Files:** 7 product files (+630/-23 lines, 41,046 diff bytes) + rebuilt web/dist

## Accomplishments

- BottomSheet (PRIM-01) extended additively — `fullHeight` (h-dvh for D-05 run detail), a `footer` slot (flex-none chrome row after the scroll body, safe-area bottom inset moving onto the last surface), and a closed `tone` union (default/fail/warn) swapping the panel surface to status tokens; absent props render the Phase 5 sheet exactly, proven by MoreSheet's untouched green suite
- 05-UI-REVIEW findings 1 and 6 absorbed ONCE at the shared primitive: header/body/footer side padding clamps each physical side against its own safe-area inset (landscape cutouts), and the close button's hit box is the 44px touch floor (sanctioned `bv-convention-exception` marker, same precedent as the touch chevron)
- ConfirmSheet (PRIM-03/D-07): the mobile presentation half of useConfirm — toned sheet, message in the scroll body, stacked footer actions with the destructive confirm on TOP and the safe cancel LAST (thumb-default), no autoFocus anywhere (BottomSheet's open effect lands focus on the close button, the safe outcome)
- useConfirm branches the existing portal on `useIsDesktop`: desktop ConfirmDialog untouched, every call site (BackupButton stop-ack, reset-selection, remove-set, restore guards) inherits the mobile sheet with ZERO per-site changes — the diff contains no call-site file
- Layout scroller `p-6` -> `p-4 md:p-6` (mobile gutter 16px; desktop byte-identical by construction) with truthful comment updates at the site
- Gates: BottomSheet/MoreSheet 21/21; the six-suite Task 2 verify 59/59; full vitest 100 files / 2340 tests; `tsc --noEmit` clean; `vite build` ok; eslint clean on all touched files; desktop-untouched e2e **10 passed** on desktop-1280 against the rebuilt dist

## Task Commits

Each task was committed atomically:

1. **Task 1: BottomSheet fullHeight/footer/tone, 44px close, inset-clamped padding** - `4254aa9f` (feat)
2. **Task 2: ConfirmSheet mobile presentation for useConfirm (D-07)** - `10d3a8e5` (feat)
3. **Task 3: Narrow-viewport gutter p-4, desktop keeps p-6 (md:p-6)** - `f2c5ccc9` (feat)

## Files Created/Modified

- `web/src/components/mobile/BottomSheet.tsx` — additive fullHeight/footer/tone props, TONE_PANEL_CLASS map, inset-clamped header/body/footer, h-11 w-11 close with exception marker
- `web/src/components/mobile/BottomSheet.dom.test.tsx` — 5 new phase-6 extension tests (class-token presence discipline)
- `web/src/components/mobile/ConfirmSheet.tsx` — NEW: hookless presentation half, stacked actions, tone pass-through, no-status-color exception marker
- `web/src/components/mobile/ConfirmSheet.dom.test.tsx` — NEW: 10 tests (4 direct presentation + 6 hook-swap incl. controlled matchMedia stub, live width-flip-while-pending, exactly-once Escape)
- `web/src/lib/useConfirm.tsx` — useIsDesktop branch inside the portal; dialogRef deliberately unattached in the sheet branch; promise API byte-identical
- `web/src/app/Layout.tsx` — `p-4 md:p-6` + comment updates
- `web/dist/index.html` — rebuilt embedded SPA

## Decisions Made

- **`tone` as a closed union, not a className pass-through:** two competing bg-* utilities on one element resolve by stylesheet order (Button.tsx's TONE_TABLE rationale); a three-value union keeps the surface choice reasonable at every future call site
- **Physical-side inset mapping:** each side clamps against its OWN inset (`pl`->left, `pr`->right); env() insets are physical and do not flip under direction:rtl, so the physical mapping is the correct reading of the plan's finding-1 intent
- **Warn tone supported end-to-end:** `pending.tone ?? "fail"` can be warn (RestoreCancelButton's light branch); a fail-only sheet would recolor warn confirmations red on mobile — meaning drift, so ConfirmSheet maps warn to statusWarnBg/Button-warn for desktop parity
- **Double Escape is benign by construction:** both document-level listeners fire; `settle()` nulls `resolveRef` so the promise resolves once — asserted ("EXACTLY once") rather than deduplicated
- **The sheet drops aria-describedby (documented gap):** BottomSheet has no described-by slot; adding one is primitive roadmap, not this consumer — the desktop card keeps its described message
- **Controlled matchMedia stub for the swap tests:** useMediaQuery caches its MQL at module level, so per-test re-stubs never reach it; the stub mints stable objects with a live `matches` getter and fires change listeners on flip (the reusable answer for future hook-swap tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] BottomSheet `tone` prop landed in Task 1**
- **Found during:** Task 1 (ConfirmSheet design)
- **Issue:** Task 2's ConfirmSheet needs a toned panel surface, but Task 2's file list excluded BottomSheet.tsx — the primitive had no way to tint its panel, and Task 1 was the designated BottomSheet-touching task
- **Fix:** Added the closed `tone` union (default/fail/warn) to BottomSheet in Task 1, additive like its siblings; ConfirmSheet consumes it in Task 2 without touching the primitive again
- **Files modified:** web/src/components/mobile/BottomSheet.tsx, BottomSheet.dom.test.tsx
- **Commit:** 4254aa9f

**2. [Rule 1 - Bug] Inset-clamp order corrected from the plan's literal wording**
- **Found during:** Task 1 (implementation)
- **Issue:** The plan text says "max(1rem, var(--safe-area-right)) on the start side" — taken literally, content would sit under a landscape display cutout (start side padding clamped against the opposite inset)
- **Fix:** Each PHYSICAL side clamps against its OWN inset (pl -> --safe-area-left, pr -> --safe-area-right); correct in both rotations and under RTL, since env() insets never flip with writing direction; documented in the component comments
- **Files modified:** web/src/components/mobile/BottomSheet.tsx
- **Commit:** 4254aa9f

**3. [Rule 2 - Missing critical] ConfirmSheet supports the warn tone**
- **Found during:** Task 2 (implementation)
- **Issue:** The plan describes the fail-tone sheet only, but useConfirm passes `pending.tone ?? "fail"` and warn is a live value (RestoreCancelButton's non-destructive branch) — a fail-only sheet would render warn confirmations in fault-red on mobile
- **Fix:** ConfirmSheet takes the full ConfirmTone and maps it through panel surface AND confirm Button (warn -> statusWarnBg/statusWarnSolid), keeping desktop/mobile meaning parity
- **Files modified:** web/src/components/mobile/ConfirmSheet.tsx, ConfirmSheet.dom.test.tsx
- **Commit:** 10d3a8e5

**4. [Rule 3 - Blocking] Task 2 verify command substituted**
- **Found during:** Task 2 (verification)
- **Issue:** The plan's verify names `src/lib/useConfirm.test.tsx`, which does not exist (no such suite was ever created; useConfirm is dom-tested through its consumers)
- **Fix:** Ran the existing equivalents: ConfirmDialog.test.ts, restore/RestoreAction.confirm.dom.test.tsx, BackupButton.dom.test.tsx, plus the new ConfirmSheet suite and BottomSheet/MoreSheet regressions — 6 files, 59/59 green
- **Commit:** 10d3a8e5

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 missing-critical)
**Impact on plan:** All four stay inside the plan's file set (one Task 2 necessity pulled into Task 1's file); no frozen file touched, no new dependency, no new i18n key, no desktop change, no API change.

## Issues Encountered

- **Windows Playwright boot stall (Task 3):** the desktop-untouched run printed nothing for 600s; a stale `bombvault.exe` from the stalled boot held port 3000. `taskkill //F //IM bombvault.exe` released it, the backgrounded run then completed on its own: **10 passed (10.9m wall, tests themselves ~200ms each)**, exit 0, against the freshly rebuilt dist. Same operational risk 06-01 documented — budget for the manual kill when a run hangs after (or before printing) results.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 06-04 (RunDetailSheet) mounts on the primitive as-is: `<BottomSheet fullHeight footer={...}>` — both props are proven, the footer content padding is the consumer's
- Any future hook-branch test (presentation swaps on width/pointer) should lift the controlled matchMedia stub from ConfirmSheet.dom.test.tsx rather than re-derive it
- The aria-describedby gap on the sheet is the one known accessibility asymmetry vs the desktop card — if a verifier or a11y sweep flags it, the fix is a `describedById` prop on BottomSheet plus ConfirmSheet wiring, a small isolated change
- 06-05/06-06 sticky action bars span the new 16px mobile gutter (p-4) — keep bar side padding consistent with the scroller gutter when mounting
- i18n untouched by this plan (consumed common.confirm/cancel/close + confirmDialog.title only), so the parity/orphans suites have a single writer across Wave 1

## Self-Check: PASSED

- All key created files exist on disk (ConfirmSheet.tsx, ConfirmSheet.dom.test.tsx, this SUMMARY)
- All three task commits exist in history: 4254aa9f, 10d3a8e5, f2c5ccc9
- Working tree clean of uncommitted product sources at summary time (only .planning/ doc updates pending the metadata commit)

---
*Phase: 06-maquette-screens*
*Completed: 2026-09-12*
