---
phase: 8
slug: guided-restore-real-device-verification
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-14
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (+ @testing-library/react, jsdom) for unit/dom/source-guard; @playwright/test for e2e on the real Go binary |
| **Config file** | `web/vitest` (package-config) + `web/playwright.config.ts` (4 projects: desktop-1280, desktop-768, mobile-iphone, mobile-android; fresh-DB binary per run) |
| **Quick run command** | `cd web && npx vitest run` |
| **Full suite command** | `cd web && node node_modules/@playwright/test/cli.js test` |
| **Estimated runtime** | vitest ~2–3 min; full e2e ~50 min (tail gate) |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run`
- **After every plan wave:** Run the plan's `<automated>` e2e slice (`guided-restore.spec.ts` / `narrow-viewport.spec.ts` / `destination-settings.spec.ts` / `desktop-untouched.spec.ts` as declared per plan)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 min (vitest); e2e slices ~10 min

---

## Per-Task Verification Map

Reconstructed at validation audit (file seeded as stub by plan-phase; tasks 13 across 5 plans, waves 1–4).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | VERIFY-03 | — | i18n keys pre-seeded: 42-locale parity, en copy pinned, no em dash | unit | `cd web && npx vitest run` | ✅ `web/src/lib/i18n.preseed.test.ts` | ✅ green (1d664c5a) |
| 08-01-02 | 01 | 1 | SCRN-06 | — | Mobile flow gate chain (gateTo), step-badge hue identity incl. reserved 3/4, Back preserves state | dom unit | `cd web && npx vitest run` | ✅ `web/src/pages/Recovery.mobile.dom.test.tsx` | ✅ green (b42b40fe, 6a9cf933) |
| 08-01-03 | 01 | 1 | SCRN-06, VERIFY-03 | — | API parity call multiset (21 calls), full-object PUT, kit filename, desktop leakage needles | e2e | `npx playwright test e2e/guided-restore.spec.ts e2e/desktop-untouched.spec.ts` | ✅ both specs | ✅ green (6a9cf933; milestone tail gate green) |
| 08-02-01 | 02 | 2 | SCRN-06 | T-08-01 | Config restore row gated by shared confirm(); narration read-only ABOVE the control; skip first-class | dom unit | `cd web && npx vitest run` | ✅ (suite, 110 files / 2456 tests) | ✅ green (60bb9dcf) |
| 08-02-02 | 02 | 2 | SCRN-06 | T-08-01 | ConfirmSheet destructive-top/cancel-bottom; cancel fires zero restore calls; exact POST/PUT bodies; busy tip on disabled row | e2e | `npx playwright test e2e/guided-restore.spec.ts` | ✅ | ✅ green (dd71634f) |
| 08-03-01 | 03 | 3 | SCRN-06, VERIFY-03 | T-08-05 | Restore-all + per-target rows behind ConfirmSheet; four-status Badge strip reconciliation; verbatim scrubbed reasons | dom unit | `cd web && npx vitest run` | ✅ | ✅ green (SUMMARY Self-Check PASSED) |
| 08-03-02 | 03 | 3 | SCRN-06 | — | mobileShellSource minChars floor on Recovery.tsx mobile block (regression fails loudly) | source guard | `cd web && npx vitest run src/app/mobileShellSource.test.ts` | ✅ | ✅ green (SUMMARY Self-Check PASSED) |
| 08-03-03 | 03 | 3 | SCRN-06, VERIFY-03 | T-08-01, T-08-03 | Sequential restore-all POST proof (strictly-between runs fixture); cancel-fires-nothing; visibility-gate unmount/pause; cancelled-neutral Badge; D-09 landscape boundary pair; de/fr × 320/360 sweep | e2e | `npx playwright test e2e/guided-restore.spec.ts e2e/narrow-viewport.spec.ts` | ✅ both specs | ✅ green (SUMMARY Self-Check PASSED; milestone tail gate green) |
| 08-04-01 | 04 | 2 | VERIFY-04 | T-08-02 | Touch targets ≥44px (Button MOBILE_BLEED, LanguageCard/ActivityLog bleed) | unit | `cd web && npx vitest run` | ✅ | ✅ green (SUMMARY Self-Check PASSED) |
| 08-04-02 | 04 | 2 | VERIFY-04 | T-08-02 | mobileShellSource WHOLLY_PHASE8_FILES scope guard | source guard | `cd web && npx vitest run src/app/mobileShellSource.test.ts` | ✅ | ✅ green (SUMMARY Self-Check PASSED) |
| 08-04-03 | 04 | 2 | VERIFY-04, VERIFY-05 | T-08-02 | hitBoxes ≥44px battery (scenario 5) on real binary | e2e | `npx playwright test e2e/destination-settings.spec.ts` | ✅ | ✅ green (SUMMARY Self-Check PASSED) |
| 08-05-01 | 05 | 4 | VERIFY-02, VERIFY-05 | — | UAT record completeness: landscape notes ≥2, WR-01 ≥1, ForeignRestoreCard ≥1 in 08-UAT.md | doc-grep | `test -f 08-UAT.md && grep -c landscape/WR-01/ForeignRestoreCard` (plan-declared) | ✅ `08-UAT.md` | ✅ green (record closed 09de4f77) |
| 08-05-02 | 05 | 4 | VERIFY-02 | T-08-07 | Runbook placeholders only (`<server-ip>`, `<app-key>`), zero IP literals in 08-UAT.md | doc-grep | `grep -c 'server-ip' ≥1 && grep -cE ipv4-regex = 0` (plan-declared) | ✅ `08-UAT.md` | ✅ green (re-verified at security audit 2026-09-15) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no Wave 0 stubs were needed (all 13 tasks carry `<automated>` verifies against the pre-existing vitest + playwright harness).

---

## Manual-Only Verifications

Physical-device behaviors — all **already executed and consigned** in the D-11 session (2026-09-14/15, Android device, builds `mobilefix-877600d5` → `mobilefix-2b08030b`); nothing pending.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guided restore end-to-end on real touch hardware, portrait + landscape | VERIFY-02 | Requires physical device (touch, viewport, real Chrome) | D-11 session — matrix cells 5+6 FULL CELL PASS (08-UAT.md) |
| Thumb-zone ergonomics / one-hand Procedure R | SCRN-06 | Subjective feel on a real screen | D-11 — Procedure R PASS (milestone exit criterion, 08-UAT.md) |
| Both themes legible on physical display | VERIFY-05 | Physical display rendering | D-11 — checklist item 4 PASS, both themes (08-UAT.md) |

---

## Validation Audit 2026-09-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 13 tasks carry plan-declared `<automated>` verifies; every referenced test file exists; every plan SUMMARY carries Self-Check: PASSED. vitest re-run at current HEAD (which includes the post-phase mobile quickplan fixes) is green (112 files / 2481 tests, EXIT=0). The full e2e milestone tail gate (all 4 projects, **659 passed / 0 failed**, EXIT=0) completed after this audit — final green proof of every phase 5–8 spec, including `guided-restore`, `narrow-viewport` and `desktop-untouched`. Device behaviors above were exercised for real and consigned — VERIFY-02 verdict PASS (`09de4f77`).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — infra pre-existing)
- [x] No watch-mode flags
- [x] Feedback latency < 3 min (vitest quick run)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-15
