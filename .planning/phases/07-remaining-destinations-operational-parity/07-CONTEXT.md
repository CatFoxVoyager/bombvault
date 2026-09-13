# Phase 7: Remaining Destinations & Operational Parity - Context

**Gathered:** 2026-09-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Every remaining destination — VMs, Flash, Config, Receiver, Fleet, Settings — operates in the same mobile card language with sheet editors, schedule/notification/replication parity, list ergonomics, and the design bible's platform-adaptive chrome (M3/HIG), closing the "no desktop-only settings" contract (MOBILE-03 + MOBILE-04). Desktop above 48rem is byte-identical. No new routes (`router.tsx` frozen), no API changes (`api.ts` frozen), no backend changes, no new runtime npm dependencies.

</domain>

<decisions>
## Implementation Decisions

### Destination pages (MORE-01)
- **D-01:** Each remaining destination page renders a mobile block below md via the established double gate — desktop content `max-md:hidden`, mobile content rendered behind `!isDesktop` — the Home/Containers precedent from 06-06. Same files, same pages; no second route tree.
- **D-02:** VM/Flash/Config item lists render in the phase 6 card language: block-level item cards carrying status badge + last-run info + off-site indicator, `MobileSectionLabel` grouping, `StickyActionBar` where an editor state exists.
- **D-03:** The Config restore guard chain surfaces readably — chain steps render as an ordered list inside the restore sheet, not collapsed behind a single confirm.
- **D-04:** Fleet peers render as cards (reachable / last contact / protection summary); tapping a peer opens a content-sized detail BottomSheet (viewer, not editor — no `fullHeight`).

### Editors & schedule (FLOW-01, FLOW-02)
- **D-05:** TimePicker / CadenceBuilder / schedule and notification editors open as `fullHeight` BottomSheets (flag added to the primitive in phase 6) — full-screen editor affordance for complex forms.
- **D-06:** The invoking card always shows the effective schedule preview (next fire time from the shared `/api/schedule/next` derivations extracted in 06-06) so closing the sheet validates the edit without reopening it.
- **D-07:** Notifications and off-site replication settings are editable on mobile (forms in sheets; write-only secrets contract preserved); no desktop-only settings remain — the FLOW-02 contract.

### Settings page (MORE-02)
- **D-08:** Settings renders as stacked full-width cards below md replacing the desktop tab-card strip; the 7-tab Selector strip becomes horizontally scrollable tonal chips (M3 chip language) above the stacked content.
- **D-09:** Dark mode / language / accent pickers reuse the phase 6 popover primitives (ColorPickerPopover rides TapPopover; language via flag chips); full-form editors open full-screen sheets.

### List ergonomics (LISTS-01)
- **D-10:** Long lists (runs, containers, sets, logs) get a sticky-in-flow search field + filter chips row above the list; filter chips reuse FilterPopover / TapPopover. "Sticky" means sticky-in-flow within the page, never `fixed` (phase 5/6 standing contract).
- **D-11:** Load-more pagination with a constant visible threshold per list — never infinite scroll (Out of Scope); rows ≥ 44px touch targets throughout.

### Platform-adaptive chrome (PLAT-01)
- **D-12:** Platform detection extends the phase 6 media-hook pattern (`useIsCoarsePointer`, `(pointer: coarse)`) — chrome translation only, one IA, no duplicated page components. Mechanism: a `data-platform` attribute on the app root (`material` / `cupertino`) with CSS custom-property variants. M3 language: navpill bar (BottomNav already ships the pill treatment), **FAB for the primary action** — this is where the FAB lands, deliberately deferred from phase 6 D-06 — tonal chips. HIG: large titles, circular checks. `DESKTOP_QUERY` in `useMediaQuery.ts` stays the ONLY width authority; the pointer axis remains the second, independent media axis.

### Claude's Discretion
- Exact card composition and section order per destination page — follow each desktop page's existing information hierarchy translated into card form.
- Exact i18n key naming following the existing `domain.key` conventions; de copy uses the house vocabulary (Bereich/Gesamt-Backup precedent).
- Which destination anchors the tracer plan — planner's call.
- Ingestion of the phase 6 UI-review advisory fixes (stat-triad typography, 12px→8/16 spacing sweep, `home.newBackupConfirm` verbatim, chevron aria-label with path, Files editor header `flex-wrap`): recommended to fold into this phase's plans since they touch the same files the new pages extend; planner decides placement and scope.

### Folded Todos
None — `todo.match-phase 7` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design bible & maquettes
- `design/mobile/README.md` — locked carbon tokens, four-status rule, platform mapping (M3/HIG); read via `git show 0b64c7df:design/mobile/README.md` (branch `mobile-design-concepts`; working tree has no `design/` dir)
- `git show 0b64c7df:design/mobile/android.html` / `ios.html` — the maquette screens this language implements

### Milestone planning artifacts
- `.planning/REQUIREMENTS.md` — MORE-01/02, FLOW-01/02, LISTS-01, PLAT-01 verbatim (this phase); Out of Scope table (drag-to-reorder, infinite scroll, hamburger, 5th hue — do not fold into plans)
- `.planning/ROADMAP.md` §Phase 7 — goal + 5 success criteria
- `.planning/phases/06-maquette-screens/06-CONTEXT.md` — D-01..D-11 (tree interactionMode, save-bar publish contract, stacked detail, BottomSheet tone/fullHeight/footer, ConfirmSheet, TapPopover, useVisibilityGate, DESKTOP_QUERY authority)
- `.planning/phases/05-mobile-shell-navigation-foundation/05-CONTEXT.md` — More sheet registry derivation, safe-area contract, single width literal, localized e2e route-abort pattern
- `.planning/phases/06-maquette-screens/06-UI-REVIEW.md` — the 17/24 findings; top 3 fixes + the 360px Files editor-header overflow are absorption candidates for this phase

### Codebase
- `web/src/index.css` — semantic tokens (carbon-*, accent*, status*); never raw hex; the 8/16 spacing scale decision
- `web/src/lib/useMediaQuery.ts` — `DESKTOP_QUERY` single source + source-assert guard
- `web/src/lib/pageShell.ts` — PAGE_SHELL / PAGE_SHELL_RESPONSIVE on every page root
- `web/src/components/navGlyphs.tsx` + the ONE nav registry — More sheet destinations + `labelKey` typing
- `web/src/components/mobile/` — BottomSheet (tone union, fullHeight, footer), StickyActionBar, TapPopover, ConfirmSheet, RunDetailSheet — the primitives this phase composes
- `.planning/codebase/STRUCTURE.md` — pages per route, `settings/` tab cards, i18n pattern (en+de inline + locales/*.ts, 42-table parity tests)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- BottomSheet `fullHeight` + footer + tone union — every editor sheet in this phase
- TapPopover / FilterPopover / ColorPickerPopover — chip popovers on touch
- StickyActionBar + publish-contract save queue — editors with live-saved state
- useConfirm → ConfirmSheet — every destructive action, zero per-call-site changes
- RunDetailSheet — reuse candidate for Fleet peer detail / destination run history
- MobileSectionLabel, Badge, avatar-card patterns from the phase 6 Dashboard/Containers blocks
- useIsDesktop / useIsCoarsePointer — the two media hooks; no new width literals
- useVisibilityGate — long lists on pages that can background
- worstRpoStatus / worstRpoLabel / nextBackupFireAt shared derivations (06-06) — effective previews on invoking cards

### Established Patterns
- `max-md:hidden` + `!isDesktop` double gate — desktop DOM untouched both directions, asserted in e2e
- Desktop-identity e2e parametrized per route (`desktop-untouched.spec.ts`) — extend to every new mobile block
- Localized e2e: `/api/display-prefs` route.abort + Go-JSON fixtures at the Playwright route layer (harness has no Docker/VMs/flash devices; fresh DB gates everything but Recovery off)
- Every user-visible string via `t()` with same-commit 42-table binding; em dashes banned; backend error text verbatim
- Typography weights 400/600 only in NEW code; spacing 8/16 stops only — the two open phase 6 review findings are the standing enforcement, not suggestions to repeat

### Integration Points
- `web/src/pages/settings/` tab cards — the 7-tab Selector strip is the Settings integration surface
- Runs / containers / sets / logs lists — pagination + sticky search integration points
- `/api/schedule/next` + shared derivations — schedule previews on invoking cards
- Frozen: `router.tsx` (no new routes), `api.ts` (no API changes), `progress.ts`, `internal/**`

</code_context>

<specifics>
## Specific Ideas

- **FAB:** the phase 6 Home trigger deliberately stayed a sticky thumb-zone block *because the FAB is PLAT-01* — this phase must ship the M3 FAB treatment for the primary action on the material chrome (and its HIG equivalent), or record why the sticky block stays.
- The More sheet already routes all six destinations correctly (phase 5 registry contract) — this phase makes each destination's *page* mobile; the sheet itself needs no rework.
- Fresh-DB gating: like Recovery, destinations render their settings-gate state honestly (gate-off → hidden from the More sheet); mobile pages handle both gate states.
- The de/fr narrow-viewport sweeps (320–360px) apply to every new list/editor in this phase — the milestone exit criterion is rehearsed here, not only in phase 8.

</specifics>

<deferred>
## Deferred Ideas

- SCRN-05 per-file stats triade — recorded v2 data candidate (frozen-API substitutes shipped in phase 6); not this phase.
- Drag-to-reorder, infinite scroll, hamburger menu, 5th accent hue — REQUIREMENTS.md Out of Scope at milestone level.
- Guided restore step flow (SCRN-06), real-device validation (VERIFY-02..05) — Phase 8.
- `/gsd-map-codebase` refresh — structural drift since 2026-09-09 remains unmapped (STATE.md concern); out of phase scope.

### Reviewed Todos (not folded)
None — no matching todos existed for phase 7.

</deferred>

---

*Phase: 7-Remaining Destinations & Operational Parity*
*Context gathered: 2026-09-13*
