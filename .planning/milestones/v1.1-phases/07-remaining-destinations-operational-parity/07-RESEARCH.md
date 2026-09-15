# Phase 7: Remaining Destinations & Operational Parity - Research

**Researched:** 2026-09-13
**Domain:** Mobile translation of six destination pages (VMs, Flash, Config, Receiver, Fleet, Settings) + schedule/notification/offsite sheet editors + list ergonomics + M3/HIG platform-adaptive chrome — React 19 + Tailwind v4 SPA, presentation-only, zero new runtime deps.
**Confidence:** HIGH (all findings from direct code reads of the working tree this session; design bible read via `git show 0b64c7df`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Implementation Decisions

**Destination pages (MORE-01)**
- **D-01:** Each remaining destination page renders a mobile block below md via the established double gate — desktop content `max-md:hidden`, mobile content rendered behind `!isDesktop` — the Home/Containers precedent from 06-06. Same files, same pages; no second route tree.
- **D-02:** VM/Flash/Config item lists render in the phase 6 card language: block-level item cards carrying status badge + last-run info + off-site indicator, `MobileSectionLabel` grouping, `StickyActionBar` where an editor state exists.
- **D-03:** The Config restore guard chain surfaces readably — chain steps render as an ordered list inside the restore sheet, not collapsed behind a single confirm.
- **D-04:** Fleet peers render as cards (reachable / last contact / protection summary); tapping a peer opens a content-sized detail BottomSheet (viewer, not editor — no `fullHeight`).

**Editors & schedule (FLOW-01, FLOW-02)**
- **D-05:** TimePicker / CadenceBuilder / schedule and notification editors open as `fullHeight` BottomSheets (flag added to the primitive in phase 6) — full-screen editor affordance for complex forms.
- **D-06:** The invoking card always shows the effective schedule preview (next fire time from the shared `/api/schedule/next` derivations extracted in 06-06) so closing the sheet validates the edit without reopening it.
- **D-07:** Notifications and off-site replication settings are editable on mobile (forms in sheets; write-only secrets contract preserved); no desktop-only settings remain — the FLOW-02 contract.

**Settings page (MORE-02)**
- **D-08:** Settings renders as stacked full-width cards below md replacing the desktop tab-card strip; the 7-tab Selector strip becomes horizontally scrollable tonal chips (M3 chip language) above the stacked content.
- **D-09:** Dark mode / language / accent pickers reuse the phase 6 popover primitives (ColorPickerPopover rides TapPopover; language via flag chips); full-form editors open full-screen sheets.

**List ergonomics (LISTS-01)**
- **D-10:** Long lists (runs, containers, sets, logs) get a sticky-in-flow search field + filter chips row above the list; filter chips reuse FilterPopover / TapPopover. "Sticky" means sticky-in-flow within the page, never `fixed` (phase 5/6 standing contract).
- **D-11:** Load-more pagination with a constant visible threshold per list — never infinite scroll (Out of Scope); rows ≥ 44px touch targets throughout.

**Platform-adaptive chrome (PLAT-01)**
- **D-12:** Platform detection extends the phase 6 media-hook pattern (`useIsCoarsePointer`, `(pointer: coarse)`) — chrome translation only, one IA, no duplicated page components. Mechanism: a `data-platform` attribute on the app root (`material` / `cupertino`) with CSS custom-property variants. M3 language: navpill bar (BottomNav already ships the pill treatment), **FAB for the primary action** — this is where the FAB lands, deliberately deferred from phase 6 D-06 — tonal chips. HIG: large titles, circular checks. `DESKTOP_QUERY` in `useMediaQuery.ts` stays the ONLY width authority; the pointer axis remains the second, independent media axis.

### Claude's Discretion
- Exact card composition and section order per destination page — follow each desktop page's existing information hierarchy translated into card form.
- Exact i18n key naming following the existing `domain.key` conventions; de copy uses the house vocabulary (Bereich/Gesamt-Backup precedent).
- Which destination anchors the tracer plan — planner's call.
- Ingestion of the phase 6 UI-review advisory fixes (stat-triad typography, 12px→8/16 spacing sweep, `home.newBackupConfirm` verbatim, chevron aria-label with path, Files editor header `flex-wrap`): recommended to fold into this phase's plans since they touch the same files the new pages extend; planner decides placement and scope.

### Deferred Ideas (OUT OF SCOPE)
- SCRN-05 per-file stats triade — recorded v2 data candidate (frozen-API substitutes shipped in phase 6); not this phase.
- Drag-to-reorder, infinite scroll, hamburger menu, 5th accent hue — REQUIREMENTS.md Out of Scope at milestone level.
- Guided restore step flow (SCRN-06), real-device validation (VERIFY-02..05) — Phase 8.
- `/gsd-map-codebase` refresh — structural drift since 2026-09-09 remains unmapped (STATE.md concern); out of phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MORE-01 | VMs, Flash, Config, Receiver, Fleet in the mobile card language: item cards with status + last run + offsite state, trigger + schedule entry points; Config surfaces the restore guard chain readably; Fleet peer cards (reachable, last contact, protection summary) | Per-page render inventories with file:line (Architecture Patterns); card-language precedent in Dashboard.tsx mobile block; restore chain located at Recovery.tsx `restoreOwnConfig`; FleetPeer/ReceivedRepoStatus field lists verified in api.ts |
| MORE-02 | Settings: stacked setting cards; editors as full-screen sheets; dark mode / language / accent work as today; 7-tab Selector strip gets a mobile treatment | Settings.tsx structure mapped (TabKey union, TAB_ORDER, Selector strip, queueSettingsWrite chain, tab cards incl. ThemeCard/LanguageCard/NotifyCard); D-08/D-09 mechanisms identified |
| FLOW-01 | Schedule editing parity: TimePicker / CadenceBuilder open as full-screen sheets with large targets; effective-schedule preview stays visible on the invoking card | CadenceBuilder renders INLINE (not modal) — sheet wrapper is new; TimePicker popover rides inside it; EffectiveScheduleLine + 06-06 shared derivations (`nextBackupFireAt`) already exist for previews |
| FLOW-02 | Notification + off-site replication configuration parity: editable on mobile via the sheet-editor pattern (no desktop-only settings) | NotifyCard is self-contained (getNotify/setNotify/testNotify, emptyNotify literal); OffsiteTargetsSection is a stateless CRUD section; OffsiteWizard located in Settings.tsx; write-only secrets contract documented |
| LISTS-01 | Sticky search + filter chips above long lists (runs, containers, sets, logs) with load-more pagination (never infinite scroll); rows ≥ 44px | Baseline verified: NO pagination exists anywhere; `listRuns()` takes no params (api.ts frozen → client-side paging only); VMs already has search + persisted chips + FilterPopover; ActivityLog has `filterLogLines`; Flash rows already 44px (py-1.5 min-h pattern) |
| PLAT-01 | Android M3 expression (navpill bar, FAB, tonal chips) and iOS HIG expression (large title, circular checks) from the same codebase — same IA, translated chrome | `data-platform` mechanism follows verified index.css precedents (`data-theme` custom variant line 3, `:root[data-shape]` 603-609, `[data-motion]` 521-562) and lib/shape.ts + lib/motion.ts application pattern; design bible FAB/navpill/chip/selcheck specs extracted from maquettes; zero existing platform-detection code (grep clean) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted directives binding this phase (full text in `D:\code\bombvault\CLAUDE.md` and `D:\code\bombvault\.claude\CLAUDE.md`):

- **Stack discipline:** no UI kit, no state library, no CSS-in-JS; Tailwind utility classes on semantic tokens from `web/src/index.css` — never raw hex or hard-coded radii on controls; shared controls carry `glim-*` engine classes.
- **Frozen files this phase:** `web/src/app/router.tsx` (no new routes), `web/src/lib/api.ts` (no API changes), `web/src/lib/progress.ts`, `internal/**` (no backend changes).
- **Every user-visible string through `t()`** from `useT()` (lint-enforced); **em dashes banned** in user text (lint-enforced, non-configurable); backend error text shown verbatim.
- **Typography weights 400/600 only in new code; spacing 8/16 stops only** (`gap-2`/`gap-4`, `px-2`/`px-4`) — the phase 6 review findings are standing enforcement.
- **Status colors belong on Badges/chips, never on interactive controls**; page roots use `PAGE_SHELL` constants (`web/src/lib/pageShell.ts`).
- **Web build required after any `web/` change:** `cd web && npm run build` (tsc --noEmit && vite build; `web/dist` committed) since the binary embeds the SPA.
- **Lint:** 8 `bombvault/*` house rules incl. one-badge-size, icon badges need tooltips, pages use PAGE_SHELL; when a rule blocks legitimate work, declare an exception in `web/eslint.config.js`, never a disable comment.
- **Async jobs:** POSTs return `{ok:true,started:true}`; outcomes NEVER read from the POST response — use `useBackupWatch` correlating by baseline run ids, never client clock.
- **Secrets in forms: write-only contract** — GET returns `""` + `*Set` flag; blank on save keeps stored value; Clear flag removes.
- **Comments are load-bearing "why" documents** — every non-obvious choice carries a paragraph citing issue numbers and rejected alternatives; exceptions are written down at the site (model: `pageShell.ts`).
- **Relative imports** (`../lib/api`), named exports everywhere except locale modules and `Recovery.tsx`.
- **GSD workflow enforcement:** this research is produced inside `/gsd-plan-phase`; no direct repo edits outside the workflow.

## Summary

Phase 7 is the mobile translation of the six destination pages that phases 5–6 deliberately left desktop-only, plus the operational editors (schedule, notifications, off-site replication) and the platform-adaptive chrome layer. The codebase evidence is unambiguous about the shape of the work: **none of the six pages has any mobile gating today** (grep-verified: no `max-md:hidden` and no `useIsDesktop` in Vms.tsx, Flash.tsx, Config.tsx, Receiver.tsx, Fleet.tsx, Settings.tsx), so every mobile block is new code composed from the primitives phases 5–6 already shipped — BottomSheet (with `fullHeight`/`footer`/`tone`), StickyActionBar, TapPopover, ConfirmSheet, MobileSectionLabel, and the Dashboard double-gate pattern at `Dashboard.tsx:2100-2374` as the working template. Desktop above 48rem stays byte-identical because the double gate removes mobile DOM from the desktop render (`max-md:hidden`) and desktop DOM from the mobile render (`!isDesktop`).

Three findings most affect planning. **First, the two "dialog" pages are not sheet-compatible as written:** ReceiverDialog and FleetDialog are desktop `createPortal` centered modals (`fixed inset-0 z-50`), so mobile needs re-hosted fullHeight BottomSheet editors containing the same fields (Receiver: name/repo/APP_KEY with RevealInput + regex/deadManHours/checkCadence/readDataPercent/enabled; Fleet: name/url/token/enabled). CadenceBuilder renders INLINE inside Settings sections (not a modal), so FLOW-01's "opens as full-screen sheet" means wrapping the existing component in a fullHeight sheet on mobile — the component itself needs no fork. **Second, LISTS-01 is client-side only:** `listRuns()` takes no parameters and `api.ts` is frozen, so load-more must slice already-fetched arrays behind a constant threshold (the D-11 contract conveniently forbids the server round-trip design); ActivityLog's `filterLogLines` and VMs' persisted filter chips are the existing filter mechanics to reuse, not re-derive. **Third, PLAT-01 has a verified, sanctioned mechanism waiting:** `index.css` already drives three root attributes (`data-theme` via `@custom-variant` at line 3, `:root[data-shape=...]` at 603-609, `[data-motion=...]` at 521-562) and `lib/shape.ts`/`lib/motion.ts` show the set-attribute-on-html + localStorage pattern; a `lib/platform.ts` doing the same for `data-platform="material|cupertino"` touches no frozen file and no existing page.

The plan-relevant risks are concentrated in four places: (1) the FAB — the design bible's `.fab` is `position:absolute` against a fixed-height maquette frame, which collides with the repo's in-flow-only discipline; D-12's own wording ("or record why the sticky block stays") sanctions resolving this per-surface with a written rationale. (2) Settings' serialized write chain — mobile editors MUST ride `queueSettingsWrite` + the `savedBaseline` ref (full-object PUT correctness); a mobile sheet that fires its own `putSettings(fullObject)` from stale state silently reverts concurrent desktop edits. (3) The 42-table i18n same-commit rule — every new `t()` key must be bound in en+de+40 locale modules in the same commit or the parity/orphan tests fail the gate. (4) Desktop identity — the `desktop-untouched.spec.ts` battery currently covers only MAQUETTE_ROUTES; extending it to the six pages is the cheapest guard against the phase's one hard regression class.

**Primary recommendation:** Seven plans in dependency order — (1) platform chrome layer (`data-platform` + FAB + tonal chips + large-title), (2) VMs + Flash, (3) Config + Receiver, (4) Fleet, (5) Settings + schedule/notification/offsite sheets, (6) list ergonomics (sticky search/chips + load-more across all lists), (7) e2e/i18n sweeps + remaining UI-review absorption + full gate.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mobile card blocks (5 destinations) | Browser/Client (SPA pages) | — | Presentation-only translation of already-fetched data; no API change permitted (api.ts frozen) |
| Sheet editors (schedule/notify/offsite/receiver/fleet) | Browser/Client (SPA components) | — | Same forms, new host surface; writes go through existing `putSettings`/`setNotify`/offsite-target API fns unchanged |
| Config restore guard-chain display | Browser/Client (Config page + sheet copy) | — | The chain itself is server-side and frozen; the phase only renders its steps readably (D-03) |
| Effective schedule preview | Browser/Client (shared derivations) | API (frozen `/api/schedule/next`) | Server computes `ScheduleNext`; 06-06 derivations (`nextBackupFireAt`) format it; mobile cards consume both |
| List search/filter/load-more | Browser/Client (SPA) | — | Client-side by constraint: `listRuns()` takes no params; filters already client-side (`filterLogLines`, VM chips) |
| Platform detection (`data-platform`) | Browser/Client (lib + index.css) | — | Root-attribute + CSS custom-property variants; extends verified `data-shape`/`data-motion` pattern; no UA sniffing |
| FAB / navpill / tonal chips / large title | Browser/Client (CSS variants on existing components) | — | "Chrome translation only, one IA" (D-12) — BottomNav already ships the pill; FAB is a new small component styled per platform |
| Secrets entry (notify/offsite/receiver/fleet forms) | Browser/Client (write-only contract) | API (unchanged) | GET never returns secrets; mobile sheets preserve blank-keeps/Clear-removes semantics |

## Standard Stack

### Core (all already installed — zero new runtime dependencies, per CONTEXT.md)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-dom | ^19.2.7 | UI | Locked stack |
| react-router-dom | ^7.18.1 | Routing (classic API only) | `router.tsx` frozen — no new routes |
| tailwindcss | ^4.3.3 | Styling on semantic tokens | `data-*` root-attribute variants are the sanctioned extension mechanism |
| typescript | ^7.0.2 (tsgo) | Type safety; `strict` + noUnusedLocals | Locked stack |
| vitest + @testing-library/react + jsdom | ^4.1.10 / ^16.3.2 / ^30.0.1 | dom/unit tests (`.test.ts` / `.dom.test.tsx`) | Existing suite incl. mobileShellSource.test.ts source-assert guards |
| @playwright/test | 1.63.0 | e2e: 4 projects (desktop-1280, mobile, de/fr narrow) | Existing harness with fresh-DB wipe-then-boot webServer |

### Supporting (in-repo primitives this phase composes — do not rebuild)

| Asset | Location | Purpose | When to Use |
|---------|---------|---------|-------------|
| BottomSheet (`fullHeight?`, `footer?`, `tone?: "default"\|"fail"\|"warn"`) | `web/src/components/mobile/BottomSheet.tsx` | All editor/detail sheets | D-05 editors → `fullHeight`; D-04 Fleet detail → content-sized (no flag) |
| StickyActionBar | `web/src/components/mobile/StickyActionBar.tsx` | Pinned save/cancel row | Any mobile editor state; must be direct child of the page column |
| TapPopover | `web/src/components/mobile/TapPopover.tsx` | Anchored tap popovers | InfoBubble/chip popovers on touch; ColorPickerPopover rides it (D-09) |
| ConfirmSheet (via `useConfirm`) | `web/src/components/mobile/` | Destructive confirms | Every delete/clear — zero per-call-site changes (phase 6 branched the portal already) |
| RunDetailSheet | `web/src/components/mobile/RunDetailSheet.tsx` | Run detail viewer | Reuse candidate for destination run history lines |
| MobileSectionLabel | `Dashboard.tsx` (mobile block) | Card grouping label | Every mobile block's section headers |
| `useIsDesktop` / `useIsCoarsePointer` | `web/src/lib/useMediaQuery.ts` | The two media axes | Double gate (`!isDesktop`) + pointer axis (never for page gating) |
| `useBackupWatch` (+ `onRun`) | `web/src/lib/backupWatch.ts` | Async run correlation | VM/Flash/Config trigger buttons (FlashBackupButton pattern already does this) |
| `nextBackupFireAt` / `worstRpoStatus` derivations | 06-06 shared derivations | Effective previews | D-06 preview line on every invoking card |
| `filterLogLines` | `web/src/lib/activityLog.ts` | Log filtering | LISTS-01 log chips — reuse, don't re-derive |
| `pageShell.ts` constants | `web/src/lib/pageShell.ts` | Page roots | PAGE_SHELL_RESPONSIVE for pages converted (Containers/Files/Dashboard precedent); Settings keeps PAGE_SHELL_TABBED |

**Installation:** None. `web/package.json` verified this session — runtime deps are exactly `flag-icons`, `qrcode-generator`, `react`, `react-dom`, `react-router-dom`; adding anything violates the CONTEXT.md freeze.

**Version verification:** No new packages ⇒ no registry checks required. Existing versions read from `web/package.json` this session (quoted in Sources).

## Package Legitimacy Audit

No external packages are installed by this phase (zero-new-runtime-deps is a locked decision, and all composing primitives are in-repo).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none — no installs) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
                        ┌────────────────────────────────────────────────┐
                        │                 <html data-platform>           │
                        │   lib/platform.ts  (material | cupertino)      │
                        │   index.css custom-property variants           │
                        │   ⇒ FAB shape · tonal chips · large title ·    │
                        │     circular checks (chrome only, one IA)      │
                        └───────────────────────┬────────────────────────┘
                                                │ styles
  Route entry (router.tsx FROZEN — existing 10 routes)
        │
        ▼
  Layout (Sidebar ≥48rem · BottomNav + MoreSheet <48rem — phase 5, unchanged)
        │
        ▼
  Page component (same file, both renders)          ┌─ media axes ─────────────┐
        │                                            │ useIsDesktop  (width)    │
        ├── desktop JSX  class="max-md:hidden" ◄─────│ useIsCoarse (pointer)    │
        └── mobile JSX   rendered if !isDesktop      │ width = page gating ONLY │
                                                     └──────────────────────────┘
  Mobile page column (PAGE_SHELL_RESPONSIVE rhythm)
        │
        ├─ header / large title (HIG variant via data-platform)
        ├─ sticky-in-flow search + filter chips (LISTS-01; TapPopover/FilterPopover)
        ├─ item cards (status Badge + last-run + offsite indicator + MobileSectionLabel)
        │     ├─ trigger button → BackupButton semantics → useBackupWatch → RunDetailSheet
        │     ├─ schedule row → fullHeight BottomSheet ──► CadenceBuilder/TimePicker (INLINE
        │     │                                            components wrapped, not forked)
        │     │        └─ on close: effective preview on card (nextBackupFireAt / EffectiveScheduleLine)
        │     ├─ notify / offsite entry → fullHeight sheets → setNotify / offsite-target fns
        │     │        └─ write-only secrets: blank input + "Set" badge + Clear flag
        │     └─ load-more button (constant threshold; client-side slice; NEVER auto-load)
        └─ StickyActionBar (only where an editor state exists)

  Writes: putSettings via queueSettingsWrite + savedBaseline (Settings.tsx chain)
          setNotify / create+update+deleteOffsiteTarget / create+updateReceivedRepo /
          create+updateFleetPeer — all existing api.ts functions, untouched
```

### Recommended Project Structure

```text
web/src/
├── lib/
│   ├── platform.ts              # NEW: data-platform application (model: shape.ts/motion.ts)
│   └── useMediaQuery.ts         # UNTOUCHED semantics — DESKTOP_QUERY stays the only width literal
├── components/
│   ├── mobile/
│   │   ├── Fab.tsx              # NEW: primary-action FAB, platform-styled via CSS variants
│   │   └── (existing primitives — BottomSheet, StickyActionBar, TapPopover, ...)
│   └── CadenceBuilder.tsx       # UNCHANGED component; mobile hosts it in a fullHeight sheet
├── pages/
│   ├── Vms.tsx / Flash.tsx / Config.tsx / Receiver.tsx / Fleet.tsx / Settings.tsx
│   │                            # each gains a mobile block (double gate) in the SAME file
│   └── settings/                # tab cards mostly reused as stacked cards (D-08)
└── e2e/
    ├── desktop-untouched.spec.ts   # EXTENDED: battery loop covers the six pages
    └── destination-pages.spec.ts   # NEW: staged-fixture mobile scenarios per page
```

### Pattern 1: The double gate (D-01) — the one non-negotiable structural rule

**What:** Desktop JSX keeps rendering always but carries `max-md:hidden`; mobile JSX renders only when `!isDesktop`. Both halves live in the same page component.
**When to use:** Every one of the six pages, exactly as `Dashboard.tsx:2100-2104` (comment), `:2363`, `:2983`, `:3075` and Containers/Files already do.
**Why both halves:** CSS hiding alone would still run desktop effects/polls on mobile; JSX gating alone would leave desktop DOM present-but-invisible, breaking the byte-identity e2e and firing duplicate desktop handlers under touch.
**Example:**

```tsx
// Source: Dashboard.tsx mobile block precedent (06-06)
{/* Mobile (<48rem): stacked cards. Desktop keeps the grid above. Double gate:
    max-md:hidden removes mobile DOM from desktop render; !isDesktop removes
    desktop JSX from mobile render (no hidden desktop polls/effects). */}
<div className="max-md:hidden">{/* existing desktop JSX untouched */}</div>
{!isDesktop && (
  <div className="md:hidden flex flex-col gap-6">{/* mobile cards */}</div>
)}
```

**Verification:** `desktop-untouched.spec.ts` desktop loop asserts desktop markers per route; the mobile project asserts the desktop markers are absent (role/text-first per phase 6 convention).

### Pattern 2: `data-platform` — extend the root-attribute pattern, never UA-sniff

**What:** A small lib module that resolves `material | cupertino` once, writes it on `<html>`, persists to localStorage, and funnels every read through the application function (the `shape.ts`/`motion.ts`/`theme.ts paint()` discipline).
**Verified precedent — the exact mechanism to clone:**

```ts
// Source: web/src/lib/shape.ts:51-53 (verbatim, read this session)
export function applyShape(shape: Shape | string | undefined): void {
  // ...
  document.documentElement.setAttribute("data-shape", s);
```

```ts
// Source: web/src/lib/theme.ts:57-67 (verbatim, read this session)
function paint(theme: Theme): void {
  const resolved = resolve(theme);
  getHtml().setAttribute("data-theme", resolved);
  // Mirror into the live meta theme-color tag. paint() is the single
  // application choke point — setTheme, applyStoredTheme and the system-flip
  // listener all funnel through it — so this one write covers every path.
  // Null-guarded with ?. : jsdom test environments have no index.html head,
  // so the meta tag may not exist.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[resolved]);
}
```

CSS side (`index.css` precedents, verified this session): `@custom-variant dark (&:is([data-theme="dark"] *))` at line 3; `:root[data-shape="soft"]` / `[data-shape="square"]` overrides at ~603-609; `[data-motion=...]` transition gating at ~521-562. A `[data-platform="cupertino"]` / `[data-platform="material"]` block redefining a handful of custom properties (e.g. `--mob-fab-radius`, `--mob-chip-radius`, `--mob-title-size`, `--mob-check-shape`) is the same move.

**Resolution choice (discretion):** default `material`; do NOT sniff `navigator.userAgent`/`userAgentData` (grep-verified: neither appears anywhere in `src/` — a clean slate). The honest default is a static `material` default with the choice persisted like shape/motion; a coarse-pointer hint may *seed* the default but must remain a user-overridable preference. This needs one planner decision; both options are freeze-compatible.

### Pattern 3: Inline editors wrapped in fullHeight sheets (FLOW-01)

**What:** CadenceBuilder (and the schedule/notification forms) already render inline inside Settings sections. Mobile does not fork them; it hosts them: a `fullHeight` BottomSheet whose body is `<CadenceBuilder .../>` exactly as Settings renders it, with a StickyActionBar for apply/cancel where the editor has draft state.
**When to use:** D-05 — TimePicker (which pops inside CadenceBuilder via its own popover), CadenceBuilder, NotifyCard form, offsite target draft editor.
**Verified call site:** the only TimePicker consumer is `CadenceBuilder.tsx:442` — hosting CadenceBuilder brings TimePicker along; no separate integration needed.

### Pattern 4: Client-side load-more behind a constant threshold (LISTS-01)

**What:** A tiny shared helper (e.g. `useLoadMore(items, threshold)` returning the visible slice + a `showMore` callback). All lists render `visible.length` rows; the button appends one constant threshold. No sentinel observers, no scroll listeners, no server paging (`listRuns()` has no params and `api.ts` is frozen — `[VERIFIED: web/src/lib/api.ts:1923]` area, read this session).
**When to use:** runs lists (Dashboard, per-destination recent runs), containers, file sets, activity log, VM list, receiver/fleet lists where they can grow.
**Rows:** ≥ 44px touch height — Flash.tsx snapshot rows already establish the pattern (`py-1.5` rows measured at 44px, read this session); MoreSheet's `rowBase min-h-[3.25rem]` (52px) is the sheet-row precedent.

### Pattern 5: Settings writes ride the existing serialized chain (MORE-02/FLOW-02)

**What:** Mobile Settings editors must not open a second write path. The desktop chain is `queueSettingsWrite` (a promise-queue serializing full-object PUTs, `Settings.tsx:1214-1223`, read this session) + the `savedBaseline` ref that makes each PUT a correctly-merged full-object write. The `configEnabled` autosave in `ConfigSettingsCard.tsx` is the model for a mobile toggle: re-fetch `getSettings` → merge ONLY the changed field → `putSettings`.
**Anti-pattern to refuse:** a sheet capturing form state at open time and later PUTting the whole captured object — it silently reverts anything changed elsewhere between open and save.

### Pattern 6: Dialog → sheet re-hosting (Receiver, Fleet)

**What:** `ReceiverDialog` and `FleetDialog` are desktop portal modals (`createPortal`, `fixed inset-0 z-50`, `max-h-[90vh] overflow-y-auto` box — both read this session). Mobile re-hosts the same fields inside a `fullHeight` BottomSheet (editor ⇒ D-05 affordance) and Fleet's peer detail in a content-sized sheet (viewer ⇒ D-04, explicitly NOT fullHeight). Keep the field components (RevealInput, validation regexes) and swap only the host shell — the same "one component, new presentation" discipline as useConfirm in phase 6.

### Anti-Patterns to Avoid

- **`position:fixed` for the search row, chips, or FAB.** Standing phase 5/6 contract (D-10 restates it): sticky-in-flow only (`sticky bottom-0`-style within the page column, like StickyActionBar). The design bible's `.fab { position:absolute; right:18px; bottom:88px }` is maquette-frame positioning, NOT a spec for the app — resolve per-surface (in-flow FAB block or sticky container) and write the "why" comment, which D-12 explicitly sanctions.
- **Second write path for settings.** See Pattern 5.
- **Server pagination attempts.** Frozen api.ts; client-side slicing only.
- **UA sniffing for platform.** Attribute + preference only (D-12 mechanism).
- **Gating page blocks on coarse pointer.** The pointer axis drives *control variants* (tree checkboxes, popover behavior), never *which page render exists* — width (48rem) is the only page authority.
- **Prefilling secret inputs from GET.** GET returns `""` + `has*` flag by contract; render a "Set" badge + blank input; blank-on-save keeps; explicit Clear removes.
- **New i18n keys without same-commit 42-table binding.** en + de inline in `i18n.ts` + 40 modules under `web/src/lib/locales` (counts verified this session); parity + orphan tests fence the sweep and will fail otherwise.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheets / focus trap / scroll containment | Any modal-ish custom surface | `BottomSheet` (+`fullHeight`/`footer`/`tone`) | Phase 5/6 hardened: double-rAF entrance, scrim hit-testing subtleties, safe-area clamps, focus capture ordering |
| Destructive confirms | New confirm UI per page | `useConfirm` (auto→ConfirmSheet on mobile) | Zero per-call-site changes; fail/warn tones, consequence copy, no default-focus |
| Hover-affordance replacement | Tap menus ad hoc | `TapPopover` (+ computeBubblePosition clamp/flip) | Backdrop z-order and focus-restore already solved; InfoBubble open-only-tap quirk handled |
| Schedule math / next-fire preview | Recomputing cron client-side | `getScheduleNext` + 06-06 derivations (`nextBackupFireAt`, `worstRpoStatus`) | Server owns schedule truth; derivations are single-source so cards can't disagree |
| Run correlation after trigger | setTimeout/poll-by-clock | `useBackupWatch` (+ `onRun` deep-link) | Baseline-id correlation; client clock is a documented wrong answer |
| Log filtering | New predicate stack | `filterLogLines` (lib/activityLog) | Desktop ActivityLog already filters text/domain/type/day; chips bind to the same fn |
| VM list filters | New filter state model | Existing `search` + persisted chips + `FilterPopover` (Vms.tsx) | Already localStorage-persisted and desktop-tested; mobile row translates it |
| Platform CSS variants | Per-component className branching | `data-platform` + custom-property overrides in index.css | The `data-shape`/`data-motion` blocks are the proven layering-safe mechanism (unlayered-author-CSS vs Tailwind-layer pitfall already recorded in phase 6: width-on-wrapper-div lesson) |
| Restore guard chain semantics | Reimplementing/altering steps | Render the existing chain readably (D-03); chain code in Recovery.tsx `restoreOwnConfig` is frozen behavior | Server-owned chain; UI only narrates |

**Key insight:** every mechanism this phase needs exists and is e2e-guarded. The phase's actual engineering is *hosting* (sheets wrapping inline editors, dialogs re-shelled, cards translating tables) and *wiring* (same api fns, same write chains, same derivations) — plans should be sized around hosting+wiring, not mechanism-building.

## Runtime State Inventory

Not a rename/refactor/migration phase — omitted per protocol. (No string renames; no runtime caches carry phase-7 identifiers.)

## Common Pitfalls

### Pitfall 1: Desktop DOM leakage through one-sided gating
**What goes wrong:** Mobile block added without `max-md:hidden` on the desktop half (or desktop left mounted under mobile), producing duplicated ids, double event handlers, and a failing desktop-identity e2e.
**Why:** CSS-only hiding keeps desktop effects (ResizeObserver tab-strip measurement, polls) alive on phones; JSX-only gating leaves hidden desktop DOM in desktop renders.
**Avoid:** Always both halves (Pattern 1); extend `desktop-untouched.spec.ts` to all six routes in the same plan that touches them.
**Warning signs:** duplicate-text locator errors in Playwright; `tabStripWidth` ResizeObserver firing in mobile runs.

### Pitfall 2: Stale full-object settings PUT from a sheet
**What goes wrong:** A mobile editor PUTs a settings object captured at open time, reverting concurrent changes (or its own earlier autosaves).
**Why:** `UpdateSettings` is full-row REPLACE by design; the `savedBaseline`/queue chain exists precisely to merge correctly.
**Avoid:** Route every mobile settings write through `queueSettingsWrite`; autosave toggles copy the ConfigSettingsCard re-fetch→merge→put shape.
**Warning signs:** a sheet holding a `Settings` object in state instead of field-level values.

### Pitfall 3: Secret fields prefilled or echoed
**What goes wrong:** Mobile sheet renders a password input with a "stored" value (impossible — GET returns `""`) or saves the blank as a wipe.
**Why:** Write-only contract: `hasAppKey: boolean` / `hasToken: boolean` flags exist precisely because values never round-trip (verbatim: `/** A sending key is stored; the key itself is NEVER returned. */ hasAppKey: boolean` — api.ts:2715-2716; same contract on FleetPeer `hasToken`, api.ts:2851-2852).
**Avoid:** Blank input + "Set" badge from the flag; blank-on-save keeps; Clear checkbox/flag removes. Reuse RevealInput.
**Warning signs:** any `value={repo.appKey}` in a sheet.

### Pitfall 4: The FAB fighting the in-flow discipline
**What goes wrong:** Copying the maquette's `position:absolute` FAB into the app, breaking scroll/safe-area behavior and the phase 5 no-fixed contract.
**Why:** The maquette frame is a fixed-height artboard; the app is a scrolling document.
**Avoid:** Implement the FAB as in-flow (end-of-content primary action) or sticky-in-flow inside the page column; keep the M3 *look* (52px, radius-18, accent, per `git show 0b64c7df:design/mobile/android.html`: `height:52px; border-radius:18px; background:var(--accent); position:absolute; right:18px; bottom:88px` — first three properties transfer, the positioning does not) and record the deviation comment D-12 asks for. Alternatively record why the Home sticky-block pattern stays on a given surface.
**Warning signs:** `fixed`/`absolute` against viewport in a FAB implementation.

### Pitfall 5: Platform styling via Tailwind classes scattered in JSX
**What goes wrong:** `isCupertino ? "rounded-full" : "rounded-lg"` branching in dozens of components — untestable chrome drift, and "one IA, no duplicated components" (D-12) erodes.
**Why:** Class-level branching multiplies decision points; attribute-level CSS centralizes them.
**Avoid:** Custom properties overridden under `[data-platform=...]` in index.css; components consume `var(--mob-*)` through existing token-style utilities; only genuinely structural differences (large title element) get tiny component-level switches.
**Warning signs:** `usePlatform()` conditionals inside page blocks.

### Pitfall 6: i18n keys landed without the 42-table sweep
**What goes wrong:** CI parity/orphan tests fail (or worse, English leaks into de/fr e2e).
**Why:** House rule: keys bound in en+de (inline `i18n.ts`) + 40 locale modules in the SAME commit (`nav.mobileNavigation` codemod precedent, phase 6).
**Avoid:** Every plan that adds `t()` keys carries its locale-module edits as the same task; reuse the codemod approach for volume.
**Warning signs:** a plan with i18n keys in the page task but locale edits in a "later cleanup".

### Pitfall 7: Spacing/weight regressions in brand-new code
**What goes wrong:** New mobile blocks introduce `gap-3`/`px-3` or `font-medium` — exactly the phase 6 review findings, now in fresh code.
**Why:** 8/16 spacing stops and 400/600 weights are the standing enforcement from 06-UI-REVIEW.
**Avoid:** Use gap-2/gap-4, px-2/px-4, font-normal/font-semibold only; absorb the named review fixes in the plans that touch those files (sanctioned by CONTEXT.md discretion).
**Warning signs:** any `text-sm font-medium` stat triad in new cards; `gap-3` in new JSX.

### Pitfall 8: Gate-off pages rendering garbage on mobile
**What goes wrong:** Navigating directly to `/vms` with `vmsEnabled=false` (More sheet hides it, but the route exists) renders an empty card stack or errors.
**Why:** navModel gates set `enabled:false` (registry-level hiding); page-level gate state must render honestly (CONTEXT.md specifics: "mobile pages handle both gate states").
**Avoid:** Each mobile block handles the gate-off/empty state with the same honesty as desktop (point to Settings to enable).
**Warning signs:** e2e only ever tests gate-on fixtures.

### Pitfall 9: jsdom lies about the gate in dom tests
**What goes wrong:** A `.dom.test.tsx` asserts mobile markup and fails — or worse, is written against desktop and always passes.
**Why:** `useIsDesktop` returns true under the jsdom matchMedia stub (phase 5 decision): jsdom IS desktop; mobile blocks are e2e-only by construction.
**Avoid:** Test extractable pure logic (load-more window math, filter predicates, platform resolution) in unit tests; assert mobile DOM in the Playwright mobile project only.
**Warning signs:** dom tests stubbing `matchMedia` per-file to force mobile — that is a smell the logic should be extracted instead.

## Code Examples

### Editor sheet skeleton (D-05 shape)
```tsx
// Source: composed from BottomSheet props verified this session
{scheduleSheetOpen && !isDesktop && (
  <BottomSheet
    open={scheduleSheetOpen}
    onClose={closeScheduleSheet}
    fullHeight            // h-dvh editor affordance (D-05)
    title={t("vms.scheduleTitle")}
  >
    <CadenceBuilder
      value={draft.cadence}
      onChange={setDraftCadence}
      label={t("vms.cadenceLabel")}
      hueIndex={0}
    />
    <StickyActionBar>
      {/* apply/cancel; draft state never autosaves settings here */}
    </StickyActionBar>
  </BottomSheet>
)}
```

### Config restore guard chain as ordered list (D-03)
The chain to narrate (behavior frozen, from `Recovery.tsx` `restoreOwnConfig`, read this session): 1) persist current settings choice (`getSettings` re-fetch → targeted PUT of `configPath`/`configOffsite`), 2) `restoreConfig("latest", source)`, 3) APP_KEY mismatch → `appKeyRemedy` step if raised, 4) staged post-restore check, 5) `autoRestart` → `waitForAppBack` → reload, else manual-restart instruction. Mobile renders these as a numbered `<ol>` inside the restore sheet, each step plain-language; the sheet's confirm button names the outcome (restart). Use `useConfirm`/ConfirmSheet tones for the destructive emphasis.

### Fleet peer card fields (D-04) — from the verified type
```tsx
// Source: web/src/lib/api.ts:2832-2853 (verbatim field set, read this session)
// id, name, url, enabled, lastPollAt (unix s; 0 = never), lastPollOk (boolean|null,
//   null = never polled), lastPollError, lastPollInstanceName, lastPollVersion,
//   lastPollDomains: DomainStatus[] ("same shape as StatusResponse.domains,
//   renderable with the same UI"), createdAt, sortOrder, hasToken
```
Card shows: name + enabled, reachable (derived from `lastPollOk`/`lastPollError`), last contact (`lastPollAt`), protection summary from `lastPollDomains` (worst-RPO derivation reuse). Detail sheet (content-sized) can render the full DomainStatus scorecard with the SAME renderer desktop uses — that is the D-04 "protection summary" made literal.

### Receiver card fields — from the verified type
```tsx
// Source: web/src/lib/api.ts:2720-2726 (verbatim, read this session)
// ReceivedRepoStatus extends ReceivedRepoView {
//   lastReceived: string;   // RFC3339, "" if none/unreachable
//   snapshotCount: number;
//   reachable: boolean;     // false when the repo could not be opened read-only
// }
```
Plus inventory drill-down (`receiverInventory` → `ReceiverInventory { sources, snapshotCount, lastReceived, totalSize }`, api.ts:2751-2756) as the detail sheet's body, and `checkReceivedRepo(id, readData)` for a manual check action (`ReceiverCheckResult { ok, error, ranReadData, at }`, api.ts:2759-2764).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-page modal dialogs (Receiver/Fleet) | Portal modal on desktop + sheet re-host on mobile | Phase 6 (useConfirm branching precedent) | This phase applies the same one-component-two-shells discipline to page dialogs |
| Desktop-only settings (notify/offsite/schedule) | Sheet editors below 48rem | This phase (D-05/D-07) | Closes MOBILE-03/04 contract |
| Root attributes: theme/shape/motion | + `data-platform` | This phase (D-12) | Third/fourth attribute following the identical lib pattern |
| Single primary action as sticky block (phase 6 Home) | FAB under material chrome | This phase (D-12) | Phase 6 deferred deliberately; per-surface resolution with recorded rationale |

**Deprecated/outdated:** none in scope. (No new deps; no API deprecations touched.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Platform default of `material` with a persisted user override (no UA sniffing) satisfies D-12; coarse pointer may seed but not decide | Pattern 2 / PLAT-01 | Low — mechanism is attribute-based either way; wrong default is a one-line constant change, but the *decision* should be confirmed at plan review |
| A2 | Phase 6 mobile lists (Home recent runs, Containers list, Files sets) currently lack search/chips/load-more and LISTS-01 intends to add them there (not only new phase 7 lists) | LISTS-01 analysis | Medium — scope of plan 6 depends on reading LISTS-01's "runs, containers, sets, logs" as the existing phase 6 surfaces (the requirement's own wording supports this) |
| A3 | VM desktop search/chips transfer to the mobile VM block by reusing the same state (not a parallel mobile filter state) | Pattern 4 / VMs | Low — parallel state would be a fork; reusing is clearly the D-12 spirit |
| A4 | The 06-UI-REVIEW fixes (triad typography, spacing sweep, `home.newBackupConfirm`, chevron aria-label, Files header wrap) can be absorbed piecemeal into plans touching those files without a dedicated plan | Waves (per CONTEXT.md discretion) | Low — worst case a small follow-up task in plan 7 |
| A5 | `ReceivedRepoCard`'s rendered contents match the type fields above (card JSX read at a summary level this session; type verified verbatim) | Receiver section | Low — planner verifies exact JSX when writing tasks |

## Open Questions (RESOLVED)

1. **Which surface gets the FAB vs the existing sticky primary-action block?**
   - What we know: D-12 says "FAB for the primary action — this is where the FAB lands", and sanctions recording why a sticky block stays on specific surfaces. Home already shipped the sticky "New backup" block (phase 6).
   - What's unclear: whether Home *migrates* to the FAB in this phase or keeps the sticky block with a recorded rationale.
   - Recommendation: FAB on destination pages' primary actions (VMs/Flash/Config trigger, Settings add-actions); Home keeps its shipped block with the recorded-why comment, revisited at phase 8 real-device pass. Planner's call per discretion.
   - **RESOLVED (planning, 07-01):** the FAB hosts the primary trigger on the NEW destination surfaces (plans 07-03/07-05 consume it); Home KEEPS its phase 6 sticky block with the recorded-why comment; Config/Receiver/Fleet primary actions are sheet-opening rows, not FABs (UI-SPEC FAB surface resolution, mirrored in 07-01 Task 2's surface-resolution paragraph).
2. **Platform preference exposure.**
   - What we know: shape/motion are user-set via Settings About-area controls; `data-platform` needs a resolver + persistence.
   - What's unclear: whether an explicit user-facing control ships now or the attribute is silently derived (default material, seeded by pointer).
   - Recommendation: derive + persist internally this phase (no new Settings UI required by D-12); an explicit control can ride a later polish pass. Flag at plan review.
   - **RESOLVED (planning, 07-01):** default `material` + persisted `bv-platform` override, NO OS detection and NO Settings control this phase — the why-comment in platform.ts documents the rationale; the explicit control rides a later polish pass (UI-SPEC recorded platform-selection decision).
3. **Settings stacked cards vs tab-card components.**
   - What we know: D-08 — stacked full-width cards below md, chip strip above. The `settings/` tab cards are already card-shaped and self-contained (NotifyCard fully; others embed in desktop sections).
   - What's unclear: how many desktop sections render acceptably as-is in the stacked column vs need mobile variants (the tab-card components mostly can be reused directly; the big Sections containers cannot).
   - Recommendation: tracer plan anchors on Settings; resolve per-tab during planning with the "follow desktop information hierarchy" discretion.
   - **RESOLVED (planning, 07-05):** reuse the self-contained tab cards as-is (NotifyCard/ThemeCard/LanguageCard/AccentCard/AboutCard class); translate wrapper-style sections into MobileSectionLabel + stacked cards following the desktop information hierarchy; notify/offsite sections stay reachable through their inline forms until 07-07 re-hosts them as fullHeight sheets.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | builds, vitest, Playwright | ✓ | 24 (CI-pinned; local per repo docs) | — |
| npm | script runner | ✓ | bundled | — |
| Playwright browsers (chromium/webkit/firefox + mobile descriptors) | 4-project e2e | ✓ | 1.63.0 (`@playwright/test` in package.json, read this session) | — |
| vitest | dom/unit + source-assert guards | ✓ | ^4.1.10 | — |
| bombvault.exe build for webServer | e2e boot | ✓ (phase 5/6 harness proven; Windows caveats below) | — | manual webServer start |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

**Windows e2e caveats (from STATE.md, binding on plan execution):** local Playwright runs use a manually started webServer (teardown hang — kill `bombvault.exe` manually); orphaned playwright node processes accumulate between runs (documented cleanup command); NEVER buffer Playwright output through `| tail`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 (dom/unit + source-assert guards) + @playwright/test 1.63.0 (4 projects: desktop-1280, mobile, de/fr narrow) |
| Config file | `web/vitest` config via package script (`npm run test` = `vitest run`); `web/playwright.config.ts` |
| Quick run command | `cd web && npx vitest run src/lib` (fast unit/guard slice) |
| Full suite command | `cd web && npm run test` + `cd web && npx playwright test` (four projects; Windows caveats above) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MORE-01 | Each destination renders mobile cards <48rem; desktop DOM byte-identical ≥48rem | e2e (explicit) | `npx playwright test e2e/destination-pages.spec.ts --project=mobile` and extended `desktop-untouched.spec.ts` loop over the six routes (both projects) | ❌ Wave 0 (new spec + battery extension) |
| MORE-01 | Config restore chain renders as ordered steps | e2e (explicit: step list present in restore sheet, staged config fixture) | `npx playwright test e2e/destination-pages.spec.ts -g "config restore"` | ❌ Wave 0 |
| MORE-01 | Fleet peer card reachable/last-contact/protection from FleetPeer fields; detail sheet content-sized | e2e (explicit; staged `listFleetPeers` Go-JSON fixture) + dom test (explicit: peer-card derivation fn if extracted) | `npx playwright test -g "fleet peer"`; `npx vitest run src/lib` | ❌ Wave 0 |
| MORE-02 | Settings stacked cards + chip strip <48rem; desktop strip untouched (PAGE_SHELL_TABBED intact ≥48rem) | e2e (explicit both directions) | `npx playwright test -g "settings mobile"` + desktop-untouched settings route | ❌ Wave 0 |
| FLOW-01 | Schedule editor opens as fullHeight sheet; effective preview visible on invoking card without reopening | e2e (explicit: sheet role/fullHeight marker; preview text on card after staged `getScheduleNext`) | `npx playwright test -g "schedule sheet"` | ❌ Wave 0 |
| FLOW-02 | Notify + offsite forms editable in sheets; secrets blank-keep/Clear preserved | e2e (explicit: staged `getNotify` fixture, save path assert) + existing desktop tests (backstop) | `npx playwright test -g "notify\|offsite"` | ❌ Wave 0 (desktop-side existing tests = backstop) |
| LISTS-01 | Sticky-in-flow search+chips above lists; load-more grows by constant threshold; never auto-loads; rows ≥44px | unit (explicit: threshold window math as extracted pure fn); e2e (explicit: staged long list, press Load-more, count rows; assert no sentinel auto-load; sample row height) | `npx vitest run src/lib/loadMore.test.ts`; `npx playwright test -g "load more"` | ❌ Wave 0 (both files) |
| PLAT-01 | `data-platform` on `<html>`; FAB/tonal chips under material; large title/circular checks under cupertino; desktop unaffected | unit/dom (explicit: platform.ts resolve+apply, storage persistence); e2e (explicit: attribute present, FAB role <48rem on a destination page); source-assert (backstop: DESKTOP_QUERY still sole width literal — existing mobileShellSource guard extends) | `npx vitest run src/lib/platform.test.ts`; `npx playwright test -g "platform"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npm run test` (vitest) + touched spec file via `npx playwright test -g "<tag>"` (manual webServer on Windows).
- **Per wave merge:** full `npx playwright test` four-project gate + `cd web && npm run build` (tsc --noEmit; dist commit per CLAUDE.md).
- **Phase gate:** all four projects green + go build chain unaffected (`internal/**` untouched, but `just check` confirms).

### Wave 0 Gaps
- [ ] `web/e2e/destination-pages.spec.ts` — staged Go-JSON fixtures for VM/flash/config/receiver/fleet/settings routes (model: `maquette-screens.spec.ts` staging half, incl. `**/api/display-prefs*` route.abort for any localized scenario)
- [ ] `web/e2e/desktop-untouched.spec.ts` extension — battery loop + leakage needles for the six new routes
- [ ] `web/src/lib/loadMore.test.ts` — threshold window math (pure fn extracted in plan 6)
- [ ] `web/src/lib/platform.test.ts` + mobileShellSource guard extension — platform attribute contract
- [ ] Framework install: none needed (both frameworks installed and proven)

## Security Domain

`security_enforcement` is enabled (config: security_asvs_level=1). This phase is presentation-only over existing, already-validated endpoints — no new API surface, no new inputs reaching the backend beyond existing form fields re-hosted in sheets.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged; login untouched) | existing auth gate |
| V3 Session Management | no (unchanged) | existing CSRF/auth middleware |
| V4 Access Control | no (unchanged; same endpoints, same caller) | server-side gates frozen |
| V5 Input Validation | yes (re-hosted forms) | unchanged server boundary (`decodeBody`, `resourceNameRe`, 1 MiB, DisallowUnknownFields — frozen); client sends exactly the existing typed payloads |
| V6 Cryptography | no | restic/APP_KEY untouched |
| V7 Error handling | yes (display) | backend error text shown verbatim per house rule — already scrubbed server-side (`scrubError` paths→[path] first); mobile must NOT strip or re-render raw non-scrubbed strings anywhere new |
| Secrets handling | yes | **Write-only contract is the phase's security-critical invariant** (see Pitfall 3): never prefill, never echo, blank-keeps, Clear-removes; RevealInput reuse; `has*` flags only |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage via new mobile sheet state/logging | Information Disclosure | Render `has*` flag badges, never values; no `console.log` of form state; RevealInput |
| Tap-to-confirm automation bias on destructive sheet actions | Elevation/abuse | ConfirmSheet semantics via `useConfirm` (no default focus, consequence-naming copy) — never hand-roll a confirm |
| Duplicated desktop+mobile forms drifting on secret semantics | Tampering | One field component set (RevealInput etc.) re-hosted, not re-implemented |
| Platform attribute abuse (CSS injection surface) | Tampering | Attribute values are a closed union (`material|cupertino`) set only by the lib fn; never from storage without validation (mirror `applyShape`'s coercion) |

## Suggested Plan / Wave Structure (research question 6)

Seven plans, dependency-ordered; sizes follow the phase 5/6 reality that page-translation plans with same-commit i18n + e2e land at 45min–2h40m each (STATE.md metrics).

| # | Plan | Scope | Depends on |
|---|------|-------|-----------|
| 1 | **Platform chrome layer (PLAT-01 foundation)** | `lib/platform.ts` (`data-platform` resolve/apply/persist, model: shape.ts); index.css `[data-platform]` custom-property variants; `Fab` component (in-flow/sticky-in-flow; M3 look, HIG variant); tonal-chip + large-title CSS treatments; dom/source-assert tests. Anchors the Open Questions (FAB surfaces, preference exposure). | — |
| 2 | **VMs + Flash mobile blocks (MORE-01a)** | Double-gate both pages; VM cards (state badge, method, include toggle, disclosure→snapshots, restore entry via RestoreAction), Flash cards + snapshot rows; trigger buttons via existing BackupButton semantics; schedule sheet entry (consumes plan 1 chip/FAB language); i18n 42-table; e2e + desktop battery extension for both routes. Tracer-plan anchor candidate (largest, highest-risk page first while review bandwidth is fresh). | 1 |
| 3 | **Config + Receiver (MORE-01b)** | Config cards + restore sheet with D-03 ordered guard-chain list; Receiver repo cards + dialog→fullHeight sheet re-host (write-only APP_KEY preserved); i18n; e2e. | 1 |
| 4 | **Fleet (MORE-01c)** | Peer cards (reachable/last contact/protection from verified `FleetPeer` fields); D-04 content-sized detail sheet reusing the DomainStatus scorecard renderer; dialog→sheet editor; i18n; e2e. | 1 |
| 5 | **Settings + operational editors (MORE-02, FLOW-01, FLOW-02)** | Stacked cards + horizontal chip strip (D-08); theme/language/accent via phase 6 popovers (D-09); schedule (CadenceBuilder/TimePicker) + NotifyCard + offsite targets/wizard hosted as fullHeight sheets riding `queueSettingsWrite` (D-05/06/07); effective previews on invoking cards. Largest plan — consider splitting Settings-page vs editors if it exceeds ~3 tasks. | 1 (2–4 recommended first: patterns settle) |
| 6 | **List ergonomics (LISTS-01)** | `useLoadMore` constant-threshold helper + unit tests; sticky-in-flow search+chips rows on runs/containers/sets/logs (phase 6 surfaces) and the new phase 7 lists; 44px rows sweep; never-auto-load e2e. | 2–5 (all lists exist) |
| 7 | **Sweeps + gate + review absorption (VERIFY rehearsal)** | de/fr 320–360px narrow sweeps over every new list/editor; remaining 06-UI-REVIEW fixes not yet absorbed (triad typography, spacing sweep, `home.newBackupConfirm`, chevron aria-label, Files header wrap); full four-project gate; i18n parity/orphan confirmation across all new keys. | 1–6 |

**Suggested waves:** W1={1} · W2={2,3,4} (independent, all consume plan 1) · W3={5} · W4={6} · W5={7}. If the planner compresses to 5 plans: merge 3+4 (Config+Receiver+Fleet share the dialog→sheet mechanic) and fold 6's helper into 2 with consumers accumulating per plan — the 7-plan shape is recommended because STATE.md already budgets 7 and each plan stays under the 3-task house ceiling.

## Sources

### Primary (HIGH confidence — direct working-tree reads this session)
- `web/src/pages/Vms.tsx`, `Flash.tsx`, `Config.tsx`, `Receiver.tsx`, `Fleet.tsx`, `Settings.tsx` (structure + key line ranges as cited inline)
- `web/src/lib/api.ts:2710-2880` (ReceivedRepo*/Receiver*/FleetPeer types + endpoints — verbatim field sets quoted), earlier reads: Settings/Run/NotifyConfig/OffsiteTarget/VM/FileSetView/EffectiveSchedule/ScheduleNext locations
- `web/src/lib/useMediaQuery.ts` (DESKTOP_QUERY:42, POINTER_COARSE_QUERY:92), `web/src/lib/navModel.ts`, `web/src/lib/pageShell.ts` (all three constants verbatim), `web/src/lib/theme.ts:57-67` (paint verbatim), `web/src/lib/shape.ts:51-53`, `web/src/lib/motion.ts`
- `web/src/components/mobile/` — BottomSheet.tsx, StickyActionBar.tsx, RunDetailSheet.tsx, TapPopover.tsx, MoreSheet.tsx
- `web/src/index.css` (line-3 custom variant; data-shape 603-609; data-motion 521-562), `web/src/components/CadenceBuilder.tsx` + `TimePicker.tsx` (single call site :442), `EffectiveScheduleLine.tsx`, `OffsiteTargetsSection.tsx`, `web/src/pages/settings/*` (NotifyCard, ThemeCard, LanguageCard, shared.tsx), `web/src/pages/Dashboard.tsx` mobile block + derivations, `web/src/pages/Recovery.tsx` restoreOwnConfig, `web/src/components/ActivityLog.tsx` filter bar
- `web/package.json` (deps + scripts, verbatim this session), `web/playwright.config.ts`, `web/e2e/desktop-untouched.spec.ts`, `web/e2e/maquette-screens.spec.ts`, `web/e2e/narrow-viewport.spec.ts`

### Planning artifacts (HIGH)
- `.planning/phases/07-.../07-CONTEXT.md` (D-01..D-12, discretion, deferred), `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json`, `.planning/phases/06-maquette-screens/06-RESEARCH.md` + `06-UI-REVIEW.md`

### Design bible (HIGH, pinned commit)
- `git show 0b64c7df:design/mobile/README.md`, `android.html` (`.fab`, `.navpill`, `.chip` CSS verbatim), `ios.html` (`.selcheck` 23px circle, `.group` 14px cells)

### Secondary/Tertiary
- None required — no external library questions arose (zero new deps; all patterns in-repo). Web search providers are disabled in `.planning/config.json`; nothing in this phase needed them.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero installs; all versions read from package.json this session
- Architecture patterns: HIGH — every pattern cites a working-tree file:line read this session; the only design-level judgment (platform default/persistence) is logged as A1 for plan-review confirmation
- Pitfalls: HIGH — all eight are either standing contracts from phases 5/6 (documented in STATE.md) or direct consequences of frozen files verified this session
- Wave structure: MEDIUM — sizes inferred from phase 5/6 plan metrics; exact split is the planner's call

**Research date:** 2026-09-13
**Valid until:** 2026-10-13 (stable: frozen files + in-repo patterns; no external dependency churn possible)
