# Project Research Summary

**Project:** BombVault v1.1 — Mobile Interface
**Domain:** Responsive mobile layer on an existing desktop-first React 19 / Vite 8 / Tailwind 4 SPA (Go-embedded, self-hosted backup UI)
**Researched:** 2026-09-11
**Confidence:** HIGH

## Executive Summary

v1.1 turns the existing BombVault SPA into a fully operational mobile interface: a breakpoint-scoped mobile shell (bottom bar with Home / Containers / Files / Settings + a "More" sheet) per the locked design bible (design/mobile/README.md, commit 0b64c7df on branch mobile-design-concepts), with the desktop layout untouched above the breakpoint and **full operational parity below it** — not a view-only companion. Competitive research is unambiguous: every restic-ecosystem UI (Backrest, Vorta-class) and NAS/container admin tool (Unraid, TrueNAS, Proxmox, Portainer) ships desktop-first pages rendered on glass; only Home Assistant proves one-responsive-codebase-with-parity is achievable. Parity on a phone is therefore both the table stakes (responsive shell) and the differentiator (operate, don't just watch — trigger backups, edit selections, run guided restores from the driveway).

The recommended approach is **zero new dependencies and zero backend changes**. Everything is built from what the repo already has: a two-token viewport meta edit, ~60 lines of hand-rolled CSS (safe-area, touch affordance, dvh), one ~15-line `useMediaQuery` hook quarantined to `Layout.tsx` (the single chrome switch point), hand-rolled `BottomNav`/`MoreSheet` components in a new `components/mobile/` folder, and Tailwind `max-md:` variants / container queries adapting pages **in place** — never a second page tree. `router.tsx`, `web/src/lib/api.ts`, and all of `internal/**` are frozen. The milestone is presentation-only.

The dominant risks are all *invisible in desktop testing*: `100vh` puts the bottom bar under the mobile URL bar; safe areas are a two-half contract (`viewport-fit=cover` AND `env()`); iOS keyboards never resize the layout viewport; Tailwind v4 already gates `hover:` behind `@media (hover: hover)` so hover-only affordances silently vanish on touch; jsdom does no layout and there is no e2e suite, so responsive regressions fail no existing test; and emulation is not a device. Mitigation is structural: a Playwright smoke harness (with desktop-untouched assertions) lands in Phase 1, the real-device pass is a Phase 4 exit criterion, and every mobile style is scoped below one breakpoint (48rem / Tailwind `md:`) so "desktop intact" is testable with one number.

## Key Findings

### Recommended Stack

Zero new npm dependencies, zero Go changes, zero Docker/build changes. See `.planning/research/STACK.md`.

**Core technologies (all existing):**
- **Tailwind CSS 4.3.3** — breakpoints (`md:` = 48rem = the one switch), `dvh` utilities, built-in container queries, and `hover:` already gated by `@media (hover: hover)` — keep; add nothing.
- **React 19.2.7** — `useSyncExternalStore` for the media-query hook; `inert` as a true boolean prop for the More sheet backdrop; component-local `useState` for all chrome state. No state library.
- **react-router-dom 7.18.1** — bottom bar is four `NavLink`s to the *same* flat routes; `router.tsx` untouched.
- **Vite 8.1.5** — `viewport-fit=cover` / `theme-color` in `web/index.html` flow into the embedded dist automatically; default build target (Safari 16.4+) already covers every CSS feature needed.

**Four hand-rolled additions (code, not packages):**
1. Viewport meta extension + `theme-color` (`web/index.html`, below the untouched FOUC script).
2. ~40–60 lines of CSS in `web/src/index.css`: safe-area (`env()` with `0px` fallback, centralized as custom properties), `touch-action: manipulation`, `overscroll-behavior: contain`, `svh`/`dvh` cascade.
3. A new `web/src/lib/useMediaQuery.ts` (~15 lines) will hold the one breakpoint literal `DESKTOP_QUERY = "(min-width: 48rem)"` as a fragile pair with the CSS `md:` boundary, pinned by a guard test.
4. Tailwind `max-md:` variants on existing components; new chrome in `components/mobile/`.

**Explicitly rejected:** any UI kit or headless sheet library (Radix, vaul, MUI), state libraries, PWA/service-worker tooling (stale-bundle liability for a committed-dist self-hosted app), native wrappers (Capacitor/React Native), a second mobile route tree, `hover:` custom-variant, `100vh`, and zoom-disabling viewport hacks.

### Expected Features

See `.planning/research/FEATURES.md`. The five maquette surfaces (Home, Containers, touch selection tree, File sets, Run detail/Recovery) are locked by the design bible; the six More destinations extend the same language.

**Must have (table stakes — P1):**
- Mobile shell: bottom bar (4 tabs) + More sheet, safe-area correct, `dvh`/`svh` sizing, desktop untouched above 48rem — **gates everything**
- Bottom-sheet + tap-popover primitives (hand-rolled, focus-trapped, scroll-contained) — gate 6+ later surfaces
- Glanceable Home: next run, recent runs (four-status badges), repo health, thumb-zone "New backup" with consequence-aware confirm + deep-link to the live run
- Containers: summary line + status cards, then per-container detail
- Touch tri-state selection tree: full-row targets of at least 44px, chevron/check hit-area separation, pinned live "handed to restic" count, Save pinned in a bottom action bar — wired to the existing serialized save queue, semantics byte-identical
- File sets screen (shares the tree implementation by construction)
- Run detail: stats triad, mono snapshot id, activity log naming exclusion reasons, verify/browse, restore entry point
- Guided restore mobile flow: preflight, consequence-naming bottom-sheet confirm, dry-run/verify, live progress; restore control secondary-styled
- Visibility-aware refresh: SSE pauses on `visibilitychange` hidden, refetch on visible (background tabs throttle timers; SSE tabs are exempt — the app must explicitly stop work)

**Should have (differentiators — P2):**
- VMs, Flash, Config, Receiver, Fleet in the card language (mostly re-chrome)
- Settings with full-screen sheet editors; schedule / notification / replication editing parity
- Sticky search/filter + load-more pagination (never infinite scroll)
- Platform-adaptive chrome completion (M3 navpill/FAB vs HIG large-title)
- Full operational parity itself — unmatched in the restic/NAS space

**Defer (v2+):** PWA installability, web push (server notification channels already cover alerting), junk-folder suggestion chips, tree fanout into ExcludesEditor, biometric/native integrations.

**Anti-features (do not build):** hamburger-drawer primary nav; native wrappers/push; drag-to-reorder on touch (conflicts with scroll); hover-dependent affordances ported as-is; a fifth status hue; desktop tables with horizontal scroll; per-subfolder retention/schedules (#91/#24 discipline); confirm-in-confirm modal chains.

### Architecture Approach

The architecture research (`.planning/research/ARCHITECTURE.md`) verified in-code that this is a clean, presentation-only integration. Five patterns define it:

1. **Hybrid breakpoint strategy:** exactly one JS media-query decision (Layout choosing Sidebar vs BottomNav+MoreSheet); all in-page adaptation is CSS-only. CSS-hiding the live Sidebar is rejected (it runs subscriptions/dialogs); a route-level split is rejected (breaks single-URL, doubles i18n across 42 locales).
2. **Bottom bar + More sheet = second rendering of one nav registry.** Extract a pure `destinations(settings)` derivation into a new `web/src/lib/navModel.ts` that will feed both Sidebar and MoreSheet so settings-gated tabs can never drift; sign-out must be reachable in mobile chrome.
3. **Pages responsive in place** — `PAGE_SHELL` gains responsive rhythm (`gap-6 md:gap-10`); container queries inside cards for tree-adjacent affordances; per-page "no visible change at or above md" audits.
4. **Shell correctness:** `h-dvh` root; bottom bar **in normal flow** (flex sibling), not `position:fixed` — sidesteps toolbar/keyboard/rubber-band pitfalls entirely.
5. **SelectionTree under touch = presentation only.** The APG contract (`aria-checked`, roving tabindex, Space-through-`onToggle`) stays byte-identical; ALL pointer input funnels into the same `onToggle`; tap updates roving tabindex; the pinned count re-presents existing SELECT-03 state with zero new computation.

**Explicitly frozen:** `router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, the selection/backupPaths contracts, everything under `internal/**`.

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all twelve. The top five:

1. **Mobile shell collides with lint-enforced desktop conventions** (`page-uses-page-shell`, routed-pages test, single-Sidebar assumption) — decide the PAGE_SHELL architecture in Phase 1, declare exceptions only in `eslint.config.js` with rationale (never inline disables), one nav registry, sign-out preserved.
2. **A second input path into the selection tree** (pointer handlers writing selection state, bypassing the D-04 guard / save queue; tap not updating roving tabindex) — all input funnels through the same `onToggle`; activation on `click` only; dom-test twins for tap and keyboard.
3. **`100vh` shell trap + safe areas done half-way** — `svh` cascade for static chrome, `dvh` only where tracking is wanted; `viewport-fit=cover` AND `env()` together, insets centralized as CSS custom properties; bottom bar in normal flow; verified in both orientations on notched and SE-class devices.
4. **Hover-only affordances silently vanish on touch** (Tailwind v4 gates `hover:` behind `@media (hover: hover)`) — every interactive affordance must have a non-hover path; grep `hover:opacity-*` / `group-hover:` / `hover:flex` reveal patterns during the screen phases.
5. **Responsive regressions are invisible to the entire test stack, and emulation is not a device** — jsdom does no layout, there is no e2e suite, Playwright emulation fakes no safe areas/keyboard/PTG. Minimal Playwright smoke harness (desktop-untouched assertions + mobile descriptors) from Phase 1; real iPhone Safari + Android Chrome checklist is the Phase 4 exit criterion.

Also load-bearing: keyboard vs fixed bar on iOS (the `interactive-widget` meta is Android-only — one `focusin`/visualViewport mechanism in Phase 1); 42-locale text overflow in compact chrome (de+fr passes at 320–360px are definition-of-done for the shell); bundle growth in the single un-code-split chunk (baseline in Phase 1, budget in Phase 4); never hard-code the design bible's dark hex values — semantic tokens only, both themes verified (light theme exists and mobile is new code).

## Implications for Roadmap

Research converges on a four-phase structure: infrastructure before chrome, chrome before pages, tree-adjacent screens before the long tail, parity sweep last. Every phase boundary has a provably-empty desktop diff.

### Phase 1: Mobile shell foundation (MOBILE-01)
**Rationale:** the shell gates everything; every convention, unit-policy, and harness decision made here is inherited by all later phases and is far cheaper to get right first than to retrofit across 11 screens.
**Delivers:** matchMedia test stub (desktop-default, installed in `vitest.config.ts` setupFiles); `useMediaQuery` + breakpoint literal + fragile-pair guard test; Layout chrome switch (Sidebar | BottomNav+MoreSheet) via one nav registry (`navModel.ts`); `h-dvh`; `viewport-fit=cover` + `theme-color`; centralized safe-area CSS variables; touch-affordance utilities; scroll-container policy (`overscroll-behavior`); keyboard mechanism (`focusin`/visualViewport); Playwright smoke harness with desktop-untouched assertions; bundle-size baseline; de/fr narrow-viewport pass on the chrome.
**Addresses:** Table-stakes shell; More sheet stub. **Avoids:** Pitfalls 1, 3, 4, 5, 6 (policy), 9 (chrome), 10 (harness), 11 (baseline), 12 (token discipline).

### Phase 2: The four maquette screens (MOBILE-02)
**Rationale:** the design bible's five locked surfaces, sequenced after the shell exists; includes the milestone's hardest UI work (touch tree) and an early real-device reality check to recalibrate before the long tail.
**Delivers:** Home (glanceable + trigger backup + visibility-aware refresh), Containers + touch SelectionTree variant (pinned count, 44px-class rows, save queue unchanged) with the early device check, File sets (shares the tree), Run detail / Recovery. Begins the hover-reveal audit and touch-target sweep.
**Addresses:** P1 core screens; the signature touch tree; differentiator parity begins. **Avoids:** Pitfalls 2, 7, 8; verify keyboard parity (APG suite) after touch lands.

### Phase 3: Remaining destinations (MOBILE-03)
**Rationale:** the More sheet's six destinations land independently once shell + card + sheet patterns are proven; mostly re-chrome over existing data plumbing.
**Delivers:** VMs, Flash, Config, Receiver, Fleet, Settings (Selector-strip 1424px treatment lives here); full-screen sheet editors over TimePicker/CadenceBuilder; notification + replication parity; sticky search/filter + load-more; per-destination de/fr and touch-target sweeps; hover audit completed.
**Addresses:** P2 parity contract. **Avoids:** Pitfalls 1 (Settings exception comment updated deliberately, never bypassed), 7, 8, 9.

### Phase 4: Parity, polish, real-device verification (MOBILE-04)
**Rationale:** cross-cutting verification is meaningless until every screen exists; guided restore and touch polish ride on proven primitives.
**Delivers:** guided restore wizard end-to-end on device (with sessionStorage checkpoint against pull-to-refresh), InfoBubble tap fallback, drag-reorder fallback decision, dialogs at 360px, landscape insets, keyboard-open verification of every form, both themes, de/fr, APG keyboard regression suite, bundle audit vs budget (code-split decision), stale-embed discipline, and the **real-device pass (notched + SE-class iPhone Safari, Android Chrome, portrait + landscape) as the exit criterion**.
**Addresses:** "Looks Done But Isn't" checklist; differentiator DR-from-phone. **Avoids:** Pitfalls 2 (re-verify), 5, 6, 10, 11, 12.

### Phase Ordering Rationale

- **Dependency-driven:** the shell + primitives gate all ten destinations (FEATURES dependency graph); sheet/popover primitives gate 6+ surfaces and are built once in Phase 1/2.
- **One tree implementation stays one:** the touch variant is an interaction-layer variant of `SelectionTree`, built once in Phase 2, reused by Containers and File sets by construction.
- **Desktop non-regression at every boundary:** each phase's desktop diff is auditable as empty — the architecture's per-page audit rule plus the Phase 1 Playwright assertions make "desktop intact above the breakpoint" asserted, not vibes.
- **Device testing is front-loaded (early Phase 2 check) and back-loaded (Phase 4 exit criterion)** — cheap recalibration early, systemic sign-off late; "deferring all devices to the end" is a named debt pattern.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-plan-phase --research-phase`):
- **Phase 2:** the touch SelectionTree variant is the milestone's hardest work — pointer-event semantics, roving-tabindex-on-tap, and hit-area mechanics deserve targeted research at plan time.
- **Phase 1:** Playwright harness setup (config, device descriptors, CI wiring into `lint.yml`) has no in-repo precedent.

Phases with standard patterns (skip research-phase):
- **Phase 3:** card re-chrome over existing pages; sheet editors reuse proven primitives.
- **Phase 4:** verification sweep; mechanisms all exist by then.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Zero-dependency approach grounded in direct repo inspection + primary vendor sources (WebKit, Chrome, MDN) at the LOW webfetch tier but cross-checked; Context7 MEDIUM for Tailwind/Vite/React specifics |
| Features | HIGH for product decisions | Locked design bible + maquettes @0b64c7df + live codebase inventory (local, primary); ecosystem claims MEDIUM where vendor pages were unfetchable (Synology, M3/HIG specifics) |
| Architecture | HIGH | Every integration claim verified directly against the repo (Layout/router/pageShell/SelectionTree/jsdom probe); framework mechanics MEDIUM |
| Pitfalls | HIGH | Code-grounded pitfalls cited file:line; platform behavior claims all from official vendor docs, several cross-checked across two independent sources |

**Overall confidence:** HIGH — this milestone is unusually well-grounded because it is presentation-only on a codebase the research verified directly, against a locked design bible.

### Gaps to Address

- **React 19 `inert` boolean-attribute support** — Context7 query drifted; confirm before relying on `<div inert={open}>` (fallback: `setAttribute` in an effect).
- **iOS standalone/A2HS with self-signed TLS** — unverified; only relevant if PWA is ever revisited (deferred to v2+ anyway).
- **Breakpoint edge (640–767px devices)** — decide empirically in Phase 1 device testing; the `--breakpoint-*` override is a one-line change if large phones render desktop badly.
- **iOS keyboard overlap in sheets** — no `interactive-widget` equivalent; `scrollIntoView`/VisualViewport pattern only if observed, per-screen; do not pre-build.
- **M3 / HIG platform-adaptive specifics** — m3.material.io and Apple HIG were JS-shelled and unfetchable; treat cited specifics (navpill, large-title) as directional and verify wording before user-facing docs.
- **`just web` vs "commit `web/dist`"** — the CLAUDE.md says commit dist; the researcher found `.gitignore` keeps dist ignored except a placeholder (build-fresh-in-Docker is the enforced mechanism). Resolve the doc discrepancy during Phase 1; do not touch `.gitignore` without an explicit decision.

## Sources

### Primary (HIGH confidence)
- design/mobile/README.md + `android.html` / `ios.html` maquettes @0b64c7df — locked tokens, four-status rule, bottom-nav IA, per-screen content
- Direct codebase inspection: `Layout.tsx`, `router.tsx`, `pageShell.ts`, `Sidebar.tsx`, `SelectionTree.tsx`, `index.html`, `package.json`, `vitest.config.ts`, `.planning/codebase/` — shell structure, contracts, test-stack reality
- `.planning/PROJECT.md` — Key Decisions (Space-through-onToggle, one-deep save queue, D-04 guard)

### Secondary (MEDIUM confidence)
- Context7: Tailwind v4 (breakpoints, `hover:` gating), Vite 8 (build target), React 19 (`useSyncExternalStore`, `inert`)
- Category consensus: NAS/container admin mobile posture (Unraid/TrueNAS/Proxmox/Portainer), Home Assistant responsive model

### Tertiary (LOW confidence — primary vendor/spec sources at the webfetch seam tier)
- WebKit blog (viewport-fit, env(), rotation), Chrome Developers blog (interactive-widget, resizes-visual), MDN (dvh/svh, overscroll-behavior, Page Visibility, env())
- W3C WCAG 2.2 Understanding (2.5.8 target size, 1.4.1 use of color), W3C ARIA APG tree pattern
- NN/g confirmation-dialog guidance; Material bottom-navigation archive; Backrest/Uptime Kuma READMEs (gap evidence)
- Flagged for implementation-time verification: React 19 `inert`, iOS A2HS + self-signed TLS, HIG/M3 specifics

---
*Research completed: 2026-09-11*
*Ready for roadmap: yes*
