---
phase: 05-mobile-shell-navigation-foundation
fixed_at: 2026-09-11T22:10:46-04:00
review_path: .planning/phases/05-mobile-shell-navigation-foundation/05-REVIEW.md
iteration: 3
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-09-11T22:10:46-04:00
**Source review:** .planning/phases/05-mobile-shell-navigation-foundation/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (critical_warning scope — 0 critical, 2 warning; the 7 info findings were out of scope and untouched)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Tap-on-active does not suppress navigation — the documented contract is asserted by comments but not implemented

**Files modified:** `web/src/components/mobile/BottomNav.tsx`, `web/src/components/mobile/MoreSheet.tsx`, `web/e2e/mobile-shell.spec.ts`
**Commit:** 344d7492
**Applied fix:** Implemented the suppression the four prose claims already describe, per the reviewer's primary Fix shape. `tapDestination` now receives the click event and calls `e.preventDefault()` when the tap is on-active, before react-router's own handler runs — verified against the installed react-router source (`Link.handleClick`: `if (onClick) onClick(event); if (!event.defaultPrevented) internalOnClick(event);`), so the navigation is genuinely suppressed rather than followed by a scroll. Same shape for MoreSheet's row, with `onClose()` kept unconditional (the navigate case closes so the destination is visible behind it; the tap-on-active case reveals the scroller it just sent back to the top). Load-bearing comments updated to state the mechanism instead of restating the aspiration. The tap-on-active e2e test now also captures `history.length` before the tap and asserts it is unchanged after the scroll-to-top, making the no-navigation half of the contract executable (the previous scrollTop-only poll passed with or without the bug). The existing e2e no-re-navigation assertion and the tap-on-active scroll behavior are preserved, per the fix note.

**Verification note:** full vitest suite green (98 files / 2313 tests, matching the pre-fix baseline), `tsc --noEmit` exit 0, eslint clean on the touched src files. The new history-depth e2e assertion could not be executed yet: the e2e suite runs the compiled Go binary's embedded SPA, and rebuilding `web/dist` + the binary is explicitly out of scope until the phase-close rebuild — it will execute there (it fails against the pre-fix source and passes against this fix).

### WR-02: The e2e harness's freshness/reuse guarantees don't hold — specs hard-code fresh-DB state on top of a persistent, reusable server

**Files modified:** `web/playwright.config.ts`, `web/e2e/wipe-e2e-data.mjs` (new file), `web/e2e/health.spec.ts`
**Commit:** 2de0fe41
**Applied fix:** Three changes, per the reviewer's Fix direction:

1. `reuseExistingServer: false` (the requested direction; no env-gated opt-in). An occupied port now fails the run loudly with Playwright's "URL is already used" error instead of silently testing against whatever BombVault already listens on 3000. The comment records that reuse would also skip `command` entirely, silently dropping the wipe.
2. The "fresh DB per run" guarantee is now real: the webServer command became a wipe-then-boot pipeline (`node web/e2e/wipe-e2e-data.mjs && <binary>`). The new file `wipe-e2e-data.mjs` deletes the gitignored `.playwright-data/` and fails loudly (with the `taskkill /IM bombvault.exe /F` recovery hint) instead of letting the binary boot a poisoned DB.
3. Corrected the stale comments in both files to the actual semantics: ONE webServer boot per run shared by all four projects (not per project), data dir wiped before every boot by the pre-command, reuse never.

**Deliberate deviation from the reviewer's suggestion, with evidence:** the reviewer offered "globalSetup/globalTeardown (or webServer pre-command)". The pre-command variant is the only one that works: in the installed Playwright 1.63 source, `createGlobalSetupTasks` orders plugin setup tasks (the webServer is a plugin, `playwright:webserver`) BEFORE `globalSetups` — so a globalSetup wipe would land after the binary has already booted and opened its SQLite file (EBUSY on Windows; on POSIX a silent no-op writing to the unlinked inode). The node interpreter is spliced into the command absolutely via `process.execPath` (JSON-quoted) because spawned shells on this Windows machine can lack `node` on PATH — observed live during validation ("'node' n'est pas reconnu"); the first attempt with bare `node` failed, the `process.execPath` variant boots.

**Verification note:** the touched spec was executed — `health.spec.ts` on the desktop-1280 project passes (1 passed; 94 ms test time — the 5.9 min run duration is the KNOWN Windows teardown hang, handled by the sanctioned separate-shell `taskkill` protocol, and `reuseExistingServer: false` was NOT re-introduced to paper over it). The wipe is demonstrably effective: after the run, `.playwright-data/` contained only freshly-booted state, and the old dir's leftover `manual-server.log` (pre-dating this fix) was gone. `tsc --noEmit` exit 0 and eslint clean (config + e2e specs are outside the tsc `include`/eslint flat-config scope by design, as before this change).

## Skipped Issues

None — both in-scope findings were fixed. The 7 Info findings (IN-01 through IN-07) are out of scope for this iteration (`critical_warning`) and were deliberately not touched.

## Verification location

All gates ran in the MAIN checkout (D:\code\bombvault, branch `docker-folders`): `workflow.use_worktrees` is `false` in `.planning/config.json`, so per the opt-out rule no worktree was created and commits landed directly on the checked-out branch. Gate inventory per fix: WR-01 → full vitest + tsc + eslint; WR-02 → touched e2e spec (health.spec.ts, one project) + tsc + eslint. `web/dist` was NOT rebuilt and NOT committed (phase-close rebuild is a separate decision); nothing under `internal/`, and none of the frozen files, were touched.

---

_Fixed: 2026-09-11T22:10:46-04:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

# Iteration 3: Code Review Fix Report (WR-03 / WR-04 from the iteration-2 re-review)

**Fixed at:** 2026-09-11T23:07:17-04:00
**Source review:** .planning/phases/05-mobile-shell-navigation-foundation/05-REVIEW.md (iteration-2 re-review)
**Iteration:** 3
**Scope:** critical_warning — exactly the two new warnings the iteration-2 re-review produced (WR-03, WR-04). The 8 Info findings (IN-01 through IN-08) remain out of scope and untouched.

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0
- Status: all_fixed

## Fixed Issues

### WR-03: stale "persistent DATA_DIR" comment in mobile-shell.spec.ts's bootWithoutServerLook block

**Files modified:** `web/e2e/mobile-shell.spec.ts`
**Commit:** ed4d207f
**Applied fix:** Comment-only rewrite of the doc block above `bootWithoutServerLook` (was lines 31-40). The false parenthetical — "a de/fr backstop run leaves one behind on the persistent DATA_DIR" — described the pre-2de0fe41 world and is gone. The replacement states the actual post-wipe semantics: the DATA_DIR is wiped before every RUN (not per worker) by the webServer's wipe-then-boot pre-command, so nothing survives from a previous run; the remaining true reason for aborting the reconciliation fetch is within-run cross-worker persistence — all four projects share that ONE server for the whole run, so a locale any worker PUTs would rewrite every localized label for workers that boot after it. The degradation-path justification (sync()'s fetch failing is the app's own documented "offline: the cache is the look" path) was deliberately retained — it is the load-bearing why for aborting rather than stubbing, per the house load-bearing-comments convention. `narrow-viewport.spec.ts:53-61` was NOT touched, per the finding's explicit exclusion (its within-run parallel-worker rationale is still true).

### WR-04: no-op scroller shrink in the tap-on-active e2e — inline height cannot shrink a flex-1 scroller

**Files modified:** `web/e2e/mobile-shell.spec.ts`
**Commit:** d57ea613
**Applied fix:** The setup now GROWS THE PAGE instead of pretending to shrink the scroller. `style.minHeight = clientHeight + 500px` is set on `#bv-main`'s firstElementChild (the per-route `glim-page-enter flex-1 flex flex-col` wrapper around the Outlet — Layout.tsx:317), which forces `scrollHeight > clientHeight` under any flex sizing: a flex item's explicit min-height clamps the flex shrink, so the wrapper overflows the `flex-1` (flex-basis 0%) scroller deterministically, independent of the dashboard's natural content. An honest precondition assert (`expect(scrollHeight > clientHeight).toBe(true)`) immediately follows, so a future no-op setup fails with a reason instead of a poll timeout. The old `style.height = "200px"` and its misleading comment are gone (the new comment documents why the shrink was a silent no-op: flex-basis 0% owns the main axis). **The history-depth assertion is untouched** — the relative `history.length` comparison remains exactly as the WR-01 fix introduced it, per the re-review's verification that it is sound.

**Empirical proof (new for this phase):** the spec was EXECUTED on the mobile-android project — `node node_modules/@playwright/test/cli.js test e2e/mobile-shell.spec.ts --project=mobile-android` → **6 passed, exit 0**, including the tap-on-active test: the precondition assert passed (the grow is real, not inferred), scrollTop stuck above 0, the Layout-owned scroll-to-top fired on the active-slot tap, and `history.length` was unchanged. This is the first execution of this spec to completion in this environment (the re-reviewer's two attempts hung in the runner layer); the known teardown hang was handled by the sanctioned separate-shell `taskkill //IM bombvault.exe //F`, after which the runner completed with exit 0 and port 3000 was confirmed free.

## Skipped Issues

None — both in-scope findings were fixed. The 8 Info findings (IN-01 through IN-08) are out of scope for this iteration and were deliberately not touched.

## Verification location and gate inventory

All gates ran in the MAIN checkout (D:\code\bombvault, branch `docker-folders`): `workflow.use_worktrees` is `false` in `.planning/config.json`, so per the opt-out rule no worktree was created and both commits landed directly on the checked-out branch. These numbers are reproducible from the main checkout as it stands now.

- WR-03: standalone `tsc --noEmit --strict` on the spec file (exit 0; e2e specs sit outside `web/tsconfig.json`'s `include: ["src"]` by design, so a file-scoped invocation is the applicable Tier-2 check) + stale-phrase grep (no hits for `persistent`/`backstop`).
- WR-04: same standalone tsc (exit 0) + the Playwright mobile-android run above (6 passed, exit 0).
- Project gates after both fixes: `node node_modules/typescript/bin/tsc --noEmit` exit 0; `node node_modules/eslint/bin/eslint.js .` exit 0 with only 2 pre-existing warnings in files this iteration did not touch (`ActivityLog.tsx`, `Sidebar.tsx` — warn-only `exhaustive-deps`); `node node_modules/vitest/vitest.mjs run` → 98 files / 2313 tests passed, matching the mandated baseline.
- Not touched: `web/dist` (NOT rebuilt, NOT committed — phase-close rebuild is the orchestrator's), everything under `internal/`, the frozen files (`web/src/app/router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`), `narrow-viewport.spec.ts`. No `git add -A` was used; each commit staged exactly `web/e2e/mobile-shell.spec.ts`.

---

_Fixed: 2026-09-11T23:07:17-04:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
