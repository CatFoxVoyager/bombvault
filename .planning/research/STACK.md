# Stack Research — v1.1 Mobile Interface (Responsive SPA Layer)

**Domain:** Mobile-responsive layer on an existing hand-rolled React/Vite SPA (Go-embedded, self-hosted backup UI)
**Researched:** 2026-09-11
**Confidence:** MEDIUM

## Headline Verdict

**Zero new npm dependencies.** The entire mobile-responsive layer is built from things the project already has, plus four small hand-rolled additions:

1. **Two-line edit to `web/index.html`** — extend the viewport meta (`viewport-fit=cover`, `interactive-widget=resizes-content`) and add `theme-color`. This is the only "install-like" change in the milestone.
2. **~40–60 lines of hand-rolled CSS in `web/src/index.css`** — safe-area padding utilities, touch-affordance rules, overscroll containment. No new build step.
3. **One ~15-line `useMediaQuery` hook in `web/src/lib/`** — the only new JS, for JS-driven chrome swapping (Sidebar ↔ bottom bar). `matchMedia` is already used in `lib/theme.ts`, so the pattern has precedent.
4. **Tailwind responsive variants (`max-md:` / `md:`) on existing components** — Tailwind CSS v4 is already the styling system (`@import 'tailwindcss'` + `@theme` tokens in index.css); breakpoints, `dvh` height utilities, and touch-safe hover behavior ship with it.

Go backend: **zero changes** (every endpoint the mobile UI needs exists; SSE works in mobile browsers in-tab). Vite config, the committed `web/dist` embed, and the Docker multi-arch build: **zero changes** — `index.html` is the Vite entry, so meta edits flow into the committed dist automatically via the existing `tsc --noEmit && vite build` process.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why / Verdict |
|------------|---------|---------|---------------|
| Tailwind CSS (existing) | 4.3.3 | Breakpoint switch, mobile layout, `min-h-dvh`, `overscroll-contain`, `touch-*` utilities | Already the project's styling engine with carbon tokens in `@theme`. v4 breakpoints: `sm`=40rem (640px), `md`=**48rem (768px)**, `lg`=64rem. v4's `hover:` variant already compiles inside `@media (hover: hover)`, so desktop hover styles will NOT stick on touch — a v3-era reason to add libraries that no longer exists. **Keep; add nothing.** |
| react-router-dom (existing) | 7.18.1 | Bottom-bar navigation via `NavLink` (gives `aria-current="page"` + active class for the M3 navpill/HIG tint) | Bottom bar is just four `NavLink`s in a `fixed bottom-0` flex row. **Keep; add nothing.** |
| React (existing) | 19.2.7 | More-sheet + shell state via local `useState`; `inert` boolean attribute to blind the background while the More sheet is open | React 19 handles `inert` as a true boolean attribute (`setAttribute('inert','')`), so `<div inert={sheetOpen}>` is one prop, no workaround. More-sheet open state is component-local — no state library. **Keep; add nothing.** |
| Vite (existing) | 8.1.5 | Build; committed `web/dist` embed | Default `build.target` is `baseline-widely-available` (2026-01-01): Chrome 111+, Edge 111+, Firefox 114+, **Safari 16.4+**. The bundle already requires iOS 16.4+; every CSS feature this milestone needs is at or below that floor, so the mobile layer introduces no support regression. **No config change.** |
| `useMediaQuery` hook (new, hand-rolled) | — | Flip `Layout.tsx` chrome (Sidebar ↔ bottom bar + More sheet) below the breakpoint | ~15 lines: `matchMedia` + `useSyncExternalStore`. Precedent exists (`lib/theme.ts`, `Dashboard.tsx` use `matchMedia`). CSS media queries do the styling; the hook is only for conditional *subtrees*. A library (`react-responsive`) would violate the hand-rolled constraint for no capability gain. |

### The Four Concrete Additions (code, not packages)

**1. Viewport meta — edit `web/index.html` line 34:**

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" content="#161616" />
```

- `viewport-fit=cover` — required for `env(safe-area-inset-*)` to ever be non-zero on iOS; without it Safari auto-insets the page and the fixed bottom bar can never extend its surface under the home indicator (WebKit, "Designing Websites for iPhone X").
- `interactive-widget=resizes-content` — Chrome Android 108+ defaults to `resizes-visual`: the keyboard overlays the layout viewport and a `position: fixed` bottom bar stays put and gets buried. This key restores layout resizing so the bar/inputs sit atop the keyboard. iOS Safari ignores the key harmlessly (it has always behaved visual-only; resize logic there is handled by the keyboard being an overlay with visual-viewport scrolls). Unknown meta keys are ignored by all other browsers — the addition is safe everywhere (Chrome Dev blog, "viewport resize behavior").
- `theme-color` — tints mobile browser chrome to the carbon `bg` `#161616`; no manifest needed. (If a light theme value is wanted later, use the two-`<meta>` `media=` pattern; the FOUC script at the top of index.html is untouched.)

**2. Safe-area CSS — new utilities in `web/src/index.css`** (greenfield: no `env(`/`safe-area`/`dvh` rules exist yet):

```css
/* Bottom bar: background extends under the home indicator; controls stay above it. */
.mobile-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
/* Page content: clear the bar plus the inset. */
.safe-bottom {
  padding-bottom: calc(3.75rem + env(safe-area-inset-bottom, 0px));
}
```

Key facts driving this: insets are `0` when browser UI already occupies the space (iOS Safari portrait in-tab reports bottom inset 0; Chrome Android with the toolbar shown likewise), non-zero in landscape (side insets) and in standalone/home-screen mode (~34px bottom). So use `env()` unconditionally with a `0px` fallback — it is free when 0 and correct when not. Legacy `constant()` (pre-iOS 11.2) is dead; do not add it. Where a base padding must survive 0 insets, use the `max(base, env(...))` form inside `@supports (padding: max(0px))` per the WebKit pattern.

**3. Touch-affordance CSS — also `web/src/index.css`:**

```css
.touch-target  { touch-action: manipulation; }        /* kill double-tap-zoom pause on tree toggles, nav */
.no-touch-ink  { -webkit-tap-highlight-color: transparent; }  /* pair with :active states instead */
.scroll-contain{ overscroll-behavior: contain; }      /* More sheet: no scroll-chaining to body */
.nav-row       { user-select: none; }                  /* no long-press selection on nav/tree rows (logs stay selectable) */
```

Nothing else is needed for "touch feel": the 300 ms tap delay is long gone with a correct viewport meta; momentum scrolling is default; `-webkit-overflow-scrolling` is obsolete.

**4. Viewport height — use `dvh` with a `vh` fallback for full-height shells:**

```css
/* or Tailwind: min-h-screen min-h-dvh (v4 ships h-dvh / min-h-dvh / min-h-svh) */
.shell { min-height: 100vh; min-height: 100dvh; }
```

`100vh` on mobile is the *large* viewport, so a 100vh shell bleeds under Safari's expanded toolbar. `dvh` tracks the live toolbar state; `svh` is the conservative choice for always-visible chrome. Support (Chrome/Edge 108, Firefox 101, Safari 15.4) sits below the Vite 8 JS floor (Safari 16.4), and the cascade fallback makes it moot anyway. Note `dvh` does *not* react to the keyboard (keyboard ≠ UA UI) — the `interactive-widget` meta is the keyboard fix.

### Breakpoint Strategy (single decision the roadmap needs)

**One switch at `md:` = 48rem / 768px (Tailwind default; no `@theme --breakpoint-*` override needed).**

- Below 768px: mobile shell — bottom bar (Home, Containers, Files, Settings) + "More" sheet, per the design bible's 392/390px prototypes.
- At/above 768px: existing desktop layout untouched. iPad portrait (768px) gets the desktop UI, which is acceptable (it has room for the sidebar) and — critically — guarantees "desktop intact above the breakpoint" is testable with one number.
- Implementation rule: desktop protection comes from *only adding* `max-md:` variants and mobile-gated CSS; never editing classes the desktop layout depends on. If a rare edge needs mobile-only custom CSS, wrap it in one `@media (width < 48rem)` block rather than sprinkling queries.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Existing vitest + jsdom + testing-library | Component tests for bottom bar / More sheet | No new tooling. Two known gaps: jsdom does not implement `window.matchMedia` (the `useMediaQuery` hook needs a mock — likely already stubbed somewhere for theme tests) and jsdom does no layout, so breakpoint behavior itself is CSS-only and untestable there; test DOM structure/aria, not pixels. |
| Chrome DevTools device mode | Breakpoint + touch emulation during dev | Existing `npm run dev` + proxy to `https://localhost:3443`. |
| Real phone against the Docker image | Safe-area/keyboard/overscroll verification | These four behaviors are unreliable in emulation; the multi-arch image + self-signed TLS already supports LAN testing from a phone. |

## Installation

```bash
# Nothing to install. Zero new dependencies, zero dev dependencies.
# All changes are edits to:
#   web/index.html                    (viewport meta + theme-color)
#   web/src/index.css                 (safe-area, touch, dvh utilities)
#   web/src/lib/useMediaQuery.ts      (new, ~15 lines, hand-rolled)
#   web/src/app/Layout.tsx            (chrome swap + bottom bar + More sheet, hand-rolled)
# Then the existing process: cd web && npm run build && commit web/dist
```

## Alternatives Considered

| Recommended | Alternative | When the Alternative Would Win |
|-------------|-------------|-------------------------------|
| Tailwind default `md:` 48rem breakpoint, used as-is | Custom `--breakpoint-*` in `@theme` (e.g. 42rem) | Only if testing shows 640–767px devices (large phones, small tablets) look wrong as desktop. Decide from device testing, not upfront — the override is one line if needed. |
| One `useMediaQuery` hook | `react-responsive`, `usehooks`-style packages | Never here — any of them is a dependency bought to avoid 15 lines, against the constraint. |
| Hand-rolled More sheet (`fixed` + backdrop + `inert` + existing `useConfirm.tsx` focus-trap pattern) | Radix UI / React Aria / vaul / Headless UI for bottom sheets | If swipe-to-dismiss-with-velocity physics were required. It is not — the design bible specifies tap-outside/close affordances. Reuse the project's existing focus-trap (`useConfirm.tsx`) rather than adding `focus-trap-react`. |
| `viewport-fit=cover` + own inset padding | Safari's default `viewport-fit=auto` auto-insetting | Only if the design never extends under device UI — but the bottom bar must (its surface should run under the home indicator in landscape/standalone), so `cover` is required. |
| `theme-color` meta only | Full PWA manifest + icons + service worker | See "What NOT to Use" — the milestone is a responsive layer, not installability. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any UI kit (MUI, Mantine, AntD) or headless primitive (Radix, React Aria, Base UI, Headless UI, vaul) | Project constraint (no UI kit) and design bible is locked to carbon tokens; kits ship their own token systems that fight it | Hand-rolled components per `components/` conventions, reusing `useConfirm.tsx` focus-trap and `Button.tsx`/`Toggle.tsx` patterns |
| State libraries (zustand, jotai, redux) for sheet/nav state | One boolean of UI state does not justify a dependency; constraint says no state library | Component-local `useState` lifted to `Layout.tsx` |
| PWA tooling (`vite-plugin-pwa`, service workers, manifest in this milestone) | A service worker caching a **committed-dist, self-upgrading** self-hosted app is a stale-bundle liability: every Docker image serves its own hashed assets, and an SW pinned to old chunks survives container upgrades — a classic "my UI didn't update" support burden on exactly the audience (self-hosters) least equipped to debug it. Also pure scope creep: installability is not a v1.1 requirement | `theme-color` + existing `apple-touch-icon` now; manifest/icons only if a later milestone explicitly wants A2HS standalone (then: manifest with `display: standalone` + 192/512 icons; note `apple-mobile-web-app-capable` is deprecated and Safari warns on it) |
| `@custom-variant hover (&:hover)` to restore v3 tap-hover | Deliberately reintroduces sticky hover states on touch | Keep v4's `@media (hover: hover)` gating; add `:active` styles for touch feedback instead |
| `100vh`-based full-height layout | Large-viewport unit: content bleeds under mobile toolbars | `min-h-dvh` (Tailwind v4 ships it) or the `100vh; 100dvh` two-line cascade |
| React-18 `inert=""` string workaround | React 19 treats `inert` as a proper boolean attribute; empty strings trigger a dev warning | `<div inert={isOpen}>` |
| Second route tree / separate mobile pages | Duplicates i18n strings and API wiring across 42 locales; doubles the parity-test surface | Same routes, swapped chrome in `Layout.tsx`; pages adapt internally with `max-md:` variants |
| Native wrapper (Capacitor/Ionic), `touch-action: none` globally, `-webkit-overflow-scrolling: touch`, `constant()` insets | Out of scope / obsolete / would break scrolling | Browser-tab responsive SPA per the design bible |

## Stack Patterns by Variant

**If a mobile screen needs a structurally different subtree (e.g. touch selection tree vs desktop checkboxes):**
- Gate with the `useMediaQuery` hook (or `hidden max-md:flex` classes), keep one component per concept, extend via additive-optional props — the same rule that let `SelectionTree` serve containers and file sets (Key Decision, PROJECT.md). One tree implementation, two presentations.

**If device testing shows 640–767px devices render desktop badly:**
- Add `@theme { --breakpoint-mobile: 48rem; }`-style override or drop the switch to `sm:` (40rem) — one-line change, no code motion. Decide empirically in MOBILE-01, not speculatively.

**If home-screen install (standalone) is ever wanted:**
- Safe-area work is already correct (that's why `viewport-fit=cover` + `env()` lands in this milestone even though insets are mostly 0 in-tab). Then add: manifest (`name`, 192/512 icons, `start_url`, `display: standalone`) + regenerate icons. The status-bar levers (`apple-mobile-web-app-status-bar-style`) remain iOS-only meta tags.

**If the keyboard hides form fields on iOS despite the above:**
- iOS has no `interactive-widget` equivalent; the pattern is `scrollIntoView` on focus within the More sheet/schedule forms (VisualViewport listener). Handle per-screen only if observed — do not pre-build.

## Version Compatibility

| Package / Feature | Compatible With | Notes |
|-------------------|-----------------|-------|
| Tailwind CSS 4.3.3 + Vite 8.1.5 + React 19.2.7 | Already coexisting in repo | No new peers introduced; the milestone adds no package at all |
| CSS `env(safe-area-inset-*)` | iOS 11.2+, Chrome 69+, Firefox 65+ | Far below the Vite 8 JS floor (Safari 16.4); fallback arg covers the rest |
| CSS `dvh/svh` | Chrome/Edge 108, Firefox 101, Safari 15.4 | Below the JS floor; `vh` cascade fallback for anything older |
| `inert` | Chrome 102+, Firefox 112+, Safari 15.5+ | At/below the JS floor |
| `interactive-widget=resizes-content` | Chrome Android 108+ only | Ignored elsewhere by design; iOS keyboard handled per-screen if needed |
| v4 `hover:` gating (`@media (hover: hover)`) | All v4 versions | Existing desktop hover styles already behave correctly on touch — verify no raw `.foo:hover` CSS rules in index.css bypass it (spot-check during MOBILE-01) |

## Integration Points with the Existing Setup

- **`web/index.html`**: the meta edit sits below the existing FOUC-prevention script, which stays byte-identical. Vite copies index.html into `web/dist` on build — the committed-dist embed ships the change with zero Go/infrastructure work.
- **`web/src/app/Layout.tsx`** (209 lines, `<Sidebar/>` + `<main>` scroll container): the swap point. Bottom bar + More sheet render here; `<main>` gains the `safe-bottom` padding so content clears the bar. Existing sidebar sticky-footer/flex conventions in this file should be preserved above the breakpoint.
- **i18n (42 locales)**: bottom-bar labels and More-sheet strings are new keys through the existing `lib/i18n.ts`; the parity/orphan tests will enforce translation coverage automatically. Bottom bar direction: flexbox flips under RTL automatically — no extra work, but add one RTL assertion for the bar.
- **Dark-only carbon theme**: `theme-color` `#161616` matches `--carbon-bg`; no theme-switch interplay (the `data-theme` machinery is untouched).
- **Go backend / Docker**: zero changes. Mobile clients use the same `/api` + SSE surface; the browser handles reconnection on mobile network flaps.

## Sources

Per the classify-confidence seam: Context7 (official library docs) = MEDIUM; web fetches = LOW tier, though all are primary/authoritative platform sources (vendor blogs and standards bodies), which is why the overall file confidence is MEDIUM.

- Context7 `/websites/tailwindcss` (Tailwind v4 docs) — default breakpoints, `@theme --breakpoint-*` customization, v4 `hover:` = `@media (hover: hover)` (MEDIUM)
- Context7 `/vitejs/vite/v8.0.10` (Vite docs + source) — default `build.target` = `baseline-widely-available` (Chrome 111+/Firefox 114+/Safari 16.4+) (MEDIUM)
- Context7 `/react/react/v19.2.7` (React source + fixtures) — `inert` boolean-attribute handling in React 19 (MEDIUM)
- WebKit blog "Designing Websites for iPhone X" — `viewport-fit=cover`, `env()` vs legacy `constant()`, `max(env())` pattern (LOW tier, primary source)
- developer.chrome.com "viewport resize behavior" — `interactive-widget` semantics, Chrome 108 default change (LOW tier, primary source)
- web.dev "Viewport units" (via current URL) — svh/lvh/dvh definitions, support matrix (Chrome 108/FF 101/Safari 15.4), fallback pattern (LOW tier, primary source)
- W3C WAI WCAG 2.2 Understanding 2.5.8 Target Size (Minimum) — 24×24px rule, spacing exception, nav-bar applicability (LOW tier, primary source)
- MDN `env()` and Web/Apps Manifest — inset-zero conditions, bottom-bar padding example; manifest installability fields, iOS A2HS/standalone behavior, deprecated `apple-mobile-web-app-capable` (LOW tier, primary source)
- Repo ground truth — `web/package.json`, `web/index.html`, `web/src/index.css`, `web/src/app/Layout.tsx`, `web/src/components/ConfirmDialog.tsx`/`lib/useConfirm.tsx`, `web/vite.config.ts`, `.planning/codebase/STACK.md` (verified by direct inspection, 2026-09-11)

---
*Stack research for: BombVault v1.1 Mobile Interface — responsive SPA layer*
*Researched: 2026-09-11*
