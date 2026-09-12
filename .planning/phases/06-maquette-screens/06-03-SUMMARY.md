---
phase: 06-maquette-screens
plan: 03
subsystem: ui
tags: [tap-popover, mobile, primitive, prim-02]
requirements-completed: [PRIM-02]
requires:
  - 05-06 e2e harness (real Go binary, bootWithoutServerLook, device projects)
  - 05 DESKTOP_QUERY (>=48rem) + coarse-pointer media axis (D-11)
  - 06-01/06-02 mobile primitives (BottomSheet patterns, touch-tree conventions)
provides:
  - TapPopover primitive (web/src/components/mobile/TapPopover.tsx) — PRIM-02
  - InfoBubble tap path (coarse-pointer open + outside-tap dismissal + 44px target)
  - FilterPopover + ColorPickerPopover mobile branches through TapPopover
  - web/e2e/tap-popovers.spec.ts (real-binary tap contracts incl. desktop hover control)
affects: [06-04, 06-05, 06-06, phase-8 real-device validation]
tech-stack:
  added: []
  patterns:
    - portaled dialog + consuming backdrop layer (z-40 under z-50) — not a scrim, not inert
    - measure-then-place anchoring through lib/bubblePosition (clamp-then-flip reused, no new maths)
    - controlled/uncontrolled open state in one primitive (ColorPicker rides controlled)
    - two media axes: useIsDesktop (width) vs useIsCoarsePointer (capability) per D-11
key-files:
  created:
    - web/src/components/mobile/TapPopover.tsx
    - web/src/components/mobile/TapPopover.dom.test.tsx
    - web/e2e/tap-popovers.spec.ts
  modified:
    - web/src/components/InfoBubble.tsx
    - web/src/components/FilterPopover.tsx
    - web/src/components/ColorPickerPopover.tsx
    - web/dist/index.html
decisions:
  - InfoBubble tap-open is OPEN-ONLY (never a toggle): Android fires focus before click and focus already ran show(), so a click-toggle would re-hide the bubble the same gesture opened; re-tap deliberately not a close
  - ColorPickerPopover drives TapPopover CONTROLLED (open/onOpenChange) so its own positioning + Escape/scroll/resize effects stay live on both branches
  - ColorPickerPopover's outside-mousedown dismissal is now desktop-only — a document-level mousedown could close mid-tap-gesture and unmount the backdrop between mousedown and click (tap-through leak, T-06-03); TapPopover's backdrop owns outside taps on mobile
  - Mobile picker width lives on a wrapper div inside the panel — .glim-picker { width:100% } is unlayered author CSS that beats Tailwind v4 layered utilities on the same element
  - Backdrop covers the trigger, so re-tap toggles through the backdrop's outside-tap handler; the trigger stays mounted on both sides of open for the light focus restore
metrics:
  duration: 1h44m
  completed: 2026-09-12
  tasks: 3
  commits: 3
actuals:
  tokens: 13700
  tasks: 3
  commits: 3
status: complete
---

# Phase 6 Plan 3: TapPopover primitive + hover-to-tap migrations Summary

Hand-rolled TapPopover primitive (portaled dialog, viewport-clamped anchoring via computeBubblePosition, consuming backdrop, light focus) with InfoBubble, FilterPopover and ColorPickerPopover migrated to a tap path below the 48rem breakpoint while desktop renders byte-identically (D-09), proven by dom tests + a real-binary Playwright spec.

## Accomplishments

- **TapPopover (PRIM-02)**: one primitive owning open state, aria (expanded/haspopup/dialog), portal to body, measure-then-place anchoring through `computeBubblePosition` (clamp-then-flip, margin 8 — zero new positioning maths), a transparent full-viewport **consuming** backdrop (z-40 under the z-50 panel — not a scrim, not inert; outside taps die on it, never click through), document-level Escape, re-tap-to-close (backdrop covers the trigger), light focus (panel focuses on open, restores to trigger on every close path), no Tab trap, `glim-fade` entrance self-gated by prefers-reduced-motion. Controlled AND uncontrolled open in one API.
- **InfoBubble tap path**: gated on `useIsCoarsePointer` (capability axis, D-11) with the hook's sanctioned manual `show()`/`hide()` API; open-only tap (see decisions), outside-tap dismissal effect (bubble is pointer-events:none so the tap lands underneath), and the 44px touch target on the same gate — desktop keeps the exact 15px footprint.
- **FilterPopover migration**: below `useIsDesktop` the panel mounts through TapPopover with the same surface recipe; the component's own `open` state stays false on mobile so the desktop dismissal effect no-ops and the two systems never fight. Desktop branch byte-identical.
- **ColorPickerPopover migration**: controlled TapPopover; shared `pickerBody` fragment (sv square + hue bar + hex input verbatim, refs/handlers untouched); positioning effect + outside-mousedown dismissal gated to desktop (T-06-03 mid-gesture analysis); Escape/scroll/resize dismissal on both branches. Desktop branch byte-identical.
- **e2e spec** on the real binary: InfoBubble tap-open/outside-tap-dismiss, Escape + focus-restore, filter panel fully inside the 360/390px viewport (the clipping this primitive exists to fix) + outside-tap dismiss, and a desktop-1280 control asserting the InfoBubble still opens on hover.

## Task Commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | TapPopover primitive + dom tests (tracer) | 260820c9 |
| 2 | InfoBubble + FilterPopover tap migrations | e24eda30 |
| 3 | ColorPickerPopover migration + e2e spec + dist rebuild | 768f87bd |

## Files Created / Modified

**Created:** `web/src/components/mobile/TapPopover.tsx`, `web/src/components/mobile/TapPopover.dom.test.tsx` (9 tests), `web/e2e/tap-popovers.spec.ts` (4 tests, 5 project-skipped legs by design).

**Modified:** `web/src/components/InfoBubble.tsx`, `web/src/components/FilterPopover.tsx`, `web/src/components/ColorPickerPopover.tsx`, `web/dist/index.html` (rebuilt, committed per house rule).

## Decisions Made

See frontmatter `decisions` — the five are: open-only InfoBubble tap (Android focus-before-click), controlled TapPopover for the color picker, desktop-only outside-mousedown there (mid-gesture unmount hazard), width-on-wrapper for `.glim-picker` cascade layers, backdrop-covers-trigger re-tap with the trigger kept mounted for focus restore. Each is documented in a load-bearing comment at the site.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `tooltip is not defined` ReferenceError after the InfoBubble destructure edit**
- **Found during:** Task 2 (consumer regression suites; `Containers.excludesAssistant.dom.test.tsx` reproduced it alone)
- **Issue:** The destructuring edit left the JSX tail referencing the old `tooltip` object the destructure removed.
- **Fix:** Added `bubble` to the destructure; re-ran the full combined set (all 279 regression tests then passed — a single-file run had hidden it).
- **Files modified:** `web/src/components/InfoBubble.tsx`
- **Commit:** e24eda30

**2. [Rule 1 - Bug] e2e assertions expected the wrong translated string**
- **Found during:** Task 3 (Playwright run)
- **Issue:** `toHaveText("Filter")` but the label is `t("filter.button")` = "Filters"; the failure dumps proved the real behaviors (open, Escape dismiss, focus restore) all worked.
- **Fix:** Corrected both assertions to "Filters".
- **Files modified:** `web/e2e/tap-popovers.spec.ts`
- **Commit:** 768f87bd

**Test-only fix (not a plan deviation):** a dom test held a stale detached backdrop element after a close/reopen cycle (portal children unmount with the popover, so clicks on the stale node never reach React's root listener); replaced with a fresh-query helper.

**Guardrails honored:** no frozen file touched (router/api/progress/internal untouched), zero new npm dependencies, zero new i18n keys (all strings reuse existing keys), desktop branches byte-identical.

## Issues Encountered

Windows Playwright stalls recurred and the remedy is now a two-step playbook: (a) silent-boot stall (server LISTENING on :3000, zero worker output for minutes) — `taskkill //F //IM bombvault.exe` and retry, with `DEBUG=pw:api` unstick if it repeats; (b) teardown wedge after all tests finish — killing the runner's OWN bombvault.exe webServer PID lets teardown complete and print results. Final official run: **7 passed / 5 skipped (mobile-android + mobile-iphone + desktop-1280)**.

## Verification

- TapPopover dom tests + bubblePosition: 21/21; tracer feedback gate re-run after Task 1 commit: PASS.
- Consumer regression set: 279/279; ColorPicker suites: 16/16; full vitest: 101 files / **2349 tests passed** (was 2340, +9 new).
- eslint clean on all four changed source files (e2e specs are outside the eslint config scope by design); `tsc --noEmit` clean; `vite build` ok (second build byte-identical — dist already committed).
- Acceptance gates: PASS for all three tasks.

## Next Phase Readiness (notes for 06-04)

- BottomSheet `fullHeight`/`footer` props proven in 06-02; **TapPopover now available** for any remaining hover-dependent surface; controlled-mode pattern (`open`/`onOpenChange`) is the way to keep a consumer's own effects live.
- InfoBubble is now 44px on coarse pointers — pages stacking several bubbles in one row should be checked for wrap on the maquette screens.
- Sticky bars span the p-4 gutter (06-02 convention) — keep new mobile chrome consistent.
- Windows Playwright stall remedy above applies to every remaining e2e run this phase.

## Self-Check: PASSED

All created files exist on disk; all four commit hashes (260820c9, e24eda30, 768f87bd, 15465998) verified in git history.
