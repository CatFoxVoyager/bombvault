---
phase: 5
slug: mobile-shell-navigation-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (+ @testing-library/react, jsdom) for unit/dom/source-guard; @playwright/test 1.63.0 (exact-pinned) for e2e on the real Go binary |
| **Config file** | `web/playwright.config.ts` (4 projects: desktop-1280, desktop-768, mobile-iphone, mobile-android; fresh-DB binary per run; `reuseExistingServer: false`) |
| **Quick run command** | `cd web && npx vitest run` |
| **Full suite command** | `cd web && node node_modules/@playwright/test/cli.js test` |
| **Estimated runtime** | vitest ~2–3 min; full e2e ~50 min |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` vitest slice
- **After every plan wave:** Run the plan's e2e slice (`mobile-shell.spec.ts` / `desktop-untouched.spec.ts` / `narrow-viewport.spec.ts` as declared per plan)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 min (vitest)

---

## Per-Task Verification Map

Reconstructed at validation audit (file seeded as stub by plan-phase and never reconciled — hook ran for phases 7–8 only; #2117 NOT-VALIDATED resolved retroactively here). 17 tasks across 6 plans, waves 1–3.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | VERIFY-01 | T-05-SC | Package-legitimacy gate before ANY npm install (registry, repo, no postinstall, engines) | human gate | — (blocking-human checkpoint; evidence re-verified live) | n/a | ✅ executed (user approved) |
| 05-01-02 | 01 | 1 | VERIFY-01 | T-05-01, T-05-02 | @playwright/test exact-pinned; 4-project config boots real binary (throwaway APP_KEY, gitignored DATA_DIR, HTTP_ONLY — no auth bypass); health smoke per project | e2e | `cd web && npx playwright test` | ✅ `e2e/health.spec.ts` | ✅ green (8266ea80) |
| 05-02-01 | 02 | 1 | SHELL-01, SHELL-03 | T-05-05 | ONE pure nav registry; unit guards assert settings gates never surface a disabled entry | unit | `cd web && npx vitest run src/lib/navModel.test.ts` | ✅ | ✅ green (dea95f80) |
| 05-02-02 | 02 | 1 | SHELL-01 | T-05-05 | Sidebar consumes the registry (desktop intact) | unit + build | `cd web && npm run build && npx vitest run` | ✅ | ✅ green (6bf37c22) |
| 05-02-03 | 02 | 1 | SHELL-01 | T-05-06 | useMediaQuery hook; matchMedia stub guarded, test-only, desktop-default | unit | `cd web && npx vitest run src/lib/useMediaQuery.test.ts && npx vitest run` | ✅ | ✅ green (8f1c8dee) |
| 05-03-01 | 03 | 1 | PRIM-01, SHELL-03 | — | nav.more key across all locales; 42-locale parity | unit + lint | `cd web && npx vitest run src/lib/i18n.parity.test.ts && npm run lint` | ✅ | ✅ green (68a02f82) |
| 05-03-02 | 03 | 1 | PRIM-01 | T-05-07 | BottomSheet primitive: semantic tokens only, no raw hex | unit + build + tsc | `cd web && npm run build && npx tsc --noEmit` | ✅ | ✅ green (cd0641f8) |
| 05-03-03 | 03 | 1 | PRIM-01 | T-05-08 | Focus trap bidirectional (Tab+Shift+Tab) + focus restore, lifted from battle-tested useConfirm | dom | `cd web && npx vitest run src/components/mobile/BottomSheet.dom.test.tsx` | ✅ | ✅ green (33ece617) |
| 05-04-01 | 04 | 1 | SHELL-04, SHELL-05 | T-05-03, T-05-09 | Safe-area custom properties; FOUC script byte-identity assert; theme-color via paint() choke point | unit + build | `cd web && npm run build && npx vitest run` | ✅ | ✅ green (307c4871) |
| 05-04-02 | 04 | 1 | SHELL-06, SHELL-07 | T-05-02 | Mobile login: ≥16px inputs (no iOS focus-zoom); no auth surface change | unit + build | `cd web && npm run build && npx vitest run` | ✅ | ✅ green (5d9dce7d) |
| 05-04-03 | 04 | 1 | SHELL-04–07 | — | mobileShellSource guard suite (shell-root guard, scope) | source guard | `cd web && npx vitest run src/app/mobileShellSource.test.ts` | ✅ | ✅ green (ada102cf) |
| 05-05-01 | 05 | 2 | SHELL-01–05, VERIFY-01 | T-05-02 | Layout = the ONE chrome switch (h-dvh root, Sidebar-or-BottomNav, hidden surface not rendered); first mobile e2e smoke on all 4 projects | e2e | build + `npx playwright test e2e/mobile-shell.spec.ts` | ✅ | ✅ green (9250436a) |
| 05-05-02 | 05 | 2 | SHELL-02, SHELL-03 | T-05-02 | BottomNav ≥44px slots in normal flow; MoreSheet registry-ordered; sign-out no-confirm behind authEnabled gate | dom + e2e | `vitest run src/components/mobile/MoreSheet.dom.test.tsx` + build + `mobile-shell.spec.ts` | ✅ | ✅ green (37441e0a) |
| 05-05-03 | 05 | 2 | SHELL-05 | — | iOS keyboard mechanism guarded (attaches only when shell root exists) | source guard + build | `vitest run src/app/mobileShellSource.test.ts && npx vitest run && npm run build` | ✅ | ✅ green (commit in 05-05 TDD chain) |
| 05-06-01 | 06 | 3 | SHELL-02, SHELL-03, VERIFY-01 | — | desktop-untouched 10-route loop + bar-exactness (dual-direction leakage needles) | e2e | `npx playwright test e2e/desktop-untouched.spec.ts && npx playwright test e2e/mobile-shell.spec.ts` | ✅ | ✅ green (f48037fb) |
| 05-06-02 | 06 | 3 | SHELL-03, VERIFY-01 | — | narrow-viewport de/fr backstop; server-look-proof e2e boots | e2e | `npx playwright test e2e/narrow-viewport.spec.ts` | ✅ | ✅ green (35584836) |
| 05-06-03 | 06 | 3 | SHELL-02, SHELL-03, VERIFY-01 | — | Go test chain + build + FULL playwright suite; lint.yml playwright CI job; web/dist phase close | e2e + ci | `npm test && npm run build` + go build + `npx playwright test` | ✅ | ✅ green (be2bdcd1, 5d8db7ea) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `@playwright/test` 1.63.0 exact-pinned + lockfile (05-01 Task 2 — this phase IS the harness wave; VERIFY-01)
- [x] `web/playwright.config.ts` 4-project harness + `e2e/health.spec.ts` smoke
- [x] Harness artifact dirs gitignored (T-05-01)

Wave 0 was delivered by plan 05-01 itself and is proven green — no open Wave 0 dependencies remain.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Package-legitimacy judgment before npm install (@playwright/test) | VERIFY-01 / T-05-SC | blocking-human checkpoint by design (supply-chain gate) | Executed 2026-09-1x — user approved; registry/repo/no-postinstall/engines evidence re-verified live in 05-01-SUMMARY |

All other phase behaviors have automated verification.

---

## Validation Audit 2026-09-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 17 tasks carry plan-declared verifies (16 automated + 1 human gate by design, already executed); every referenced test file exists; vitest re-run at current HEAD is green (112 files / 2481 tests, EXIT=0 — includes navModel, useMediaQuery, BottomSheet.dom, MoreSheet.dom, i18n.parity, mobileShellSource); the e2e specs of this phase (mobile-shell, desktop-untouched, narrow-viewport) are re-run by the in-flight milestone tail gate.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3 min (vitest quick run)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-15
