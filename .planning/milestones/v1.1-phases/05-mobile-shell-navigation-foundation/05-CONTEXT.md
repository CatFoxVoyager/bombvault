# Phase 5: Mobile Shell & Navigation Foundation - Context

**Gathered:** 2026-09-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Below the 48rem breakpoint the SPA presents a working mobile shell — bottom bar, More sheet, safe-area- and keyboard-correct viewport — while the desktop layout above the breakpoint renders unchanged, and the Playwright harness makes responsive regressions fail CI from here on. Requirements: SHELL-01..07, PRIM-01, VERIFY-01.

</domain>

<decisions>
## Implementation Decisions

### Barre & feuille More (chrome composition)
- More sheet trigger = a dedicated 5th bottom-bar slot labelled "More" (⋯-class icon) — the design bible locks 4 destinations; the trigger is not a destination and does not count against the M3/HIG destination rules. Tapping opens the hand-rolled bottom sheet.
- Destination order inside the More sheet = desktop sidebar order (Recovery, VMs, Flash, Config, Receiver, Fleet), derived from the ONE shared nav registry — no separate ordering logic to maintain.
- Sign-out = item at the bottom of the More sheet, visually separated (muted treatment) — reachable in one tap per SHELL-03; it is not a destination and does not appear in the desktop sidebar position.
- Active state: when the current route is one of the More destinations, the corresponding item inside the sheet is highlighted (same accent-tint language as the bottom bar items) so the user is never lost on /vms, /flash, etc.

### Viewport, clavier, login (shell correctness)
- Root sizing: replace the existing `h-screen` in `Layout.tsx` with `h-dvh`; use `svh` for regions that must stay visible (bottom bar). Never `100vh` anywhere in the mobile shell (SHELL-05).
- iOS keyboard (no `interactive-widget` equivalent): ONE `focusin`/`visualViewport` mechanism, centralized at the Layout level in this phase — not per-page.
- Login routes render WITHOUT mobile chrome: full-screen, centered card, safe-area correct, inputs ≥ 16px effective font (SHELL-07). The bottom bar appears only for authenticated app destinations.
- Landscape: bottom bar stays at the bottom in BOTH orientations (success criterion 2 covers landscape; a landscape side rail would be a new component out of scope).

### Harnais Playwright & CI (VERIFY-01)
- CI wiring: a separate `playwright` job inside the existing `lint.yml` workflow — one badge, the gate already exists, runs parallel to the Go job.
- Browsers in CI: Chromium + WebKit — Safari is half this milestone's mobile audience; WebKit headless catches layout divergence early.
- Desktop-untouched assertions: ALL page-level routes via a parameterized loop (Sidebar visible + expected desktop layout at ≥ 48rem viewport) — the success criterion says "per-page".
- Server under test: compiled Go binary + wait for `/api/health` (precedent: the CI Docker boot smoke test). Without a docker socket, pages render in their empty states but the chrome/layout is what the assertions check. No vite preview (zero API), no MSW (new dependency — forbidden).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/app/Layout.tsx` (209 lines) — the ONE chrome switch point: `<div className="flex h-screen overflow-hidden">` → `<Sidebar>` + `<main class="flex-1 overflow-y-auto p-6">` → `<Outlet/>`. The `h-screen` here is the SHELL-05 replacement target. Sidebar receives `settings` + `authEnabled` props (sign-out lives inside Sidebar today).
- `web/src/components/Sidebar.tsx` — all 10 settings-gated destinations with icons + labels (`/dashboard`, `/recovery`, `/containers`, `/vms`, `/flash`, `/files`, `/config`, `/receiver`, `/fleet`, `/settings`) — the source of truth the shared nav registry extracts.
- Research-verified building blocks: Tailwind 4.3.3 (`md:` = 48rem breakpoint, `dvh`/`svh` utilities, container queries, `hover:` already gated by `@media (hover: hover)`), React 19 `useSyncExternalStore` for the media-query hook, react-router-dom 7 classic `NavLink` for bottom-bar tabs.

### Established Patterns
- No state library — component-local `useState` + Context providers; module singletons only for progress/display-prefs.
- Tailwind utility classes over semantic tokens (`carbon-*`, `accent*`, `status*`) — never raw hex; shared controls carry `glim-*` engine classes.
- Every user-visible string through `t()` from `useT()` (lint-enforced); named exports everywhere (default exports only for locale modules + `Recovery.tsx`).
- Long narrative "why" block comments at the top of nontrivial files; exceptions declared in `eslint.config.js`, never inline disables.

### Integration Points
- `Layout.tsx` media-query decision is the single JS breakpoint; all in-page adaptation is CSS-only (`max-md:` variants) — never a second page tree.
- New chrome components live in a new `web/src/components/mobile/` folder; the new pure nav derivation in a new `web/src/lib/navModel.ts` feeding BOTH Sidebar and MoreSheet.
- `web/index.html` viewport meta extension + `theme-color` go BELOW the untouched FOUC script (SHELL-06).
- Frozen: `router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, everything under `internal/**`.
- Guard test pins the fragile pair between the `useMediaQuery` breakpoint literal `(min-width: 48rem)` and the CSS `md:` boundary.
- jsdom 30 has no layout → matchMedia test stub needed in `vitest.config.ts` setupFiles (desktop-default).

</code_context>

<specifics>
## Specific Ideas

- Design bible is the locked reference: `design/mobile/README.md` + `android.html`/`ios.html` maquettes @0b64c7df (branch `mobile-design-concepts`) — carbon tokens, accent `#FCC419` with `on-accent` ink never white, four-status rule, M3 navpill bar / HIG tinted tab bar. Platform-expression polish (navpill, FAB, large title) is PLAT-01 / Phase 7 — Phase 5 ships the structural shell in the shared language.
- Research flags for planning: Playwright harness setup (config, device descriptors, CI wiring) has NO in-repo precedent — targeted research recommended at plan time.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Landscape side rail noted as a possible v2 idea if device testing shows a need; not committed.)

</deferred>
