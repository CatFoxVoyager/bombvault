# Phase 5: Mobile Shell & Navigation Foundation - Research

**Researched:** 2026-09-11
**Domain:** Responsive mobile shell on an existing React 19 / Tailwind 4.3.3 SPA (bottom bar + More sheet + viewport correctness) and a greenfield Playwright e2e harness wired into Go-binary-serving CI
**Confidence:** HIGH (every integration point verified against the live repo this session; external claims cited from official vendor docs; one package flagged SUS by heuristic, mitigated by authoritative-source confirmation)

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Barre & feuille More (chrome composition)**
- More sheet trigger = a dedicated 5th bottom-bar slot labelled "More" (⋯-class icon) — the design bible locks 4 destinations; the trigger is not a destination and does not count against the M3/HIG destination rules. Tapping opens the hand-rolled bottom sheet.
- Destination order inside the More sheet = desktop sidebar order (Recovery, VMs, Flash, Config, Receiver, Fleet), derived from the ONE shared nav registry — no separate ordering logic to maintain.
- Sign-out = item at the bottom of the More sheet, visually separated (muted treatment) — reachable in one tap per SHELL-03; it is not a destination and does not appear in the desktop sidebar position.
- Active state: when the current route is one of the More destinations, the corresponding item inside the sheet is highlighted (same accent-tint language as the bottom bar items) so the user is never lost on /vms, /flash, etc.

**Viewport, clavier, login (shell correctness)**
- Root sizing: replace the existing `h-screen` in `Layout.tsx` with `h-dvh`; use `svh` for regions that must stay visible (bottom bar). Never `100vh` anywhere in the mobile shell (SHELL-05).
- iOS keyboard (no `interactive-widget` equivalent): ONE `focusin`/`visualViewport` mechanism, centralized at the Layout level in this phase — not per-page.
- Login routes render WITHOUT mobile chrome: full-screen, centered card, safe-area correct, inputs ≥ 16px effective font (SHELL-07). The bottom bar appears only for authenticated app destinations.
- Landscape: bottom bar stays at the bottom in BOTH orientations (success criterion 2 covers landscape; a landscape side rail would be a new component out of scope).

**Harnais Playwright & CI (VERIFY-01)**
- CI wiring: a separate `playwright` job inside the existing `lint.yml` workflow — one badge, the gate already exists, runs parallel to the Go job.
- Browsers in CI: Chromium + WebKit — Safari is half this milestone's mobile audience; WebKit headless catches layout divergence early.
- Desktop-untouched assertions: ALL page-level routes via a parameterized loop (Sidebar visible + expected desktop layout at ≥ 48rem viewport) — the success criterion says "per-page".
- Server under test: compiled Go binary + wait for `/api/health` (precedent: the CI Docker boot smoke test). Without a docker socket, pages render in their empty states but the chrome/layout is what the assertions check. No vite preview (zero API), no MSW (new dependency — forbidden).

### Claude's Discretion

None explicitly reserved; the UI-SPEC (05-UI-SPEC.md, status: approved) resolves component-level specifics and is the binding design contract. Precedence: CONTEXT.md → UI-SPEC → REQUIREMENTS → codebase.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Landscape side rail noted as a possible v2 idea if device testing shows a need; not committed.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | Responsive mobile shell — bottom nav + More sheet, safe areas, desktop intact | `navModel.ts` one-registry derivation (Sidebar JSX order verified at `Sidebar.tsx:729-787`); Layout media-query switch via `useMediaQuery.ts`; React 19 `inert` confirmed for the sheet backdrop |
| SHELL-02 | Bottom bar: 4 destinations, ≥44px targets, accent-tinted active, tap-on-active scrolls top, normal flow (never fixed) | Tailwind `md:` = 48rem verified in installed theme.css; `NavLink` `aria-current` styling precedent (Sidebar `navActive`); tap-on-active mechanism lives in Layout which owns `main`'s scroller |
| SHELL-03 | More sheet from the ONE pure nav registry; sign-out reachable | Sign-out parity source verified: `Sidebar.tsx:353-357` (`logout()` + `location.reload()`, no confirm); i18n keys `nav.*` verified in `i18n.ts:62-69` |
| SHELL-04 | Safe-area correctness via `viewport-fit=cover` + `env()` as CSS custom properties; desktop reports 0 | MDN `env(safe-area-inset-*)` = 0 on rectangular viewports [CITED: MDN env()]; no safe-area CSS exists yet in index.css (grep verified) — greenfield block |
| SHELL-05 | `dvh` root, `svh` for must-stay-visible chrome, never `100vh`; Android `interactive-widget=resizes-content` | `h-dvh`/`h-svh` Tailwind utilities [CITED: tailwindcss.com/docs/height]; dvh/svh track toolbars NOT the keyboard [CITED: MDN length]; `interactive-widget` is Chrome 108+ Android-only [CITED: developer.chrome.com] |
| SHELL-06 | Viewport meta extension + `theme-color` below the untouched FOUC script | Current meta verified at `web/index.html:34`; FOUC script at `index.html:16-31`; theme choke point = `paint()` in `theme.ts:45-47` |
| SHELL-07 | Login mobile: two-step flow untouched, inputs ≥16px effective, safe-area correct | Login root `min-h-screen` at `Login.tsx:67` → `min-h-dvh`; both inputs render `text-sm` (14px) at `Login.tsx:91,112` → need `max-md:text-base` |
| PRIM-01 | Hand-rolled bottom sheet: focus-trapped, scroll-contained, safe-area padded | Full in-repo precedent verified: `useConfirm.tsx` (document-level Escape + Tab trap + focus restore, portal to `document.body`), `ConfirmDialog.tsx` (backdrop `bg-black/60 z-50`, `max-h-[85vh]`) |
| VERIFY-01 | Playwright harness: desktop-untouched assertions ≥48rem + mobile descriptors; regressions fail CI | Full harness design below (Standard Stack + Architecture Patterns); Playwright 1.63.0 on npm; webServer polls compiled Go binary; CI job wiring for lint.yml |

## Project Constraints (from CLAUDE.md)

- **Frozen files this phase:** `web/src/app/router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, everything under `internal/**` (also declared in 05-UI-SPEC.md). Zero backend changes, zero new RUNTIME npm deps.
- **Tech stack:** no UI kit, no state library, no router framework; hand-rolled tree/UI per existing components; `t()` for every user-visible string (lint-enforced); em dashes banned in user text; named exports (default only for locale modules + `Recovery.tsx`).
- **Tailwind discipline:** utility classes on semantic tokens (`carbon-*`, `accent*`, `status*`) — never raw hex or hard-coded radii; shared controls carry `glim-*` engine classes; status colors on Badges only, never interactive controls.
- **Web build gate:** after any `web/` change: `cd web && npm ci && npm run build` (`tsc --noEmit && vite build`); the binary embeds `web/dist` (committed — `git check-ignore web/dist/index.html` reports TRACKED, verified this session).
- **Async/lint rules:** exceptions declared in `eslint.config.js`, never inline disables; long narrative "why" block comments at the top of nontrivial files; eslint rule `bombvault/page-uses-page-shell` governs only `src/pages/*.tsx` (Layout-level mobile chrome in `components/mobile/` is outside its scope — collision resolved in UI-SPEC).
- **Process:** `go build/vet/gofmt/golangci-lint/test` before every push; Go test suite needs restic ≥ 0.17 on PATH (irrelevant here — `internal/**` frozen).
- **Releases:** never tag without explicit approval (not triggered by this phase).

## Summary

Phase 5 is a presentation-only mobile shell plus a greenfield Playwright harness, on a codebase whose every integration seam was verified this session. The shell side is low-risk and well-precedented: `Layout.tsx` is the single chrome switch point (its `h-screen` at `Layout.tsx:176` is the SHELL-05 replacement target), the desktop sidebar's destination set and JSX order are stable and greppable, the focus-trap/portal/scrim mechanics the BottomSheet needs already exist verbatim in `useConfirm.tsx`/`ConfirmDialog.tsx`, and React 19 + Tailwind 4.3.3 cover every primitive the spec calls for (`inert` as a true boolean prop — confirmed in React 19 source, resolving the SUMMARY.md gap — and `h-dvh`/`h-svh`/`overscroll-contain` utilities with `md:` = 48rem verified in the installed theme.css).

The genuinely new ground is the Playwright harness. Verified design: `@playwright/test` 1.63.0 (current npm latest) as the milestone's single sanctioned devDependency; `web/playwright.config.ts` whose `webServer` launches the compiled Go binary (fresh `APP_KEY`, temp `DATA_DIR`, `HTTP_ONLY=true`, poll `/api/health`); projects for desktop (1280px + the 768px boundary), iPhone-13-class WebKit (390×844) and a 360×800 Chromium-class device; a new `playwright` job in `lint.yml` running `npm ci && npm run build && go build` then `npx playwright install --with-deps chromium webkit`. Auth is disabled on a fresh database (`auth_password_hash` empty = disabled, `internal/store/settings.go:60`), so the harness needs no login step; the binary boots headless without a docker socket because the Docker SDK client never connects at construction time (`dockercli_internal_test.go:19-28`; empirically proven by the CI smoke test which never mounts the socket).

Two findings matter most for planning. First, the iOS keyboard CANNOT be handled by `dvh` or by the Android meta tag: `dvh`/`svh` are defined by browser toolbars only, and the keyboard shrinks only the visual viewport — so the one Layout-level `focusin`/`visualViewport` mechanism is load-bearing, not defensive. Second, adding `useMediaQuery` to Layout will crash the existing `Layout.displayPrefs.dom.test.tsx` (it renders the real Layout in jsdom, and jsdom 30 has no `window.matchMedia` — probed this session) unless the desktop-default stub lands in the same change.

**Primary recommendation:** Land the jsdom `matchMedia` stub + `useMediaQuery` + guard test as one early task, extract `navModel.ts` before touching Layout, build BottomSheet by lifting the `useConfirm.tsx` trap mechanism, and wire the Playwright job with the compiled-binary webServer exactly as specified in the Harness section below — pinning `@playwright/test` and running browser install with `--with-deps`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chrome switch (Sidebar vs BottomNav+MoreSheet) | Client (SPA, Layout) | — | One JS media-query decision at the single chrome switch point; `router.tsx` frozen, no route-level split |
| Nav destination derivation | Client (pure lib) | — | `destinations(settings)` is a pure synchronous function of already-loaded `Settings` — no fetch, no loading state |
| Viewport sizing (dvh/svh) + safe areas | Client (CSS) | — | Pure CSS (`index.css` custom properties + Tailwind utilities); desktop reports 0 insets and is unaffected |
| Android keyboard resize | Browser platform | Client (viewport meta) | `interactive-widget=resizes-content` in the meta tag — Chrome 108+ Android only |
| iOS keyboard handling | Client (Layout-level JS) | Browser (visualViewport API) | iOS has no meta equivalent; ONE `focusin`/`visualViewport` mechanism at Layout level (locked decision) |
| Bottom sheet primitive | Client (SPA component) | — | Hand-rolled (no UI kit constraint); portal + trap lifted from `useConfirm.tsx` precedent |
| theme-color sync | Client (SPA lib) | — | `paint()` in `theme.ts` is the single choke point every theme application funnels through |
| E2E responsive gate | CI (GitHub Actions) | Client (compiled Go binary under test) | New `playwright` job in `lint.yml`; server = compiled binary serving the fresh SPA build; assertions on chrome/layout only |
| Backend/API behavior | — (frozen) | — | `internal/**` frozen; the binary is exercised read-only as a static+API host |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | ^1.63.0 | e2e harness (VERIFY-01) — the ONE sanctioned new package (devDependency) | Official Microsoft runner; `devices` descriptors + `webServer` + multi-engine (Chromium/WebKit) in one tool [CITED: playwright.dev] — `npm view` confirms 1.63.0 latest, 45M weekly downloads |
| React `useSyncExternalStore` | built in (19.2.7) | `useMediaQuery` hook | Official pattern for browser-API-as-store: subscribe returns unsubscribe, primitive snapshot `mql.matches` is stable [CITED: react.dev/reference/react/useSyncExternalStore] |
| React `inert` prop | built in (19.2.7) | More-sheet backdrop inerting | React 19 lists `inert` in its boolean-attribute switch: truthy → `setAttribute('inert','')`, falsy → `removeAttribute` [VERIFIED: React 19 source ReactDOMComponent.js via Context7 /react/react] |
| Tailwind `h-dvh` / `h-svh` | 4.3.3 (installed) | SHELL-05 root + chrome sizing | `h-dvh` tracks dynamic browser UI, `h-svh` the small (stable) viewport [CITED: tailwindcss.com/docs/height]; `md:` = `--breakpoint-md: 48rem` [VERIFIED: node_modules/tailwindcss/theme.css:327-331] |
| Tailwind `overscroll-contain` | 4.3.3 (installed) | Sheet scroll containment (PRIM-01) | `overscroll-behavior: contain` utility with responsive variants [CITED: tailwindcss.com/docs/overscroll-behavior] |
| react-router-dom `NavLink` | ^7.18.1 (installed) | Bottom-bar items (native `aria-current`) | Same component the desktop sidebar already uses; classic API only (no data router) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest `test.setupFiles` | ^4.1.10 (installed) | jsdom `matchMedia` desktop-default stub | One new setup module, guarded for node-env (see Pitfall 1); runs before every test file |
| Playwright `webServer.cwd` | 1.63.0 | Run the go-binary command from repo root while config lives in `web/` | `webServer` options include `cwd`, `env`, `timeout`, `reuseExistingServer`, `gracefulShutdown` [CITED: playwright.dev/docs/test-webserver] |
| `env(safe-area-inset-*)` + `max(..., 0px)` | platform CSS | SHELL-04 insets as `:root` custom properties | Values are 0 on rectangular viewports; `viewport-fit=cover` makes them non-zero on notched devices [CITED: MDN env()] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Compiled Go binary under test | `vite preview` | Rejected (locked decision): preview serves zero API — Layout's auth probe would fail open (`catch → pass`, `Layout.tsx:52-56`) but settings/domain gating never loads; binary costs one `go build` and tests the real serving path |
| Compiled Go binary under test | MSW mocks | Rejected: new runtime-adjacent dependency, forbidden this milestone |
| `devices['iPhone 13']` + `devices['Pixel 5']` as-is | Custom descriptors | iPhone 13 (390×844, WebKit) matches the UI-SPEC exactly; Pixel 5 is 393×851 — spread + override `viewport: { width: 360, height: 800 }` for the UI-SPEC's 360×800 Android-class project (device flags `isMobile`/`hasTouch` survive the spread) [CITED: playwright.dev/docs/emulation] |
| `useSyncExternalStore` hook | `useEffect` + `useState` media listener | Rejected: torn snapshots between render and effect; `useSyncExternalStore` is the sanctioned pattern [CITED: react.dev] |
| Storing insets per component | `:root` CSS custom properties (`--safe-area-*`) | Rejected (locked): SHELL-04 mandates centralization; desktop unaffected at 0 |
| Focus-trap library | Hand-rolled lift of `useConfirm.tsx` | No new dependency allowed; the exact mechanism (document-level Escape + Tab cycling over `FOCUSABLE_SELECTOR` + trigger restore) already exists and is battle-tested in-repo |

**Installation:**
```bash
cd web
npm install -D @playwright/test@^1.63.0
npx playwright install chromium webkit          # local dev browsers (Windows ok)
```

**Version verification:** `npm view @playwright/test version` → `1.63.0` (latest, published 2026-09-04; weekly release cadence) [VERIFIED: npm registry]. No other package changes — zero new runtime deps is a milestone constraint.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@playwright/test` | npm | 9 yrs (project); latest publish 2026-09-04 | ~45.3M/wk | github.com/microsoft/playwright | [SUS] | Flagged — see note |
| `playwright-core` (transitive) | npm | latest publish 2026-09-04 | ~74.8M/wk | github.com/microsoft/playwright | [SUS] | Flagged (transitive of the above) |

The seam's verdict is `SUS` on the "too-new" heuristic (latest publish < 14 days old), which fires every week for Playwright's Tuesday release train. Mitigating signals, all verified: the package name is the one named by the official docs [CITED: playwright.dev]; repo is `microsoft/playwright`; 45M weekly downloads; not deprecated; `scripts.postinstall` is null (`npm view` returned no postinstall) — no install-script risk. The package is already mandated by the approved UI-SPEC ("the ONE sanctioned new package is `@playwright/test`").

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@playwright/test` — planner inserts a `checkpoint:human-verify` before the install task per protocol (expected to be a formality given UI-SPEC mandate + signals above)

## Architecture Patterns

### System Architecture Diagram

```text
                        CI / LOCAL (playwright project)
 ┌────────────────────────────────────────────────────────────────────┐
 │  npm ci → npm run build (tsc + vite → web/dist) → go build        │
 │      → bombvault binary (embeds fresh web/dist)                    │
 │  playwright webServer: spawn binary (APP_KEY, DATA_DIR=tmp,       │
 │      HTTP_ONLY=true) → poll GET /api/health → run tests           │
 │      projects: desktop-1280 / desktop-768 (Chromium)              │
 │                mobile-iphone (WebKit 390×844)                     │
 │                mobile-android (Chromium 360×800)                  │
 └────────────────────────────────────────────────────────────────────┘

                        BROWSER (SPA runtime, per visit)
   page load
      │
      ▼
   index.html ──► FOUC script (untouched) stamps data-theme
      │           viewport meta: width=device-width, initial-scale=1,
      ▼                    viewport-fit=cover, interactive-widget=resizes-content
      │           meta theme-color (static dark fallback)
      ▼
   Layout.tsx ── authGate? ──"blocked"──► LoginPage (NO mobile chrome,
      │                                     min-h-dvh, inputs ≥16px)
      │ "pass"
      ▼
   useMediaQuery(DESKTOP_QUERY = "(min-width: 48rem)")
      │
      ├─ desktop ───► Sidebar (unchanged) + main scroller   [≥48rem]
      │
      └─ mobile ────► main scroller (flex column)
                        + BottomNav (flex sibling, shrink-0, svh-safe,
                          pads --safe-area-bottom)                [<48rem]
                             │ tap "More"
                             ▼
                        BottomSheet (portal to body, scrim, focus trap,
                          overscroll-contain, safe-area padded)
                             └─ MoreSheet rows = navModel.destinations(settings)
                                  (same source Sidebar derives from)
```

### Recommended Project Structure

```text
web/
├── e2e/                          # NEW — Playwright specs
│   ├── desktop-untouched.spec.ts #   parameterized loop over the 10 nav routes
│   ├── mobile-shell.spec.ts      #   bar slots, sheet, focus trap, sign-out
│   └── narrow-viewport.spec.ts   #   de/fr at 320/360px, labels never wrap
├── playwright.config.ts          # NEW — webServer + projects
├── src/
│   ├── lib/
│   │   ├── navModel.ts           # NEW — pure destinations(settings) + bar-slot split
│   │   ├── navModel.test.ts      # NEW — pure-logic (node env, repo default)
│   │   ├── useMediaQuery.ts      # NEW — the ONE DESKTOP_QUERY literal
│   │   ├── useMediaQuery.test.ts # NEW — fragile-pair guard vs CSS md:
│   │   └── testSetup/            # NEW — matchMedia stub module (setupFiles)
│   ├── components/mobile/        # NEW — BottomNav.tsx, MoreSheet.tsx, BottomSheet.tsx
│   └── app/
│       └── Layout.tsx            # EDITED — h-dvh, flex-direction switch, chrome mount,
│                                 #   tap-on-active scroll, iOS keyboard mechanism
└── src/index.css                 # EDITED — --safe-area-* custom properties block
web/index.html                    # EDITED — viewport meta + theme-color (below FOUC)
.github/workflows/lint.yml        # EDITED — new `playwright` job
```

### Pattern 1: The one media-query hook (useSyncExternalStore)

**What:** ~15-line hook owning the single `DESKTOP_QUERY` literal, consumed only by Layout.
**When to use:** the Layout chrome switch — never for in-page adaptation (that stays CSS `max-md:`).
**Example:**
```typescript
// Shape per react.dev/reference/react/useSyncExternalStore; literal pinned
// by a guard test to Tailwind's --breakpoint-md: 48rem.
const DESKTOP_QUERY = "(min-width: 48rem)";
const mql = window.matchMedia(DESKTOP_QUERY);          // created lazily in browser
function subscribe(cb: () => void) {
  mql.addEventListener("change", cb);                  // modern API; theme.ts:79-87
  return () => mql.removeEventListener("change", cb);  // shows the house fallback shape
}
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => mql.matches);
}
```
Guard `typeof window`/`matchMedia` for the jsdom-test path (Pitfall 1) — a defensive `mql == null → true` default also keeps node-env source imports safe.

### Pattern 2: BottomSheet modality = lift of the useConfirm mechanism

**What:** portal to `document.body` + scrim click close + document-level keydown (Escape + Tab trap over `FOCUSABLE_SELECTOR`) + focus restore to trigger.
**When to use:** PRIM-01; the identical shape is already in-repo and documented (`useConfirm.tsx:78-149`).
**Example:**
```typescript
// Source: web/src/lib/useConfirm.tsx:78-149 (verified in-repo precedent)
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// document.addEventListener("keydown", ...): Escape → close; Tab → cycle
// focusables(first/last); on close → trigger.focus() (captured at open).
// Portal: createPortal(<Panel/>, document.body) — escapes ancestor CSS
// transforms (e.g. .glim-page-enter) that would trap position:fixed.
```
Differences for the sheet: backdrop `bg-black/60 z-50` (same as ConfirmDialog), panel `max-h-[85dvh]` (ConfirmDialog uses `85vh` — the sheet is the mobile primitive and must use `dvh`), internal scroll `overflow-y-auto overscroll-contain`, bottom `padding: var(--safe-area-bottom)`, slide-up gated behind `motion-safe:` (house precedent: `Sidebar.tsx:222` `motion-safe:active:scale`).

### Pattern 3: Playwright webServer over the compiled Go binary

**What:** `webServer` spawns the built binary and polls the health endpoint before tests.
**When to use:** all VERIFY-01 projects.
**Example:**
```typescript
// Source: playwright.dev/docs/api/class-testconfig + docs/test-webserver
export default defineConfig({
  use: { baseURL: "http://127.0.0.1:3000" },
  webServer: {
    command: "../bombvault" + (process.platform === "win32" ? ".exe" : ""),
    cwd: join(import.meta.dirname, ".."),     // repo root, where the binary was built
    url: "http://127.0.0.1:3000/api/health",  // poll — same endpoint as build.yml:56
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      APP_KEY: "0".repeat(64),        // config.go:73-77 requires exactly 64 lowercase hex
      DATA_DIR: "./.playwright-data", // writable dir — the ONLY fail-fast boot check (main.go:178)
      HTTP_ONLY: "true",              // plain HTTP: no self-signed TLS to ignore
      PORT: "3000",
    },
  },
  projects: [
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "desktop-768",  use: { ...devices["Desktop Chrome"], viewport: { width: 768,  height: 900 } } }, // 48rem boundary
    { name: "mobile-iphone",  use: devices["iPhone 13"] },                                   // WebKit 390×844
    { name: "mobile-android", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } } }, // Chromium
  ],
});
```
Fresh DB ⇒ auth disabled (`auth_password_hash` empty = disabled, `internal/store/settings.go:60`) ⇒ no login step; docker-less boot is safe (Pitfall 6).

### Anti-Patterns to Avoid

- **A second page tree / route-level mobile split:** breaks single-URL deep links and doubles i18n across 42 locales — explicit out-of-scope table row in REQUIREMENTS.md.
- **`position:fixed` bottom bar:** SHELL-02 mandates a normal-flow flex sibling; fixed elements also misplace under `resizes-content` [CITED: developer.chrome.com] and under iOS keyboard scroll.
- **CSS-hiding the Sidebar below the breakpoint:** rejected in milestone research — the live Sidebar runs subscriptions/dialogs; Layout must not RENDER it on mobile (assertions then check `isVisible`, not `display`).
- **`100vh` anywhere in the mobile shell:** puts chrome under the mobile URL bar (the milestone's own thesis); Login's `min-h-screen` (`Login.tsx:67`) converts to `min-h-dvh` in the same pass.
- **Second ordering logic for the More sheet:** locked decision — sidebar order via the one registry; a hand-maintained list is the drift SHELL-03 exists to kill.
- **Reliance on `dvh` (or the meta tag) for the iOS keyboard:** neither reacts to the keyboard (verified citations below); the Layout-level `focusin`/`visualViewport` mechanism is the only iOS path.
- **`test.skip` on WebKit failures:** WebKit is half the audience; a layout divergence is the regression the harness exists to catch. (Note `test.fixme` honestly if a genuine WebKit engine bug appears, with an issue reference — house comment style.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Media-query state | Ad-hoc `resize` listeners / per-component queries | One `useSyncExternalStore` hook + Tailwind `md:`/`max-md:` | Tearing, listener leaks, and a second breakpoint literal are exactly the drift the guard test forbids |
| Bottom-sheet modality | A new trap/Escape/portal implementation | Lift `useConfirm.tsx`'s mechanism verbatim | In-repo, already handles the portal-transform and focus-left-dialog bugs that were each fixed once |
| Device emulation matrices | Hand-written viewport/UA/touch configs | Playwright `devices` descriptors | Viewport+UA+`isMobile`+`hasTouch`+`deviceScaleFactor` curated per device [CITED: playwright.dev/docs/emulation] |
| Server readiness wait | curl/sleep loops in CI YAML | `webServer.url` polling | Built into the runner; races and leaks live in hand-rolled shell loops (the build.yml loop is for containers, not test runs) |
| OS-dependency install for WebKit on CI | apt-get lists in the workflow | `npx playwright install --with-deps chromium webkit` | Curated per-version package lists maintained upstream [CITED: playwright.dev/docs/browsers] |
| Safe-area values | Hard-coded notch paddings | `env(safe-area-inset-*)` behind custom properties | Values are device/dynamic; hard-coded insets are wrong on every other device |

**Key insight:** every modality/emulation/wait primitive this phase needs already exists — in-repo (`useConfirm`, routedPages-style source tests) or upstream (Playwright). The phase's own work is composition and the breakpoint discipline, not mechanism invention.

## Common Pitfalls

### Pitfall 1: useMediaQuery lands without the jsdom stub — an existing test breaks immediately
**What goes wrong:** `Layout.displayPrefs.dom.test.tsx:47,59-62` renders the REAL `Layout` in jsdom. The moment Layout calls `useMediaQuery` → `window.matchMedia`, that test throws. jsdom 30.0.1's `window.matchMedia` is `undefined` (probed directly this session: `typeof window.matchMedia === "undefined"`; `visualViewport` too) [VERIFIED: local jsdom 30.0.1 probe].
**Why it happens:** this repo's vitest runs `environment: "node"` by default with per-file `// @vitest-environment jsdom` docblocks (`vitest.config.ts:16`); nobody ever needed matchMedia before.
**How to avoid:** new `test.setupFiles` module in `vitest.config.ts` defining a desktop-default `matchMedia` stub, GUARDED (`if (typeof window !== "undefined" && typeof window.matchMedia !== "function")`) because setupFiles execute in node-env files too. Land it in the SAME task as `useMediaQuery`.
**Warning signs:** `TypeError: window.matchMedia is not a function` in `Layout.displayPrefs.dom.test.tsx` or any new `.dom.test.tsx`.

### Pitfall 2: iOS keyboard — dvh and the meta tag both do nothing
**What goes wrong:** bottom bar or focused input painted under the iOS keyboard.
**Why it happens:** `dvh`/`svh` are defined by browser TOOLBARS, not the keyboard [CITED: MDN length]; the OSK shrinks only the visual viewport [CITED: MDN VisualViewport]; `interactive-widget` is Chrome-on-Android only and "support excludes Chrome on iOS/iPadOS" [CITED: developer.chrome.com/blog/viewport-resize-behavior]. iOS default already behaves like `resizes-visual`.
**How to avoid:** the ONE Layout-level `focusin`/`visualViewport` mechanism (locked decision): listen for `focusin`/`focusout` + `window.visualViewport` `resize`, and ensure the focused input stays visible (guard `typeof window.visualViewport !== "undefined"` — also absent in jsdom). Contract to assert on device: input visible, bar never overlaps focused content.
**Warning signs:** works on Android CI, fails on real iPhone — exactly why VERIFY-02 (device pass) exists.

### Pitfall 3: `viewport-fit=cover` without `env()` (or vice versa) — half the contract
**What goes wrong:** content under the notch/home indicator, or dead padding on desktop.
**Why it happens:** `viewport-fit=cover` is what makes insets non-zero on notched devices; `env(safe-area-inset-*)` is 0 on rectangular viewports — desktop unaffected [CITED: MDN env()].
**How to avoid:** both together, insets centralized as `:root` custom properties (`max(env(...), 0px)`), consumed by BottomNav/MoreSheet/login only.
**Warning signs:** only visible on real notched devices — the Playwright harness CANNOT fake safe areas (milestone research, pitfall 5).

### Pitfall 4: The `48rem` pair drifts (JS literal vs CSS `md:`)
**What goes wrong:** JS switches chrome at one width, Tailwind's `max-md:` variants at another — pages flicker between chrome systems in a 1px window.
**Why it happens:** two independent definitions of "desktop".
**How to avoid:** the guard test (UI-SPEC locked decision): node-env source test asserting `DESKTOP_QUERY === "(min-width: 48rem)"` — Tailwind's default `--breakpoint-md: 48rem` [VERIFIED: node_modules/tailwindcss/theme.css:328]. Pattern precedent: `routedPages.test.ts` reads source text, no DOM.
**Warning signs:** any future "just tweak the breakpoint" edit without touching the literal.

### Pitfall 5: navModel extraction breaks the sidebar's visible-rank semantics
**What goes wrong:** rainbow hue positions shift when domain tabs are toggled.
**Why it happens:** `Sidebar.tsx:750-769` gates `{vmsEnabled && <NavItem hueIndex={nextHue()} …/>}` — a hidden tab never burns a slot because the gate short-circuits BEFORE `nextHue()` during the render pass (long documented rationale, `Sidebar.tsx:82-163`).
**How to avoid:** `destinations(settings)` must derive the FULL ordered list with an `enabled` flag per destination (or two lists), so the Sidebar's render-time counter semantics are preserved and MoreSheet filters the same array by `enabled`. Do not make navModel itself do the hue assignment.
**Warning signs:** hue changes on toggling a domain in Settings — covered by existing appearance tests if they render Sidebar; check `navGlyphs.fit.dom.test.tsx`-style suites still pass.

### Pitfall 6: assuming the binary cannot boot without docker — it can, but only because the client is lazy
**What goes wrong:** planner adds a docker socket to CI "just in case", or wrongly descope the harness believing a socket is required.
**Why it happens:** `main.go:210-214` fatal-errors if `dockercli.New()` errors — but `client.NewClientWithOpts` "only builds the HTTP client, it never connects" [VERIFIED: internal/dockercli/dockercli_internal_test.go:19-28]; the socket is only touched on first API call. Empirical proof: the CI smoke test boots the container WITHOUT mounting the socket and `/api/health` answers [VERIFIED: .github/workflows/build.yml:49-64].
**How to avoid:** nothing to do — document the invariant; keep the harness socket-less (CI has none).
**Warning signs:** none expected; if `DOCKER_HOST` is ever set to a malformed value in CI env, `New()` errors — keep it unset.

### Pitfall 7: Playwright strict-mode locator collisions on shared chrome
**What goes wrong:** `getByRole("navigation")` matches two elements → strict-mode violation in mobile tests.
**Why it happens:** ConfirmDialog's own header comment documents this exact failure class (two identically-named controls broke strict-mode matching) `ConfirmDialog.tsx:56-62`.
**How to avoid:** give the mobile bar its own `aria-label` (e.g. translated primary-nav label) distinct from Sidebar's `<nav>`; desktop assertions assert Sidebar visible + BottomNav ABSENT per project (Layout renders one or the other — no CSS hiding).
**Warning signs:** `strict mode violation` in e2e output.

### Pitfall 8: stale embedded SPA in the harness
**What goes wrong:** e2e tests assert against last-committed `web/dist`, not the working tree.
**Why it happens:** the binary embeds dist at build time (`web/embed.go`); dist is committed (TRACKED, verified via `git check-ignore` this session).
**How to avoid:** the `playwright` job MUST run `npm ci && npm run build` (web) BEFORE `go build` — same order as the existing `web` job (`lint.yml:30-41`). Locally: rebuild both after any web change.
**Warning signs:** a brand-new BottomNav class never found by e2e while vitest passes.

## Code Examples

### Viewport meta + theme-color (SHELL-06), below the untouched FOUC script
```html
<!-- Source: web/index.html:34 (current line being replaced) -->
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" content="#161616" />
```
`theme.ts` then mirrors the live theme into the meta on every application — hook the `paint()` choke point (`theme.ts:45-47`, called by `setTheme`/`applyStoredTheme`/the system-flip listener), not individual call sites; carry the paired-change comment per UI-SPEC. Fallback static content = dark value. (User-configurable accent exists via `lib/accent.ts` but theme-color mirrors `--carbon-bg` only, per UI-SPEC.)

### Safe-area custom properties (SHELL-04)
```css
/* web/src/index.css — new block; env() is 0 on rectangular viewports [MDN env()] */
:root {
  --safe-area-top: max(env(safe-area-inset-top), 0px);
  --safe-area-right: max(env(safe-area-inset-right), 0px);
  --safe-area-bottom: max(env(safe-area-inset-bottom), 0px);
  --safe-area-left: max(env(safe-area-inset-left), 0px);
}
```

### Layout switch (the ONE JS breakpoint decision)
```tsx
// Source: web/src/app/Layout.tsx:175-208 (structure being modified)
// Desktop (unchanged): flex ROW → Sidebar + main.
// Mobile: flex COLUMN → main + BottomNav (shrink-0 flex sibling — normal flow).
const isDesktop = useIsDesktop();
return (
  <div className={`${isDesktop ? "flex-row" : "flex-col"} flex h-dvh overflow-hidden bg-carbon-background`}>
    {isDesktop ? <Sidebar … /> : null}
    <main id="bv-main" className="flex-1 flex flex-col overflow-y-auto p-6 min-w-0">…</main>
    {isDesktop ? null : <BottomNav … />}
  </div>
);
```
Tap-on-active: BottomNav reports `NavLink` `isActive` clicks to Layout, which owns `main`'s scroller (`document.getElementById("bv-main")?.scrollTo({ top: 0 })` shape) — no navigation event fires for the active route.

### Sign-out parity (SHELL-03)
```tsx
// Source: web/src/components/Sidebar.tsx:353-357 — reuse exactly; NO confirm
async function signOut() {
  await logout().catch(() => undefined);
  const g = globalThis as unknown as { location: { reload(): void } };
  g.location.reload();
}
```

### CI job (VERIFY-01) — new `playwright` job in `.github/workflows/lint.yml`
```yaml
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@<pinned>          # same digest pin style as sibling jobs
      - uses: actions/setup-go@<pinned>
        with: { go-version: '1.26' }
      - uses: actions/setup-node@<pinned>
        with: { node-version: '24' }
      - run: npm ci
        working-directory: web
      - run: npm run build                        # tsc + vite → web/dist (BEFORE go build)
        working-directory: web
      - run: go build -o bombvault ./cmd/bombvault
      - run: npx playwright install --with-deps chromium webkit
        working-directory: web
      - run: npx playwright test
        working-directory: web
```
Browsers both engines: WebKit-on-Linux system deps are handled by `--with-deps` [CITED: playwright.dev/docs/browsers]. Windows-local runs work for Chromium/WebKit but the gate is CI.

### Desktop-untouched parameterized loop
```typescript
// Source shape: playwright.dev/docs/api/class-test (test.describe.configure/for-loop pattern)
for (const route of ["/dashboard", "/recovery", "/containers", "/vms", "/flash",
                     "/files", "/config", "/receiver", "/fleet", "/settings"]) {
  test(`desktop untouched: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toHaveCount(0);
  });
}
```
(All 10 routes exist in the frozen router `router.tsx:27-39`; `/glyphs`, `/jobs`, and `*` are intentionally outside the loop.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` mobile shells | `dvh`/`svh` viewport units | Safari 15.4 / Chrome 108 (2022), baseline since | `h-dvh`/`h-svh` are plain Tailwind utilities here; `vh` ≡ `lvh` (the large viewport) [CITED: MDN length] |
| JS keyboard hacks on Android | `interactive-widget` viewport meta | Chrome 108 (default flipped to `resizes-visual`) | One meta token fixes Android; iOS still needs the visualViewport path [CITED: developer.chrome.com] |
| React `inert=""` string hacks / `setAttribute` effects | True boolean `inert` prop | React 19 | `<div inert={open}>` just works; SUMMARY.md's open gap is now closed [VERIFIED: React 19 source] |
| `addListener` media queries | `addEventListener` on MediaQueryList | Safari 14+ | House fallback for old Safari already written once in `theme.ts:79-87`; new hook may mirror it |
| Playwright `webServer.command` only | `cwd`/`env`/`gracefulShutdown`/`wait` options | 1.50-ish (docs current at 1.63) | Config can live in `web/` while spawning the repo-root binary [CITED: playwright.dev/docs/test-webserver] |

**Deprecated/outdated:**
- Milestone STACK.md's "dark-only theme, no theme-switch interplay" for `theme-color` — superseded by the approved UI-SPEC: `theme.ts` updates the meta content on every theme application (#161616 dark / #f4f4f4 light). UI-SPEC is binding.
- `window.confirm`-style modality patterns — already replaced app-wide by ConfirmDialog/`useConfirm`; the sheet is that lineage's mobile sibling, not a new family.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fresh-DB pages render in usable empty states for all 10 routes (lists empty, no crash), so chrome assertions work without seeded data | Architecture Pattern 3 / VERIFY-01 | Harness needs a tiny seed step (e.g. create a file set via API) — cheap addition to `webServer` startup or a global-setup script |
| A2 | Pinning `@playwright/test` to `^1.63.0` and installing browsers at that version keeps engine/vendor versions aligned in CI (Renovate will PR bumps weekly; browser binaries are re-fetched per job so no caching drift) | Standard Stack | A mid-week release could change behavior under us; pin exact (`1.63.0`) in CI for reproducibility if flakiness appears |
| A3 | WebKit headless on ubuntu-latest renders this SPA's layout correctly (no engine-specific crash) | Standard Stack / CI | If WebKit proves flaky in CI, the fallback is dropping to Chromium-only temporarily — but that contradicts a locked decision, so treat as escalation, not silent choice |
| A4 | `import.meta.dirname` / Node 24 file-URL math is available in the playwright config (Node 24 both locally and in CI) | Code Examples | Use `fileURLToPath`/`path.join` fallback — trivial rewrite if tsc target objects |

## Open Questions (RESOLVED)

> **Resolution (2026-09-11, at plan time):** Q1 — the Files bar slot derives from the single nav registry: `destinations(settings)` filtered to enabled tab entries, so with `/files` gated off the bar renders 3 destination slots + More (3+1), matching desktop Sidebar gating. Resolved in **05-02-PLAN.md** (Task 1: `barDestinations` = `destinations` filtered to `bar && enabled`; see also the objective note there). Q2 resolved in 05-01 Task 2 (`npm install -D --save-exact @playwright/test` — exact pin). Q3 resolved in 05-01's `desktop-768` project (768px exactly, per UI-SPEC). Items kept below as the original research record.

1. **The bottom bar's "Files" slot when `filesEnabled` is false**
   - What we know: the Sidebar gates `/files` behind `filesEnabled` (`Sidebar.tsx:756-758`), but REQUIREMENTS SHELL-02 fixes the bar as Home/Containers/Files/Settings, and the UI-SPEC both marks `files*` as settings-gated in navModel AND calls the bar a "fixed 4+1 grid" whose only defined collapse is the auth-disabled More-slot case.
   - What's unclear: when Files domain is off, does the bar still render a Files slot (4 items, one leading to a domain that desktop hides), or collapse to 3?
   - Recommendation: planner picks the reading that matches desktop semantics — likely: Files slot hidden when `filesEnabled` is false (same `enabled` flag from the shared registry), bar renders 3+1. Confirm during discuss/plan review since the UI-SPEC text is ambiguous; the fix is one flag check in navModel either way.

2. **Exact Playwright version pin strategy under Renovate**
   - What we know: Playwright releases weekly; Renovate manages npm (`renovate.json` `matchManagers: ["npm"]`).
   - What's unclear: caret range vs exact pin in `package.json`.
   - Recommendation: pin exact (`1.63.0`) — the browser binaries and the npm package must move in lockstep; let Renovate PR the bump so both change in one commit.

3. **Whether the `desktop-768` project should assert at exactly 768px or 767px**
   - What we know: 48rem = 768px; at 768px both the CSS `md:` and the JS `(min-width: 48rem)` are on the SAME (desktop) side — verified semantics, so 768 is safe and asserts the boundary.
   - What's unclear: nothing material — noted so the planner doesn't "fix" it to 767 (which would correctly assert the MOBILE side and duplicate the mobile project).
   - Recommendation: 768px exactly (UI-SPEC already says "768px boundary").

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | SPA build, vitest, Playwright | ✓ (local) | 24.16.0 | CI pins node-version '24' (`lint.yml:37`) |
| npm | installs | ✓ | 11.13.0 | — |
| Go | compiling the binary under test | ✓ (local) | 1.25.0 (go.mod floor) | CI uses 1.26 (`lint.yml:25`); binary builds on either |
| @playwright/test | VERIFY-01 | ✗ (not installed) | 1.63.0 current | The install task itself; devDependency only |
| Playwright browsers (chromium, webkit) | VERIFY-01 | ✗ (not installed) | — | `npx playwright install chromium webkit` locally; `--with-deps` in CI |
| WebKit Linux OS deps | CI WebKit project | ✗ until `--with-deps` | — | handled by the install command [CITED: playwright.dev/docs/browsers] |
| restic ≥ 0.17 | Go test suite | n/a | — | `internal/**` frozen — Go tests out of scope this phase |

**Missing dependencies with no fallback:** none — everything missing is installed by the phase's own first tasks.

**Missing dependencies with fallback:** local Playwright browsers (Windows dev machines can run Chromium/WebKit; the authoritative gate is the CI job regardless).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 (node env default, per-file `@vitest-environment jsdom`) + @testing-library/react ^16.3.2; NEW: @playwright/test ^1.63.0 |
| Config file | `web/vitest.config.ts` (edit: add `test.setupFiles`); NEW `web/playwright.config.ts` |
| Quick run command | `cd web && npx vitest run src/lib/navModel.test.ts` (per task commit: `npx vitest run`) |
| Full suite command | `cd web && npm test` (vitest) + `cd web && npx playwright test` (e2e, CI-gated) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SHELL-01 | Desktop ≥48rem unchanged; mobile shell <48rem | e2e (all 4 projects) | `npx playwright test` | ❌ Wave 0 (`web/e2e/`) |
| SHELL-02 | Bar: 4 slots + More, ≥44px, accent active, tap-on-active scrolls top | e2e (mobile projects) | `npx playwright test e2e/mobile-shell.spec.ts` | ❌ Wave 0 |
| SHELL-03 | More sheet = sidebar-order destinations from ONE registry; sign-out reachable | unit + e2e | `npx vitest run src/lib/navModel.test.ts`; e2e sheet spec | ❌ Wave 0 (both) |
| SHELL-04 | Safe-area custom properties exist and are consumed | unit (source/CSS assert, node env) | `npx vitest run src/lib/...` (style-guard style) | ❌ Wave 0 |
| SHELL-05 | `h-dvh` root; no `100vh` in mobile shell; meta `interactive-widget` present | unit (source assert) + e2e viewport sizing | vitest source test; e2e | ❌ Wave 0 |
| SHELL-06 | index.html meta extension below FOUC script | unit (source assert on index.html) | `npx vitest run` | ❌ Wave 0 |
| SHELL-07 | Login: no bottom bar, `min-h-dvh`, inputs `max-md:text-base` | e2e (blocked-gate project or unit) | e2e mobile spec (auth-enabled variant via API) or vitest dom test | ❌ Wave 0 |
| PRIM-01 | BottomSheet: trap, Escape, scrim, scroll-contain, safe-area | unit (jsdom dom test lifting useConfirm test patterns) + e2e focus-trap check | `npx vitest run src/components/mobile/BottomSheet.dom.test.tsx` | ❌ Wave 0 |
| VERIFY-01 | Desktop-untouched parameterized loop over 10 routes; regressions fail CI | e2e (CI gate) | `npx playwright test e2e/desktop-untouched.spec.ts` | ❌ Wave 0 |
| (guard) | `DESKTOP_QUERY` ≡ CSS `md:` = 48rem | unit (source, node env — routedPages pattern) | `npx vitest run src/lib/useMediaQuery.test.ts` | ❌ Wave 0 |
| (i18n) | `nav.more` in en+de+40 locales | existing pipeline | `npx vitest run src/lib/i18n.parity.test.ts` | ✅ exists (`i18n.parity.test.ts`, plus orphans/quality) |

### Sampling Rate

- **Per task commit:** `cd web && npx vitest run` (fast, node+jsdom)
- **Per wave merge:** `cd web && npm run build && npx playwright test` (full e2e incl. WebKit)
- **Phase gate:** full vitest + Playwright suite green in the CI `playwright` job before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `web/src/lib/testSetup/matchMedia.ts` (desktop-default stub) + `test.setupFiles` entry in `web/vitest.config.ts` — REQUIRED before useMediaQuery touches Layout (Pitfall 1)
- [ ] `web/playwright.config.ts` + `web/e2e/` specs + `@playwright/test` devDependency + browsers install step
- [ ] `testids` contract (`desktop-sidebar`, `bottom-nav`, `more-sheet`) — needed by both desktop-untouched and mobile specs; add deliberately, document in the components
- [ ] `data-testid` free alternative: prefer role/aria queries where natural (bar = `navigation[aria-label]`) to respect strict-mode discipline

*(No framework install gap beyond the Playwright devDependency; vitest/RTL/jsdom all present.)*

## Security Domain

### Applicable ASVS Categories (level 1, per `.planning/config.json` `security_enforcement: true`)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | touched (SHELL-07) | No auth logic changes — presentation only (font size, `min-h-dvh`, safe-area padding). Login flow, `needCode` two-step, and `logout()` semantics untouched |
| V3 Session Management | touched (sign-out UI) | Mobile sign-out reuses the exact `logout()` + reload path (`Sidebar.tsx:353-357`); no new session surface. More sheet is auth-UI only |
| V4 Access Control | no | No new endpoints; `internal/**` frozen; chrome performs no fetches (UI-SPEC: "Phase 5 chrome performs no fetches") |
| V5 Input Validation | no | No new inputs, no new `decodeBody` surface; frozen handlers keep `resourceNameRe`/1 MiB/DisallowUnknownFields discipline |
| V6 Cryptography | no | `APP_KEY` handling untouched; harness generates a throwaway key (`openssl rand -hex 32` in CI or a fixed dev constant locally — dev-only, never a real secret) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Test artifacts leaking host data into a public repo (traces/videos/screenshots) | Information Disclosure | Repo rule: no real user data in the repo. Fresh empty-state DB in the harness means nothing to leak; still: gitignore `web/test-results/`, `web/playwright-report/`, `.playwright-data/` and never commit them |
| Harness weakening the auth gate (auto-login helper) | Elevation of Privilege | Not needed: fresh DB = auth disabled by default (`settings.go:60`); do NOT add a login-bypass or seed a password |
| `theme-color`/meta tampering via FOUC-script edit | Tampering | SHELL-06 keeps the FOUC script byte-untouched and adds lines BELOW it — the plan must preserve the existing `<script>` block verbatim |
| Self-signed TLS bypass pressure | Repudiation | Not applicable — harness uses `HTTP_ONLY=true` instead of `ignoreHTTPSErrors`; no HTTPS disabling enters app code |

## Sources

### Primary (HIGH confidence)
- In-repo reads this session: `Layout.tsx` (176-208 h-screen target), `Sidebar.tsx` (62-61 glyph re-exports, 269-319 NavItem, 344-385 sign-out, 729-787 route order), `router.tsx` (frozen route table), `ConfirmDialog.tsx` (backdrop/scrim/85vh), `useConfirm.tsx` (trap/portal/Escape), `Login.tsx` (67, 91, 112), `theme.ts` (45-47, 79-87), `index.html` (16-34), `vitest.config.ts`, `package.json`, `routedPages.test.ts`, `Layout.displayPrefs.dom.test.tsx`, `main.tsx`, `.github/workflows/lint.yml`, `.github/workflows/build.yml` (49-64 smoke), `cmd/bombvault/main.go` (178, 210-214), `internal/dockercli/dockercli_internal_test.go` (19-28), `internal/config/config.go` (73-77), `internal/api/api.go` (117), `internal/store/settings.go` (60)
- Local tool probes: `npm view @playwright/test` (1.63.0, weekly downloads, no postinstall); jsdom 30.0.1 matchMedia/visualViewport absence probe; `node_modules/tailwindcss/theme.css:327-331` (`--breakpoint-md: 48rem`); `git check-ignore web/dist/index.html` (TRACKED)
- Design bible (read-only): `git show 0b64c7df:design/mobile/README.md` — locked tokens, platform mapping, four-status rule

### Secondary (MEDIUM confidence)
- Context7 `/websites/playwright_dev` — webServer options (command/url/timeout/reuseExistingServer/cwd/env/gracefulShutdown), projects + `devices` descriptors, `install --with-deps` CI pattern
- Context7 `/react/react` (v19.2.7 source) — `inert` in the boolean-attribute switch of ReactDOMComponent.js
- Context7 `/websites/react_dev_reference_react` — `useSyncExternalStore` subscribe/getSnapshot/getServerSnapshot contract
- Context7 `/websites/tailwindcss` — `h-dvh`, `h-svh`, `overscroll-contain` utilities

### Tertiary (LOW confidence)
- [CITED: developer.chrome.com/blog/viewport-resize-behavior] — `interactive-widget` values, Chrome 108+ default, iOS exclusion
- [CITED: developer.mozilla.org/en-US/docs/Web/API/VisualViewport] — OSK shrinks visual viewport only; resize/scroll events
- [CITED: developer.mozilla.org/en-US/docs/Web/CSS/length] — svh/lvh/dvh definitions; dvh unstable; units track toolbars not keyboard
- [CITED: developer.mozilla.org/en-US/docs/Web/CSS/env] — safe-area-inset-* semantics, 0 default
- [CITED: playwright.dev/docs/browsers] — `install-deps` / `--with-deps`; WebKit per-OS variability

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library already in-repo except `@playwright/test`, which is npm-verified and doc-confirmed (SUS verdict attributed to its weekly release cadence, mitigations documented)
- Architecture: HIGH — every seam (Layout switch point, nav registry source, trap precedent, i18n pipeline, CI job shape) verified by direct file reads this session
- Pitfalls: HIGH — Pitfalls 1-3 and 5-8 are grounded in reproduced behavior or verbatim in-repo precedent; Pitfall 2's platform claims cite official vendor docs and agree with the locked decision's own framing
- Harness design: MEDIUM-HIGH — Playwright config surface doc-verified; the end-to-end run (A1 empty states, A3 WebKit-in-CI) is unexercised until first execution by design

**Research date:** 2026-09-11
**Valid until:** 2026-10-11 (stable: presentation-only phase on a pinned local stack; only `@playwright/test` moves weekly — re-check latest at execution time)
