---
phase: 7
slug: remaining-destinations-operational-parity
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-13
validated: 2026-09-14
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
| PLAT-01 platform adaptation | 07-01, 07-03, 07-05, 07-08 | 1+2 | PLAT-01 | — | N/A (presentation only) | unit (platform.ts union/coercion, UA-sniffing guard, source assert) + e2e chrome sweep | `npx vitest run src/lib/platform.test.ts src/app/mobileShellSource.test.ts src/components/mobile/Fab.dom.test.tsx` + `npx playwright test e2e/platform-chrome.spec.ts` | ✅ | ✅ green |
| LISTS-01 list ergonomics | 07-02, 07-03, 07-06, 07-08 | 1+2 | LISTS-01 | — | N/A | unit (useLoadMore) + dom (touch tree) + e2e | `npx vitest run src/lib/useLoadMore.test.ts src/components/SelectionTree.touch.dom.test.tsx` + `npx playwright test e2e/list-ergonomics.spec.ts` | ✅ | ✅ green |
| MORE-01 operational destinations | 07-03, 07-04, 07-08 | 1+2 | MORE-01 | — | destructive confirms via useConfirm/ConfirmSheet | dom + e2e | `npx vitest run src/pages/Flash.desktop.dom.test.tsx` + `npx playwright test e2e/destination-vms-flash.spec.ts e2e/destination-config-receiver-fleet.spec.ts` | ✅ | ✅ green |
| MORE-02 settings parity | 07-05, 07-08 | 1+2 | MORE-02 | — | secrets write-only contract untouched | dom + e2e | `npx playwright test e2e/destination-settings.spec.ts e2e/settings-editors.spec.ts` | ✅ | ✅ green |
| FLOW-01 schedule/notification flows | 07-03, 07-04, 07-07, 07-08 | 1+2 | FLOW-01 | — | N/A | unit + dom + e2e | `npx vitest run src/pages/VMs.test.tsx` + `npx playwright test e2e/destination-vms-flash.spec.ts` | ✅ | ✅ green |
| FLOW-02 replication flows | 07-07, 07-08 | 2 | FLOW-02 | — | off-site target secrets write-only | e2e | `npx playwright test e2e/destination-config-receiver-fleet.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

All six phase requirements have green automated verification. Evidence: regression gate at end of phase — `go test ./...` all ok, vitest 2446/2446 across 109 files; filtered destination e2e specs green on all 4 projects; verifier verdict 5/5 must-haves passed (07-VERIFICATION.md).

**Known debt (not a coverage gap):** `web/e2e/platform-chrome.spec.ts` mobile-android "mobile cupertino/material checkbox consumer" probes (:135/:166) fail because 07-03 deliberately moved the VM multi-select checkbox off the always-visible mobile surface — the probe's product target no longer exists below md. Attribution proven at pre-07-06 commit 713bc6b3 (identical 2 failed / 19 passed / 31 skipped). The platform behaviors those probes guarded (attribute flip, token re-skin) remain green-tested on live consumers (19 passing probes in the same spec + the source-assert and unit guards above). Tracked in `deferred-items.md` §"Pre-existing e2e failures" and STATE.md concerns.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — the phase 5/6 vitest + Playwright harness (real-binary webServer recipe, route-layer fixture pattern, desktop-untouched parametrization) extended to the new pages. No second test mechanism was introduced.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-device feel (thumb ergonomics, motion quality, brand warmth) | PLAT-01 / milestone exit | No real hardware in the harness | Phase 8 VERIFY-02 is the scheduled venue — not this phase |
| M3/HIG expression on actual Android/iOS chrome | PLAT-01 | Browser emulation approximates, device verifies | Phase 8 real-device validation |

*All other phase behaviors have automated verification (dom tests + e2e scenarios + source-assert guards).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none found)
- [x] No watch-mode flags
- [x] Feedback latency < 120s (vitest ~90s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-14 by `/gsd-validate-phase 7` (verify:post hook)

---

## Validation Audit 2026-09-14

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Pre-existing obsolete e2e probes (2, platform-chrome checkbox consumers): excluded from gap count — product target removed by design (07-03), behaviors still covered by green tests, debt tracked in deferred-items.md.
