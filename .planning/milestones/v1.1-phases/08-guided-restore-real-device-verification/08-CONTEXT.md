# Phase 8: Guided Restore & Real-Device Verification - Context

**Gathered:** 2026-09-14
**Status:** Ready for planning

<domain>
## Phase Boundary

The milestone's exit criteria are met: the guided restore flow runs end-to-end from a phone on proven primitives (SCRN-06 — preflight summary → confirmation naming overwrite consequences → optional dry-run/verify → live progress with log → completion), and the whole mobile app passes the real-device, i18n, touch-target, and theme verification sweep on both platforms (VERIFY-02..05). Desktop above 48rem stays byte-identical. No new routes (`router.tsx` frozen), no API changes (`api.ts` frozen), no backend changes, no new runtime npm dependencies. The real-device pass (VERIFY-02) is an explicit human checkpoint AFTER the automated plans land — it is the milestone exit criterion, not a subagent task.

</domain>

<decisions>
## Implementation Decisions

### Guided restore mobile flow (SCRN-06)
- **D-01:** The mobile guided restore lives INSIDE `Recovery.tsx` via the established double gate — desktop stepper content `max-md:hidden`, mobile full-screen step flow rendered behind `!isDesktop`. No new navigation: the route already exists, `router.tsx` is frozen. This is the same pattern that rehosted six destination pages in phases 6–7 (Home/Containers/Files precedent).
- **D-02:** The mobile flow is 1:1 parity with the desktop Recovery stepper's existing path: preflight summary → confirmation naming overwrite consequences → optional dry-run/verify → live progress with log → completion. No new restore types, no new API surface — the mobile steps fire the same guarded Recovery calls the desktop stepper fires.
- **D-03:** The server-side guard chain is unchanged and NARRATED, not bypassed — the phase-7 precedent (Config restore sheet renders the chain read-only above the outcome-naming confirm, D-03/07). Restore controls are secondary-styled and positioned away from the thumb's default path (the SCRN-06 requirement): primary flow actions advance the steps; destructive/terminal controls sit below the thumb arc and ride useConfirm → ConfirmSheet destructive tone.
- **D-04:** Live progress + log reuses the existing progress pipeline read-only (`web/src/lib/progress.ts` SSE consumption / `useBackupWatch` correlation pattern) — consumed, never edited. The RunDetailSheet (phase 6) is the reuse candidate for the progress/log presentation.
- **D-05:** Encrypted-repo / credentials steps keep the write-only secrets contract (RevealInput + `has*` flags, blank-keeps, Clear-only-removes) — the T-07-11/T-07-24 pattern carries over wherever the flow handles a secret field.

### Verification sweep routing (VERIFY-03..05)
- **D-06:** The three phase-7 UI-review recommendations route here: (1) desktop-era 32px controls inside the Settings stacked cards under the 44px mobile floor → fixed in this phase's VERIFY-04 sweep (extend the phase-7 toggle-bleed pattern to every remaining control); (2) ActivityLog mobile day-filter chip solid accent (`ActivityLog.tsx:465`) → switch to tonal `accentSoft` (accent-reservation 4: accent reserved for active/primary state) or document the reservation — implementer picks the honest one; (3) the spacing/weight guard is scoped to MOBILE regions only (max-md:hidden counterparts and `!isDesktop` blocks) — legacy desktop-half 12px paddings (e.g. `Dashboard.tsx:3029,3037`) are NOT touched; desktop byte-identity wins over the guard's letter. This scoping clarification is binding for the guard needles if any change.
- **D-07:** i18n sweep (VERIFY-03): every mobile-visible string via `t()` with 42-locale parity (same-commit binding tests); de/fr pass the narrow-viewport sweep at 320–360px on the shell + key screens (`narrow-viewport.spec.ts` extension).
- **D-08:** Touch targets (VERIFY-04): every interactive control below the breakpoint ≥ 44px; every hover-dependent affordance has a non-hover path (Tailwind v4 `hover:` behind `@media (hover: hover)`); four-status conveyed by text labels, never color alone (WCAG 1.4.1); semantic tokens only. Both themes verified in mobile (VERIFY-05).
- **D-09:** Landscape re-test: `DESKTOP_QUERY = "(min-width: 48rem)"` stays the ONLY width authority — no second breakpoint. Large phones in landscape may legitimately cross 48rem and render the desktop layout; the VERIFY-02 criterion is that EACH orientation renders correctly under the single authority, not that landscape is forced mobile. Landscape e2e re-proofs assert this as-is.

### Process (locked)
- **D-10 (LOCKED, user decision):** E2E spec filtering from phase 8 onward. Verbatim directive for every executor prompt in this phase: « During task verification, run only the e2e specs affected by your changes (filtered `npx playwright test <spec>`); the full e2e suite is run once at the phase tail gate by the orchestrator — do not re-run it per plan. » Vitest stays full-suite per plan (fast). Refused alternatives: `reuseExistingServer`, workers/sharding (backlog v2).
- **D-11:** Human pause VERIFY-02..05: after the automated plans land (execute-phase with `--no-transition`), execution STOPS for explicit user validation on real hardware — notched iPhone Safari, SE-class iPhone Safari, Android Chrome, portrait AND landscape, including one guided restore exercised on device. Protocol: document the test matrix in the phase UAT artifact, rebuild `web/dist`, redeploy ONLY `BombVault-test` (the PROD `BombVault` container is never touched), hand the user non-repo coordinates. The two phase-7 `behavior_unverified` items (WR-01 multi-row chip-hide, WR-02 Files save-bar-under-search) and UI-review fix 1 join this device session's checklist.
- **D-12:** Frozen surfaces: `router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**` — read-only consumption only. Zero npm installs. Milestone stays presentation-only.

### Claude's Discretion
- Exact step decomposition and copy rhythm of the mobile stepper — follow the desktop stepper's information hierarchy translated into the mobile full-screen step language.
- Which plan carries the tracer slice (planner's call — the guided-restore e2e is the natural tracer).
- Whether D-06 fix 2 lands as tonal accent change or documented reservation — implementer's honest call.
- Placement of the UAT protocol artifact and the device-session checklist.

### Folded Todos
None — no pending todos matched phase 8.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone planning artifacts
- `.planning/REQUIREMENTS.md` — SCRN-06, VERIFY-02..05 verbatim (this phase); Out of Scope table
- `.planning/ROADMAP.md` §Phase 8 — goal + 4 success criteria
- `.planning/phases/07-remaining-destinations-operational-parity/07-CONTEXT.md` — D-01..D-12 standing mobile decisions (double gate, sheets, DESKTOP_QUERY authority, pointer axis)
- `.planning/phases/07-remaining-destinations-operational-parity/07-UI-REVIEW.md` — the 24/24 audit; the 3 priority fixes routed by D-06
- `.planning/phases/07-remaining-destinations-operational-parity/07-VALIDATION.md` — Manual-Only rows name this phase as the real-device venue
- `.planning/phases/06-maquette-screens/06-CONTEXT.md` — D-01..D-11 (tree interactionMode, save-bar contract, BottomSheet tone/fullHeight, ConfirmSheet, TapPopover, useVisibilityGate)
- `.planning/phases/05-mobile-shell-navigation-foundation/05-CONTEXT.md` — shell contracts, More sheet registry, safe areas
- `.planning/STATE.md` — `behavior_unverified` WR-01/WR-02 + deferred debt entering the device session
- `deferred-items.md` — pre-existing platform-chrome checkbox failures (obsolete probes, 713bc6b3 attribution) + v2 backlog

### Design bible
- `design/mobile/README.md` — locked carbon tokens, four-status rule, platform mapping; read via `git show 0b64c7df:design/mobile/README.md` (branch `mobile-design-concepts`; working tree has no `design/` dir)

### Codebase
- `web/src/pages/Recovery.tsx` — the integration surface: desktop stepper (StepDisclosure, StepCard, CloudCredsDisclosure, EncryptionStatus; `export default` line ~1497, ~2605 lines) — the mobile flow rehosts THIS path
- `web/src/components/mobile/` — BottomSheet (tone union, fullHeight, footer), StickyActionBar, TapPopover, ConfirmSheet, RunDetailSheet
- `web/src/lib/useMediaQuery.ts` — `DESKTOP_QUERY` single source + source-assert guard
- `web/src/lib/pageShell.ts` — PAGE_SHELL on every page root
- `web/e2e/narrow-viewport.spec.ts`, `web/e2e/platform-chrome.spec.ts`, `web/e2e/desktop-untouched.spec.ts` — the sweep's existing e2e vehicles
- `.planning/codebase/STRUCTURE.md` — pages per route, i18n pattern (42-table parity tests)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Double gate (`max-md:hidden` + `!isDesktop`) + per-route desktop-identity e2e parametrization — the rehost pattern for Recovery
- ConfirmSheet / useConfirm — the overwrite-consequence confirmation and every destructive restore control
- RunDetailSheet + progress SSE consumption — live progress + log presentation (read-only reuse)
- RevealInput + `has*` flags — secrets in the connect/credentials steps
- StickyActionBar — step-level primary/secondary action rows
- MobileSectionLabel / Badge / card patterns — step content blocks
- useIsDesktop / useIsCoarsePointer — the two media hooks; no new width literals
- mobileShellSource guard + platform.test.ts — the source-assert safety net extended to the new flow

### Established Patterns
- Localized e2e: `/api/display-prefs` route.abort + Go-JSON fixtures at the Playwright route layer (harness has no real Docker/VMs — fresh DB gates everything but Recovery-adjacent flows; the guided-restore e2e asserts UI choreography and API-call parity, NOT actual restore outcomes)
- Every user-visible string via `t()` with same-commit 42-table binding; em dashes banned; backend error text verbatim
- Typography weights 400/600 only; spacing 8/16 stops — scoped to mobile regions per D-06 fix 3
- E2E filtering (D-10): filtered `npx playwright test <spec>` per task; full suite ONCE at the phase tail gate by the orchestrator

### Integration Points
- `Recovery.tsx` — both halves live in this one file; the desktop stepper JSX moves inside `max-md:hidden` unchanged
- Existing Recovery API calls (`api.ts` read-only) — the mobile steps fire the identical requests
- `BombVault-test` container — the ONLY redeploy target for the device session; PROD never touched
- Device-session checklist — inherits WR-01, WR-02, UI-review fix 1 from phase 7

</code_context>
