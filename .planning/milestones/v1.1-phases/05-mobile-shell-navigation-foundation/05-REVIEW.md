---
phase: 05-mobile-shell-navigation-foundation
reviewed: 2026-09-12T02:46:55Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - .github/workflows/lint.yml
  - .gitignore
  - scripts/gen_glyphs.py
  - web/dist/index.html
  - web/e2e/desktop-untouched.spec.ts
  - web/e2e/health.spec.ts
  - web/e2e/mobile-shell.spec.ts
  - web/e2e/narrow-viewport.spec.ts
  - web/e2e/wipe-e2e-data.mjs
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
  info: 8
  total: 10
status: issues_found
---

# Phase 5: Code Review Report (iteration 2 — fix re-review)

**Reviewed:** 2026-09-12
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

Re-review of the phase after commits 344d7492 (WR-01) and 2de0fe41 (WR-02). Both iteration-1 warnings are substantively fixed; the mechanisms were verified against the installed dependency sources rather than the code's own comments. Two new warnings remain, both in the fix commits' own additions: one site of the WR-02 comment corrections was missed (mobile-shell.spec.ts still describes the DATA_DIR as persistent), and the new tap-on-active e2e test's scroll setup is a no-op on the mobile branch (flex-basis overrides the inline height it sets), so the "deterministically scrollable" guarantee it claims does not exist. The seven iteration-1 info findings were re-verified and all still stand; one new minor info was added.

### Verification of iteration-1 fixes

**WR-01 (tap-on-active must suppress navigation) — VERIFIED FIXED.**

- Both handlers now call `e.preventDefault()` when the tapped destination is already current: `web/src/components/mobile/BottomNav.tsx:84-89` and `web/src/components/mobile/MoreSheet.tsx:87-102`.
- Verified against the INSTALLED react-router 7.18.1, not the comment's claim: `web/node_modules/react-router/dist/development/chunk-7XGYIT3M.js:434-439` is exactly `function handleClick(event) { if (onClick) onClick(event); if (!event.defaultPrevented) { internalOnClick(event); } }` — the user onClick runs first and `defaultPrevented` gates `internalOnClick`, so the push (and with it the duplicate history entry) is suppressed. The BottomNav comment quotes the installed source accurately.
- The scroll behavior survives: `preventDefault` stops the navigation, not the handler body, and `scrollMainToTop()` still runs. The anchor's own browser default is covered by the same `preventDefault()` (in the non-active case react-router's `internalOnClick` calls `preventDefault` itself, so the bare anchor never navigates in either branch). Keyboard activation (Enter → `click`) passes through the identical path. MoreSheet's `onClose()` stays unconditional, so the sheet closes in both cases — correct.
- The contract is now executable: `web/e2e/mobile-shell.spec.ts:190-205` asserts `history.length` unchanged across the tap. The relative before/after comparison is sound (a same-path push adds exactly one entry; no absolute-depth engine dependency), and the scroll poll alone could not have detected a navigation, so the assertion adds real coverage.
- All four prose sites now match the implementation (Layout.tsx:50-53, BottomNav.tsx:29-35 + 74-83, MoreSheet.tsx:20-23 + 88-96, mobile-shell.spec.ts:181-183).

**WR-02 (harness freshness/reuse guarantees) — VERIFIED FIXED in mechanism; one comment site missed (see WR-03).**

- `reuseExistingServer: false` (`web/playwright.config.ts:74`): verified against installed Playwright (`web/node_modules/playwright/lib/runner/index.js:859-865`) — a URL that already answers now throws `"... is already used ..."` instead of silently adopting a foreign server.
- The wipe-then-boot pipeline is sound, verified end to end:
  - Ordering is real: the webServer command (`playwright.config.ts:52-53`) composes `node wipe-e2e-data.mjs && <binary>` and runs before Playwright's globalSetup task, as the comments claim — a globalSetup wipe would indeed land after boot.
  - Path agreement holds: the config's `DATA_DIR: "./.playwright-data"` resolves against the webServer's `cwd: repoRoot` (both the wipe via the shell and the binary inherit it), and the script derives the same absolute directory from `import.meta.url` regardless of cwd (`wipe-e2e-data.mjs:32`). `.playwright-data/` is gitignored (`.gitignore:46`), as the config comment claims.
  - Failure modes are loud at every link: wipe failure → `console.error` + `process.exit(1)` (`wipe-e2e-data.mjs:34-44`, with the taskkill hint); `&&` short-circuits so no binary boots; a dead command surfaces as Playwright's `"Process from config.webServer was not able to start. Exit code: 1"` (runner/index.js:897); an occupied port is the "already used" throw above. No reuse path exists that could skip the wipe.
  - `shell: true` and env merging claims verified in the installed runner (index.js:879, 872-876: `{...DEFAULT_ENVIRONMENT_VARIABLES, ...process.env, ...webServer.env}`) — the binary inherits a full environment plus exactly the four overrides, so nothing exotic is lost by supplying `env`.
  - The absolute-`process.execPath` splicing is justified and correct (`JSON.stringify` quoting is safe under both cmd.exe and sh).
  - Empirically executed on this Windows machine: the wipe deleted the stale dir (the leftover manual-server.log is gone), a fresh SQLite DB appeared, and the binary booted listening on 127.0.0.1:3000 with the harness env — the pipeline works.
- `health.spec.ts` comments are now truthful (one boot per run shared by four projects; reuse never; pre-command wipe before boot). `web/dist/index.html` is known-stale by instruction; nothing in the current sources makes the scheduled rebuild produce anything wrong.

The two findings below are what remains. Everything else reviewed — navModel registry vs the frozen route table, i18n keys in all three locales (`nav.more` "Mehr"/"Plus" in `web/src/lib/locales/fr.ts:15`), the FOUC byte guard against `web/index.html:16-31`, safe-area env pairs (index.css:228-231), theme-color pair vs `--carbon-bg`, `IconEllipsis` viewBox vs `gen_glyphs.py:414-418`, CI's playwright job (binary built at repo root, chromium+webkit, web build before go build) — still checks out.

## Critical Issues

None.

## Warnings

### WR-03: One of the three "persistent DATA_DIR" comment sites was not corrected — mobile-shell.spec.ts still describes the pre-fix world

**File:** `web/e2e/mobile-shell.spec.ts:31-40`

**Issue:** The WR-02 fix corrected the freshness comments in `playwright.config.ts` and `health.spec.ts`, but `mobile-shell.spec.ts`'s `bootWithoutServerLook` block still says: "A stored bv-lang (**a de/fr backstop run leaves one behind on the persistent DATA_DIR**) would silently rewrite every localized label under these assertions". After 2de0fe41 the DATA_DIR is wiped before every boot — a prior run can no longer leave anything behind, so the parenthetical's mechanism is now false. This is exactly the class of untruthful comment WR-02 existed to remove, one file over. Do NOT extend the correction to `narrow-viewport.spec.ts:53-61`: its rationale is about parallel workers sharing ONE server WITHIN a run, which the wipe does not change and which is still true.

**Fix:** Rewrite the parenthetical to the remaining true reason, e.g.:

```ts
// The look's truth lives on the SERVER (displayPrefs.ts, #191): at boot the
// page adopts the harness DB's stored display prefs, bv-lang included. All
// four projects share that one server, so any page that ever PUTs a locale
// would rewrite every localized label for the workers that boot after it
// ("More" -> "Mehr"). Aborting the reconciliation keeps every worker on the
// harness default regardless of what its siblings do; nothing is PUT back.
```

### WR-04: The tap-on-active e2e's scroll setup is a no-op — `style.height = "200px"` cannot shrink a `flex-1` scroller, so the "deterministically scrollable" guarantee is false

**File:** `web/e2e/mobile-shell.spec.ts:179-189`

**Issue:** The setup comment claims "Make the scroller deterministically scrollable: the dashboard's content height varies, the mechanism under test does not", then sets `el.style.height = "200px"` on `#bv-main`. On both mobile projects (the only ones that run this test) the shell root is `flex ... flex-col` (Layout.tsx:334) and `#bv-main` is a `flex-1` flex item — `flex: 1 1 0%`. When flex-basis is a definite length (0% of a definite `h-dvh` container), the used main size comes from the flex algorithm; the inline `height` is consulted only as the basis fallback for `flex-basis: auto` (and the scroll container's automatic minimum size is 0, so nothing reintroduces it). The element is therefore NOT shrunk to 200px; it stays viewport-minus-bar. `el.scrollTop = 300` then clamps to 0 unless the dashboard's natural content happens to overflow, and the subsequent `expect.poll(...).toBeGreaterThan(0)` passes only on that natural overflow. The determinism the comment promises does not exist: a future dashboard that fits the viewport (or a tall viewport) fails this test with a confusing timeout even though the suppress-then-scroll mechanism under test is fine. (Static CSS-semantics verdict: two attempts to execute this spec to completion in the review environment hung in the Playwright runner layer — the author-validated `health.spec.ts` hangs identically there — so "currently passes on natural overflow" is inferred from Dashboard's content volume, not measured. CI is the gate that will prove it.)

**Fix:** Grow the content instead of shrinking the scroller — that works under any flex sizing and is what actually makes the scroll deterministic:

```ts
await page.locator("#bv-main").evaluate((el) => {
  // Grow the PAGE, not the scroller: #bv-main is a flex-1 item of the
  // flex-col shell, so an inline height on it is ignored (flex-basis 0%
  // owns the main axis). A tall first child guarantees scroll overflow.
  const first = el.firstElementChild as HTMLElement | null;
  if (first) first.style.minHeight = `${el.clientHeight + 500}px`;
  el.scrollTop = 300;
});
```

and optionally assert the precondition honestly (`expect(await page.locator("#bv-main").evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)`) so a future setup regression fails with a reason instead of a poll timeout.

## Info

### IN-01: The bar's EMPTINESS rule is dead code — `moreDestinations` can never be empty (residual)

**File:** `web/src/components/mobile/BottomNav.tsx:20-23` (doc), `:72` (impl)

**Issue:** Unchanged from iteration 1. `moreDestinations` always returns at least Recovery (navModel.ts:101, `bar: false, enabled: true`; pinned by navModel.test.ts:183), so `|| authEnabled` is unreachable-in-effect and the documented degradation path can never fire.

**Fix:** Either simplify to `moreDestinations(settings).length > 0`, or note at both sites that the emptiness rule is currently vacuous and what would make it real.

### IN-02: navModel's lib→components import contradicts the documented layer rule (residual)

**File:** `web/src/lib/navModel.ts:47-58` (import), `:35-42` (defense)

**Issue:** Unchanged. The in-file exception argument is good, but `.claude/CLAUDE.md` (SPA Layers) still says "nothing imports upward from lib", so the house doc describes an architecture the code no longer follows.

**Fix:** Record the sanctioned exception in the CLAUDE.md layer note (registry-as-data may import pure glyph components), or keep lib pure by resolving glyph IDs to components at render time.

### IN-03: The ONE keyboard mechanism is blind to portal-rendered inputs (residual)

**File:** `web/src/app/Layout.tsx:137-138`; `web/src/components/mobile/BottomSheet.tsx:236`

**Issue:** Unchanged. The `focusin`/`focusout` listeners are native listeners on the `shellRef` div; BottomSheet portals to `document.body`, and native focus events follow the DOM tree, not the React tree — a text field inside any sheet or dialog never sets `focusedField`. Latent until the first input-bearing sheet builds on PRIM-01.

**Fix:** Attach the focus listeners at document level (keeping the `isDesktop`/`authGate` bail-outs), or document the boundary in BottomSheet's header.

### IN-04: Document-level Escape closes every open dialog at once (residual)

**File:** `web/src/components/mobile/BottomSheet.tsx:118-125, 147-148`

**Issue:** Unchanged. No stacking discipline on the document-level Escape handler (verbatim useConfirm lift); WhatsNewDialog plus an open sheet each close on one Escape.

**Fix:** A module-level open-dialog stack (only the top responds to Escape), or an accepted-limitation note in BottomSheet's header.

### IN-05: The keyboard mechanism's rAF is not cancelled on cleanup (residual)

**File:** `web/src/app/Layout.tsx:133-135` (schedule), `:140-144` (cleanup)

**Issue:** Unchanged. The cleanup removes the three listeners but not the pending `requestAnimationFrame`; the source guard's "tears down every listener it adds" promise (mobileShellSource.test.ts:387-397) is satisfied, but the rAF is part of the same mechanism. Harmless today (scrollIntoView on a detached node no-ops).

**Fix:** Track the id and `cancelAnimationFrame(raf)` in the cleanup.

### IN-06: `signOut` duplicated verbatim between Sidebar and MoreSheet (residual)

**File:** `web/src/components/mobile/MoreSheet.tsx:72-76`; `web/src/components/Sidebar.tsx:345-349`

**Issue:** Unchanged. Same layer, same body (best-effort logout then the `globalThis` reload dance); the two will drift if the mechanism ever changes.

**Fix:** Extract `signOutAndReload(): Promise<void>` next to `logout` in lib and call it from both chrome surfaces.

### IN-07: Local e2e runs expose an auth-disabled instance on 0.0.0.0 (residual)

**File:** `web/playwright.config.ts:60-89` (harness env); evidence: `internal/api/server.go:36` (`bindHost = "0.0.0.0"`)

**Issue:** Unchanged. The harness header discusses auth at length but never records that a local `npx playwright test` briefly serves a full auth-less API on all interfaces. The fresh DATA_DIR bounds the blast radius; the omission is the finding.

**Fix:** One honest line in the config's auth paragraph ("local runs briefly expose an authless instance on 0.0.0.0 — don't run the suite on untrusted networks").

### IN-08: Tap-on-active suppression keys on exact pathname equality; NavLink's active state is segment-prefix — they disagree on a trailing-slash location

**File:** `web/src/components/mobile/BottomNav.tsx:84-89` (also `web/src/components/mobile/MoreSheet.tsx:97-100`)

**Issue:** The suppression check is `location.pathname === to`, but NavLink's `isActive` (installed react-router, `chunk-7XGYIT3M.js:491`) is equality OR prefix-with-`/` boundary. With today's flat route table the two diverge only when the location carries a trailing slash (a hand-typed `/dashboard/`): the slot renders active (accent backdrop, aria-current) while the tap re-navigates — a one-shot duplicate history entry, i.e. a single-dose version of the WR-01 failure. No in-app path produces a trailing slash today, so this is near-unreachable; recorded so the choice is deliberate rather than accidental.

**Fix:** Either align the check with NavLink's match semantics (`location.pathname === to || location.pathname.startsWith(to + "/")` — safe only while the route table stays flat) or add a one-line comment noting the exact-match choice and the trailing-slash divergence.

---

_Reviewed: 2026-09-12T02:46:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
