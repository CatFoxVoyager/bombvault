---
phase: 5
slug: mobile-shell-navigation-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 05-RESEARCH.md §Validation Architecture (pre-planning); Task IDs/Waves filled at validate-phase §6.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (node env default, per-file `@vitest-environment jsdom`) + @testing-library/react ^16.3.2; NEW: @playwright/test ^1.63.0 (sole sanctioned devDependency) |
| **Config file** | `web/vitest.config.ts` (edit: add `test.setupFiles`); NEW `web/playwright.config.ts` |
| **Quick run command** | `cd web && npx vitest run` |
| **Full suite command** | `cd web && npm test && npm run build && npx playwright test` |
| **Estimated runtime** | vitest ~30s · Playwright full (4 projects incl. WebKit) ~2-4 min first run |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run`
- **After every plan wave:** Run `cd web && npm run build && npx playwright test` (full e2e incl. WebKit)
- **Before `/gsd-verify-work`:** Full suite must be green — vitest + Playwright CI `playwright` job
- **Max feedback latency:** ~30 seconds (vitest path)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (seeded) | — | — | SHELL-01 | — | N/A | e2e (4 projects) | `npx playwright test` | ❌ W0 (`web/e2e/`) | ⬜ pending |
| TBD (seeded) | — | — | SHELL-02 | — | N/A | e2e (mobile) | `npx playwright test e2e/mobile-shell.spec.ts` | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | SHELL-03 | — | N/A | unit + e2e | `npx vitest run src/lib/navModel.test.ts` + sheet spec | ❌ W0 (both) | ⬜ pending |
| TBD (seeded) | — | — | SHELL-04 | — | N/A | unit (source/CSS assert, node env) | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | SHELL-05 | — | N/A | unit (source assert) + e2e viewport | vitest source test; e2e | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | SHELL-06 | T-05 meta tampering | FOUC script byte-untouched; meta added BELOW it | unit (source assert on index.html) | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | SHELL-07 | — | No auth logic changes — presentation only | e2e auth variant or vitest dom | `npx playwright test` / `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | PRIM-01 | — | N/A | unit (jsdom dom, lift `useConfirm` patterns) + e2e trap check | `npx vitest run src/components/mobile/BottomSheet.dom.test.tsx` | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | VERIFY-01 | — | N/A | e2e (CI gate, parameterized 10-route loop) | `npx playwright test e2e/desktop-untouched.spec.ts` | ❌ W0 | ⬜ pending |
| TBD (seeded) | — | — | (guard) DESKTOP_QUERY ≡ `md:` 48rem | — | N/A | unit (source, node env — routedPages pattern) | `npx vitest run src/lib/useMediaQuery.test.ts` | ❌ W0 | ⬜ pending |
| existing | — | — | (i18n) `nav.more` 42 locales | — | N/A | existing pipeline | `npx vitest run src/lib/i18n.parity.test.ts` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/src/lib/testSetup/matchMedia.ts` (desktop-default stub) + `test.setupFiles` entry in `web/vitest.config.ts` — REQUIRED before useMediaQuery touches Layout (jsdom 30 has no matchMedia; existing `Layout.displayPrefs.dom.test.tsx` crashes otherwise). Guard setupFiles for node-env files.
- [ ] `web/playwright.config.ts` + `web/e2e/` specs + `@playwright/test` devDependency (exact pin — Renovate; browser binaries and npm package move together) + `npx playwright install --with-deps chromium webkit` in CI
- [ ] `testids` contract (`desktop-sidebar`, `bottom-nav`, `more-sheet`) — shared by desktop-untouched and mobile specs; prefer role/aria queries where natural (bar = `navigation[aria-label]`)
- [ ] `.gitignore` for `web/test-results/`, `web/playwright-report/`, `.playwright-data/` — never commit harness artifacts (repo rule: no artifacts in public repo)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

None in Phase 5 — all phase behaviors have automated verification. (Real-device pass is VERIFY-02 / Phase 8, out of this phase's scope.)

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (vitest sampling path)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
