---
phase: 05-mobile-shell-navigation-foundation
reviewed: 2026-09-11T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - .github/workflows/lint.yml
  - .gitignore
  - scripts/gen_glyphs.py
  - web/dist/index.html
  - web/e2e/desktop-untouched.spec.ts
  - web/e2e/health.spec.ts
  - web/e2e/mobile-shell.spec.ts
  - web/e2e/narrow-viewport.spec.ts
  - web/index.html
  - web/package-lock.json
  - web/package.json
  - web/playwright.config.ts
  - web/src/app/Layout.tsx
  - web/src/app/mobileShellSource.test.ts
  - web/src/components/Sidebar.tsx
  - web/src/components/mobile/BottomNav.tsx
  - web/src/components/mobile/BottomSheet.dom.test.tsx
  - web/src/components/mobile/BottomSheet.tsx
  - web/src/components/mobile/MoreSheet.dom.test.tsx
  - web/src/components/mobile/MoreSheet.tsx
  - web/src/components/navGlyphs.tsx
  - web/src/index.css
  - web/src/lib/i18n.ts
  - web/src/lib/navModel.test.ts
  - web/src/lib/navModel.ts
  - web/src/lib/testSetup/matchMedia.ts
  - web/src/lib/theme.ts
  - web/src/lib/useMediaQuery.test.ts
  - web/src/lib/useMediaQuery.ts
  - web/src/pages/Login.tsx
  - web/vitest.config.ts
findings:
  critical: 0
  warning: 2
  info: 7
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-09-11
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Phase 5 ships the mobile shell foundation: a Playwright e2e harness running four projects against the compiled Go binary, the ONE chrome switch in Layout (width-only 48rem — locked decision, not re-litigated here), BottomNav/MoreSheet/BottomSheet, the navModel registry, safe-area/FOUC/viewport guard suites, and a CI playwright job.

The work is unusually well-defended: cross-file claims were verified rather than trusted, and most of them held. The navModel registry matches the frozen route table (`web/src/app/router.tsx`) route-for-route and order-for-order; every `labelKey` exists in the en table and the de/fr stress-case labels the narrow-viewport spec relies on (`"nav.more": "Mehr"/"Plus"`, `"nav.recovery": "Wiederherstellung"/"Récupération"`) exist in their tables; the theme-color meta pair (#161616/#f4f4f4) matches `--carbon-bg`'s two theme blocks in index.css; `bg-accentSoft`/`text-accentText` resolve to real Tailwind theme-mapped tokens; the lockfile pins `@playwright/test` 1.63.0 exact with consistent `playwright`/`playwright-core` integrity hashes; the FOUC byte-guard, one-breakpoint-literal guard, and safe-area env-pair guards all match the current sources; `IconEllipsis`'s viewBox math checks out against `gen_glyphs.py`'s `cropped_box`; the committed `web/dist/index.html` was rebuilt. No secrets, no injection surface, no debug artifacts. The BottomSheet primitive is a faithful, documented lift of the useConfirm mechanism with the inert-scrim deviation measured rather than guessed.

Two warnings survived: the tap-on-active contract is asserted in prose but not implemented (navigation is never suppressed), and the e2e harness's "fresh DB per run" guarantee is untrue in two documented-elsewhere ways. The info tier is mostly latent gaps in mechanisms this phase declares to be THE one (keyboard mechanism vs portals, Escape stacking, the emptiness rule that can never fire).

## Warnings

### WR-01: Tap-on-active does not suppress navigation — the documented contract is asserted by comments but not implemented

**File:** `web/src/components/mobile/BottomNav.tsx:74-76` (also `:95`, `:126-129`; same pattern in `web/src/components/mobile/MoreSheet.tsx:87-94`)

**Issue:** The contract is stated four times — Layout.tsx:50-53 ("scrolls the main scroller back to the top **instead of navigating**"), BottomNav.tsx:71-73 ("scroll to top **instead of re-navigating**"), MoreSheet.tsx:88-91, and the e2e spec (`web/e2e/mobile-shell.spec.ts:181-183`: "the Layout-owned scroll-to-top must fire **instead of a re-navigation**"). The implementation never prevents the navigation:

```ts
const tapDestination = (to: string) => {
  if (location.pathname === to) scrollMainToTop();
};
```

`onTap` is invoked from NavLink's `onClick` (BottomNav.tsx:126-129), which fires before NavLink's own handler navigates. React Router (classic BrowserRouter, per house constraint) `navigate()`s to the same path via `history.push` — there is no same-location dedup — so every tap on the already-active slot **also** pushes a duplicate history entry.

**Failure scenario:** On a phone, a user tapping the active Dashboard/Containers slot to scroll up (the primary "scroll to top" gesture this phase introduces) stacks duplicate `/dashboard` entries. The first Android back-gesture press then appears to do nothing (same page re-mounts nothing, key is pathname-stable), and the second press leaves the app — the classic broken-back-button read. The e2e test cannot catch this: it polls `scrollTop === 0`, which passes whether or not the navigation happened.

**Fix:** Receive the click event and skip the navigation when tap-on-active:

```tsx
// BottomNav BarSlot
<NavLink
  to={destination.to}
  onClick={(e) => {
    if (location.pathname === destination.to) {
      e.preventDefault();
      scrollMainToTop();
    }
  }}
  ...
```

Same shape for MoreSheet's row `onClick` (keep the unconditional `onClose()` for the navigate case). If the contract is intentionally narrowed to "scroll AND navigate", correct all four prose claims and add a history-depth assertion to the e2e test so the stated contract is executable either way.

### WR-02: The e2e harness's freshness/reuse guarantees don't hold — specs hard-code fresh-DB state on top of a persistent, reusable server

**File:** `web/playwright.config.ts:48` (`reuseExistingServer: !process.env.CI`), `:54-56` ("Fresh empty-state DB per run"); `web/e2e/health.spec.ts:3-5`

**Issue:** Three claims baked into the harness comments and spec assumptions diverge from Playwright's actual semantics:

1. `health.spec.ts:4` says "Each of the four projects starts the compiled Go binary from scratch (fresh gitignored DATA_DIR)". Playwright starts **one** webServer per run, shared by all four projects — the binary boots once, not per project.
2. `playwright.config.ts:54-55` says "Fresh empty-state DB per run". `.playwright-data/` is never cleaned (gitignored, no globalSetup/teardown), so the DB is fresh only on the first run after a manual delete. The narrow-viewport spec itself documents the leakage (`web/e2e/narrow-viewport.spec.ts:34-36`: "a de/fr backstop run leaves one behind **on the persistent DATA_DIR**"). Today the specs are saved by their own discipline (every one aborts `**/api/display-prefs*` before boot); the first future spec that PUTs prefs or toggles a setting silently poisons every later run.
3. `reuseExistingServer: !process.env.CI` means that on any dev machine with something already listening on `127.0.0.1:3000` — most concretely a running dev BombVault with real settings, enabled domains, or a password — Playwright silently reuses it: `APP_KEY`/`DATA_DIR`/`HTTP_ONLY` are **not applied**, and the fresh-DB assumptions the specs assert (bar-exactness = 4 slots, sheet = Recovery-only, sign-out absent, auth gate off) are evaluated against foreign state. The failures are loud but mystifying ("expected 4 slots, got 5"), and the run exercises assertions against a real instance instead of the throwaway one the config header describes.

**Fix:** Set `reuseExistingServer: false` (or gate it behind an explicit `BV_E2E_REUSE=1`-style opt-in), add a `globalSetup`/`globalTeardown` (or webServer pre-command) that wipes `.playwright-data/` so "fresh DB" is true again, and correct the two comments (one boot per run; DB fresh per run only because the harness now guarantees it).

## Info

### IN-01: The bar's EMPTINESS rule is dead code — `moreDestinations` can never be empty

**File:** `web/src/components/mobile/BottomNav.tsx:20-23` (doc), `:69` (impl)

**Issue:** The header documents "the More trigger renders only while the sheet it opens would have content — at least one enabled non-bar destination, **or** a sign-out row", implemented as `moreDestinations(settings).length > 0 || authEnabled`. But Recovery is never gated (`navModel.ts:101`, `bar: false, enabled: true`), so `moreDestinations` always returns at least one entry — pinned by `navModel.test.ts:182-184` ("no caller can ever receive an empty navigation"). The `|| authEnabled` arm is unreachable-in-effect and the documented degradation path can never fire.

**Fix:** Either simplify to `moreDestinations(settings).length > 0`, or note at both sites that the emptiness rule is currently vacuous and what would make it real (e.g., Recovery becoming gated).

### IN-02: navModel's lib→components import contradicts the documented layer rule

**File:** `web/src/lib/navModel.ts:47-58` (import), `:35-42` (defense)

**Issue:** `.claude/CLAUDE.md` (SPA Layers) states the layering as "pages/ → components/ → lib/; **nothing imports upward from lib**". `navModel.ts` — a lib module — imports ten glyph components from `../components/navGlyphs`. The file's own header argues the exception well (single source of label AND icon data; three cited in-repo precedents), but the house doc now describes an architecture the code no longer follows, which is exactly how layering rules rot.

**Fix:** Update the CLAUDE.md layer note to record the sanctioned exception (registry-as-data may import pure glyph components; nothing else crosses upward), or keep lib pure by having the registry carry glyph IDs resolved to components at render time in each consumer.

### IN-03: The ONE keyboard mechanism is blind to portal-rendered inputs

**File:** `web/src/app/Layout.tsx:93-96, 137-138`; `web/src/components/mobile/BottomSheet.tsx:170, 236-237`

**Issue:** The keyboard mechanism attaches `focusin`/`focusout` to `shellRef` and is declared the ONE listener set ("a per-component listener would multiply", asserted by `mobileShellSource.test.ts`). But BottomSheet portals to `document.body` — DOM-wise outside `shellRef` — as do ConfirmDialog and WhatsNewDialog. React-tree membership does not carry DOM events: a text field inside any sheet or dialog will never set `focusedField`, so the scroll-into-view guarantee silently does not cover it. Latent today (MoreSheet has no inputs), but BottomSheet is PRIM-01 — the primitive future input-bearing sheets will build on — so the first one will discover this in production, not in review.

**Fix:** Attach the focus listeners at document level (keep the `isDesktop`/`authGate` bail-outs and the single-listener guarantee), or document the boundary in BottomSheet's header so the first input-bearing sheet knows the mechanism does not reach it.

### IN-04: Document-level Escape closes every open dialog at once

**File:** `web/src/components/mobile/BottomSheet.tsx:118-125, 147-148`; `web/src/app/Layout.tsx:358-360`

**Issue:** BottomSheet's Escape handler is document-level with no stacking discipline (the verbatim useConfirm lift, which the header cites as the point). WhatsNewDialog renders outside the chrome switch and a ConfirmDialog can sit above the sheet; with any two of them open, one Escape closes both, because each listener calls `preventDefault` and `onClose` independently. Each dialog is individually correct; the composition is not coordinated. Risk grows with every new BottomSheet consumer.

**Fix:** A module-level open-dialog stack (push on open, pop on close; only the top responds to Escape/Tab-trap), or at minimum an accepted-limitation note in BottomSheet's header so the stacking gap is a recorded decision rather than an accident.

### IN-05: The keyboard mechanism's rAF is not cancelled on cleanup

**File:** `web/src/app/Layout.tsx:133-135` (schedule), `:140-144` (cleanup)

**Issue:** `onViewportResize` schedules `requestAnimationFrame(() => focusedField?.scrollIntoView(...))`, but the cleanup removes only the three listeners. A visualViewport resize landing in the same tick as teardown (branch switch across 48rem, unmount) still scrolls one frame later, after the mechanism has officially torn down. Harmless today — `scrollIntoView` on a detached node no-ops — but the file's own source guard (`mobileShellSource.test.ts:387-397`) promises "tears down every listener it adds", and the rAF is part of the mechanism.

**Fix:** Track the id (`let raf = 0; ... raf = requestAnimationFrame(...)`) and `cancelAnimationFrame(raf)` in the cleanup.

### IN-06: `signOut` duplicated verbatim between Sidebar and MoreSheet

**File:** `web/src/components/mobile/MoreSheet.tsx:72-76`; `web/src/components/Sidebar.tsx:345-349`

**Issue:** The best-effort-logout-then-reload body (including the `globalThis as unknown as {...}` reload dance) is copied between the two chrome surfaces. Unlike the codebase's sanctioned cross-seam regex duplication, both copies live in the same layer, so the usual seam justification doesn't apply; if the mechanism ever changes (e.g., adopting the epoch-rotating "sign out everywhere" variant or adding post-logout cleanup), the two will drift and mobile/desktop sign-out will behave differently.

**Fix:** Extract `signOutAndReload(): Promise<void>` next to `logout` (lib), and have both call sites use it. The comments can keep their history.

### IN-07: Local e2e runs expose an auth-disabled instance on 0.0.0.0

**File:** `web/playwright.config.ts:41-61` (harness env); evidence: `internal/api/server.go:36` (`bindHost = "0.0.0.0"`)

**Issue:** The binary binds all interfaces unconditionally, so a local `npx playwright test` serves a full BombVault API with auth disabled on the developer's LAN for the duration of the run (CI is unaffected; the fresh DATA_DIR contains no targets or credentials, so blast radius is small, and the product's own trust model is LAN-trust). Worth one honest line in the harness header that already discusses auth so nobody rediscovers it by port scan.

**Fix:** Note it in `playwright.config.ts`'s auth paragraph ("local runs briefly expose an authless instance on 0.0.0.0 — don't run the suite on untrusted networks"), or pass an interface-binding env var through `webServer.env` if the server ever grows one.

---

_Reviewed: 2026-09-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
