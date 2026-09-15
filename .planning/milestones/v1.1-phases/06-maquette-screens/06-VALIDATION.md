---
phase: 6
slug: maquette-screens
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (+ @testing-library/react, jsdom) for unit/dom/source-guard; @playwright/test 1.63.0 for e2e on the real Go binary |
| **Config file** | `web/playwright.config.ts` (4 projects; fresh-DB binary per run) |
| **Quick run command** | `cd web && npx vitest run` |
| **Full suite command** | `cd web && node node_modules/@playwright/test/cli.js test` |
| **Estimated runtime** | vitest ~2–3 min; full e2e ~50 min |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` vitest slice
- **After every plan wave:** Run the plan's e2e slice (`touch-tree` / `tap-popovers` / `run-detail-visibility` / `maquette-screens` / `home-trigger` / `desktop-untouched` as declared per plan)
- **Before `/gsd-verify-work`:** Full suite must be green (plan 07's Task 3 gate)
- **Max feedback latency:** ~3 min (vitest)

---

## Per-Task Verification Map

Reconstructed at validation audit (file seeded as stub by plan-phase and never reconciled — hook ran for phases 7–8 only; #2117 NOT-VALIDATED resolved retroactively here). 21 tasks across 7 plans, waves 1–5.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SCRN-03 | T-06-01 | SelectionTree touch mode (tracer): touch targets reflect real state, roving-on-tap | dom | vitest run SelectionTree{,.touch,.keyboard}.dom + lib guards | ✅ | ✅ green (2ac4124e) |
| 06-01-02 | 01 | 1 | SCRN-03 | T-06-01 | Full-row targets + notice-row touch sizing | dom | vitest run SelectionTree dom trio | ✅ | ✅ green (e0c34f4b) |
| 06-01-03 | 01 | 1 | SCRN-03 | T-06-01 | Touch geometry e2e on mobile projects | e2e | `npx playwright test e2e/touch-tree.spec.ts --project=mobile-android --project=mobile-iphone` | ✅ | ✅ green (2c77b29a) |
| 06-02-01 | 02 | 1 | PRIM-03 | T-06-03 | BottomSheet fullHeight/footer/tone, 44px close, inset-clamped padding | dom | `vitest run mobile/BottomSheet.dom + MoreSheet.dom` | ✅ | ✅ green (4254aa9f) |
| 06-02-02 | 02 | 1 | PRIM-03 | T-06-02 | ConfirmSheet mobile presentation for useConfirm (D-07): destructive top, safe cancel bottom | dom | `vitest run mobile/ConfirmSheet.dom + useConfirm + BackupButton.dom` | ✅ | ✅ green (10d3a8e5) |
| 06-02-03 | 02 | 1 | PRIM-03 | — | Narrow gutter p-4 below md, desktop keeps p-6 | dom + e2e | `vitest run && playwright test e2e/desktop-untouched.spec.ts --project=desktop-1280` | ✅ | ✅ green (f2c5ccc9) |
| 06-03-01 | 03 | 1 | PRIM-02 | T-06-03 | TapPopover primitive + bubblePosition clamp | dom | `vitest run mobile/TapPopover.dom + bubblePosition` | ✅ | ✅ green |
| 06-03-02 | 03 | 1 | PRIM-02 | T-06-03, T-06-05 | Consumers re-hosted (InfoBubble, FilterPopover); eslint surface check | dom + lint | `vitest run mobile/TapPopover.dom && eslint InfoBubble FilterPopover` | ✅ | ✅ green |
| 06-03-03 | 03 | 1 | PRIM-02 | T-06-03 | Tap popovers e2e incl. desktop project (no regression) | e2e | `npx playwright test e2e/tap-popovers.spec.ts` (3 projects) | ✅ | ✅ green |
| 06-04-01 | 04 | 2 | SCRN-05, PRIM-04 | T-06-01 | runDisplay mapping (four-status text language); eslint Dashboard/runDisplay | unit + lint | `vitest run && eslint runDisplay.ts Dashboard.tsx` | ✅ | ✅ green |
| 06-04-02 | 04 | 2 | SCRN-05 | T-06-01 | RunDetailSheet mobile + i18n parity | dom | `vitest run mobile/RunDetailSheet.dom + i18n tests` | ✅ | ✅ green |
| 06-04-03 | 04 | 2 | PRIM-04 | T-06-01 | Visibility gate: hide unmounts subscription, reshow reconciles from server | unit + e2e | `vitest run useVisibilityGate + backupWatch && playwright test e2e/run-detail-visibility.spec.ts --project=mobile-android` | ✅ | ✅ green |
| 06-05-01 | 05 | 3 | SCRN-02, SCRN-03, FLOW-03 | T-06-02 | StickyActionBar: surface's ONE solid-accent control, thumb zone | dom | `vitest run mobile/StickyActionBar.dom + SelectionTree dom pair + i18n` | ✅ | ✅ green |
| 06-05-02 | 05 | 3 | SCRN-02–04 | T-06-05 | Files.tsx mobile sweep + i18n parity + eslint | unit + lint | `vitest run i18n pair + SelectionTree.touch && eslint Files.tsx` | ✅ | ✅ green |
| 06-05-03 | 05 | 3 | SCRN-02–04, FLOW-03 | T-06-02 | Maquette screens e2e (3 projects) + BackupButton dom | e2e | `playwright test e2e/maquette-screens.spec.ts && vitest run BackupButton.dom` | ✅ | ✅ green |
| 06-06-01 | 06 | 4 | SCRN-01, FLOW-03 | T-06-01 | Mobile Dashboard block order; desktop grid untouched above md | unit + e2e | `vitest run && playwright test e2e/desktop-untouched.spec.ts (2 desktop projects)` | ✅ | ✅ green (5378f5b0) |
| 06-06-02 | 06 | 4 | SCRN-01, FLOW-03 | T-06-02 | Thumb-zone New-backup trigger behind confirm (consequence copy); no outcomes read from POST | dom + i18n | `vitest run i18n pair + BackupButton.dom` | ✅ | ✅ green (d9fabfb2) |
| 06-06-03 | 06 | 4 | SCRN-01, FLOW-03 | T-06-02 | home-trigger e2e: glanceability, cancel-keeps-server-untouched, full trace, leakage guard (4 projects) | e2e | `playwright test e2e/home-trigger.spec.ts` | ✅ | ✅ green (b3c55a70) |
| 06-07-01 | 07 | 5 | SCRN-01–05, PRIM-02–04 | T-06-05 | i18n sweep over mobile components + BottomNav eslint | unit + lint | `vitest run i18n pair + mobile/ && eslint BottomNav.tsx` | ✅ | ✅ green (1d4ee59d) |
| 06-07-02 | 07 | 5 | SCRN-01–05 | T-06-05 | Desktop-untouched dual-project regression gate | e2e | `playwright test e2e/desktop-untouched.spec.ts --project=desktop-1280 --project=desktop-768` | ✅ | ✅ green (6142eb40) |
| 06-07-03 | 07 | 5 | SCRN-01–05, PRIM-02–04, FLOW-03 | T-06-05 | Phase-close FULL vitest + build + dist cleanliness gate (first full 4-project run caught real issues) | e2e + build | `vitest run && npm run build && git status --porcelain web/dist \| wc -l` | ✅ | ✅ green (c5088867, d2797304) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — the Playwright harness landed in phase 5 (VERIFY-01); no Wave 0 stubs needed here.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-09-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 21 tasks carry plan-declared automated verifies; every referenced test file exists; summaries report Self-Check: PASSED (06-03, 06-04, 06-05, 06-07) with commit-level evidence (06-01, 06-02, 06-06); vitest re-run at current HEAD is green (112 files / 2481 tests, EXIT=0 — includes every dom/unit file mapped above); this phase's e2e specs are re-run by the in-flight milestone tail gate.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — infra from phase 5)
- [x] No watch-mode flags
- [x] Feedback latency < 3 min (vitest quick run)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-15
