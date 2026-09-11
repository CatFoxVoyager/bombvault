# Pitfalls Research

**Domain:** Adding a responsive mobile layer (bottom nav + More sheet, touch selection tree, guided restore, full management parity on iOS Safari and Android Chrome) to an existing desktop-first hand-rolled React 19 / Vite 8 / Tailwind 4 SPA embedded in a Go binary — BombVault v1.1
**Researched:** 2026-09-11
**Confidence:** HIGH for code-grounded pitfalls (file:line cited from `.planning/codebase/` and direct source inspection); MEDIUM for framework-behavior claims (Tailwind v4, Vite 8 via Context7); LOW-to-MEDIUM for web-platform behavior claims — the classify-confidence seam rates web fetches LOW, but every such claim below comes from official vendor documentation (MDN, W3C WCAG Understanding docs, WebKit blog, Chrome developers blog), several cross-checked across two independent sources. Nothing below rests on a single unverified blog.

**Phase vocabulary used below** (the v1.1 roadmap is not written yet; keep this mapping when it is):
- **M1 — Shell foundation** (MOBILE-01): viewport meta, viewport-height strategy, safe areas, breakpoint strategy, bottom nav + More sheet architecture, lint/exception decisions, regression harness.
- **M2 — Maquette screens** (MOBILE-02): Home, Containers + touch tree, File sets + tree, Run detail/Recovery.
- **M3 — Remaining destinations** (MOBILE-03): VMs, Flash, Config, Receiver, Fleet, Settings in the mobile language.
- **M4 — Parity, polish, verification** (MOBILE-04): guided restore, schedules, notifications, replication on small screens, bundle audit, real-device pass.

---

## Critical Pitfalls

### Pitfall 1: The mobile shell collides with lint-enforced desktop conventions (PAGE_SHELL, routed pages, single Sidebar nav)

**What goes wrong:**
Every routed page's root must use `PAGE_SHELL` (one 40px-gap, 1152px-cap wrapper — `web/src/lib/pageShell.ts`), enforced by the `bombvault/page-uses-page-shell` lint rule plus `web/src/app/routedPages.test.ts`. The app has exactly one nav surface (`web/src/components/Sidebar.tsx`, which also holds the sign-out row) inside one `Layout.tsx` auth gate. A mobile shell that gives pages a different root wrapper or a second nav breaks CI in two places at once — and the historical response to a blocking rule (a `eslint-disable` comment) is explicitly against house rules: exceptions are declared in `web/eslint.config.js` with a written rationale (the `page-uses-page-shell` options are the model). The worse failure is the quiet one: someone "temporarily" bypasses the shell class on mobile pages and within a milestone there are again five different card widths and two gaps — the exact mess `pageShell.ts`'s header comment documents having already cleaned up once.

**Why it happens:**
The convention machinery was built for a desktop-only app; it has no vocabulary for "same route, two chrome languages." Developers meet the lint error mid-features and reach for the disable comment because the sanctioned escape hatch (declaring an exception) is undocumented for this case.

**How to avoid:**
- Decide the architecture in M1 before any screen work: either (a) `PAGE_SHELL` stays and pages are wrapped by a responsive mobile shell *outside* the page root (bottom nav lives in `Layout.tsx`, pages untouched above the breakpoint), or (b) `PAGE_SHELL` gains a documented responsive variant. Write the decision into PROJECT.md Key Decisions with the `pageShell.ts` narrative style.
- If a lint exception is needed, declare it in `web/eslint.config.js` with the reasoning comment — never an inline disable (`reportUnusedDisableDirectives` is an error anyway).
- Drive bottom nav, More sheet, and Sidebar from ONE nav registry (array of route + glyph + `nav.*` i18n key) so a new destination can never be registered in one chrome and forgotten in the other. Keep sign-out reachable in the mobile chrome (it currently lives only in the Sidebar).
- Keep `Layout.tsx` as the single auth gate; the mobile shell is a layout decision inside it, not a second app entry.

**Warning signs:**
A PR that adds `eslint-disable bombvault/page-uses-page-shell`; a second hand-maintained list of destinations; `routedPages.test.ts` or the lint job going red during mobile work and being "fixed" by weakening the rule.

**Phase to address:** M1 (shell foundation). This is the first decision the milestone makes; every screen phase inherits it.

---

### Pitfall 2: Adding touch handlers to the selection tree creates a second input path that bypasses the one-toggle pipeline

**What goes wrong:**
`SelectionTree.tsx` has a deliberately narrow input contract: selection is expressed ONLY via `aria-checked` on the treeitem; the visual checkbox is `aria-hidden` with `tabIndex -1` (review WR-02); there is ONE `onKeyDown` on the `role="tree"` element with roving tabindex; and a locked Key Decision says "Keyboard Space routes through the identical onToggle pipeline as checkbox clicks — one toggle semantics, one D-04 zero-include guard, one save queue — an alternate input path can never bypass a client-side guard." Touch is a new input path. Classic ways it breaks:
- Toggling on `onPointerDown`/`onTouchStart` *and* getting the synthesized `click` = two toggles per tap (net no-op with a visible flicker, or a guard trip on the intermediate state).
- A long-press context menu ("deselect subtree") implemented as a raw touch handler that mutates selection state directly, skipping the D-04 zero-include guard and the save queue.
- Taps that never move focus: mobile browsers don't focus buttons on tap, so the roving tabindex target desyncs from what the user touched — then a connected-keyboard user (or VoiceOver user) pressing Space acts on the wrong node. Tap must update the roving tabindex exactly like arrow keys do.
- Press-state or drag-affordance listeners calling `preventDefault()` on touchstart, killing scrolling inside the tree (appdata trees are long lists).

**Why it happens:**
Pointer events and compatibility mouse events are a minefield; desktop components never had to think about it, so nothing in the component's structure pushes toward a single funnel.

**How to avoid:**
- One rule, written at the top of the mobile tree variant: **all pointer input funnels into the same `onToggle` path** — activation on `click` only; `onPointerDown` is for visual press state (or use the `:active` CSS state); no handler other than `onToggle` may write selection state.
- On pointerup, if the tapped treeitem is not the roving tabindex target, `focus()` it (same code path arrows use), so keyboard and touch share one focus model.
- Long-press, if needed at all, must open a menu whose actions call the same exported operations as keyboard/desktop paths — never a direct state write. Reconsider: the design bible shows no context menu; tri-state checks + the exclusions disclosure may be enough, and skipping long-press removes a whole class of gesture/scroll conflicts (`-webkit-touch-callout`, text selection).
- Extend the existing `.dom.test.tsx` pattern: every existing keyboard/click test gets a `fireEvent.click` twin that asserts `aria-checked` AND the resulting PATCH payload; add one test asserting a tap on a non-focused node moves roving tabindex.

**Warning signs:**
A `touchStart`/`pointerDown` handler with selection logic in it; two code paths to `aria-checked`; a code review note saying "touch just synthesizes a click" without a test; tree rows that no longer scroll when a finger starts on a row.

**Phase to address:** M2 (the touch tree is built there). The invariant statement should be recorded in M1's conventions so M2 inherits it as a rule, and re-verified in M4 (keyboard-only regression pass).

---

### Pitfall 3: Building the mobile shell on 100vh (the large-viewport trap)

**What goes wrong:**
The desktop SPA is a scrolling document, so it never had a height-constrained shell; the mobile layout (fixed bottom nav + content area + More sheet) introduces one. `100vh` / Tailwind `h-screen` on mobile equals the **large viewport** — the space with the URL bar hidden. With the toolbar shown (the initial and most common state), a `100vh` shell is taller than the screen: the bottom of the shell — exactly where the new bottom nav lives — sits underneath Safari's toolbar and is unreachable. `dvh` fixes it but jitters: every toolbar collapse/expand while scrolling resizes the shell, re-flowing the whole app.

**Why it happens:**
`100vh` is the muscle-memory full-height idiom, and it is correct on desktop — the suite has zero tests that would catch it because jsdom performs no layout.

**How to avoid:**
- Shell height uses the ordered fallback cascade (later declaration wins only where supported): `min-height: 100vh;` then `min-height: 100svh;` (and `100dvh` only for surfaces that should track the visible viewport). Use `svh` (worst case, all browser UI shown) wherever content must never be obscured — the bottom nav's positioning math included. Support: Safari 15.4+, Chrome 108+, Firefox 101+ (MDN); Vite 8's baseline is Safari/iOS 16.4 so the units are in-baseline, but keep the plain-vh fallback first regardless — it costs one line and guards older Android WebViews.
- Prefer `min-height` over `height` for the shell so overflow grows the document instead of clipping it.
- Do not chase jitter with JS `resize` handlers; pick the right unit per surface instead (static chrome = svh; genuinely dynamic surfaces = dvh).
- Note for later: `position: fixed` anchors to the *layout* viewport — pinch-zoom can push fixed bars offscreen regardless of which unit you chose. Acceptable for an admin tool; just don't "fix" it by disabling zoom (see Anti-Features).

**Warning signs:**
Any `h-screen` / `100vh` in mobile shell code; a bottom nav that requires scrolling to reach on device; screenshots taken only with the URL bar collapsed.

**Phase to address:** M1. Get the unit policy into the shell's first PR so it is never retrofitted across 11 screens.

---

### Pitfall 4: Safe areas done half-way — `viewport-fit=cover` without `env()`, or `env()` without `cover`

**What goes wrong:**
`web/index.html` currently ships `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — no `viewport-fit=cover`, no `theme-color`. Adding a bottom nav pulls in both halves of the safe-area contract, and each half fails differently:
- Set `viewport-fit=cover` but forget `env(safe-area-inset-bottom)`: the page now lays out edge-to-edge and the home indicator / gesture bar overlaps the bottom nav's tap targets.
- Add `env()` padding but forget `cover`: the insets are 0 (Safari's default `auto` insetting keeps content out of the unsafe area but paints only the body background there), so the padding logic is untestable dead code and the design bible's edge-to-edge "cell" cards stop at a hard line.
- The rotation trap: insets are non-zero only near the notch/home-indicator edges and change with orientation (WebKit blog) — bottom inset is generous in portrait, side insets grow in landscape, and a bar padded only for `bottom` looks correct in one orientation and clipped in the other. "Insets are not a replacement for margins."

**Why it happens:**
Desktop never had any of this; `env()` returns 0px on desktop browsers, so every mistake is invisible in desktop testing and in Playwright device emulation (which does not emulate safe-area insets at all).

**How to avoid:**
- In M1, extend the viewport meta once: `width=device-width, initial-scale=1.0, viewport-fit=cover` (plus `interactive-widget=resizes-content`, see Pitfall 5, and a `theme-color` matching the carbon `bg`).
- Centralize the insets as CSS custom properties once (`--bv-safe-bottom: max(0px, env(safe-area-inset-bottom))` etc.) in `index.css` next to the other tokens, and consume them everywhere (bottom bar, More sheet grab-handle area, sticky headers, FAB). One definition = one-line fix when wrong.
- Use the WebKit-recommended pattern: plain fallback padding, then `max(16px, env(safe-area-inset-bottom))` inside `@supports` — and never put a `var()` inside the `@supports` condition.
- Keep `html`/`body` background on the carbon `bg` token so the unsafe-area fill is the right color in both themes.
- Verify in portrait AND landscape, notched iPhone and home-button iPhone (SE-class, where insets are 0 — the padding must gracefully collapse to the plain fallback).

**Warning signs:**
`env(safe-area-inset-*)` appearing ad-hoc in multiple components instead of a shared variable; screenshots only in portrait; an emulator-only "verified" claim (emulation shows 0px insets, i.e. it verifies nothing).

**Phase to address:** M1. This is definitionally shell-foundation work; per-screen phases should only *consume* the variables.

---

### Pitfall 5: `position: fixed` bottom bar vs the on-screen keyboard — iOS never resizes the layout viewport, and Android changed its default in Chrome 108

**What goes wrong:**
On iOS Safari the on-screen keyboard resizes only the **visual** viewport; the layout viewport is untouched. A `position: fixed` bottom nav therefore stays exactly where it was — behind the keyboard — while Safari scrolls the focused input into view *visually*, producing the classic broken states: nav bar floating mid-screen over the keyboard, or the bar apparently "missing" while a schedule form is open. Chrome on Android ≥108 aligned with Safari (`resizes-visual` default), so the old Android behavior people remember (layout shrinks, fixed elements ride up above the keyboard) is gone by default; the `interactive-widget=resizes-content` meta value restores it — **but iOS does not support that meta at all**, so it can never be the whole fix.

**Why it happens:**
Desktop keyboards don't change the viewport, so desktop-tested CSS is guaranteed wrong here; and the Android fix people find first (the meta tag) silently does nothing on the platform with the worst behavior.

**How to avoid:**
- Treat the meta tag as an Android-only assist (`interactive-widget=resizes-content` in the M1 viewport meta), and build one JS mechanism for iOS in M1: on `focusin`/`focusout` of text inputs (or via `visualViewport` resize), hide the bottom nav / pin it below the keyboard, or add bottom padding equal to the keyboard overlap. Every form in M3/M4 (schedules, notification URLs, replication endpoints, login/TOTP) gets this for free by construction — the mechanism must exist in M1 or each screen reinvents it badly.
- Never position critical actions in a fixed bar that assumes the keyboard will push it up; "primary action while editing" buttons belong inline in the form flow on mobile.
- Test the login screen early (M2 ships screens but Login is reached on a fresh device first) — TOTP code inputs + fixed chrome + iOS is the fastest place to see this bug.

**Warning signs:**
A screenshot of any form with the keyboard open; `interactive-widget` described in the PR as "fixes the keyboard issue"; no `focusin`/`visualViewport` code anywhere in the shell.

**Phase to address:** M1 builds the mechanism; M3/M4 verify every form surface against it.

---

### Pitfall 6: Pull-to-refresh and scroll chaining erase guided-restore wizard state mid-restore

**What goes wrong:**
An app-style mobile layout means nested/inner scroll containers and full-screen sheets. Two native behaviors become hazards:
- **Pull-to-refresh** (Android Chrome on the document scroller): reloads the SPA from scratch. Desktop users never swipe, so nothing protects against it — and the client state it destroys is not a list refresh. The guided restore flow's step position and confirmations, the touch tree's expanded-set, and any half-filled schedule form are all client-side React state. A mid-restore accidental reload also tears down the `useBackupWatch` correlation for the in-flight job (it recovers by re-polling `listRuns`, but the *wizard* is gone).
- **Scroll chaining**: reaching the end of the More sheet's scroll continues scrolling the page *behind* the sheet (MDN's canonical example). On iOS < 16 there is no `overscroll-behavior` at all — and while Vite 8's baseline is iOS 16.4, older iOS Safari still loads and runs the bundle fine (JS syntax is what's transpiled, CSS features just don't exist), so those users get the broken behavior.

**Why it happens:**
Browser defaults exist for documents, not app shells; desktop testing can't trigger any of it.

**How to avoid:**
- Scroll-container policy set once in M1: `overscroll-behavior: contain` on every inner scroller and on sheets/dialogs (an `overflow: hidden` backdrop container counts as always-at-boundary, so `contain` there stops background bleed); `none` on `html` if the product decides pull-to-refresh is never wanted on an admin tool — decide explicitly, it is a real tradeoff (PTG is a familiar affordance).
- Belt-and-braces for the destructive flow in M4: checkpoint the guided-restore wizard's step state (e.g. `sessionStorage`) so a reload resumes or at least clearly announces "restore was configured but not started/completed" instead of silently dropping the user at Home.
- Keep every snapshot-id validation and confirm step server-checked (they already are) — the UI state being rebuildable must never be what makes the destructive step safe.

**Warning signs:**
Sheets whose backdrop scrolls when flicked; no `overscroll-behavior` anywhere in the codebase after M1; QA notes like "the page reloaded when I pulled down at the top of Containers."

**Phase to address:** M1 (scroll policy), M4 (wizard checkpoint).

---

### Pitfall 7: Hover-only affordances silently vanish on touch — Tailwind 4 already gates `hover:` behind `@media (hover: hover)`

**What goes wrong:**
Tailwind v4 compiles the `hover:` variant inside `@media (hover: hover)` (confirmed via Context7, upgrade-guide source). That is *good* — and exactly why it is dangerous here: on touch devices, hover styles don't just misfire, they never exist. Any desktop affordance implemented only as a hover reveal is not "degraded" on mobile, it is **absent with no error**: tooltips (`useTipBubble`), hover-revealed row actions (edit/delete buttons that appear on row hover), hover-enlarged hit areas, hover-staged confirmations. The milestone's parity requirement (MOBILE-04) fails silently — the screen "works," the capability is unreachable.

**Why it happens:**
On a desktop dev machine every hover affordance works during development; the mobile emulator screenshots are static, so a hover-only control looks fine (hidden) in every capture.

**How to avoid:**
- M1 writes the rule: **every interactive affordance must have a non-hover path** (always-visible, tap-to-reveal via a visible button, or long-press — in that order of preference).
- Sweep in M2/M3 screen work: grep components rendered on mobile screens for `hover:` classes attached to visibility/opacity transitions (`hover:opacity-*`, `group-hover:`, `hover:flex`) — those are the reveal patterns; tooltips need a tap-equivalent (the design bible's tinted chips/badges can carry the info inline instead).
- Where hover styling is purely decorative (pressed/raised states) do nothing — those are fine to lose on touch; the `:active` state covers press feedback.
- Keyboard-focus visibility (`focus-visible`) must not be regressed while adding touch styles — the tree's APG support depends on it.

**Warning signs:** A mobile screen walkthrough performed only with a mouse; any control whose mobile "location" is described as "same as desktop, it appears on hover."

**Phase to address:** M2 (audit begins with the maquette screens, which contain the worst offenders — row actions), completed across M3, verified M4.

---

### Pitfall 8: Desktop-density touch targets — the tree's tri-state checks and chrome controls under 24px

**What goes wrong:**
WCAG 2.2 SC 2.5.8 (AA) requires a 24×24 CSS px square inside every pointer target, with a spacing exception (undersized targets pass only if 24px circles around them don't intersect other targets — 20px buttons need ~4px gaps; WCAG Understanding doc). AAA 2.5.5 is 44×44; platform conventions are 44pt (iOS HIG) / 48dp (Material). The existing components were built for pointer precision: compact tree rows with a small tri-state checkbox, `TimePicker` steppers, `DropdownListbox` rows, one-size icon badges (a lint rule pins icon-badge sizing). Rendered at desktop sizes on a phone, the tree — the milestone's centerpiece — becomes a mis-tap generator, and each mis-tap is not cosmetic: it toggles a folder in or out of the backup set and fires the save queue.

**Why it happens:**
The desktop layouts are "done" and visually approved; shrinking screens makes everything look fine in screenshots. Hit-area math (spacing exception, concentric hit slop) is invisible in any static capture.

**How to avoid:**
- The mobile design language (per the locked bible) already implies 44px-class rows — enforce it: checkbox and chevron hit areas extend to the full row height via padding/pseudo-element, not by visually enlarging the glyph.
- Keep the *visual* glyph compact; grow the *target* (CSS `::before` hit expansion or padding). The spacing exception is a fallback for genuinely dense pairs (tree chevron next to checkbox on one row) — verify the 24px-circle non-intersection actually holds there, and if it doesn't, restructure the row instead of citing the exception by vibes.
- Do this via the shared components (`SelectionTree`, `Button`, `Toggle`) so per-screen work inherits it; the house lint-rule culture is the right tool if enforcement is needed (a target-size rule is feasible — the codebase already lints icon-badge sizes).
- Special attention: destructive targets (Restore, Reset selection) get size AND spatial separation — see Security Mistakes.

**Warning signs:** A mobile tree screenshot where the checkbox is a small square inside a roomy row (roomy rows with tiny targets are the classic miss); no mention of hit-area anywhere in the M2 plan.

**Phase to address:** M2 (tree + maquette screens), carried through M3, spot-checked M4.

---

### Pitfall 9: 42-locale text overflow in compact mobile chrome — the bottom nav and pinned-count bar

**What goes wrong:**
The i18n machinery is excellent about *presence* of translations (parity/quality/orphan tests, `bombvault/user-message-is-translated`, em-dash ban) but says nothing about *geometry*. Mobile chrome is the most space-constrained surface the app has ever had: 4 bottom-nav tabs ~80px each, a More sheet, a pinned "handed to restic" count line, compact headers. German compounds ("Einstellungen", "Wiederherstellung", "Empfänger") and French strings overflow tab widths; ellipsis on a nav label destroys the one thing the label exists to say; worse, a label that wraps pushes the tab bar's height around and desyncs safe-area padding math. There are 40 lazy locale files precisely because strings differ in length — desktop sidebar widths absorbed that variance, mobile tabs cannot.

**Why it happens:**
Everyone develops in English (or the `en` fallback); jsdom cannot measure layout, so no existing test can catch it; the parity tests pass because the key exists in all 42 locales.

**How to avoid:**
- Design chrome icon-primary: glyph carries identity, label is secondary and allowed to ellipsize gracefully (`min-w-0`, `truncate`, `title` — and the translated tooltip via `t()`, per the translated-text lint rule).
- M1 makes a de + fr pass at 320–360px a *definition of done* for the shell itself; M3 repeats the sweep for remaining screens. Use `?lang=de` (or the switcher) and real narrow viewports — this is the cheapest possible device-lab task.
- Keep numerals tabular (`font-variant-numeric`, already in the bible) so the live count line doesn't wiggle; give the count line a `min-w-0`/truncate contract too.
- Never solve it by hard-coding shorter strings or dropping `t()` — the lint rules will (rightly) fail CI; solve it in layout.
- Optional harness upgrade: one Playwright screenshot test per nav surface with the `de` locale — jsdom can't do it, but the M1 regression harness (Pitfall 10) can.

**Warning signs:** Screenshot reviews conducted only in English; any nav component with fixed pixel label widths; ellipsis on labels described as "temporary."

**Phase to address:** M1 (chrome passes de/fr at narrow widths before screens are built), M3 (per-destination sweep).

---

### Pitfall 10: Responsive regressions are invisible to the entire existing test stack — and emulation is not a device

**What goes wrong:**
Three layers of blindness stack up:
1. The web test suite runs vitest with a **node** environment by default (jsdom is per-file opt-in) and jsdom performs **no layout** — `getBoundingClientRect` returns zeros, media queries never evaluate. A media-query typo that reflows desktop, or a breakpoint that never fires, cannot fail any existing test.
2. There is **no e2e/browser suite** (the module map: Playwright exists only as "live-manual verification" commentary). CI (`lint.yml` web job) runs lint + vitest only.
3. When mobile verification does happen, **Playwright device emulation is not a real phone**: it fakes viewport/UA/touch, but not safe-area insets (always 0), not the on-screen keyboard, not pull-to-refresh, not toolbar collapse (`dvh`/`svh` behave differently), and desktop-Chromium or even Playwright-WebKit is not iOS Safari's actual behavior. "Passed in emulation" is exactly the claim that fails on a physical iPhone.

**Why it happens:**
The suite's node-first design is a deliberate speed choice that was correct for logic-heavy v1.0; the milestone changes *what kind* of risk the code carries (layout and device behavior) without changing the harness.

**How to avoid:**
- M1 adds a minimal Playwright smoke suite as a new optional script (not bolted into the default `npm test`): a handful of desktop assertions at ≥1024px ("sidebar visible, PAGE_SHELL width intact" — the desktop-untouched guarantee needs a guard too) plus device-descriptor passes for the mobile shell. Wire it into the existing `lint.yml` web job or a separate job; keep it under a few minutes.
- Accept emulation's limits explicitly in the roadmap: emulation gates PRs; a **real-device checklist** (physical iPhone Safari + Android Chrome, notched and non-notched, portrait + landscape, keyboard-open forms) is an M4 exit criterion, not a nice-to-have. Self-hosted deployment makes this easy: point a real phone at the LAN instance.
- For the desktop-untouched guarantee, the smoke suite is the mechanism — "desktop intact above the breakpoint" must be asserted, not assumed, because every mobile CSS addition is a potential desktop regression and no reviewer can hold 156 files of layout in their head.

**Warning signs:** Mobile PRs whose only verification is dev-server screenshots; the phrase "emulation passed" used as device evidence; a Playwright dependency added in M4 (too late) instead of M1.

**Phase to address:** M1 (harness + desktop-untouched assertions), M4 (real-device pass as exit criterion).

---

### Pitfall 11: Bundle growth and the embedded-dist staleness trap

**What goes wrong:**
Two related hazards:
- **Growth:** pages are NOT code-split — every route ships in one `index-*.js`; only locale chunks are lazy. A second full layout language (shell, bottom nav, More sheet, mobile screen variants) plus new components all lands in that single chunk, and there is no size budget anywhere in CI to notice. Mobile users on cellular feel it first.
- **Staleness:** the SPA is embedded into the Go binary. Repo reality (verified): `.gitignore` keeps `web/dist/*` ignored except a placeholder `index.html`; the real bundle is built fresh in CI/Docker, and the documented rule is `just web` (`npm ci && npm run build`) before any Go build after frontend changes. (PROJECT.md's "commit `web/dist`" phrasing is aspirational — the enforced mechanism is the build-before-embed rule; do not "fix" the gitignore without an explicit decision.) Building the binary without rebuilding the web bundle silently ships a stale SPA — and mobile testing against a stale embed wastes time on bugs that are already fixed, or worse, "verifies" behavior that isn't what ships.

**Why it happens:** v1.0 never had to care — desktop users on LAN don't notice 100KB, and the embed pipeline only bites when someone skips `just web`.

**How to avoid:**
- Measure the baseline (gzip size of the main chunk) at M1 and record it; re-check at M4 against a stated budget. If growth is real, the known lever is route-level `React.lazy` (module map's own recommendation) — but make that a conscious decision with its own tradeoffs (route transitions gain latency), not an accident.
- Milestone working agreement: after any `web/` change, `just web` before `go build`/Docker. When verifying on a phone, verify the *built image* (or `vite preview`/fresh dev build), never a binary of uncertain vintage — a version/test-connection string visible on the mobile Home screen helps confirm what you're looking at.
- Keep locale chunks lazy and do not let mobile work "simplify" by importing locale tables eagerly (a tempting fix for switching latency that would undo the 9/10-bundle reduction the lazy loading bought).

**Warning signs:** The single main chunk growing >20–30% across the milestone with no discussion; any workflow that builds the Go binary without a fresh web build; phone testing that cannot answer "which build is this?"

**Phase to address:** M1 (baseline + agreement), M4 (audit + decision on code-splitting).

---

### Pitfall 12: Hard-coding the design bible's dark tokens into mobile screens breaks the light theme

**What goes wrong:**
The v1.1 design bible locks carbon tokens as *values* (`#161616` bg, `#FCC419` accent) because the prototypes are static HTML. But the product ships a real light theme: `data-theme` is user-selectable, the FOUC script in `index.html` resolves it before first paint, and `theme.ts` owns the axis. A mobile implementation that copies the bible's literal hex values produces a mobile UI that is broken-or-ugly for every light-theme user, and — because the mobile shell is new code — it will *start* as hard-coded values unless prevented. Additionally, small screens stress contrast: `muted` ink (`#8d8d8d`) on `cell` surfaces is near/below WCAG AA (4.5:1) for small text, and the bible's muted token gets used a lot in compact chrome (captions, counts, timestamps).

**Why it happens:** The bible is the milestone's visual contract and it presents values, not variables; the temptation is to transcribe values.

**How to avoid:**
- The codebase already has the right rule and the right enforcement: semantic tokens (`carbon-*`, `accent*`, `status*`) only, never raw hex on controls (`bombvault/controls-read-engine-tokens` lint rule; `no-status-color-on-control`). Read the bible's hex values as *definitions of the tokens*, and implement mobile screens exclusively with token classes — the bible itself says the tokens are "the real tokens from the product's web UI."
- Verify every mobile screen in BOTH `data-theme` values (the theme switcher is one click; make it part of the M2/M3 screen checklists and the M4 device pass).
- Contrast hygiene for small text: prefer `sub`/`text` ink for body-size copy on `cell` surfaces; reserve `muted` for genuinely auxiliary metadata. The four-status-hue rule stands — and the existing lint rule already keeps status colors off interactive controls.

**Warning signs:** Any raw hex in a new mobile component's diff; a mobile screenshot set that is 100% dark mode; `dark:` variants used to *fix* a mobile screen that should have used a semantic token.

**Phase to address:** M1 (token discipline in the shell), enforced by existing lint; M2/M3 checklists; M4 device pass.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `user-scalable=no` / `maximum-scale=1` in the viewport meta to "fix" zoom weirdness | Kills pinch-zoom layout bugs and double-tap zoom in one line | Accessibility violation; iOS ignores it anyway (since iOS 10); users on a server-admin tool need zoom for small log text | Never — use `touch-action: manipulation` on controls for double-tap zoom instead |
| Two separate DOM trees (mobile page components + desktop page components) selected by a JS `isMobile` check | No media-query complexity; each variant is simple | Every feature ships twice forever; the 3,298-line Containers.tsx forks into two 4,000-line files; state drift between variants | Avoid; prefer one responsive tree with layout-level branching. If a genuinely different interaction is needed (touch tree), share the state/logic layer (`selectionTree.ts` is already UI-agnostic) and vary only the view |
| Scattergun `@media (max-width: ...)` values inline in components | Fast first screens | No single breakpoint truth; desktop/mobile boundary drifts per component; impossible to reason about the "desktop untouched above the breakpoint" guarantee | Never — declare breakpoint tokens once (`@theme --breakpoint-*` in Tailwind 4, rem units to preserve sort order) in M1 |
| Inline `eslint-disable` for PAGE_SHELL/nav rules on mobile screens | Unblocks the PR today | Violates the house exception process; `reportUnusedDisableDirectives` may flag it later; conventions erode | Never — declared exceptions in `web/eslint.config.js` only |
| Skipping keyboard testing of the tree after adding touch ("nobody has a keyboard on a phone") | Faster M2 | Regresses a shipped, review-mandated APG contract; iPad + keyboard users; screen-reader users | Never — the APG support is a v1.0 Key Decision, not a nice-to-have |
| `dvh` everywhere "because it's newer" | Feels modern | Whole-app relayout jitter on every toolbar collapse; scroll anchoring surprises | Only for genuinely dynamic surfaces; `svh` for static chrome (see Pitfall 3) |
| Deferring all real-device testing to the end of M4 | Uninterrupted dev flow | Systemic iOS/Android-only bugs discovered after 11 screens are "done"; rework across every screen | Never fully — one early reality check on a physical device in M2 (first tree screen) recalibrates everything cheaply |
| Route-level `React.lazy` opportunistically during mobile work | Smaller main chunk "for free" | Route-transition waterfalls on mobile networks; changed chunk semantics mid-milestone confuse comparisons | As a measured M4 decision with a size budget, not incidental |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `pageShell.ts` + `page-uses-page-shell` lint rule | Giving mobile pages a different root wrapper ad hoc | Decide in M1: responsive variant of PAGE_SHELL or shell-outside-the-page; declare any exception in `eslint.config.js` with rationale |
| `router.tsx` + `routedPages.test.ts` | Adding mobile-only routes or screens outside the registry | Same routes, same registry; mobile is a layout concern; the test must keep passing unchanged |
| `Sidebar.tsx` nav + sign-out | Duplicating the destination list for the bottom nav/More sheet; dropping sign-out | One nav registry drives both chromes; sign-out reachable in More sheet |
| `SelectionTree.tsx` input contract | New pointer handlers writing selection state; tap not updating roving tabindex | All input funnels through the same `onToggle`; tap focuses like arrows do (Pitfall 2) |
| One-deep save queue (FoldersEditor PATCH queue) | Assuming mobile latency needs a new debounce/queue; hiding queue state so reverts look like bugs | Reuse the queue unchanged; surface pending/dirty state near the pinned count so rapid toggling on a slow connection is legible |
| `progress.ts` SSE singleton + `useBackupWatch` | Making mobile Run detail SSE-only; iOS suspends EventSource in background tabs | Keep the existing dual mechanism (SSE appear-then-clear + `listRuns` poll correlated by id); refetch on `visibilitychange` when returning to the tab |
| `i18n.ts` + 40 locale chunks + lint rules | Fixed-width labels; testing only `en`; hard-coded strings to dodge overflow | Icon-primary chrome; de/fr narrow-viewport passes; all strings through `t()` (the lint rule will enforce what review misses) |
| `index.html` FOUC script ↔ `theme.ts` | Touching the shell/head and desyncing the duplicated theme-resolution logic | The fragile pair is documented — changes there must update both sides; mobile shell must not re-implement theme application |
| Go-side `widget.html` statusOffsite hex ↔ `index.css` token | Adding a mobile status chip with a "close enough" hex | Reuse tokens; the drift guard test exists — don't create a second hard-coded copy |
| `useConfirm` dialogs | Replacing confirmations with swipe/tap-through gestures on mobile | Keep `useConfirm` as the confirmation surface, restyled for mobile; destructive steps never become gesture-only |
| `api.ts` `{ok:false}` envelope | Mobile error states that render "0 results" instead of the server's scrubbed reason | Same `loadErrorMessage(res, fallback)` contract on compact error rows |
| `bombvault/*` lint rules (one icon-badge size, no status color on controls, translated text, no em dashes) | Treating them as desktop-only noise during mobile work | They are load-bearing (each exists because of shipped regressions); extend or except them formally, never route around |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Main-chunk growth from the second layout language | Slower first paint on cellular; users see the logo longer | Size baseline in M1, budget check in M4, route-lazy as the conscious lever | Immediately noticeable on 3G/4G phones once shell + screens land |
| `pointermove`-driven gesture code (swipe sheets, drag handles) running on every frame | Janky scrolling on mid-range Android; battery drain | Gesture code only on the few surfaces that need it; passive listeners; prefer CSS (scroll-snap, `:active`) | Visible on lower-end Android long before desktop |
| Re-rendering long trees on every toggle with new press-state context | Tap → visible lag → double-tap retries → double toggles | Same memoization discipline as desktop tree; press state in CSS, not React state | Tree sizes beyond ~100 loaded nodes (browse cap is 500/`/api/browse`) |
| `dvh`-sized full-screen elements | Layout thrash/jitter while the toolbar collapses during scroll | `svh` for static chrome; `dvh` only where tracking is wanted (Pitfall 3) | Every scroll on iOS Safari |
| SSE reconnect storms on flaky mobile networks | Error toasts, progress flicker | Keep the ref-counted singleton; rely on the existing `listRuns` poll fallback rather than aggressive EventSource retries | Underground/cellular transitions; screen lock > ~30s on iOS |
| Heavy shadows/blur/backdrop-filter on mobile cards and sheets | Scrolled lists drop frames on Android | Compose depth with the bible's flat surfaces + hairlines; test on the oldest phone you can find | Mid-range Android, iOS on long lists |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Simplifying destructive confirmations for touch (swipe-to-confirm restore, gesture-only steps) | A mis-tap gesture launches a restore that overwrites paths; the v1.0 guard chain (confirmation, snapshot-id validation, pre-teardown abort) is bypassed in UI terms | Keep `useConfirm` and the full guard chain as the only destructive path; gestures may *open* a confirmation, never *be* the confirmation |
| Sign-out/session controls lost in the mobile chrome | Sessions persist on shared/family devices (self-hosted admin UI is opened on tablets at home) | Sign-out is a required element of the More sheet; session remains cookie-based, no tokens in JS (existing contract) |
| Write-only secret forms re-laid out for mobile losing the blank-keeps-value contract | A mobile settings screen that re-saves `""` wipes SMTP/registry/cloud credentials | Every secret-bearing mobile form keeps the `*Set` flag + blank-preserves pattern (documented convention); test one on mobile explicitly |
| Disabling zoom / fixing font sizes to stabilize mobile layout | Accessibility failure (WCAG 1.4.4 resize); users can't read scrubbed error text or log lines | Zoom stays enabled; use responsive layout + `touch-action: manipulation` instead |
| Promising Add-to-Home-Screen/standalone mode on self-signed TLS without testing | Standalone/home-screen web app contexts may not trust the self-signed cert the way the tab does; the "install the app" flow bricks itself for self-hosted users | Treat A2HS as an unverified nice-to-have (no manifest exists today; only `apple-touch-icon`); verify on a real self-signed deployment before any docs claim it |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Double-tap zoom firing during rapid tree toggling | Two quick taps = zoom-in mid-task; selection feels broken | `touch-action: manipulation` on interactive surfaces (never meta-level zoom disable) |
| Sticky bottom bar covering the last row of lists/trees | Users can't reach the final container/set without a fight | `scroll-padding-bottom`/content padding equal to bar height + safe inset; one shared constant |
| `-webkit-tap-highlight-color` default flash | Grey boxes flashing over carbon-dark cells on every tap | Style `:active` states deliberately (raised2 token per the bible) and suppress the default highlight |
| Landscape rotation loses sheet/scroll state or breaks safe-area padding | Rotating to read a long log line breaks the layout | Rotation in the M4 device checklist; insets consumed via shared vars (Pitfall 4) |
| Tooltips as the only source of icon meaning | Icon-only mobile chrome is unexplainable | Icon + short translated label, or `aria-label` + visible-on-tap disclosure; badge tooltip lint rule already pushes this direction |
| Text selection/callout popping on long-press of labels | Long-press (reserved for potential future menus) fights the user | `-webkit-user-select: none` on chrome/navigational labels only; keep selection enabled in logs and snapshot IDs where copying matters |
| Momentum lost in inner scrollers (or double scrollbars when both document and container scroll) | The app "feels wrong" on iOS in a way nobody can name | ONE scroll policy from M1: either document scroll with sticky bars, or an app-shell inner scroller — never both, per surface |

## "Looks Done But Isn't" Checklist

- [ ] **Bottom nav:** Often missing safe-area padding collapse on home-button iPhones (SE-class, inset = 0) and landscape side insets — verify portrait + landscape on notched and non-notched devices
- [ ] **Forms (schedules, notifications, replication):** Often missing keyboard behavior — verify every form with the keyboard open on real iOS Safari (fixed bar state) and Android Chrome
- [ ] **Touch tree:** Often missing keyboard parity after touch handlers land — run the full APG key suite (arrows, Space, Home/End) after M2 and again at M4
- [ ] **Touch tree:** Often missing the empty-deselect guard through the touch path — verify the last-tick refusal + fail-tone confirm via touch, not just mouse
- [ ] **Guided restore:** Often missing PTG/reload resilience — pull-to-refresh mid-wizard on Android must not silently drop configured steps (checkpoint or explicit loss notice)
- [ ] **Run detail:** Often missing SSE-after-background recovery — lock the phone mid-backup, return, verify run state converges via the `listRuns` poll path
- [ ] **Light theme:** Often missing entirely from mobile screenshots — verify every mobile screen in `data-theme="light"` and `dark`
- [ ] **42 locales:** Often tested only in English — de + fr pass at 320–360px on nav, More sheet, pinned-count line
- [ ] **Desktop-untouched guarantee:** Often asserted, never tested — Playwright desktop assertions at ≥1024px in CI from M1 onward
- [ ] **Real devices:** Often substituted with emulation — physical iPhone Safari + Android Chrome pass is an M4 exit criterion (emulation can't see safe areas, keyboard, or PTG)
- [ ] **Pinned count / save queue:** Often missing pending/dirty indication — rapid-toggle on a throttled connection should show the queue draining, not silent reverts
- [ ] **Embedded build:** Often verified against a stale binary — confirm the served build (`just web` before `go build`) when testing on a phone

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Media-query changes break desktop | LOW — if the M1 harness exists | Revert the offending layer; the desktop Playwright assertions pinpoint the breakage; keep mobile CSS under the declared breakpoint tokens only |
| Touch path created a second toggle route | MEDIUM | Strip touch handlers back to click-only + focus management; add the missing `.dom.test.tsx` twins; re-run the APG keyboard suite |
| Safe-area shipped wrong (clipped or dead space) | LOW — if insets are centralized | Fix the one CSS variable; the shared-var decision in M1 makes this a one-line fix instead of an 11-screen sweep |
| Keyboard vs fixed bar is broken on a shipped screen | LOW–MEDIUM | The M1 `focusin`/visualViewport mechanism applies per-form; if a screen bypassed it, wire it in and add a keyboard-open screenshot to the device checklist |
| Wizard state lost to pull-to-refresh (reported by a user) | MEDIUM | Add the `sessionStorage` checkpoint in M4 scope; until then, the restore guard chain already prevents damage — the loss is UX, not safety |
| Bundle budget blown | MEDIUM | Route-level `React.lazy` as the planned lever; re-measure; consider deferring non-maquette screens' mobile variants behind lazy chunks |
| Light theme broken on mobile screens | LOW | Replace raw hex with token classes (lint rule helps find them); the both-themes screenshot checklist catches stragglers |
| Stale embed shipped to a Docker user | MEDIUM | Rebuild with `just web` + Go build, cut a patch release (SemVer; tag requires explicit approval per project constraints); add a build-order guard to the release checklist |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Lint/convention collision (PAGE_SHELL, nav registry) | M1 | `npm run lint` + `routedPages.test.ts` green with a *declared* exception; nav registry has exactly one destination list |
| 2. Second input path into the tree | M1 (rule), M2 (build) | Keyboard APG suite + click/tap `.dom.test.tsx` twins both green; `aria-checked` and PATCH payload asserted from both paths |
| 3. 100vh shell trap | M1 | Shell uses svh/dvh cascade; bottom nav reachable with URL bar visible on real iOS |
| 4. Safe-area half-done | M1 | Shared inset vars; portrait + landscape, notched + SE-class, both themes |
| 5. Keyboard vs fixed bar | M1 (mechanism), M3/M4 (forms) | Every form verified keyboard-open on iOS Safari + Android Chrome |
| 6. PTG / scroll chaining vs wizard state | M1 (scroll policy), M4 (checkpoint) | `overscroll-behavior` present on all sheets/scrollers; PTG mid-wizard does not silently discard state |
| 7. Hover-only affordances vanish | M2 (audit start), M3 (complete) | Hover-reveal grep clean on mobile-rendered components; every affordance has a non-hover path |
| 8. Touch target sizes | M2, M3 | Tree rows/chrome ≥24px-with-spacing, 44px-class per bible; dense pairs checked against the spacing exception |
| 9. Locale overflow in compact chrome | M1 (chrome), M3 (sweep) | de + fr at 320–360px on nav/More sheet/count line; no hard-coded strings |
| 10. Invisible regressions / emulation ≠ device | M1 (harness), M4 (device pass) | Playwright smoke (desktop-untouched + mobile descriptors) in CI; real iPhone + Android checklist signed off |
| 11. Bundle growth / stale embed | M1 (baseline), M4 (audit) | Gzip size recorded vs budget; `just web` before `go build` in the release checklist |
| 12. Dark-token hard-coding vs light theme | M1 (discipline), M2/M3 (checklists) | Every mobile screen screenshotted in both `data-theme` values; no raw hex in diffs |

## Sources

- Codebase (HIGH, file-grounded): `web/src/lib/pageShell.ts` (convention history + lint rule), `web/src/components/SelectionTree.tsx` (single `onKeyDown`, roving tabindex, `aria-checked`-only selection, `aria-hidden` checkbox), `.planning/codebase/modules/web.md` (test stack, no e2e, stale-dist gotcha, bundle shape, fragile pairs), `web/index.html` (viewport meta as shipped, FOUC script), `.gitignore` (web/dist placeholder reality), `.planning/PROJECT.md` (Key Decisions incl. Space-routes-through-onToggle, one-deep save queue), `design/mobile/README.md` @ `0b64c7df` (locked tokens, four-status rule, platform mapping).
- Tailwind CSS v4 docs via Context7 (MEDIUM): `hover:` variant emits inside `@media (hover: hover)`; `--breakpoint-*` theme customization (keep rem units).
- Vite docs via Context7 (MEDIUM): v8 default `build.target` = baseline-widely-available (Chrome 111+, Edge 111+, Firefox 114+, Safari/iOS 16.4+).
- WCAG 2.2 Understanding SC 2.5.8 Target Size (Minimum), w3.org (LOW per seam; authoritative spec companion): 24×24 CSS px + spacing/equivalent/inline/user-agent/essential exceptions.
- MDN Web Docs (LOW per seam; cross-checked): Viewport concepts (svh/lvh/dvh definitions; layout vs visual viewport; support Safari 15.4/Chrome 108/FF 101), overscroll-behavior (contain/none semantics, scroll chaining, iOS 16 availability, sheet background-bleed pattern).
- WebKit Blog, "Designing Websites for iPhone X" (LOW per seam; primary vendor source): `viewport-fit=cover` vs default auto-insetting, inset rotation behavior, `max()` fallback pattern, constant()→env() history.
- Chrome Developers Blog, viewport resize behavior / `interactive-widget` (LOW per seam; primary vendor source): resizes-visual default since Chrome 108, fixed-element behavior per mode, not supported on iOS.
- Practitioner knowledge flagged for implementation-time verification (LOW): React 19 `inert` attribute support for sheet backdrops (Context7 query drifted; confirm before relying); iOS standalone/A2HS behavior with user-installed TLS roots.

---
*Pitfalls research for: BombVault v1.1 Mobile Interface — adding a responsive mobile layer to a desktop-first hand-rolled SPA*
*Researched: 2026-09-11*
