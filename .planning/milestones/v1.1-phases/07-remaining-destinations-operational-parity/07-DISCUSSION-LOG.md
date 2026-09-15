# Phase 7: Remaining Destinations & Operational Parity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-13
**Phase:** 7-Remaining Destinations & Operational Parity
**Mode:** `--auto` (autonomous milestone run) — all areas auto-selected with recommended defaults; no interactive session.
**Areas discussed:** Destination pages, Editors & schedule, Settings & Selector, List ergonomics, Platform-adaptive chrome

---

## Destination pages

| Option | Description | Selected |
|--------|-------------|----------|
| Separate mobile component tree per destination | New components duplicated from desktop pages | |
| Same pages, mobile blocks below md (max-md:hidden + !isDesktop) | Phase 6 Home/Containers precedent; desktop DOM untouched | ✓ |
| Responsive single DOM | One markup reflowing at md | |

**User's choice:** auto — recommended default (double gate; the established, e2e-asserted precedent).
**Notes:** router.tsx frozen; the phase 5 registry/More sheet already routes to the existing routes, so no navigation changes are needed or allowed.

## Editors & schedule

| Option | Description | Selected |
|--------|-------------|----------|
| fullHeight BottomSheets + preview on the invoking card | Full-screen editors for complex forms; effective schedule always visible after close | ✓ |
| Content-sized sheets | Lighter, but complex TimePicker/Cadence forms scroll inside a cramped surface | |
| Inline expansion on the card | No sheet, but collides with the card-list IA | |

**User's choice:** auto — recommended default (reuses the phase 6 `fullHeight` flag added to BottomSheet).
**Notes:** D-06's effective preview reuses the 06-06 shared `/api/schedule/next` derivations so card and sheet cannot disagree.

## Settings & Selector

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked cards + horizontally scrollable tonal chips | Replaces the 7-tab strip below md; M3 chip language | ✓ |
| Accordion sections | One long scrolling page, no tab affordance | |
| Vertical tab list | Closer to desktop IA but spends width | |

**User's choice:** auto — recommended default.
**Notes:** dark/language/accent pickers reuse phase 6 popover primitives; no new picker machinery.

## List ergonomics

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky-in-flow search + FilterPopover chips + constant-threshold load-more | Matches phase 5/6 sticky discipline; explicit load-more (LISTS-01) | ✓ |
| Fixed-position toolbar | Stronger stickiness but violates the never-`fixed` contract | |
| Infinite scroll | Explicitly Out of Scope in REQUIREMENTS.md | |

**User's choice:** auto — recommended default.
**Notes:** rows ≥44px throughout; load-more thresholds constant per list (planner picks the constant).

## Platform-adaptive chrome

| Option | Description | Selected |
|--------|-------------|----------|
| data-platform attribute on the app root + CSS variants | One IA, chrome-only translation; FAB (deferred from 06 D-06) lands here | ✓ |
| Two component trees (material/cupertino) | Max fidelity, duplicates every page — rejected by milestone scope | |
| Single chrome, no platform split | Ignores PLAT-01 | |

**User's choice:** auto — recommended default.
**Notes:** detection extends `useIsCoarsePointer` ((pointer: coarse), the phase 6 D-11 second media axis); `DESKTOP_QUERY` stays the ONLY width authority.

## Claude's Discretion

Card composition/order per destination; i18n key naming (house `domain.key` + de vocabulary); tracer-plan anchor destination; placement/scope of the phase 6 UI-review advisory fixes (triad typography, 12px→8/16 spacing sweep, confirm copy verbatim, chevron aria-label, Files editor header flex-wrap) — recommended for absorption in this phase since the same files are touched.

## Deferred Ideas

- SCRN-05 per-file stats triade (v2 data candidate).
- Drag-to-reorder, infinite scroll, hamburger, 5th hue — REQUIREMENTS.md Out of Scope.
- Guided restore flow + real-device validation — Phase 8.
- `/gsd-map-codebase` refresh — STATE.md concern, out of phase scope.
