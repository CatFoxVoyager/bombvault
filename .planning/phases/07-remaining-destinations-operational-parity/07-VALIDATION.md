---
phase: 7
slug: remaining-destinations-operational-parity
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (dom tests, jsdom) + @playwright/test (4 projects: mobile-iphone, mobile-android, desktop-1280, WebKit) |
| **Config file** | `web/vitest.config.ts` / `web/playwright.config.ts` |
| **Quick run command** | `cd web && npx vitest run --reporter=dot 2>&1 | tail -20` |
| **Full suite command** | `cd web && npx vitest run` + Playwright projects (manual local webServer per the Windows wedge discipline) |
| **Estimated runtime** | ~90s vitest; Playwright mobile ~10min |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run --reporter=dot 2>&1 | tail -20`
- **After every plan wave:** Run the full vitest suite; Playwright scenarios touched by the wave
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (seeded — plans fill this map) | | | MORE-01/02, FLOW-01/02, LISTS-01, PLAT-01 | | destructive confirms route through useConfirm/ConfirmSheet; secrets write-only | dom + e2e | `cd web && npx vitest run --reporter=dot` | ✅ infra | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — the phase 5/6 vitest + Playwright harness (real-binary webServer recipe, route-layer fixture pattern, desktop-untouched parametrization) extends to the new pages. Plans must NOT introduce a second test mechanism.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-device feel (thumb ergonomics, motion quality, brand warmth) | PLAT-01 / milestone exit | No real hardware in the harness | Phase 8 VERIFY-02 is the scheduled venue — not this phase |
| M3/HIG expression on actual Android/iOS chrome | PLAT-01 | Browser emulation approximates, device verifies | Phase 8 real-device validation |

*All other phase behaviors have automated verification (dom tests + e2e scenarios + source-assert guards).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
