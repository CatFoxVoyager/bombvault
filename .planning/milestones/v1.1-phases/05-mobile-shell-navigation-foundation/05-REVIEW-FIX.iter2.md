---
phase: 05-mobile-shell-navigation-foundation
fixed_at: 2026-09-11T22:10:46-04:00
review_path: .planning/phases/05-mobile-shell-navigation-foundation/05-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
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
