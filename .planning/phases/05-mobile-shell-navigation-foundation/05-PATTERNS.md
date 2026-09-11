# Phase 5: Mobile Shell & Navigation Foundation - Pattern Map

**Phase:** 5
**Generated:** 2026-09-11
**Files analyzed:** 12 (new files/components + 2 edited hosts)
**Analogs found:** 10 / 12 (Playwright harness + e2e specs have no in-repo precedent — see "Unmapped")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `web/src/lib/navModel.ts` | utility (pure lib) | transform | `web/src/lib/pageShell.ts` (exported constants) + `Sidebar.tsx:729-792` (destination list being extracted) | role-match |
| `web/src/lib/navModel.test.ts` | test (node env, pure logic) | batch | `web/src/app/routedPages.test.ts` | exact |
| `web/src/lib/useMediaQuery.ts` | hook | event-driven | `web/src/lib/theme.ts:78-87` (`onSystemThemeChange` — the house matchMedia subscribe/unsubscribe shape) | role-match |
| `web/src/lib/useMediaQuery.test.ts` | test (source assert, node env) | transform | `web/src/app/routedPages.test.ts:60-75` (read source text, assert literal, no DOM) | exact |
| `web/src/lib/testSetup/matchMedia.ts` | config (vitest setup) | request-response | `web/vitest.config.ts:1-19` (node-default + per-file jsdom docblock doctrine) | role-match |
| `web/src/components/mobile/BottomSheet.tsx` | component (modal primitive) | event-driven | `web/src/lib/useConfirm.tsx` (stateful half: portal/Escape/Tab trap/focus restore) + `web/src/components/ConfirmDialog.tsx` (presentational half: backdrop/card/classes) | exact |
| `web/src/components/mobile/MoreSheet.tsx` | component | CRUD | `web/src/components/Sidebar.tsx:269-385` (NavItem + SidebarSignOut rows it re-expresses) | role-match |
| `web/src/components/mobile/BottomNav.tsx` | component | event-driven | `web/src/components/Sidebar.tsx` (`NavLink` + `isActive` class-fn + `navActive`/`glim-active` accent language) | role-match |
| `web/src/app/Layout.tsx` (EDIT) | controller (chrome host) | request-response | itself — `Layout.tsx:175-208` (`h-screen` at :176, `main` scroller at :190); mobile branch mirrors the same flex shell | exact |
| `web/index.html` (EDIT) | config | — | itself — FOUC script `index.html:16-31` must stay byte-identical; meta at `:34` is the replacement target | exact |
| `web/playwright.config.ts` + `web/e2e/*.spec.ts` | config + test (e2e) | request-response | NO ANALOG — nearest precedents: `.github/workflows/build.yml:49-64` (health-poll boot smoke: `openssl rand -hex 32` APP_KEY, `HTTP_ONLY=true`, poll `/api/health`) and `lint.yml` job shapes | none |
| `.github/workflows/lint.yml` (EDIT) | config (CI) | batch | itself — new `playwright` job clones the `web` job's skeleton (`lint.yml:30-41`: digest-pinned actions, `working-directory: web`, `npm ci` → build → test) | exact |

---

## Pattern Assignments

### `web/src/lib/navModel.ts` (pure lib, transform)

**Analog:** `web/src/lib/pageShell.ts` for module form; `web/src/components/Sidebar.tsx:729-792` for the data being extracted.

**Module form** (`pageShell.ts:1-2, 79-88`) — narrative `// ---` banner header, named exports only:
```typescript
// ---------------------------------------------------------------------------
// PAGE_SHELL — the ONE root-wrapper class every routed page uses.
// ...
// ---------------------------------------------------------------------------
export const PAGE_SHELL = "flex flex-col gap-10 max-w-6xl";
```
`pageShell.ts` is the house model of "one shared constant with a measured-reason essay on top." navModel.ts should open the same way and cite Sidebar's render-time hue semantics as the reason it must NOT do hue assignment (Pitfall 5 in 05-RESEARCH.md).

**Data shape to extract** — the destination list as JSX-gated render order (`Sidebar.tsx:729-792`):
- Always-on: `/dashboard` (`nav.dashboard`, `IconDashboard`), `/recovery`, `/containers`
- Settings-gated (each gated by `{xEnabled && …}`, short-circuiting before `nextHue()`): `/vms`, `/flash`, `/files`, `/config`, `/receiver`, `/fleet`
- Footer group: `authEnabled && <SidebarSignOut/>` (:784), `SidebarControls` (:785), `/settings` (:786-791)

**Critical constraint (Sidebar.tsx:703-722 comment):** `nextHue()` is called during render IN JSX order and gates short-circuit BEFORE it — a hidden tab never burns a rainbow slot. `destinations(settings)` must therefore return the FULL ordered list with an `enabled` flag per entry (not a pre-filtered list), so Sidebar keeps its counter semantics and MoreSheet filters by `enabled`. Gate values come from `Settings` fields (`vmsEnabled`, `flashEnabled`, `filesEnabled`, `configEnabled`, `receiverEnabled`, `fleetEnabled`) plus `authEnabled` passed separately (Sidebar prop, `Sidebar.tsx:65-70`).

**Anti-pattern:** making navModel hand out hue indices, or maintaining a second hand-written ordering list for MoreSheet (the exact drift SHELL-03 exists to kill).

### `web/src/lib/useMediaQuery.ts` (hook, event-driven)

**Analog:** `web/src/lib/theme.ts:78-87` — the only existing matchMedia subscription in the repo, and the sanctioned subscribe/unsubscribe shape:
```typescript
const mql = window.matchMedia("(prefers-color-scheme: dark)");
if (typeof mql.addEventListener === "function") {
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
// Safari < 14 fallback — deprecated but still the only API there.
mql.addListener(onChange);
return () => mql.removeListener(onChange);
```
Also note `theme.ts:1-13`'s banner comment convention and its "keep index.html in sync" cross-file comment pattern — relevant because the query literal must be pinned to Tailwind's `--breakpoint-md: 48rem` by a guard test (repo convention: fragile pairs get a documented guard).

**Hook location convention:** there is NO `web/src/hooks/` directory (globbed — absent). Every hook lives in `web/src/lib/use*.ts(x)`: `useConfirm.tsx`, `useReveal.ts`, `useRainbow.ts`, `useLabelMode.ts`, `useDragReorder.ts`, `useTipBubble.tsx`. So the file is `web/src/lib/useMediaQuery.ts` (the `.ts` if it exports only the hook; `.tsx` is reserved for hooks returning JSX, e.g. `useTipBubble.tsx`, `useConfirm.tsx`).

**Anti-pattern:** `useEffect`+`useState` listener (torn snapshots), a second breakpoint literal anywhere, or per-component `matchMedia` calls.

### `web/src/lib/testSetup/matchMedia.ts` + `web/vitest.config.ts` (setupFiles)

**Analog:** `web/vitest.config.ts:1-19` — the whole DOM doctrine in one file:
- Default env is `node` (:16); jsdom is opt-in per test file via `// @vitest-environment jsdom` docblock (line 1 of e.g. `Layout.displayPrefs.dom.test.tsx`).
- The stub MUST be guarded (`typeof window !== "undefined" && typeof window.matchMedia !== "function"`) because setupFiles execute in node-env files too, where `document`/`window` are undefined (see `ConfirmDialog.tsx:17-23` for the repo's own statement of that fact).
- Desktop-default return value (`matches: true` for `(min-width: …)` desktop queries) keeps existing tests (e.g. `Layout.displayPrefs.dom.test.tsx`, which renders the real Layout) asserting desktop layout.

**Anti-pattern:** flipping the default environment to jsdom; an unguarded stub (crashes node-env suites); a stub without `addEventListener`/`removeEventListener` on the returned MQL (useMediaQuery subscribes).

### `web/src/components/mobile/BottomSheet.tsx` (modal primitive)

**Analog split (the repo's own two-half doctrine, documented at `useConfirm.tsx:6-14` and `ConfirmDialog.tsx:16-27`):**
- **Stateful half** (`web/src/lib/useConfirm.tsx`): `createPortal(..., document.body)` (:155-170 — escapes ancestor CSS transforms like `.glim-page-enter`), document-level keydown (:118-149) — Escape closes, Tab/Shift+Tab cycles `focusableElements(card)` (:81-83, `FOCUSABLE_SELECTOR` at :78-79) — and focus restore to the captured trigger (:92-99, :110-112).
- **Presentational half** (`web/src/components/ConfirmDialog.tsx`): pure hookless function component; backdrop `fixed inset-0 z-50 ... bg-black/60` + `onClick` target===currentTarget close (:110-114); card `relative flex max-h-[85vh] w-full ... rounded-card bg-carbon-surface shadow-2xl` (:121); strict-mode/accessible-name discipline documented at :56-62 (two identically-named controls broke Playwright strict matching — reason the mobile nav needs a distinct `aria-label`).

**Deltas for the sheet (per 05-RESEARCH.md Pattern 2):** `max-h-[85dvh]` not `vh` (mobile primitive, SHELL-05); internal scroll `overflow-y-auto overscroll-contain`; bottom padding `var(--safe-area-bottom)`; slide-up behind `motion-safe:` (house precedent `Sidebar.tsx:222` `motion-safe:active:scale`); React 19 true boolean `inert` prop on background content. Tokens: `bg-carbon-*`, never raw hex; radii via `rounded-card`/`rounded-control`, never hard-coded.

**Anti-pattern:** a third modal family with its own trap implementation; raw hex; an inline `onKeyDown` Escape on the panel root (documented-broken at `useConfirm.tsx:25-33`).

### `web/src/components/mobile/MoreSheet.tsx` + `BottomNav.tsx`

**Analog:** `web/src/components/Sidebar.tsx`.

- **Rows:** `NavItem` (:269-324) — `NavLink` with `className={({isActive}) => …}` (:303-305), active = `navActive` + `glim-active` (accent bg + `text-accentContrast`), label never removed only hidden (`sr-only`, :314-319), icon badges need tooltips (bombvault lint rule; `useTipBubble` :289). MoreSheet reuses the SAME accent-tint language (locked decision).
- **Sign-out parity** (:353-357) — copy verbatim, NO confirm:
```typescript
async function signOut() {
  await logout().catch(() => undefined);
  const g = globalThis as unknown as { location: { reload(): void } };
  g.location.reload();
}
```
- **Order:** destination order in the sheet comes from `navModel.destinations(settings)` — Sidebar's JSX order is the source being extracted, never re-typed.
- **Every user-visible string** through `t()` from `useT()` (imported as `import { useT } from "../lib/i18n"`); em dashes banned in user text; `nav.*` keys pattern at `lib/i18n.ts:62-69` (new `nav.more` goes through the full every-locale pipeline, guarded by the existing `i18n.parity.test.ts`).

**Anti-pattern:** default export (named exports only — default reserved for locale modules + `Recovery.tsx`); status colors on interactive controls (Badges only); re-deriving the destination list instead of importing navModel.

### `web/src/app/Layout.tsx` (EDIT — the one chrome switch)

**Analog:** itself. Structure verified at `Layout.tsx:175-208`:
```tsx
<div className="flex h-screen overflow-hidden bg-carbon-background">   // :176 — h-screen → h-dvh (SHELL-05)
  <Sidebar settings={settings} authEnabled={authEnabled} />            // :177
  <main className="flex-1 flex flex-col overflow-y-auto p-6 min-w-0">  // :190 — main is THE scroller
```
Pattern to preserve: the long inline "why" comments (:178-199) explaining the flex/sticky-footer fix — mobile-branch changes get the same comment treatment. The `blocked` branch (:171-173) returns `<LoginPage/>` BEFORE the shell — that is why login gets no chrome for free (SHELL-07); login's own fixes are in `Login.tsx` (`min-h-screen` at :67 → `min-h-dvh`; `text-sm` inputs at :91, :112 → `max-md:text-base`). Tap-on-active scroll targets `main` (Layout owns it): `document.getElementById("bv-main")?.scrollTo(...)` shape. The ONE `focusin`/`visualViewport` mechanism lives here (guard `typeof window.visualViewport !== "undefined"` — absent in jsdom, same stub discipline as matchMedia).

**Anti-pattern:** rendering the Sidebar on mobile and CSS-hiding it (must not render — it runs subscriptions/dialogs); a second page tree or route-level split; `100vh` anywhere in the mobile shell.

### `web/index.html` (EDIT — SHELL-06)

**Analog:** itself. The FOUC script at `:16-31` must stay byte-identical; it ends at line 31, `<meta name="viewport">` is at `:34`. New content (`viewport-fit=cover`, `interactive-widget=resizes-content`, `theme-color` fallback `#161616`) goes at/below :34. `theme.ts:10-12` documents the index.html↔lib sync convention; the live theme-color mirror hooks `paint()` (`theme.ts:45-47` — the choke point all three application paths funnel through), following `theme.ts`'s banner-comment style for the paired-change note.

**Anti-pattern:** editing the FOUC script; mirroring theme-color at individual call sites instead of `paint()`.

### Guard tests: `navModel.test.ts`, `useMediaQuery.test.ts`, SHELL-04/05/06 source asserts

**Analog (exact):** `web/src/app/routedPages.test.ts` — the repo's source-assert style, node env, reads text with `readFileSync` + regex, asserts literals with failure messages that explain the why (:65-90). Its banner (:1-19) states the doctrine: "Node environment, no DOM: this reads source text, it does not render." Also note the self-guard idiom (:61-63 — "guards against this test silently matching nothing").

Concretely to lift:
- `useMediaQuery.test.ts` reads `useMediaQuery.ts` source and asserts the literal `"(min-width: 48rem)"` (pairs with `node_modules/tailwindcss/theme.css:328` `--breakpoint-md: 48rem`).
- SHELL-04/05/06 tests read `index.css` / component sources / `web/index.html` the same way (e.g. assert `--safe-area-*` block exists, no `100vh` in mobile-shell sources, meta contains `viewport-fit=cover` AND `interactive-widget=resizes-content` below the FOUC script).
- DOM-behavior tests (BottomSheet trap) use the `.dom.test.tsx` convention: file next to subject, `// @vitest-environment jsdom` as literal line 1, RTL `render`/`screen`/`cleanup` (model: `Layout.displayPrefs.dom.test.tsx:1-21`), `vi.mock("../lib/api", …)` for boundary fakes (:25-28).
- Test placement is always next to the subject (`src/**/*.test.ts(x)`, per `vitest.config.ts:3-4`); tests are excluded from the tsc program.

### `.github/workflows/lint.yml` (EDIT — new `playwright` job)

**Analog:** the `web` job in the same file, `lint.yml:30-41`: digest-pinned `actions/checkout`/`setup-node` (`# v7` comments), `defaults: { run: { working-directory: web } }`, sequential `npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm test`. The new job clones this skeleton plus `setup-go` (copy the `go` job's pinned action, `lint.yml:24-25`), inserts `npm run build` BEFORE `go build` (stale-embedded-SPA pitfall), then `npx playwright install --with-deps chromium webkit` and `npx playwright test`. Triggers block at `lint.yml:15-17` stays as is.

**Health-wait precedent:** `.github/workflows/build.yml:49-64` — fresh `APP_KEY="$(openssl rand -hex 32)"`, `HTTP_ONLY=true`, poll `GET /api/health`. The Playwright `webServer.url` polling replaces the shell loop (research: "Don't Hand-Roll" — the build.yml loop is for containers, not test runs), but its env recipe is the verified boot contract.

---

## Shared Patterns (apply to ALL new files)

1. **Named exports only.** Default exports exist only for locale modules and `Recovery.tsx` (confirmed in Sidebar/ConfirmDialog/theme.ts/pageShell — all named).
2. **Narrative "why" banner comments** at the top of every nontrivial file, in the `// ---` delimiter style (`pageShell.ts:1-77`, `useConfirm.tsx:6-64`, `ConfirmDialog.tsx:1-36`, `routedPages.test.ts:1-19`). A tricky choice without a paragraph is off-style. Long inline justifications at decision sites too (`Layout.tsx:178-199`).
3. **Tailwind semantic tokens only:** `carbon-*`, `accent*`, `status*` (token definitions `web/src/index.css:612, 640, 922`); never raw hex, never hard-coded radii (`rounded-card`/`rounded-control`); shared controls carry `glim-*` engine classes (`glim-hue`, `glim-active`, `glim-modal-backdrop`, `glim-field-focus`); status colors on Badges only, never interactive controls.
4. **i18n:** every user-visible string through `t()` from `useT()` (lint-enforced); no em dashes in user text (lint-enforced, non-configurable); lint exceptions go in `web/eslint.config.js`, never inline disables.
5. **jsdom discipline:** node env is the default; `.dom.test.tsx` files opt in via line-1 `// @vitest-environment jsdom`; anything touching `window`/`document`/`matchMedia`/`visualViewport` must survive both envs (guarded stubs).
6. **Pitfall-1 coupling:** the matchMedia stub + `vitest.config.ts` setupFiles entry must land in the SAME change as `useMediaQuery` — `Layout.displayPrefs.dom.test.tsx:47,59-62` renders the real Layout and jsdom 30 has no `window.matchMedia`.

## Frozen Files (must NOT touch)

- `web/src/app/router.tsx` (route table — all 10 nav routes already exist there)
- `web/src/lib/api.ts` (SPA's only API client)
- `web/src/lib/progress.ts` (module singleton)
- everything under `internal/**` (zero backend changes)

Constraint consequence: `useMediaQuery`/chrome changes may not add routes or API calls; the chrome performs no fetches (UI-SPEC).

## Unmapped / No Precedent

| File | Role | Data Flow | Reason | Nearest precedent to imitate |
|------|------|-----------|--------|------------------------------|
| `web/playwright.config.ts` | config | request-response | No e2e tooling exists in the repo (no playwright*, no cypress — grepped/globbed) | `web/vitest.config.ts` for config-file form; `build.yml:49-64` for the boot/health contract |
| `web/e2e/*.spec.ts` (3 files) | test (e2e) | request-response | Zero e2e specs in repo | Parameterized-loop style modeled on `routedPages.test.ts`'s `it.each` (:65, :77); strict-mode discipline from `ConfirmDialog.tsx:56-62` |
| `web/src/lib/testSetup/matchMedia.ts` | test config | — | No `setupFiles` exist yet in `vitest.config.ts` | Guarded-stub discipline per `ConfirmDialog.tsx:17-23`'s node-env statement |

The planner should do targeted Playwright research at plan time (flagged in CONTEXT.md specifics) and treat the harness as composition of verified pieces (research Architecture Pattern 3 gives a complete draft config).

## Metadata

**Analog search scope:** `web/src/lib/`, `web/src/components/`, `web/src/app/`, `web/src/pages/`, `web/` root configs, `.github/workflows/`
**Files read this session:** Layout.tsx, Sidebar.tsx (3 ranges), useConfirm.tsx, ConfirmDialog.tsx, theme.ts, pageShell.ts, routedPages.test.ts, vitest.config.ts, index.html, Login.tsx (:60-119), Layout.displayPrefs.dom.test.tsx (:1-30), lint.yml, build.yml (:40-74), index.css (token grep)
**Pattern extraction date:** 2026-09-11
