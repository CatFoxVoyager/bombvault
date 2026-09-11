# Architecture Research

**Domain:** Responsive mobile layer for an existing desktop-first React SPA (Go-embedded backup UI)
**Researched:** 2026-09-11
**Confidence:** HIGH on in-repo findings (verified directly against the codebase); MEDIUM on framework mechanics (Context7/docs); external web sources carry the seam's LOW provider tier and are used only where cross-checked or locally verified

**Scope:** How the v1.1 mobile layer integrates with the existing SPA — breakpoint/layout-switch strategy, Sidebar → bottom bar + More sheet mapping, in-place responsive pages, safe areas, and SelectionTree under touch. Backend (Go `internal/*`) and `web/src/lib/api.ts` are **out of the blast radius**: this milestone is presentation-only.

---

## Standard Architecture

### Current System (v1.0, verified in repo)

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser — React 19 SPA (no state library, no UI kit)               │
│                                                                    │
│  router.tsx (BrowserRouter, 11 routes, all flat paths)             │
│      └── Layout.tsx ─── auth gate · settings load · What's New     │
│               ├── Sidebar.tsx (ALWAYS mounted desktop nav,         │
│               │            settings-gated conditional tabs,        │
│               │            rainbow hues, sign-out, language)       │
│               └── <main class="flex-1 overflow-y-auto p-6">        │
│                       └── Outlet → pages/* (PAGE_SHELL wrappers)   │
│                                                                    │
│  SelectionTree.tsx — one APG tree for containers AND file sets     │
│  index.css — carbon tokens, dark-only, container queries in use    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ same-origin JSON + SSE (UNCHANGED)
                               ▼
                Go stdlib net/http (internal/api) — UNCHANGED
```

Facts this research verified directly (HIGH confidence, first-party):

- `Layout.tsx` is the single shell: it owns auth gating, settings loading, the What's-New dialog, and renders `<Sidebar />` **unconditionally** next to `<main>`. This is the one and only chrome decision point.
- `router.tsx` routes are all flat literal paths (`/dashboard`, `/containers`, `/vms`, `/flash`, `/config`, `/files`, `/receiver`, `/fleet`, `/recovery`, `/settings`) plus redirects (`/`→`/dashboard`, `/jobs`→`/settings#schedules`, `*`→`/dashboard`). **No nested routes, no layout routes** — a bottom bar can point at the exact same paths with zero router changes.
- Every page root uses `PAGE_SHELL` (`web/src/lib/pageShell.ts`: `flex flex-col gap-10 max-w-6xl`), enforced by the `bombvault/page-uses-page-shell` lint rule and `routedPages.test.ts`. `Settings` is the one declared exception (`PAGE_SHELL_TABBED`, no max-width, because its 7-segment Selector strip measures 1424px in `de`).
- The app root is `h-screen overflow-hidden` with `<main>` as the sole scroll container — an app-shell that scrolls internally, not the document.
- Tailwind v4.3.3 is in use with mobile-first responsive variants (`grid-cols-1 sm:grid-cols-3`, `md:grid-cols-2`) and at least one container query (`@[44rem]` run rows in Dashboard). No viewport media queries exist anywhere yet — only `prefers-color-scheme` / `prefers-reduced-motion`. Mobile is greenfield at the layout level.
- `web/index.html` viewport meta is `width=device-width, initial-scale=1.0` — **no `viewport-fit=cover`**, so `env(safe-area-inset-*)` is currently always 0.
- Dashboard implements widget drag-reorder with **HTML5 drag events** (`lib/useDragReorder.ts`, `lib/dashboardLayout.tsx:385`) — HTML5 DnD does not fire from touch input.
- Hover-dependent affordances exist: `useTipBubble`/`InfoBubble` (tooltip bubbles), Toast pause-on-hover.
- vitest has **no `setupFiles`**; jsdom is opt-in per test file via `// @vitest-environment jsdom`. jsdom **does not implement `window.matchMedia`** — verified locally against the repo's own jsdom 30 (`typeof window.matchMedia === "undefined"`).

### Target System (v1.1 mobile layer)

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser — SAME bundle, SAME routes, SAME API calls                 │
│                                                                    │
│  router.tsx ── UNTOUCHED (deep links keep landing identically)     │
│      └── Layout.tsx ─── auth gate · settings · What's New          │
│               │   + useMediaQuery(DESKTOP_BP)  ← NEW, one hook     │
│               ├── desktop →  Sidebar.tsx (byte-identical JSX)      │
│               │            <main class="p-6 ...">                  │
│               └── mobile  →  <main class="p-4 ...">                │
│               │            BottomNav.tsx (NEW, 4 fixed tabs)       │
│               │            MoreSheet.tsx  (NEW, overflow routes)   │
│                                                                    │
│  pages/* — responsive IN PLACE (Tailwind variants + container      │
│  queries + a few hook-driven touch affordances; NO second page     │
│  tree, NO per-page mobile components)                              │
│                                                                    │
│  SelectionTree.tsx — SAME ARIA/keyboard contract; touch density    │
│  via additive classes + pinned selection-count bar                 │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ same-origin JSON + SSE (UNCHANGED)
                               ▼
                Go stdlib net/http (internal/api) — UNTOUCHED
```

---

## Component Responsibilities

Explicit new vs modified. "Desktop-visible behavior change" = what a desktop user above the breakpoint could notice.

| Component | Status | Responsibility | Desktop-visible behavior change |
|-----------|--------|----------------|---------------------------------|
| `web/src/lib/useMediaQuery.ts` | **NEW** | `useSyncExternalStore` + `matchMedia(query)` hook; sync first read (no FOUC), change subscription | None |
| `web/src/lib/mobile.ts` (or folded into the hook file) | **NEW** | The one breakpoint literal (`DESKTOP_QUERY = "(min-width: 48rem)"`) + the fragile-pair comment binding it to the CSS `md:` boundary | None |
| `web/src/components/mobile/BottomNav.tsx` | **NEW** | 4 fixed tabs (Home, Containers, Files, Settings) as `NavLink`s; active state from route match; safe-area padding | None (unmounted ≥ breakpoint) |
| `web/src/components/mobile/MoreSheet.tsx` | **NEW** | Bottom sheet listing remaining destinations; consumes the same settings gating as Sidebar; ephemeral open state | None (unmounted ≥ breakpoint) |
| `web/src/test/matchMedia.setup.ts` + `vitest.config.ts` setupFiles | **NEW** | jsdom stub defaulting to **desktop** (`matches: false` for the mobile query) so every existing dom test keeps exercising the Sidebar path | None |
| `web/src/lib/navModel.ts` | **NEW (optional, recommended)** | Pure `destinations(settings)` derivation shared by Sidebar and MoreSheet so enable/disable gating cannot drift between the two navs | None if extraction is pure code-motion |
| `web/src/app/Layout.tsx` | **MODIFIED (small)** | Add hook; conditionally render Sidebar vs BottomNav+MoreSheet; `h-screen`→`h-dvh`; responsive `main` padding (`p-4 md:p-6`) | Pixel-identical ≥ breakpoint (`md:` preserves today's values; `dvh`==`vh` without dynamic chrome) |
| `web/index.html` | **MODIFIED (one token)** | Add `viewport-fit=cover` to the viewport meta | None (desktop ignores it) |
| `web/src/lib/pageShell.ts` | **MODIFIED (one string)** | `PAGE_SHELL` gains mobile rhythm: `gap-6 md:gap-10` (desktop keeps 40px) | None ≥ `md` |
| `web/src/index.css` | **MODIFIED (additive)** | Safe-area helpers (`padding-bottom: max(...)`), bottom-bar tokens from the design bible, any mobile density utilities | None (new rules are mobile-scoped) |
| `web/src/components/Sidebar.tsx` | **MODIFIED (only if navModel extracted; else untouched)** | Its destination list moves to shared derivation; rainbow `nextHue()` logic stays here | None if pure code-motion |
| `web/src/components/SelectionTree.tsx` | **MODIFIED (additive classes only)** | Touch density: min row height / larger hit targets under a container query; chevron affordance | None ≥ breakpoint |
| `pages/*.tsx` (10 files) | **MODIFIED (sweep, MOBILE-02/03)** | Class-level responsive adaptation; a few hook-driven affordances (pinned save bar, reorder fallback) | None ≥ breakpoint (class-per-class audit at each page) |
| `router.tsx`, `lib/api.ts`, all of `internal/**` | **UNTOUCHED** | Data flow and URL contract are frozen by design | None |

---

## Recommended Project Structure

```
web/src/
├── app/
│   ├── Layout.tsx            # MODIFIED: hook + conditional chrome (the ONE switch point)
│   └── router.tsx            # UNTOUCHED
├── components/
│   ├── mobile/               # NEW feature-scoped folder (precedent: components/restore/)
│   │   ├── BottomNav.tsx     # NEW: 4 fixed tabs, NavLink, active pill
│   │   └── MoreSheet.tsx     # NEW: overflow destinations sheet
│   ├── Sidebar.tsx           # MODIFIED (maybe): destination list → navModel
│   └── SelectionTree.tsx     # MODIFIED: additive touch-density classes
├── lib/
│   ├── useMediaQuery.ts      # NEW: the hook + the breakpoint literal
│   ├── navModel.ts           # NEW (optional): pure destinations(settings)
│   └── pageShell.ts          # MODIFIED: PAGE_SHELL responsive rhythm
├── test/
│   └── matchMedia.setup.ts   # NEW: desktop-default jsdom stub
└── pages/                    # MODIFIED in sweep, class-level only
```

### Structure Rationale

- **`components/mobile/`:** the repo already scopes features into subfolders (`components/restore/`, `components/recovery/`, `pages/settings/`). The mobile chrome is a feature, not a shared control — it must not sit beside `Button.tsx` as if it were context-free.
- **`lib/useMediaQuery.ts`:** hooks are `lib/use*.ts` by convention (`useRainbow`, `useLabelMode`, `useTipBubble`, `useDragReorder`). Keeping the breakpoint literal in the same file makes the fragile pair (JS query ↔ CSS `md:`) a single-file concern with one comment.
- **No `pages/mobile/`:** deliberately absent. The decision to adapt pages in place (Pattern 3) is what keeps MOBILE-04 parity a sweep instead of a permanent double bookkeeping.

---

## Architectural Patterns

### Pattern 1: Hybrid breakpoint strategy — JS hook for chrome, CSS for everything else

**What:** Exactly one place in the app makes a JS media-query decision: `Layout` choosing which navigation chrome to mount. Every layout change *inside* pages is CSS-only (Tailwind responsive variants + container queries).

**Why (against the two alternatives):**

- **CSS-only everywhere** (render both navs, `hidden`/`md:flex` them): CSS cannot unmount components. The Sidebar is not a passive list — it runs `useRainbow`, label-mode, tip-bubble logic, collapse state, sign-out and language flows. Keeping it mounted on a phone means running a dead component tree with live subscriptions and duplicated DOM, forever. It also invites "just hide this one part with CSS" creep until the shell is two overlapping apps.
- **Route-level split** (`/m/...` route tree or a second bundle): multiplies the parity surface — the exact failure mode v1.0 just eliminated by making ONE `SelectionTree` serve containers and file sets through additive props. It also breaks the single-URL contract (a phone bookmark of `/containers` must land on the same route a desktop link uses) and doubles i18n keys across 42 locales. Rejected.

**The hook (React 19 docs-confirmed contract — getSnapshot must be immutable, subscribe returns unsubscribe, `getServerSnapshot` unnecessary with no SSR):**

```typescript
// lib/useMediaQuery.ts
import { useSyncExternalStore } from "react";

// THE mobile boundary. Deliberately the same literal as Tailwind's `md:`
// (min-width: 48rem) so `PAGE_SHELL`'s `md:gap-10` and this hook flip on the
// same pixel. FRAGILE PAIR (repo convention, cf. index.html FOUC script ↔
// lib/theme.ts): change both together or the bottom bar and the page rhythm
// disagree in a 1px window. Guard test below pins it.
export const DESKTOP_QUERY = "(min-width: 48rem)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches, // sync first read → correct chrome on first paint, no FOUC
    () => true // server snapshot; SPA has no SSR but the overload is free
  );
}
```

**Trade-offs:** a JS decision means the chrome swap re-renders on rotate/resize — which is exactly what you want for Sidebar↔BottomNav, and nowhere else, which is why the hook is quarantined to Layout. Page content reflowing is pure CSS and survives a JS failure.

### Pattern 2: Bottom bar + More sheet as a second rendering of the same route list

**What:** The bottom bar is 4 fixed `NavLink`s (`/dashboard`, `/containers`, `/files`, `/settings`) per the locked design bible. The More sheet renders the *remaining* destinations — including the settings-gated ones (VMs/Flash/Config/Receiver/Fleet appear only when enabled).

**Why it cannot break deep links:** routes are presentation-independent. `router.tsx` is untouched; the bar and the sheet are just two more consumers of the same path constants. Active-tab detection is `NavLink`'s existing route matching — the same mechanism the Sidebar uses today. Platform guidance (M3 navigation bar / iOS tab bar) supports a small set of primary destinations with overflow to a secondary surface; the 4+More shape is that pattern verbatim.

**The one real risk is gating drift:** today only Sidebar knows "VMs tab exists iff `settings.vmsEnabled`". A More sheet that re-derives this from `settings` by hand is a second copy of the rule. Extract the derivation once (pure function, `settings → ordered destinations`), feed both. Sidebar's rainbow hue machinery stays in Sidebar — the mobile language uses the accent, not the rainbow (`design/mobile/README.md` locked tokens).

**Trade-offs:** a small refactor of Sidebar (code-motion) where an additive-only approach was possible. Worth it: an unpinned enabled-domain check silently rotting into dead links in the More sheet is a worse regression class than a mechanical extraction covered by the existing Sidebar dom tests.

### Pattern 3: Pages become responsive in place — never a second page implementation

**What:** Mobile language for the five maquette screens and the six remaining destinations is delivered as class-level changes to the existing page files: tightening rhythm, stacking grids (`grid-cols-1 md:grid-cols-2` is already the idiom), container queries for card-internal adaptation (Dashboard's `@[44rem]` run rows are the in-repo precedent), and a small number of hook-driven affordances only where the DOM itself must differ (pinned selection-count bar on tree screens; a non-drag reorder fallback).

**Why:** MOBILE-04 demands *operational parity*. Two implementations of a page double every parity check forever; one responsive implementation makes parity a CSS audit. The repo's own governance points the same way: `page-uses-page-shell` lint, `PAGE_SHELL` as the one root wrapper, and the v1.0 "one tree, two domains" decision are all the same principle — one surface, many presentations.

**Where the DOM genuinely must differ,** scope it to the smallest surface:

```tsx
// inside FoldersEditor's card (container query, not viewport query):
<figure className="@container">          {/* card is the container */}
  <SelectionTree ... />                   {/* untouched props contract */}
  <div className="@max-md:sticky @max-md:bottom-0 ...">
    {/* pinned "{n} paths handed to restic" + save — mobile only,
        reusing the SAME preview state SELECT-03 already computes */}
  </div>
</figure>
```

Container queries (built into Tailwind v4 — the v3 plugin is not needed) beat viewport queries here because the tree card sits inside `PAGE_SHELL`'s capped column and the same card must keep working on desktop.

**Trade-offs:** some pages (Settings, Containers at 3,298 lines) are already monoliths; class-level edits are low-risk per hunk but the sweep needs per-page discipline: each page's diff must be inspectable as "no visual change ≥ breakpoint", page by page, or the desktop non-regression gate becomes vibes.

### Pattern 4: Viewport height + safe areas for the app shell

**What:** three one-token changes that make the shell correct on mobile and are no-ops on desktop:

1. `h-screen` → `h-dvh` on the Layout root. `100vh` equals the *large* viewport on mobile, so the current root overflows under an expanded browser toolbar and the bottom bar lands beneath it. `dvh` resolves identically to `vh` when there is no dynamic browser chrome — desktop sees nothing. (Support: Safari 15.4+, Chrome 108+, Firefox 101+ — fine for a 2026 self-hosted admin tool; if the browser matrix must stretch older, write `height:100vh; height:100dvh;` in CSS instead of the utility.)
2. `viewport-fit=cover` added to the viewport meta. Without it, `env(safe-area-inset-*)` is 0 everywhere. With it, the shell owns the insets: `padding-bottom: max(0.5rem, env(safe-area-inset-bottom))` on the bottom bar (fallback declaration first — browsers drop the entire declaration containing an unknown function; `max()` combines inset with a minimum).
3. Bottom bar **in normal flow** (a flex sibling below `<main>`), not `position:fixed`. The Layout root is already a flex row; on mobile it becomes a flex column with `main` as `flex-1 overflow-y-auto` and the bar after it. This sidesteps every fixed-positioning pitfall (iOS rubber-band overlap, toolbar occlusion, keyboard push) — the bar simply cannot be covered because it is not floating. Landscape: `env(safe-area-inset-left/right)` padding on the shell for notched landscape.

**Trade-offs:** `viewport-fit=cover` also exposes the top inset area (status bar overlap in landscape/standalone contexts). This app has no fixed top bar — page headers scroll inside `main` — so the exposure is bounded; verified on-device in MOBILE-04 anyway.

### Pattern 5: SelectionTree under touch — adapt the presentation, never the contract

**What:** the tree's accessibility contract stays byte-identical: `role="tree"`/`treeitem`/`group`, tri-state `aria-checked` (`true`/`mixed`/`false`), `aria-expanded` on parents only, lazy children with `aria-level`/`aria-setsize`/`aria-posinset`, roving tabindex, Space-through-`onToggle`. The APG pattern covers **keyboard only** — it says nothing about touch — which means a touch adaptation has no ARIA obligations to renegotiate. Mobile changes are presentational and additive:

- **Hit targets:** tree rows grow to ≥44px touch height under the card's container query (`@max-md:min-h-11` class-level change). The checkbox stays the same semantic control; only its painted size and padding change.
- **Expand affordance:** the design bible's maquette keeps chevron-expand + row-tap-select; the chevron needs its own ≥44px zone so a tap never both expands and toggles.
- **Pinned count:** the maquette's "12,480 files · 3.2 GB handed to restic" bar is a *re-presentation* of the existing SELECT-03 per-root preview state — new placement, zero new computation, so it cannot disagree with the desktop preview.
- **Save queue under fat fingers:** rapid double-taps are already handled — the editor serializes saves through the one-deep PATCH queue and disables in-flight checkboxes (`busyPaths`). Touch changes nothing here; this is the existing design paying rent.
- **Keyboard handlers** simply never fire from touch; no dual-input arbitration is needed.

**The hover trap nearby:** `InfoBubble`/`useTipBubble` shows on `mouseenter`. Tap-as-focus may cover some cases, but a click/tap toggle fallback is a small, known change — schedule it in the MOBILE-04 touch sweep, do not assume.

---

## Data Flow

### Request Flow — UNCHANGED

```
[Tap on mobile]  ≡  [Click on desktop]
    ↓
Component → existing handler → lib/api.ts fetch → Go handler → Service
    ↓
SSE /api/progress → lib/progress.ts singleton → same components
```

**Zero new endpoints. Zero `api.ts` changes. Zero Go changes.** The mobile layer reads the exact same stores, mirrors, and queues the desktop reads. Two flows deserve explicit note because touch stresses them:

1. **Tree PATCH queue under touch:** taps arrive faster than desktop clicks. The one-deep serialized queue already collapses bursts and guarantees the newest toggle survives a failing save — verified design (PROJECT.md Key Decisions, Phase 2/3). No change; add a rapid-tap dom test for confidence.
2. **localStorage:** tree expansion state (`bv-tree-expanded-*`) is reused as-is. More-sheet open state is ephemeral component state — deliberately **not** persisted and **not** routed through display-prefs sync; chrome state is not user data.

### State Management — UNCHANGED SHAPE, ONE NEW NODE

```
Layout state (settings, authGate)  ──props──▶  Sidebar  (existing)
                                   ──props──▶  BottomNav / MoreSheet  (NEW consumers, same source)
useMediaQuery (NEW)                ──▶ Layout render branch only
```

No state library, per the hard constraint. The hook is a 15-line external-store subscription, not a state system.

---

## Anti-Patterns

### Anti-Pattern 1: CSS-hiding the Sidebar instead of unmounting it

**What people do:** render `<Sidebar className="hidden md:flex" />` and `<BottomNav className="md:hidden" />` in both modes.
**Why it's wrong:** the Sidebar is a live component (subscriptions, rainbow, dialogs). A phone pays its cost forever and two `<nav>`s invite duplicate-landmark and stale-state bugs; "hide with CSS" then spreads into pages as the cheap default.
**Do this instead:** one hook, one switch point (Layout); CSS hides nothing structural anywhere.

### Anti-Pattern 2: A parallel mobile page tree ("pages get mobile twins")

**What people do:** `MobileContainers.tsx` rendering a friendlier subset.
**Why it's wrong:** operational parity (MOBILE-04) becomes manual, permanent double-testing; the repo spent all of v1.0 un-creating this exact duplication for the tree.
**Do this instead:** responsive-in-place with container queries; conditional DOM only for the two sanctioned affordances (pinned save bar, reorder fallback).

### Anti-Pattern 3: `position:fixed` bottom bar with manual offset math

**What people do:** `fixed bottom-0 left-0 right-0` + `calc(100vh - 64px)` main height + safe-area paddings patched on top.
**Why it's wrong:** three moving targets (dynamic toolbar height, safe-area inset, keyboard) reconciled by hand; iOS rubber-banding paints content under the bar.
**Do this instead:** flex-column shell, bar in normal flow, `h-dvh` root, insets only as bar padding (Pattern 4).

### Anti-Pattern 4: A second "mobile" SelectionTree

**What people do:** rebuild the maquette's tree from scratch because "touch is different".
**Why it's wrong:** loses the APG map, the classifyNode list-arithmetic guarantees (TREE-03/04), the D-04 guard, and the serialized queue — the entire v1.0 correctness investment — to re-earn it piecemeal.
**Do this instead:** same component, additive density classes, pinned preview reusing SELECT-03 state (Pattern 5).

### Anti-Pattern 5: Shipping the hook without the test stub

**What people do:** add `matchMedia` usage; the first `.dom.test.tsx` that renders Layout crashes (`window.matchMedia is not a function`) — and the fix is per-test mocks scattered across dozens of files.
**Why it's wrong:** jsdom has no `matchMedia` (verified against the repo's jsdom 30); repo has no `setupFiles`, so the crash reaches every Layout-touching test at once.
**Do this instead:** one setup file, installed in `vitest.config.ts` `setupFiles`, stubbing desktop (`matches:false`) only when `matchMedia` is undefined — every existing test keeps its desktop semantics untouched.

---

## Integration Points

### Files/Layers That Change (the definitive list for planning)

| Layer | File(s) | Change type | Notes |
|-------|---------|-------------|-------|
| Shell | `web/src/app/Layout.tsx` | modify (small) | hook + conditional chrome + `h-dvh` + `p-4 md:p-6` |
| HTML host | `web/index.html` | modify (one token) | `viewport-fit=cover`; keep away from the FOUC script block |
| Tokens/CSS | `web/src/index.css` | modify (additive) | safe-area helpers, bottom-bar tokens (locked design bible values) |
| Page shell | `web/src/lib/pageShell.ts` | modify (one string) | `gap-6 md:gap-10` in `PAGE_SHELL`; `PAGE_SHELL_TABBED` untouched |
| New chrome | `components/mobile/BottomNav.tsx`, `MoreSheet.tsx` | new | feature folder, hand-rolled, no kit |
| New hook | `lib/useMediaQuery.ts` | new | contains the breakpoint literal |
| Nav derivation | `lib/navModel.ts` (optional) | new / extracted | shared gating for Sidebar + MoreSheet |
| Nav (desktop) | `components/Sidebar.tsx` | modify (maybe) | only if navModel extracted; hue logic stays |
| Tree | `components/SelectionTree.tsx` | modify (additive classes) | touch density only; ARIA contract untouched |
| Pages | `pages/{Dashboard,Containers,Files,Recovery,VMs,Flash,Config,Receiver,Fleet,Settings}.tsx` | modify (sweep) | class-level; per-page "no change ≥ breakpoint" audit |
| Test infra | `vitest.config.ts`, `test/matchMedia.setup.ts` | new | desktop-default stub |

**Explicitly frozen:** `app/router.tsx`, `lib/api.ts`, `lib/progress.ts`, the `backupPaths`/`selectedPaths` contracts, everything under `internal/**`. If a mobile task reaches for any of these, it has left the milestone's architecture.

### Known hard spots (discovered in-code, not speculative)

| Spot | Problem | Where it lands |
|------|---------|----------------|
| Settings' 7-tab Selector strip | measures 1424px in `de` (the documented `PAGE_SHELL_TABBED` exception) — unusable at phone width | MOBILE-03: horizontal-scroll or collapsed tab treatment on `Settings.tsx`; the width-cap exception comment must be updated, not bypassed |
| Dashboard drag-reorder | HTML5 DnD never fires from touch (`useDragReorder.ts`) | MOBILE-02/03: move-to-end/up-down buttons or long-press; a product call, flagged early |
| `InfoBubble` / `useTipBubble` | hover-only show | MOBILE-04 sweep: tap toggle fallback |
| `whatsNew` / `ConfirmDialog` surfaces | dialog max-widths assume desktop columns | MOBILE-04 sweep: small-viewport check |
| i18n | new mobile keys (More sheet title, pinned-bar copy) × 42 locales, parity tests enforce | each MOBILE phase; reuse existing `nav.*` keys wherever the label is the same destination |

---

## Suggested Build Order (desktop non-regressing at every boundary)

Ordering rationale: infrastructure before chrome, chrome before pages, tree-adjacent pages before the long tail, and the parity sweep last — every step is independently shippable and every step's desktop diff is provably empty.

1. **MOBILE-01a — invisible infrastructure.** `matchMedia` test stub (setupFiles, desktop default) → `useMediaQuery` + breakpoint literal + fragile-pair comment (+ optional parity guard test against the Tailwind `md:` literal). *Desktop gate: zero rendered change; full dom suite green because the stub preserves today's desktop semantics.*
2. **MOBILE-01b — the shell switch.** Layout hook branch (Sidebar | BottomNav+MoreSheet), `h-dvh`, `p-4 md:p-6`, `viewport-fit=cover`, safe-area bar padding, navModel extraction if taken. *Desktop gate: above 48rem the rendered JSX is byte-equivalent to today's (dvh==vh, `md:` values identical); Sidebar dom tests all still pass.*
3. **MOBILE-02 — the four maquette screens.** Dashboard, Containers (+tree touch + pinned preview), Files (+tree), Recovery/Run detail — page-scoped diffs, container queries inside cards. *Desktop gate: per-page — each diff auditable as "no visible change ≥ md"; SelectionTree dom tests untouched and green.*
4. **MOBILE-03 — the six remaining destinations.** VMs, Flash, Config, Receiver, Fleet, Settings (Selector strip treatment lives here). *Desktop gate: same per-page audit; the Settings exception comment updated deliberately.*
5. **MOBILE-04 — parity + touch sweep on real devices.** iOS Safari + Android Chrome: guided restore guard dialogs, schedules (`TimePicker`, `CadenceBuilder`), notifications, replication, landscape insets, `InfoBubble` tap fallback, drag-reorder fallback decision, dialogs at 360px. *Desktop gate: regression suite + a manual desktop pass; nothing in this phase should touch ≥ breakpoint CSS at all.*

---

## Sources

**First-party (verified in this repository — HIGH confidence):**
- `web/src/app/Layout.tsx`, `app/router.tsx`, `lib/pageShell.ts`, `components/Sidebar.tsx`, `components/SelectionTree.tsx` — shell structure, route table, PAGE_SHELL contract, nav gating, tree ARIA contract
- `web/package.json`, `vitest.config.ts`, `web/index.html` — Tailwind 4.3.3, no setupFiles, viewport meta state
- `web/src/lib/useDragReorder.ts`, `lib/useTipBubble.tsx`, `pages/Dashboard.tsx` (`@[44rem]`) — drag reorder, hover bubbles, container-query precedent
- Local jsdom 30 probe: `typeof window.matchMedia === "undefined"` (run against this repo's own devDependency)
- `design/mobile/README.md` @ `mobile-design-concepts` (`0b64c7df`) — locked tokens, 4-tab + More structure, maquette screen inventory

**Framework docs (Context7, seam tier MEDIUM):**
- Tailwind CSS v4 — `--breakpoint-*` theme tokens, mobile-first min-width variants, `max-*:` variants, built-in container queries (`@container`, `@max-md:`)
- React — `useSyncExternalStore` contract (immutable snapshot, subscribe/unsubscribe, `getServerSnapshot` for SSR)

**Web sources (WebFetch, seam tier LOW; used where cross-checked or locally corroborated):**
- WebKit Blog, "Designing Websites for iPhone X" — `viewport-fit=cover`, `env(safe-area-inset-*)`, fallback-declaration rule, `max()` combination (cross-checked with MDN)
- MDN, CSS `<length>` — `svh`/`lvh`/`dvh` semantics, the 100vh problem, support matrix (cross-checked with WebKit)
- W3C WAI-ARIA APG, TreeView pattern — roles, keyboard map, lazy-tree `aria-level`/`setsize`/`posinset`, and the verified absence of any touch guidance (presentation-only adaptation justified)
- CSS-Tricks, "CSS Container Queries" — media-vs-container query selection, container sizing constraints
- Material 3 navigation bar / iOS HIG tab bar — 4-tabs+More overflow shape (m3.material.io is JS-rendered and unfetchable; treated as established practice, not a fetched quote)

---
*Architecture research for: BombVault v1.1 Mobile Interface — responsive SPA integration*
*Researched: 2026-09-11*
