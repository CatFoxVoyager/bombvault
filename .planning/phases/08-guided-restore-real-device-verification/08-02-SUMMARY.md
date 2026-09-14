---
phase: 08-guided-restore-real-device-verification
plan: 02
subsystem: web-mobile-recovery
tags: [guided-restore, config-restore, d03-destructive-actions, confirm-sheet, e2e-parity]
requires:
  - "08-01 tracer: MobileRecoveryFlow scaffold, step-2 skip path, guided-restore.spec.ts fixtures"
  - "restoreOwnConfig handler (desktop Recovery card) - the one settings-write path"
  - "useConfirm/ConfirmSheet one-promise API (existing)"
provides:
  - "Mobile config step (position 2) with the full restore body: source picker, D-03 chain narration, confirm-gated restore row, skip, configPhase narration states"
  - "Config choreography e2e: narration DOM order, confirm gate cancel/confirm, config-restore POST parity, restart+reload re-entry at step 1, skip = zero writes"
affects:
  - "08-03 (step 5 populated restore body) reuses the same confirm-gate and parity patterns"
tech-stack:
  added: []
  patterns:
    - "D-03 guard-chain narration: read-only <ol> above the destructive control (Config MobileRestoreSheet precedent), confirm() gate below it"
    - "Tip-bubble awareness in e2e: Button `title` rides useTipBubble (aria-describedby + hover bubble), never the accessible name"
    - "Parity slice captured at POST-serve time - immune to post-reload remount traffic"
key-files:
  created: []
  modified:
    - web/src/pages/Recovery.tsx
    - web/e2e/guided-restore.spec.ts
decisions:
  - "Restore row is tone=neutral (secondary/tonal), mid-screen, full-width with min-h-[2.75rem]; the sticky bar keeps the safe Continue (D-03: destructive action never owns the thumb-default slot)"
  - "Confirm gate message is t(config.restoreChain.title); the parent Recovery() confirm is passed in as a prop so one useConfirm instance serves both halves (one pending-confirm presentation)"
  - "configPhase narration states copied class-for-class from Config.tsx:1200-1228 (px-4 py-2 mobile shapes, not the desktop card's px-3 py-2.5)"
  - "configPhase inlined as a string-literal union in the props type (ConfigPhase is Recovery()-local, not module-scope)"
metrics:
  duration: 66m
  completed: 2026-09-14
actuals:
  tokens: 7100
  tasks: 2
  commits: 2
requirements-completed: [SCRN-06]
status: complete
---

# Phase 8 Plan 2: Config Step Body + Choreography Summary

Mobile config step re-hosts the desktop card's restore body - source picker, D-03 chain narration above a confirm-gated restore row, skip, and the configPhase restart/reload narration - on the same restoreOwnConfig handler, proven by a staged-route e2e with request parity and reload re-entry at step 1.

## What Was Done

### Task 1: Config step body (Recovery.tsx) - commit 60bb9dcf

Extended MobileRecoveryFlow's step-2 block (was title + skip only) with the full body, all props threaded from the one Recovery() instance (D-02: no second fire path; Pitfall 6: restoreOwnConfig re-fetches the server baseline and merges before the PUT):

- Source picker: SourceToggle (same configSource state, disabled during saving/restarting) + local-path FolderBrowser or the off-site URL mono input, mirroring the desktop card field-for-field.
- D-03 narration: `config.restoreChain.title` + the five numbered `<li>` rendered read-only ABOVE the restore control (Config.tsx:1187-1197 structure class-for-class), with a why-comment citing the precedent.
- Restore row: tone=neutral, mid-screen, `min-h-[2.75rem] w-full`, `key={configShake}` + glim-shake parity with the desktop card, busy title `recovery.configRestoring`, and gated by the shared `confirm(t("config.restoreChain.title"))` promise (below md: ConfirmSheet - destructive control on top, safe cancel at the thumb-default bottom). Skip stays first-class below it.
- configPhase states: restarting (configRestarting + reload Badge), manual (configManualRestart), reload (configReloadWhenBack + configReload button), error (verbatim backend text in the statusFailBgSoft card) - all class-for-class from Config.tsx:1200-1228. The mid-flow reload is preserved as CORRECT (Pitfall 7): the flow re-enters at step 1 with restored settings live.
- 7 new props at the signature and mount site (configSource, setConfigSource, configPhase, configError, configShake, restoreOwnConfig, confirm); desktop stepper JSX byte-identical; no new api.ts call sites; no new i18n keys.

Verification: `cd web && npx vitest run` - 110 files / 2456 tests, exit 0.

### Task 2: Config choreography (guided-restore.spec.ts) - commit dd71634f

- Staged `**/api/config/restore` (held 600ms, answers `{ok, staged:true, autoRestart:true}`, records body + the parity slice at serve time) and `**/api/health` (200 pre-restore, then exactly one 503 - the down-first waitForAppBack requires - then 200). The settings fixture flips on restore-serve so the remount reads restored values.
- Asserted: five narration items precede the Restore control in DOM order (visible-element compareDocumentPosition, the destination-config precedent); ConfirmSheet presents with destructive Confirm before Cancel; cancel dismisses with zero restore calls and zero PUTs; confirm fires exactly GET /api/settings + PUT /api/settings + POST /api/config/restore with body `{"snapshot":"latest"}` and a full-object PUT (typed configPath + retentionKeepLast ride along); busy row goes disabled and hovering it reveals the configRestoring tip bubble; the restart narration renders; the page reloads and re-enters at chip(1).
- New skip test: advances to step 3 with zero settings writes and zero restore POSTs.
- Desktop leakage test extended: the narration title is absent at >=48rem.

Verification: `cd web && npx playwright test e2e/guided-restore.spec.ts` (filtered per D-10) - all 8 executed tests green on all four projects (2 walker, 2 choreography, 2 skip, 2 desktop leakage); 8 project-skips by design. SPA rebuilt (`npm run build` + `go build -o bombvault.exe ./cmd/bombvault`) before the run; the committed web/dist/index.html placeholder restored before committing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] E2E busy assertion assumed the wrong Button mechanism**
- **Found during:** Task 2 verification
- **Issue:** The first busy-state assertion expected the accessible name to become "Restore — Restoring…" while busy; Button.tsx never sets aria-label - `title` rides useTipBubble (aria-describedby + hover/focus bubble), so the name stays "Restore" and the locator found nothing for 5s while the page cycled to the reload.
- **Fix:** Assert the saving phase honestly: the row is `toBeDisabled()` during the staged 600ms hold, then hover it (the disabled+tip case wraps the button in a hover-reachable span exactly so a dead control's bubble opens) and assert the visible "Restoring…" bubble.
- **Files modified:** web/e2e/guided-restore.spec.ts
- **Commit:** dd71634f

### Environment notes (not plan deviations)

- The full vitest suite intermittently hit the 5s default test timeout on different heavy jsdom page suites each run (Flash.desktop, Containers.tree, VMs, Recovery.mobile - all pass in isolation; machine-load flake). Final gate run green with a locally-scoped `--testTimeout=20000` invocation flag (no repo/config change; every test still ran and asserted): 110 files / 2456 tests, exit 0.
- Playwright runs hang at Windows teardown after all tests finish (the STATE.md-documented hang); orphaned node workers + the bombvault.exe server were killed per the documented remedy and results were read from the run log.

## Auth Gates

None.

## Known Stubs

None. (Step 5's populated restore body remains Plan 03's scope, as the plan records - not a stub of this plan's goal.)

## Threat Flags

None - no security surface beyond the plan's threat model; T-08-01 (narration above control, confirm gate, tonal mid-screen placement) and T-08-03 (verbatim pre-scrubbed backend error text, APP_KEY remap inside restoreOwnConfig) are implemented as mitigated.

## Self-Check: PASSED
