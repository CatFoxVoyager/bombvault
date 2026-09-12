---
phase: 6
slug: maquette-screens
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-12
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 06-RESEARCH.md `## Validation Architecture` (plan-phase §5.5).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 + @testing-library/react ^16.3.2 + jsdom ^30.0.1; @playwright/test 1.63.0 (4 projects: desktop-1280, desktop-768, mobile-iphone=iPhone 13 WebKit, mobile-android=Pixel 5 360×800) |
| **Config file** | web/vite.config.ts (vitest); web/playwright.config.ts (fresh-DB wipe-then-boot webServer, `reuseExistingServer: false` in repo config, APP_KEY 64 zeros, DATA_DIR ./.playwright-data, HTTP_ONLY) |
| **Quick run command** | `cd web && npx vitest run` |
| **Full suite command** | `cd web && npx playwright test` (plus `cd web && npm run build` gate after any web/ change) |
| **Estimated runtime** | vitest ~180 s (98 files / ~2300 tests baseline); Playwright full ~60 min (WebKit projects dominate) |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run` (+ touched Playwright spec for screen tasks)
- **After every plan wave:** Run `cd web && npm run build && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green + `just check` + `web/dist` committed
- **Max feedback latency:** ~180 seconds (vitest path)

---

## Per-Task Verification Map

*Task IDs pinned by the planner; rows below are requirement-level seeds (Plan/Wave = TBD).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | W0 | SCRN-01 | T-06-02 | fail-tone confirm (no accidental destructive tap) | e2e (mobile projects) | `npx playwright test e2e/maquette-screens.spec.ts --project=mobile-android` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCRN-02 | — | N/A | e2e + dom | same spec + `npx vitest run src/pages` | ❌ W0 (e2e) / partial (queue dom tests exist) | ⬜ pending |
| TBD | TBD | TBD | SCRN-03 | T-06-02 | ≥44px separated hit zones | dom twins + e2e geometry | `npx vitest run src/components/SelectionTree.dom.test.tsx`; playwright spec | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCRN-04/05 | T-06-04 | no focus-based disclosure (non-sensitive metadata only) | e2e + dom | playwright spec; vitest run-detail component test | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PRIM-02 | T-06-03 | tap-outside consumed by backdrop layer (no click-through) | dom | `npx vitest run src/components/mobile/TapPopover.dom.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PRIM-03 | T-06-02 | destructive never default-focused | dom | `npx vitest run src/components/mobile/ConfirmSheet.dom.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PRIM-04 | T-06-01 | gate unsubscribes on hidden; no stale-state reconciliation from client clock | unit (jsdom visibilitychange) + e2e | `npx vitest run src/lib/useVisibilityGate.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FLOW-03 | — | N/A (BackupButton semantics unchanged) | dom (extend) + e2e | `npx vitest run src/components/BackupButton.dom.test.tsx` | ✅ exists (extend) | ⬜ pending |
| TBD | TBD | TBD | Regression | — | N/A | dom (existing suite stays green) | `npx vitest run src/components/SelectionTree.dom.test.tsx` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/components/SelectionTree.touch.dom.test.tsx` (or touch-mode twins inside existing dom test) — SCRN-03 state-model invariance + touch handlers
- [ ] `web/src/components/mobile/TapPopover.dom.test.tsx` — PRIM-02
- [ ] `web/src/components/mobile/ConfirmSheet.dom.test.tsx` — PRIM-03 focus rule + tone
- [ ] `web/src/lib/useVisibilityGate.test.ts` — PRIM-04 (jsdom visibilitychange mock)
- [ ] `web/e2e/maquette-screens.spec.ts` — SCRN-01..05 + FLOW-03 (tap + boundingBox geometry, MOBILE_PROJECTS pattern from mobile-shell.spec.ts; bootWithoutServerLook route-abort for localized boots)
- [ ] Framework install: none needed (infrastructure complete)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-device touch ergonomics (finger accuracy on ≥44px zones, tap-popover reachability) | SCRN-02/03, PRIM-02 | Playwright synthesizes pointer events; real finger motor behavior is not simulatable in CI | Phase 8 real-device validation (milestone exit criterion) — deferred by milestone scope |
| iOS Safari EventSource suspension on hidden tab | PRIM-04 | Assumption A1 (MEDIUM-LOW): platform behavior indirectly sourced; the D-10 gate is correct regardless (unsubscribes on hidden) | Phase 8 real-device pass: background the app during a run, return, verify reconciliation via baseline-id correlation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
