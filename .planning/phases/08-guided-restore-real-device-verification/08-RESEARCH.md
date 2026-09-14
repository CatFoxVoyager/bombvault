# Phase 8: Guided Restore & Real-Device Verification - Research

**Researched:** 2026-09-14
**Domain:** Mobile SPA presentation (React 19 + Tailwind 4) — rehosting the desktop Recovery stepper as a full-screen mobile step flow, plus the milestone verification sweep (real-device pass, i18n, touch targets, themes)
**Confidence:** HIGH (codebase-internal research, all sources read this session; external claims tagged)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Guided restore mobile flow (SCRN-06)**
- **D-01:** The mobile guided restore lives INSIDE `Recovery.tsx` via the established double gate — desktop stepper content `max-md:hidden`, mobile full-screen step flow rendered behind `!isDesktop`. No new navigation: the route already exists, `router.tsx` is frozen. Same pattern that rehosted six destination pages in phases 6-7 (Home/Containers precedent).
- **D-02:** The mobile flow is 1:1 parity with the desktop Recovery stepper's existing path: preflight summary → confirmation naming overwrite consequences → optional dry-run/verify → live progress with log → completion. No new restore types, no new API surface — the mobile steps fire the same guarded Recovery calls the desktop stepper fires.
- **D-03:** The server-side guard chain is unchanged and NARRATED, not bypassed — the phase-7 precedent (Config restore sheet renders the chain read-only above the outcome-naming confirm, D-03/07). Restore controls are secondary-styled and positioned away from the thumb's default path (the SCRN-06 requirement): primary flow actions advance the steps; destructive/terminal controls sit below the thumb arc and ride useConfirm → ConfirmSheet destructive tone.
- **D-04:** Live progress + log reuses the existing progress pipeline read-only (`web/src/lib/progress.ts` SSE consumption / `useBackupWatch` correlation pattern) — consumed, never edited. The RunDetailSheet (phase 6) is the reuse candidate for the progress/log presentation.
- **D-05:** Encrypted-repo / credentials steps keep the write-only secrets contract (RevealInput + `has*` flags, blank-keeps, Clear-only-removes) — the T-07-11/T-07-24 pattern carries over wherever the flow handles a secret field.

**Verification sweep routing (VERIFY-03..05)**
- **D-06:** Three phase-7 UI-review recommendations route here: (1) desktop-era 32px controls inside the Settings stacked cards under the 44px mobile floor → fixed in this phase's VERIFY-04 sweep (extend the phase-7 toggle-bleed pattern to every remaining control); (2) ActivityLog mobile day-filter chip solid accent (`ActivityLog.tsx:465`) → switch to tonal `accentSoft` or document the reservation — implementer picks the honest one; (3) the spacing/weight guard is scoped to MOBILE regions only (max-md:hidden counterparts and `!isDesktop` blocks) — legacy desktop-half 12px paddings (e.g. `Dashboard.tsx:3029,3037`) are NOT touched; desktop byte-identity wins over the guard's letter. This scoping clarification is binding for the guard needles if any change.
- **D-07:** i18n sweep (VERIFY-03): every mobile-visible string via `t()` with 42-locale parity (same-commit binding tests); de/fr pass the narrow-viewport sweep at 320-360px on the shell + key screens (`narrow-viewport.spec.ts` extension).
- **D-08:** Touch targets (VERIFY-04): every interactive control below the breakpoint ≥ 44px; every hover-dependent affordance has a non-hover path (Tailwind v4 `hover:` behind `@media (hover: hover)`); four-status conveyed by text labels, never color alone (WCAG 1.4.1); semantic tokens only. Both themes verified in mobile (VERIFY-05).
- **D-09:** Landscape re-test: `DESKTOP_QUERY = "(min-width: 48rem)"` stays the ONLY width authority — no second breakpoint. Large phones in landscape may legitimately cross 48rem and render the desktop layout; the VERIFY-02 criterion is that EACH orientation renders correctly under the single authority, not that landscape is forced mobile. Landscape e2e re-proofs assert this as-is.

**Process (locked)**
- **D-10 (LOCKED, user decision):** E2E spec filtering from phase 8 onward. Verbatim directive for every executor prompt in this phase: « During task verification, run only the e2e specs affected by your changes (filtered `npx playwright test <spec>`); the full e2e suite is run once at the phase tail gate by the orchestrator — do not re-run it per plan. » Vitest stays full-suite per plan (fast). Refused alternatives: `reuseExistingServer`, workers/sharding (backlog v2).
- **D-11:** Human pause VERIFY-02..05: after the automated plans land (execute-phase with `--no-transition`), execution STOPS for explicit user validation on real hardware — notched iPhone Safari, SE-class iPhone Safari, Android Chrome, portrait AND landscape, including one guided restore exercised on device. Protocol: document the test matrix in the phase UAT artifact, rebuild `web/dist`, redeploy ONLY `BombVault-test` (the PROD `BombVault` container is never touched), hand the user non-repo coordinates. The two phase-7 `behavior_unverified` items (WR-01 multi-row chip-hide, WR-02 Files save-bar-under-search) and UI-review fix 1 join this device session's checklist.
- **D-12:** Frozen surfaces: `router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**` — read-only consumption only. Zero npm installs. Milestone stays presentation-only.

### Claude's Discretion
- Exact step decomposition and copy rhythm of the mobile stepper — follow the desktop stepper's information hierarchy translated into the mobile full-screen step language.
- Which plan carries the tracer slice (planner's call — the guided-restore e2e is the natural tracer).
- Whether D-06 fix 2 lands as tonal accent change or documented reservation — implementer's honest call.
- Placement of the UAT protocol artifact and the device-session checklist.

### Deferred Ideas (OUT OF SCOPE)
None — no pending todos matched phase 8.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRN-06 | Guided restore mobile flow: full-screen step flow — preflight summary → confirmation naming overwrite consequences → optional dry-run/verify → live progress with log → completion; restore controls secondary-styled, away from the thumb's default path; guard chain unchanged server-side | Full step-to-API mapping documented below (Recovery.tsx integration surface, `useConfirm`/ConfirmSheet, `checkDomain`/`runDrill` as the verify surface, RestoreProgress + RunDetailSheet log presentation, `fireAndWaitRun` sequential restore) |
| VERIFY-02 | Real-device pass as the milestone exit criterion: notched + SE-class iPhone Safari and Android Chrome, portrait + landscape, guided restore exercised on device | D-11 human-pause protocol; device/viewport matrix with the 48rem landscape math; emulation-vs-real-device findings; Playwright harness already boots the real binary |
| VERIFY-03 | i18n: every mobile string through `t()` with 42-locale parity; de/fr narrow-viewport passes (320-360px) on the chrome and key screens | 42-table registry verified (en+de inline + 40 locale files); parity/orphan/quality/preseed test quartet; `narrow-viewport.spec.ts` extension points (`bootSeededPage`, route battery at :541) |
| VERIFY-04 | Touch-target + hover audit: every interactive control ≥ 44px below the breakpoint; every hover-dependent affordance has a non-hover path | Toggle `::after` bleed pattern (the D-06 fix 1 template) verified at Toggle.tsx:92-105; Tailwind v4 `hover:` → `@media (hover: hover)` verified [VERIFIED: Context7 /tailwindlabs/tailwindcss.com]; TapPopover is the non-hover path |
| VERIFY-05 | Both themes verified on mobile; four-status language with text labels (never color alone, WCAG 1.4.1); semantic tokens only | Four-status via `statusLabel`/Badge text verified; semantic token discipline + `mobileShellSource` guard verified; WCAG 1.4.1 technique G14 (color + text) [CITED: w3.org] |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives that bind this phase (from `D:\code\bombvault\CLAUDE.md` and `D:\code\bombvault\.claude\CLAUDE.md`):
- Go stdlib `net/http` only; SPA with no state library, no UI kit — hand-rolled components in line with existing ones. (Phase adds no Go code and no UI kit — compliant by construction.)
- `internal/backup` stays isolated from adapters; ports-and-adapters seam enforced by review tests. (Frozen — phase touches nothing in `internal/**`.)
- SQLite migrations append-only. (Untouched.)
- Security discipline: boundary validation, error scrubbing, argv discipline, credentials via env only. (Restore flow consumes existing guarded endpoints; no new validation surface.)
- Process: `go build/vet/gofmt/golangci-lint/test` before every push; **web build (`tsc --noEmit && vite build`, commit `web/dist`) required after any `web/` change** since the SPA is embedded — D-11's rebuild step is this rule; async tests must wait for detached goroutines.
- Releases: never tag without explicit approval.
- Settings writes via `h.store.MutateSettings` / `UpdateSettings` forbidden in production paths. (Untouched — frontend PUTs only.)
- Every user-visible string through `t()` (lint-enforced); em dashes banned in user text (lint-enforced, non-configurable); backend error text shown verbatim.
- Status colors belong on Badges/chips, never on interactive controls; page roots use `PAGE_SHELL`; exceptions declared in `web/eslint.config.js`, never disable comments.
- Comments are load-bearing "why" documents — non-obvious choices carry paragraphs citing issues/decisions.
- TS wire types mirror Go JSON field-for-field (api.ts is frozen this phase, so no new mirrors).

## Summary

Phase 8 is the mobile milestone's close-out: rehost the desktop Recovery disaster-recovery wizard (`web/src/pages/Recovery.tsx`, 2605 lines, `export default` at :1497) as a full-screen mobile step flow inside the same file, then run the four-part verification sweep (real device, i18n, touch targets, themes) that exits the milestone. Every technical ingredient already exists and was verified this session: the double-gate rehost pattern (phases 6-7), ConfirmSheet destructive anatomy, RunDetailSheet's live-progress/log presentation, the write-only secrets contract, the 42-locale parity test quartet, the narrow-viewport de/fr sweep, the Toggle 44px bleed pattern, and the `mobileShellSource` source-assert guard. The research confirmed one important mapping: **there is no dry-run endpoint** — SCRN-06's "optional dry-run/verify" step maps onto the existing integrity-verify surface (`checkDomain`, `POST /api/check/{domain}`) or the restore-verification drill (`runDrill`, `POST /api/verify/{domain}`), both already consumed read-only by RunDetailSheet's verify row. No API change is needed, exactly as D-02/D-12 require.

The server-side guard chain is untouched and is narrated, not bypassed: `RestoreContainer` guards `Confirmed==true` → snapshot-id validation (arg-injection guard) → wrong-target live re-check before any destructive step [VERIFIED: internal/backup/orchestrator.go:644-649]. The mobile flow's confirmation naming overwrite consequences rides `useConfirm`, whose presentation below md is already the fail-tone ConfirmSheet (phase-6 D-07) — zero per-call-site changes. Restore controls on mobile must be secondary-styled and placed below the thumb arc, following RunDetailSheet's own restore-entry precedent (tonal `SheetActionRow`, "never accent — restore is deliberate").

The real-device pass (VERIFY-02) is deliberately NOT automated: Playwright's official docs describe device-descriptor emulation but do not document any emulation fidelity guarantee for real iOS Safari, and Playwright's WebKit is a patched build that cannot run branded Safari [CITED: playwright.dev/docs/browsers]. The D-11 human-pause protocol (UAT artifact, rebuild `web/dist`, redeploy `BombVault-test` only, hand over non-repo coordinates) is the sanctioned venue. The 48rem landscape math is derivable and matches D-09: an SE-class phone in landscape (667px wide) stays mobile; a notched iPhone in landscape (844px wide) legitimately renders the desktop chrome.

**Primary recommendation:** Plan the guided-restore flow as one mobile block in `Recovery.tsx` sharing the page's existing component state and handlers (the desktop half stays mounted under `max-md:hidden` byte-identical), map the five SCRN-06 steps onto the existing calls per the table below, extend the existing sweep vehicles (`narrow-viewport.spec.ts`, `mobileShellSource` guard, i18n preseed + parity tests, `desktop-untouched.spec.ts` leakage battery) rather than building new mechanisms, and end the phase with the D-11 human-pause device session.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Guided restore step flow (SCRN-06) | Browser / Client (SPA) | API (existing restore endpoints) | Presentation-only milestone; the mobile steps fire the same guarded API calls the desktop stepper fires; all step logic is client state |
| Restore guard chain | API / Backend (`internal/backup`) | — | Frozen per D-12; narrated read-only in the UI; `Confirmed` flag, snapshot-id regex, wrong-target re-check all server-side |
| Live progress + log | Browser / Client (frozen `progress.ts` singleton, consumed read-only) | API (SSE `GET /api/progress`) | D-04: consumed, never edited; visibility gating is consumer-side (`useVisibilityGate`) |
| Destructive confirmation | Browser / Client (`useConfirm` → ConfirmSheet below md) | — | One promise API, two presentations; presentation swap already shipped in phase 6 |
| i18n parity + narrow viewport (VERIFY-03) | Browser / Client + vitest/Playwright gates | — | 42-table parity tests (vitest) + de/fr e2e sweep (Playwright) |
| Touch-target / hover / theme audit (VERIFY-04/05) | Browser / Client (CSS + component fixes) | vitest source-assert guards + manual device session | Automated backstops for new code; real-hardware feel is the D-11 checkpoint |
| Real-device pass (VERIFY-02) | Human on real hardware | `BombVault-test` container redeploy | Milestone exit criterion; explicitly not a subagent task (D-11) |

## Standard Stack

### Core (all already installed — ZERO new packages, D-12)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.7 | SPA framework | Repo standard; `useSyncExternalStore` media hooks |
| Tailwind CSS | ^4.3.3 | Styling over semantic tokens | `hover:` compiles behind `@media (hover: hover)` in v4 [VERIFIED: Context7 /tailwindlabs/tailwindcss.com] — the VERIFY-04 non-hover property holds by framework default |
| vitest | ^4.1.10 (installed) | dom + node unit/source-assert tests | Repo standard; ~90s full suite |
| @playwright/test | 1.63.0 (installed, exact-pinned devDep) | e2e, 4 projects | Renovate-managed single sanctioned devDependency |
| react-router-dom | ^7.18.1 | Classic routes — FROZEN (`router.tsx`) | No new routes (D-12) |

### Supporting (in-repo, read-only consumption)
| Asset | Location | Purpose | When to Use |
|---------|----------|---------|-------------|
| BottomSheet | `web/src/components/mobile/BottomSheet.tsx` | PRIM-01; tone union `"default" \| "fail" \| "warn"`, `fullHeight`, `footer` [VERIFIED: BottomSheet.tsx:75-108] | Any full-screen mobile step surface |
| ConfirmSheet | `web/src/components/mobile/ConfirmSheet.tsx` | Destructive confirm below md; destructive on top, safe cancel last, no autoFocus [VERIFIED: ConfirmSheet.tsx:30-46] | Every overwrite-consequence confirmation (automatic via `useConfirm`) |
| RunDetailSheet | `web/src/components/mobile/RunDetailSheet.tsx` | Live progress + LogList + verify row + tonal restore entry | D-04's reuse candidate for progress/log presentation |
| StickyActionBar | `web/src/components/mobile/StickyActionBar.tsx` | Sticky-in-flow action bar (never `position:fixed`) | Step-level primary/secondary action rows outside sheets |
| StepCard / StepState | `web/src/components/recovery/StepCard.tsx` | Desktop step vocabulary; `StepState = "idle" \| "ok" \| "warn" \| "bad"` [VERIFIED: StepCard.tsx:4] | Shared step state between the two halves |
| useMediaQuery | `web/src/lib/useMediaQuery.ts` | `DESKTOP_QUERY = "(min-width: 48rem)"` (:42), `POINTER_COARSE_QUERY = "(pointer: coarse)"` (:92) — the only width literals [VERIFIED] | `!isDesktop` gate; never a second literal (D-09) |
| useBackupWatch / fireAndWaitRun | `web/src/lib/backupWatch.ts` | Restore fire-and-watch + sequential bulk loop | The mobile restore step fires restores |
| RestoreProgress | `web/src/components/restore/RestoreProgress.tsx` | Inline restore banner (progress bar, cancel, sticky outcome) | Per-target progress inside the mobile flow |
| mobileShellSource guard | `web/src/app/mobileShellSource.test.ts` | Source-assert safety net (FOUC bytes, safe areas, spacing/weight sweep) | Extend the sweep list with phase-8 files |

**Installation:**
```bash
# NONE. D-12: zero npm installs. All versions above verified installed:
# @playwright/test 1.63.0, vitest ^4.1.10, react ^19.2.7, tailwindcss ^4.3.3 (web/package.json)
```

## Package Legitimacy Audit

> D-12 locks **zero npm installs** for this phase. The legitimacy gate protocol was evaluated against the phase's package list and returns an empty audit set — there is nothing to install, hence nothing to check. `npm view` calls are correspondingly not applicable.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none — no new packages) | — | — | — | — | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 Phone (SPA below 48rem)                         Go binary (unchanged, frozen)
 ┌──────────────────────────────┐                ┌─────────────────────────────────┐
 │ Recovery.tsx (ONE component) │                │ internal/api handlers           │
 │  ┌────────────────────────┐  │                │  POST /api/containers/{n}/restore│
 │  │ desktop stepper        │  │                │  POST /api/vms/{name}/restore   │
 │  │ (max-md:hidden,        │  │   same fetch   │  POST /api/config/restore       │
 │  │  byte-identical DOM)   │──┼───────────────►│  POST /api/files/sets/{id}/restore│
 │  └────────────────────────┘  │                │  POST /api/check/{domain}       │
 │  ┌────────────────────────┐  │                │  POST /api/verify/{domain}      │
 │  │ mobile step flow       │──┼───────────────►│  GET  /api/progress (SSE)       │
 │  │ (!isDesktop):          │  │                │  listRuns / discover / settings │
 │  │ 1 preflight summary    │  │                └───────────────┬─────────────────┘
 │  │ 2 confirm overwrite    │  │                                │
 │  │   (useConfirm →        │  │                    internal/backup guard chain
 │  │    ConfirmSheet)       │  │                    Confirmed==true → snapshot-id
 │  │ 3 optional verify      │  │                    regex → wrong-target re-check →
 │  │   (checkDomain/        │  │                    stop → remove → restic restore
 │  │    runDrill)           │  │                    (UNCHANGED — narrated in UI)
 │  │ 4 live progress + log  │  │
 │  │   (progress SSE read-  │  │
 │  │    only + LogList)     │  │
 │  │ 5 completion           │  │
 │  └────────────────────────┘  │
 └──────────────────────────────┘
        │
        ▼  (after automated plans land — D-11 human pause)
 Real devices: notched iPhone Safari / SE-class iPhone Safari / Android Chrome
 portrait + landscape, one guided restore exercised on device
```

### Recommended Project Structure
```
web/src/
├── pages/
│   └── Recovery.tsx            # both halves; desktop JSX under max-md:hidden, mobile flow behind !isDesktop
├── components/
│   ├── recovery/StepCard.tsx   # existing desktop step vocabulary (shared StepState)
│   ├── restore/                # RestoreAction / RestoreProgress (read-only reuse)
│   └── mobile/                 # BottomSheet, ConfirmSheet, RunDetailSheet, StickyActionBar (reuse)
├── lib/
│   ├── i18n.ts + locales/      # 42 tables; new keys pre-seeded in ONE commit (07-02 pattern)
│   ├── useMediaQuery.ts        # frozen breakpoint authority
│   └── progress.ts / backupWatch.ts  # FROZEN, consumed read-only
├── app/
│   └── mobileShellSource.test.ts  # guard sweep list extended with phase-8 files
└── e2e/
    ├── guided-restore.spec.ts  # NEW — the tracer e2e (UI choreography + API-call parity)
    ├── narrow-viewport.spec.ts # extended: de/fr sweep gains the recovery flow + key screens
    └── desktop-untouched.spec.ts # extended: /recovery mobile-chrome leakage battery
```

### Pattern 1: The D-01 double gate (desktop hidden twin + mobile mount)
**What:** Desktop JSX stays mounted, wrapped in `max-md:hidden`; the mobile block renders behind `{!isDesktop && (...)}`. One file, one component state, two presentations.
**When to use:** The entire Recovery rehost — the established pattern of phases 6-7 (Home, Containers, Files, VMs, Flash, Config, Receiver, Fleet, Settings).
**Example:**
```tsx
// Shape used by every phase 6/7 page; Recovery follows it.
return (
  <div className={PAGE_SHELL}>
    <div className="max-md:hidden">
      {/* ...existing desktop stepper JSX, byte-identical... */}
    </div>
    {!isDesktop && (
      <MobileRecoveryFlow /* shares the same state/handlers */ />
    )}
  </div>
);
```
**Load-bearing details:** jsdom answers desktop (`getSnapshot()` returns true without matchMedia [VERIFIED: useMediaQuery.ts:67-74]), so existing dom tests keep asserting the desktop page; e2e role queries against the hidden desktop half need `{ includeHidden: true }` (destination-settings.spec.ts:202-209 precedent).

### Pattern 2: One `useConfirm`, two presentations (D-03)
**What:** `const { confirm, confirmDialog } = useConfirm()`; `await confirm(message)` renders ConfirmDialog on desktop, the fail-tone ConfirmSheet below md (phase-6 D-07). ConfirmSheet stacks the destructive action on top, the safe cancel at the thumb-default bottom, and focuses nothing destructive [VERIFIED: ConfirmSheet.tsx:30-46].
**When to use:** Every overwrite-consequence confirmation and every destructive/terminal restore control in the mobile flow. The desktop `RestoreRow` already passes `requireConfirm={false}` + `confirmMessage`, which routes the row action through the modal path (RestoreAction.tsx:182-188) — below md that modal is ConfirmSheet automatically.

### Pattern 3: Restore-all as a sequential fireAndWaitRun loop
**What:** The desktop wizard's `restoreAll` fires one restore per target and waits for its newly recorded run to reach a terminal state before the next, so the shared single-flight guard never rejects follow-ups [VERIFIED: Recovery.tsx:1923-1961].
**When to use:** The mobile completion/progress step consumes the same handler — never a parallel loop, never a second fire path.

### Pattern 4: New mobile-visible copy = same-commit 42-table binding
**What:** New i18n keys are pre-seeded across all 42 tables in ONE commit (single-writer, phase-6/7 pattern); `i18n.parity.test.ts` (exact en key set + placeholder parity per locale), `i18n.orphans`, `i18n.quality`, and `i18n.preseed` fence the sweep.
**When to use:** Every new step title, button label, and chain-narration string in the mobile flow. De copy uses the house vocabulary (Bereich / Gesamt-Backup precedent).

### Pattern 5: The 44px invisible bleed (D-06 fix 1 template)
**What:** A control whose visual size is frozen grows its hit area below md with an empty absolutely-positioned `::after`:
```tsx
/* Toggle.tsx:92-105, verbatim classes */
className="relative inline-flex h-5 w-9 shrink-0 ... max-md:after:absolute max-md:after:-inset-3 max-md:after:content-['']"
```
A pseudo-element is part of its originating button, so clicks in the bleed fire the control; desktop (≥48rem) is byte-identical; no visible pixel changes at any width.
**When to use:** Extending the touch floor to the remaining desktop-era controls rendered inside mobile regions (the Settings stacked cards' 32px Buttons are the recorded debt).

### Anti-Patterns to Avoid
- **Collapsing `LsStream`-style seams / bypassing a DI seam:** not directly reachable here, but the same discipline applies client-side — never fork a second tree or a second confirm implementation; the double gate and `useConfirm` ARE the seams.
- **`position:fixed` chrome:** fights the Layout visualViewport keyboard mechanism and needs manual safe-area syncing; sticky-in-flow only (StickyActionBar doctrine).
- **Unlayered author CSS beats layered Tailwind utilities on the same element:** hiding a `glim-btn` desktop trigger via `max-md:hidden` on the SAME element silently loses (07-04 lesson) — hide on a wrapper div instead.
- **A second width literal:** landscape must never grow a height-aware query; `DESKTOP_QUERY` is the only width authority (D-09, user decision 2026-09-11 in STATE.md).
- **Fabricating restore outcomes in e2e:** the harness has no Docker/libvirt; the guided-restore e2e asserts UI choreography and API-call parity with Go-JSON route-layer fixtures, never actual restore results (CONTEXT.md, established pattern).
- **Renumbering the rainbow:** `Recovery.tsx`'s page-flat `hueSeq`/`nextHue()` counter assigns `hueIndex` in JSX evaluation order; the mobile block must use its own counter or call `nextHue()` only AFTER the desktop JSX's calls, or the desktop hue sequence shifts (see Pitfalls).
- **Editing the guard's scoping:** D-06 fix 3 is binding — the spacing/weight sweep stays mobile-regions-only; desktop-half legacy 12px (`Dashboard.tsx:3029,3037`) is not touched.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Destructive confirm below md | A custom mobile confirm dialog | `useConfirm` → ConfirmSheet (automatic) | One promise API, focus-safe (no destructive default focus), already tested (ConfirmSheet.dom.test.tsx) |
| Live progress + log rendering | A second SSE consumer or log style | `useProgress` + RunDetailSheet's LogList / RestoreProgress | progress.ts is frozen; LogList is class-for-class the ActivityLog mono pattern; a second style is the documented anti-pattern |
| Sequential multi-target restore | A parallel/bulk fire loop | `fireAndWaitRun` (backupWatch.ts:392) | The server single-flight guard rejects overlapping ops; the desktop wizard already solves sequencing |
| Narrow-viewport de/fr sweep | A new localized e2e harness | `bootSeededPage` in narrow-viewport.spec.ts (bv-lang seed + display-prefs abort) | Server-look clobbers locale seeds; parallel workers need the abort cut (observed live, 05-06) |
| Source-level mobile discipline | Runtime-only assertions | `mobileShellSource.test.ts` sweep-list extension | Declarations with no rule are invisible; the guard's needle/anti-shrink machinery already exists and D-06 fix 3 scopes it |
| Touch-target growth | Resizing frozen visuals | Toggle's `::after` bleed pattern | "Grow tap areas, never visual size inflation" — design-language rule satisfied literally |
| Restore verify | A new dry-run call | `checkDomain` / `runDrill` (api.ts, frozen) | No dry-run endpoint exists; the verify/drill endpoints are the honest existing surface |

**Key insight:** Every mechanism this phase needs shipped in phases 5-7. The phase's difficulty is composition fidelity (desktop byte-identity + mobile thumb ergonomics on one page) and sweep completeness, not new engineering.

## Common Pitfalls

### Pitfall 1: The hue counter renumbering
**What goes wrong:** `Recovery.tsx` uses a page-flat `let hueSeq = 0; const nextHue = () => hueSeq++;` where JSX evaluation order assigns every StepCard/CloudCard/row its rainbow position [VERIFIED: Recovery.tsx:1973-1985]. Inserting mobile JSX that also calls `nextHue()` mid-file shifts every desktop hue after it.
**Why it happens:** The counter is render-order based by design ("a branch that isn't currently rendering never leaves a gap").
**How to avoid:** Put the mobile block's `nextHue()` calls strictly after all desktop calls in render order, or give the mobile block its own counter; assert the desktop-first-N sequence in a dom test.
**Warning signs:** A desktop screenshot/dom test where step hues change after the mobile block lands.

### Pitfall 2: Hidden-desktop e2e queries silently matching nothing
**What goes wrong:** Under `max-md:hidden` the desktop stepper stays in the DOM; on mobile projects, role queries for desktop controls still match (hidden) unless visibility-scoped; on desktop projects, new mobile chrome must be absent.
**Why it happens:** Playwright's `toBeVisible` respects CSS, but `getByRole` counts do not unless `includeHidden` is used deliberately.
**How to avoid:** Follow destination-settings.spec.ts:202-209 — `includeHidden: true` for the mounted-hidden half; leakage needles (unique class signatures / button names) on desktop projects, per the phase-7 battery.
**Warning signs:** A green assertion that guards nothing (count 0 both sides).

### Pitfall 3: Local Playwright runs wedging on Windows
**What goes wrong:** webServer teardown hang (bombvault.exe survives, kill manually) and orphaned playwright node workers accumulating between runs; piping Playwright output through `tail` hides progress and blocks wedge diagnosis.
**Why it happens:** Documented repo blocker (STATE.md) — Windows process teardown.
**How to avoid:** Manual local webServer + `reuseExistingServer: false` config discipline; never buffer Playwright output; cleanup via `Get-CimInstance Win32_Process` filter when workers pile up. D-10's filtered-spec directive also bounds runtime per task.
**Warning signs:** A run that never finishes after the last test passes.

### Pitfall 4: Stale embedded SPA
**What goes wrong:** `go build` embeds `web/dist`; a stale build ships the old SPA to the device session.
**Why it happens:** The binary embeds `all:dist`; the placeholder index.html is committed but hashed assets are not.
**How to avoid:** `cd web && npm ci && npm run build` before building the binary for the D-11 redeploy; only `BombVault-test` is redeployed (PROD never touched).
**Warning signs:** The device session seeing pre-phase UI.

### Pitfall 5: Landscape "breaks mobile" misread
**What goes wrong:** A notched iPhone in landscape (844px CSS width) renders the desktop chrome and the sweep is judged as a failure.
**Why it happens:** `DESKTOP_QUERY = "(min-width: 48rem)"` is width-only; 844 ≥ 768.
**How to avoid:** D-09 is explicit: each orientation renders correctly under the single authority; landscape e2e re-proofs assert the 740x360-style sub-breakpoint case (mobile-shell.spec.ts "the bar stays bottom-docked in landscape"), and the device-session matrix records the notched-landscape desktop render as CORRECT.
**Warning signs:** A UAT checklist row that expects bottom-nav in notched landscape.

### Pitfall 6: Settings-write races from the wizard
**What goes wrong:** The Recovery wizard PUTs a FULL settings object; a stale mount-time baseline silently rolls back concurrent changes.
**Why it happens:** Documented in connectPreview/restoreOwnConfig — they re-fetch and merge onto the fresh server baseline before every PUT [VERIFIED: Recovery.tsx:1663-1736, 1744-1821].
**How to avoid:** The mobile flow consumes the SAME handlers; never add a code path that PUTs the stale local copy.
**Warning signs:** Any new mobile button that calls `putSettings` directly with `settings` instead of routing through connectPreview/restoreOwnConfig.

### Pitfall 7: restoreConfig reloads the page mid-flow
**What goes wrong:** `restoreOwnConfig` ends in `window.location.reload()` after `waitForAppBack` (auto-restart path) — the mobile step flow restarts at step 1.
**Why it happens:** The staged config restore requires a reload to load restored settings; this is correct behavior.
**How to avoid:** The mobile config step presents the `configPhase` states (`restarting` / `manual` / `reload` / `error`) exactly as Config's mobile restore sheet does (Config.tsx:1196-1226 precedent); do not try to preserve step position across the reload.
**Warning signs:** A mobile step that "loses" the user's progress with no restarting narration.

## Code Examples

### The five SCRN-06 steps mapped to existing calls (the planner's core table)

| SCRN-06 step | Existing surface (all frozen, read-only) | Verified reference |
|--------------|------------------------------------------|--------------------|
| Preflight summary | `checkReadable()` — `discover(true)`/`discoverVMs(true)`/`discoverFiles(true)` probe + `readSources`; `runDiscover()` — `discoverAll()` + `listContainers()/listVMs()/listFileSets()` counts | Recovery.tsx:1610-1649, 1849-1875 |
| Confirmation naming overwrite consequences | `confirm(t("containers.restoreSelectedConfirm"))` for Restore-all; `recovery.restoreRowConfirm` per row (via RestoreAction's `confirmMessage`); guard-chain narration precedent: `config.restoreChain.*` five `<li>` rendered read-only above the confirm | Recovery.tsx:1926; i18n.ts:149-154; Config.tsx:1187-1196 |
| Optional dry-run/verify | `checkDomain(domain)` — `POST /api/check/{domain}`; or `runDrill(domain, source?, kind: "subset" \| "dr")` — `POST /api/verify/{domain}`; RunDetailSheet's footer verify row is the presentation precedent | api.ts:1576-1581, 1594-1609 |
| Live progress with log | `RestoreProgress` (ProgressBar + RestoreCancelButton + sticky outcome) fed by `useBackupWatch`/`useProgress`; RunDetailSheet's `LiveRunSection` (visibility-gated, :205) + `LogList` (:179, buildLogLines, mono timestamps) | RestoreProgress.tsx (display-only banner); RunDetailSheet.tsx:179, 205 |
| Completion | `restoreAllResult {ok, fail}` summary + StepCard ok/warn pill; kit step `downloadRecoveryKit()` | Recovery.tsx:1896, 1957-1968, 2563-2597 |

### Frozen restore API signatures (mobile fires these exact calls)
```ts
// Source: web/src/lib/api.ts:687-698 (verbatim)
export function restore(
  name: string,
  snapshotId: string,
  confirm: boolean,
  source?: string,
  leaveStopped?: boolean
): Promise<OkEnvelope & { started?: boolean }> {
  return fetchJSON(`/api/containers/${encodeURIComponent(name)}/restore${srcParam(source)}`, {
    method: "POST",
    body: JSON.stringify({ snapshotId, confirm, leaveStopped }),
  });
}

// Source: web/src/lib/api.ts:1576-1581 (verbatim)
export function checkDomain(
  domain: "containers" | "vms" | "flash" | "files",
  source?: string
): Promise<OkEnvelope> {
  return fetchJSON(`/api/check/${domain}${srcParam(source)}`, { method: "POST" });
}
```
Note: `confirm: boolean` is the server guard's `Confirmed` — the client always sends `true` and the CLIENT-side confirm gate (checkbox/modal) is what asks the user first; the server independently rejects `Confirmed != true` (`ErrNotConfirmed`, orchestrator.go:654-656).

### Guard-chain narration precedent (Config mobile restore sheet, D-03)
```tsx
// Source: web/src/pages/Config.tsx:1187-1196 — the phase-7 precedent to follow
<p className="text-sm font-semibold text-carbon-text">{t("config.restoreChain.title")}</p>
<ol className="list-decimal space-y-2 ps-5 text-xs leading-relaxed text-carbon-textSub">
  <li>{t("config.restoreChain.step1")}</li>
  <li>{t("config.restoreChain.step2")}</li>
  <li>{t("config.restoreChain.step3")}</li>
  <li>{t("config.restoreChain.step4")}</li>
  <li>{t("config.restoreChain.step5")}</li>
</ol>
```
en values verbatim [VERIFIED: web/src/lib/i18n.ts:149-154]: step1 "Your current settings choice is saved first." / step2 "The latest config snapshot is restored from the repository." / step3 "If the APP_KEY does not match the snapshot, you are asked before anything else happens." / step4 "The restored configuration is checked against the live system." / step5 "Enabled apps and services are restarted and the page reloads. With auto-restart off, you restart them yourself."

### Server guard chain (narrated, unchanged)
```
// Source: internal/backup/orchestrator.go:644-649 (verbatim doc comment)
// RestoreContainer orchestrates a container restore:
//
//	guard Confirmed==true → validate snapshot id
//	→ recordRunStart
//	→ InspectName live re-check (abort on name mismatch, wrong-target guard)
//	→ pull → stop (ignore absent) → remove (ignore absent)
//	→ restic restore --target "/" → write template → CreateAndStart
//	→ recordRunFinish(success|failed)
```
(A restored per-appdata-subtree since SEC-102; a user cancel records `"cancelled"`, distinct from `"failed"` — restoreOutcome, orchestrator.go:693-698.)

### Playwright harness (already boots the real binary; 4 projects)
```ts
// Source: web/playwright.config.ts:91-113 (verbatim project list)
projects: [
  { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
  { name: "desktop-768",  use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 900 } } },
  { name: "mobile-iphone", use: devices["iPhone 13"] },                    // WebKit, 390x844
  { name: "mobile-android", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } } },
]
```
Fresh-DB wipe runs as the webServer pre-command; `reuseExistingServer: false`; auth disabled on a fresh DB; the guided-restore e2e stages the Recovery domains at the route layer with Go-JSON field-for-field fixtures (destination-vms-flash.spec.ts:55-165 `vmPayload`/`settingsBody` is the template).

### Narrow-viewport sweep extension points (VERIFY-03)
- Locale seeding: `bv-lang` localStorage key + `page.route("**/api/display-prefs*", (route) => route.abort())` before first page script [VERIFIED: narrow-viewport.spec.ts:45-72].
- Current coverage: `{de, fr} x {320px, 360px}` bar/sheet single-line + no-overflow (:74-79); route battery "never pans and clips nothing" (:541); Files editor header carried fix (:557); Dashboard log block (:586). The de/fr sweep gains the recovery flow + key screens by extending these loops.

### The 48rem landscape math (D-09, derivable from verified values)
- `DESKTOP_QUERY = "(min-width: 48rem)"` = 768px [VERIFIED: useMediaQuery.ts:42].
- SE-class landscape: 667px wide < 768 → mobile chrome (correct).
- Notched iPhone 13-class landscape: 844px wide ≥ 768 → desktop chrome (correct under the single authority; D-09 says record it as correct, not fix it).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `hover:` fired on touch tap | v4 compiles `hover:` behind `@media (hover: hover)` | Tailwind v4 | VERIFY-04's "hover affordances need a non-hover path" holds by framework default; `not-hover:` variant exists for inverse needs [VERIFIED: Context7 /tailwindlabs/tailwindcss.com] |
| WCAG target size guidance informal | 2.5.8 Target Size Minimum (24x24, AA) + 2.5.5 Enhanced (AAA) normative | WCAG 2.2 (2022) | The repo's 44px floor exceeds AA and matches the AAA/HIG convention; audits should cite 2.5.5/HIG, not 2.5.8, for the 44px number [CITED: w3.org] |
| Playwright WebKit ≈ Safari assumption | Playwright WebKit is a patched build; "closest-to-Safari experience ... run WebKit on mac"; no documented real-device fidelity | current docs | VERIFY-02's real-device pass is not automatable away; keep it a human checkpoint [CITED: playwright.dev/docs/browsers] |

**Deprecated/outdated:**
- Nothing in the phase's stack is deprecated. No new runtime deps; Renovate manages the existing pins.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SE-class iPhone = 375x667 CSS px portrait (SE 2nd/3rd gen); SE 1st gen 320x568. Corroborated by viewportsizer's iPhone 6/7/8 entry (same chassis) but the SE mapping itself is training knowledge [ASSUMED] | VERIFY-02 device matrix / Pitfall 5 | Low — affects UAT matrix documentation only; the 320px harness width already covers the narrowest case |
| A2 | Notched-iPhone safe-area inset magnitudes (~47-59px top, 34px bottom home indicator). Behavior contract (env() pairs with viewport-fit=cover, inset-clamped sheet sides) is in-repo verified; the px magnitudes are not [ASSUMED] | D-11 device session prep | Low — insets are consumed via CSS custom properties, never hard-coded; wrong magnitudes change nothing in code |
| A3 | The guided-restore e2e can stage discover/settings/restore/runs routes at the Playwright route layer with acceptable fixture effort. The pattern is proven for VMs/flash/settings/runs domains; Recovery-specific discover staging is untried [ASSUMED] | Validation Architecture / Code Examples | Medium — executor may need more fixture work than a typical destination spec; choreography-over-outcomes assertion style mitigates |
| A4 | Recommendation that the mobile block uses its own hue counter (or strictly-later nextHue calls) — the renumbering mechanism is code-verified, the fix is this research's recommendation, not a shipped pattern [ASSUMED] | Pitfall 1 | Low — a dom test assertion catches it immediately if ignored |

## Open Questions

1. **Does the mobile flow include the ForeignRestoreCard ("restore from ANOTHER BombVault repo", Recovery.tsx:2599-2601)?**
   - What we know: it is part of the Recovery page but is a separate read-only-session card, not a numbered wizard step; D-02 says the mobile flow is 1:1 with "the desktop Recovery stepper's existing path" (the numbered steps); the SCRN-06/VERIFY-02 criteria never name foreign restore.
   - What's unclear: whether it gets a mobile block now, stays desktop-only, or is folded into the step flow.
   - Recommendation: planner's call in discretion; minimum viable treatment is an explicit decision recorded in the plan (if left desktop-only, its card must live outside the `max-md:hidden` desktop wrapper or be deliberately absent on mobile).

2. **What does RunDetailSheet's restore entry do once SCRN-06 ships?**
   - What we know: today it reveals the snapshot file tree with a "the full guided restore is SCRN-06 / Phase 8" note [VERIFIED: RunDetailSheet.tsx:561-574]; D-04 names RunDetailSheet the progress/log reuse candidate.
   - What's unclear: deep-link from that entry into the guided flow (e.g. prefill target + navigate to /recovery) vs keeping reveal-only.
   - Recommendation: cheapest honest option — leave the entry as-is unless the planner wants the deep-link; either way the note text becomes stale and should be updated in the same commit.

3. **Verify step content: `checkDomain` (repo integrity) vs `runDrill` kind="subset" (read-data-subset)?**
   - What we know: both exist and are frozen; RunDetailSheet's verify row uses `checkDomain` with IntegrityCard vocabulary; `runDrill` records drill results and takes longer.
   - What's unclear: which one SCRN-06's "optional dry-run/verify" means.
   - Recommendation: follow RunDetailSheet's precedent (`checkDomain`) for the in-flow optional step; `runDrill` remains the Settings/Integrity drill surface. D-02's "no new API surface" is satisfied either way.

4. **Where does the UAT protocol artifact live?**
   - What we know: D-11 leaves placement to discretion; phase 7's manual-only rows already name phase 8 as the venue (07-VALIDATION.md).
   - Recommendation: a `08-UAT.md` next to the phase artifacts (same convention as 07-UI-REVIEW.md), checklist inheriting WR-01, WR-02, UI-review fix 1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | vitest, Playwright, web build | Yes | v24.16.0 | — |
| npm | web deps install | Yes | 11.13.0 | — |
| Go | compiling the bombvault binary for the Playwright webServer + embedded SPA | Yes | 1.25.0 (floor per go.mod; CI/Docker on 1.26) | — |
| Playwright browsers (chromium + webkit) | 4-project e2e | Yes | webkit-2359 present; pw 1.63.0 | — |
| vitest | dom/source-assert/unit gates | Yes | ^4.1.10 | — |
| restic >= 0.17 on PATH | `go test ./...` only (phase gate; web-only tasks do not need it) | No (not on PATH locally) | — | CI installs 0.17.3; orchestrator runs the tail gate |
| just | `just check` Go chain | No (not found locally) | — | Run the Go commands individually; not needed for web-only tasks |
| Real devices (notched iPhone, SE-class iPhone, Android) | VERIFY-02 | Not on this machine, by design | — | This IS the D-11 human checkpoint — not automatable |

**Missing dependencies with no fallback:** none blocking — restic/just gaps affect only the Go test chain, which this presentation-only phase does not extend (`internal/**` frozen).
**Missing dependencies with fallback:** restic (CI-provided at the tail gate), just (individual commands).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 (node + jsdom dom tests) + @playwright/test 1.63.0 (4 projects: desktop-1280, desktop-768, mobile-iphone, mobile-android) |
| Config file | `web/vitest.config.ts` / `web/playwright.config.ts` |
| Quick run command | `cd web && npx vitest run --reporter=dot` (~90s) |
| Full suite command | `cd web && npx vitest run` + filtered `npx playwright test <spec>` per D-10 (full Playwright suite ONCE at the phase tail gate, orchestrator-run) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRN-06 | Mobile guided restore choreography: steps, ConfirmSheet confirm, verify row, progress/log, completion; desktop DOM byte-identical | dom (jsdom) + e2e (staged route layer, choreography + API-call parity) | `cd web && npx vitest run src/pages/<recovery-dom-test>.tsx` + `npx playwright test e2e/guided-restore.spec.ts` + `npx playwright test e2e/desktop-untouched.spec.ts` | dom file ❌ Wave 0; e2e spec ❌ Wave 0 |
| VERIFY-03 | Every new string via `t()` with 42-table parity; de/fr 320-360px pass on shell + key screens | unit (vitest i18n quartet) + e2e | `cd web && npx vitest run src/lib/i18n.parity.test.ts src/lib/i18n.preseed.test.ts src/lib/i18n.orphans.test.ts src/lib/i18n.quality.test.ts` + `npx playwright test e2e/narrow-viewport.spec.ts` | ✅ (spec extended, not created) |
| VERIFY-04 | ≥44px controls below md (Settings stacked-card controls fixed via bleed pattern); non-hover paths | dom + source-assert + e2e backstop | `cd web && npx vitest run src/app/mobileShellSource.test.ts` + `npx playwright test e2e/destination-settings.spec.ts` (+ new touch-target assertions) | ✅ (extensions Wave 0-adjacent) |
| VERIFY-05 | Semantic tokens only in mobile regions; four-status by text; both themes on mobile | source-assert (token sweep) + manual on device | `cd web && npx vitest run src/app/mobileShellSource.test.ts` (+ theme dom tests); theme feel = device session | ✅ (sweep list extension) |
| VERIFY-02 | Real-device pass: notched iPhone / SE-class iPhone / Android Chrome, portrait + landscape, one guided restore on device | manual-only | Manual — D-11 UAT artifact; justification: no real hardware in the harness, and Playwright documents no emulation fidelity for real Safari [CITED: playwright.dev/docs/browsers] | Manual |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter=dot` (full vitest is fast) + the D-10 filtered Playwright spec(s) the task touched
- **Per wave merge:** full vitest + the wave's touched e2e specs (filtered)
- **Phase gate:** full vitest green + orchestrator-run full Playwright suite once, then `cd web && npm ci && npm run build` + binary rebuild for the D-11 device session

### Wave 0 Gaps
- [ ] `web/e2e/guided-restore.spec.ts` — covers SCRN-06 choreography + API-call parity (the natural tracer slice)
- [ ] Recovery mobile/dom test file (e.g. `Recovery.mobile.dom.test.tsx`) — covers the mobile block's step state machine with the jsdom desktop-default stub
- [ ] i18n pre-seed commit for all new `recovery.*`/flow keys across the 42 tables in ONE commit (07-02 pattern) before consumer plans land
- [ ] `mobileShellSource.test.ts` sweep-list extension with the new wholly-phase-8 files (guard rots loudly by design)

## Security Domain

### Applicable ASVS Categories (level 1, `security_enforcement: true`)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No new surface | Existing session/auth untouched; fresh-harness DB ships auth disabled (test-only posture) |
| V3 Session Management | No new surface | Server-owned; SPA consumes |
| V4 Access Control | No new surface | Server guard chain + settings gates unchanged (`internal/**` frozen) |
| V5 Input Validation | Consumed only | Boundary validation unchanged server-side (`Confirmed` guard, snapshot-id regex `ErrInvalidSnapshotID`, `nameParam`); mobile flow sends identical bodies to existing endpoints — no new client-side validation to write, none to bypass |
| V6 Cryptography | No | No crypto in a presentation phase; APP_KEY unlock flow untouched; D-05 keeps the write-only secrets contract (blank-keeps, Clear-only-removes) |
| V1 Destructive-action safety (house discipline) | Yes | Every destructive/terminal control rides `useConfirm` → ConfirmSheet below md: consequence-naming message, outcome-naming button, destructive never default-focused [VERIFIED: ConfirmSheet.tsx:30-46] |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental destructive restore overwrite (fat-tap on a phone) | Tampering | Server `Confirmed` guard + wrong-target re-check (unchanged) + client ConfirmSheet with destructive control off the thumb-default path (D-03) |
| Hover-only affordance hiding a destructive action on touch | Tampering/Elevation of UX confusion | Tailwind v4 `hover:` behind `(hover: hover)`; TapPopover non-hover path (PRIM-02) |
| Error text leaking paths/credentials into the mobile UI | Information Disclosure | Backend errors arrive pre-scrubbed (scrubError order: paths→`[path]` then creds→`[redacted]@`); UI shows them verbatim by design — never re-render raw exceptions client-side |
| Secrets in the credentials steps | Information Disclosure | Write-only contract: GET returns "" + `has*` flag; blank on save keeps stored value; RevealInput for reveal-once display (D-05) |
| Status conveyed by color alone (color-blind misread of restore outcome) | Tampering (of perceived state) | Four-status text labels on Badges (WCAG 1.4.1 G14) [CITED: w3.org] |

## Sources

### Primary (HIGH confidence — read this session)
- `web/src/pages/Recovery.tsx` — full desktop stepper: state, handlers, StepCard call sites (:2022, :2095, :2238, :2395, :2431, :2563), restoreAll (:1923-1961), hue counter (:1973-1985), ForeignRestoreCard (:2599-2601)
- `web/src/components/restore/RestoreAction.tsx`, `RestoreProgress.tsx` — shared restore control + banner (cancelledRef contract, requireConfirm/confirmMessage modal path)
- `web/src/components/mobile/` — BottomSheet (:75-108 props/tone union), ConfirmSheet (:30-46 anatomy), RunDetailSheet (:120-135 progressKeyFor, :179 LogList, :205 LiveRunSection, :561-574 restore entry), StickyActionBar (doctrine header)
- `web/src/lib/useMediaQuery.ts` (:42 DESKTOP_QUERY, :92 POINTER_COARSE_QUERY), `useConfirm.tsx`, `progress.ts`/`backupWatch.ts` export surfaces, `pageShell.ts:88`
- `web/src/lib/i18n.ts` (:149-154 config.restoreChain verbatim; :1545-1607 recovery step keys), `i18n.parity.test.ts`, `locales/` (40 files + en/de inline = 42 tables)
- `web/src/app/mobileShellSource.test.ts` (:578-780 the spacing/weight sweep, needles + mixed-file geography + anti-shrink anchors)
- `web/e2e/` — playwright.config.ts (4 projects, fresh-DB wipe, reuseExistingServer:false), narrow-viewport.spec.ts (:45-72 bootSeededPage; :74-79, :541, :557, :586), desktop-untouched.spec.ts (10-route loop + phase-6/7 leakage batteries), destination-vms-flash.spec.ts (:55-165 staging template), destination-settings.spec.ts (:202-209 includeHidden), mobile-shell.spec.ts (landscape bar test)
- `web/src/components/Toggle.tsx` (:92-105 the bleed pattern), `ActivityLog.tsx` (:465 D-06 fix 2 site; :418 desktop twin), `Config.tsx` (:1187-1226 guard-chain <ol> + mobile restore sheet states), `components/recovery/StepCard.tsx` (:4 StepState)
- `internal/api/api.go` (:173-182, :267, :296, :315-316, :325 restore route table), `internal/backup/orchestrator.go` (:644-698 guard chain + outcome mapping)
- Planning corpus: 08-CONTEXT.md, REQUIREMENTS.md, ROADMAP.md §Phase 8, STATE.md, 07-CONTEXT.md, 07-UI-REVIEW.md, 07-VALIDATION.md, 06-CONTEXT.md, 05-CONTEXT.md, 07 deferred-items.md, `.planning/codebase/STRUCTURE.md`

### Secondary (MEDIUM confidence)
- [VERIFIED: Context7 /tailwindlabs/tailwindcss.com] — Tailwind v4 `hover:` compiles inside `@media (hover: hover)`; `not-hover:` variant; official "treat hover as an enhancement" guidance (official docs source, upgrade-guide + hover-focus pages)

### Tertiary (LOW confidence — official pages fetched, seam tier LOW)
- [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html] — SC 1.4.1 (Level A): color not the only visual means; G14 text technique
- [CITED: w3.org/WAI/WCAG22/Understanding/target-size-minimum.html] — SC 2.5.8 (AA, 24x24) + 2.5.5 Enhanced (AAA) reference
- [CITED: playwright.dev/docs/emulation] — device descriptors emulate userAgent/screenSize/viewport/hasTouch/isMobile; no documented real-device fidelity
- [CITED: playwright.dev/docs/browsers] — WebKit is a patched build; "for the closest-to-Safari experience you should run WebKit on mac"
- [CITED: viewportsizer.com/phone-screen-dimensions] — iPhone 5-class 320x568; iPhone 6/7/8-class 375x667; iPhone X-class 375x812 (SE mapping = A1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; every listed version verified installed in `web/package.json` / node_modules this session
- Architecture (SCRN-06 mapping, double gate, reuse surfaces): HIGH — all integration surfaces read in full this session; every discrete value quoted with path:line
- Verification sweep (VERIFY-03..05 mechanisms): HIGH — existing sweep vehicles and guard machinery read in full
- Real-device matrix specifics (viewport px, inset magnitudes): MEDIUM/LOW — behavior contracts in-repo verified; device px magnitudes tagged A1/A2
- Pitfalls: HIGH — every pitfall traces to repo-verified code or a recorded STATE.md blocker

**Research date:** 2026-09-14
**Valid until:** 2026-10-14 (stable: presentation-only milestone, frozen surfaces, zero deps)
