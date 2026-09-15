---
phase: 5
slug: mobile-shell-navigation-foundation
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-15
---

# Phase 5 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm/CI ↔ web/ dev tree | @playwright/test + playwright-core (and their browser downloads) enter the repo as devDependencies; the lint.yml playwright job references third-party GitHub Actions | Package code, browser binaries, CI action refs |
| Test harness ↔ production repo | Playwright artifacts (traces, reports, test-results) and the harness's throwaway env (APP_KEY, DATA_DIR) live beside tracked files | Run artifacts, throwaway dev credentials |
| Operator's device ↔ SPA shell | The mobile chrome switch (Layout), safe-area insets, FOUC theme script, and iOS keyboard handler execute on the user's device | Theme preference, viewport metrics, focus events |
| web/index.html FOUC script ↔ React theme engine | Pre-hydration theme application hands off to paint(); any mismatch flashes the wrong theme | Stored theme key, inline style attribute |

---

## Threat Register

Register authored at PLAN time (all six phase PLANs carry `## Threat Model` blocks); this run aggregated the six per-plan registers into the twelve unique threats below (carried duplicates across plans collapsed) and verified each mitigation against shipped code.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-SC | Tampering | npm install of @playwright/test; CI action references | high | mitigate | Package-legitimacy `blocking-human` checkpoint before install (Task 1, user-approved); exact version pin (`"@playwright/test": "1.63.0"` in web/package.json); no postinstall script (verified at gate); lint.yml action refs are digest-pinned (10 `uses: .*@<sha>` in the file), parity-asserted against sibling jobs; Renovate manages bumps. | closed |
| T-05-01 | Information Disclosure | web/test-results/, web/playwright-report/, .playwright-data/; CI artifacts | medium | mitigate | All harness artifact dirs gitignored (`.gitignore:44-46`, `git check-ignore` confirms); fresh empty-state DB per run means nothing to leak; reports/traces never uploaded in CI; the webServer APP_KEY is the documented throwaway dev constant — no real secret enters env or logs. | closed |
| T-05-02 | Elevation of Privilege | Harness auth handling + sign-out control | high | mitigate | No login bypass, no seeded credentials anywhere (CI or specs); fresh DB = auth disabled by default (`internal/store/settings.go:60`); sign-out copied verbatim from the proven Sidebar mechanism, gated by the same `authEnabled` flag; harness asserts chrome/layout only — no auth surface changed (SHELL-07 guarantee structural, source-order asserted). | closed |
| T-05-03 | Tampering | web/index.html FOUC script | high | mitigate | Byte-identity source assert (in `web/src/app/mobileShellSource.test.ts`) fails CI on ANY mutation of the theme-script bytes; plan 04 edits confined to the meta line below the script. | closed |
| T-05-04 | Repudiation | TLS handling under test | low | accept | Harness uses `HTTP_ONLY=true` rather than `ignoreHTTPSErrors`; no TLS-disabling enters app code — accepted because it weakens nothing in production. | closed |
| T-05-05 | Information Disclosure | navModel gating + Sidebar/mobile consumers | medium | mitigate | Registry computes `enabled` from the same settings fields the desktop Sidebar uses; unit tests (`navModel.test.ts`) assert each gate and that bar/more derivations never surface a disabled entry; e2e chrome parity re-checks against the real server. | closed |
| T-05-06 | Tampering | matchMedia stub in testSetup | low | mitigate | Stub is guarded (only defines matchMedia when missing), desktop-default, and lives in test setup only — never imported by production code; full-suite green proves both envs coexist. | closed |
| T-05-07 | Tampering | BottomSheet styling | low | mitigate | Semantic tokens only (carbon-*/accent*, rounded-card/control); acceptance criteria grep for raw-hex absence; house lint rules run in the task verify. | closed |
| T-05-08 | Denial of Service (a11y) | BottomSheet focus trap | medium | mitigate | Trap mechanism lifted verbatim from battle-tested `useConfirm.tsx`; proven bidirectionally (Tab + Shift+Tab wrap) and focus-restore proven in dom tests (`BottomSheet.dom.test.tsx`); no inline onKeyDown (documented broken). | closed |
| T-05-09 | Tampering | theme-color mirror | low | mitigate | Mirror lives in `paint()` — the single choke point (setTheme/applyStoredTheme/system-flip all funnel through it) — with null guard; values pinned (#161616/#f4f4f4); paired-change comment keeps the index.html fallback in sync. | closed |
| T-05-10 | Tampering | Layout chrome switch | medium | mitigate | Desktop branch renders the identical pre-change tree (classes/comments preserved); e2e asserts Sidebar visible + bar absent on BOTH desktop projects from Task 1 onward; plan 06 hardens it into a 10-route leakage loop (`desktop-untouched.spec.ts`). | closed |
| T-05-11 | Denial of Service | iOS keyboard scroll mechanism | low | mitigate | Mechanism only scrolls (never mutates layout or focus), is frame-deferred, guarded for missing visualViewport, and torn down on unmount/branch switch; source-guarded to attach only when the shell root exists. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-05-04 | T-05-04 | The harness deliberately uses `HTTP_ONLY=true` instead of any TLS-bypass flag: the test server is plain HTTP on localhost by design, and nothing in app code learns to skip certificate validation. Weakens nothing in production. | Operator (plan-declared, ratified at audit) | 2026-09-15 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-15 | 12 | 11 (+1 accepted) | 0 | secure-phase (short-circuit: threats_open 0, register authored at plan time, ASVS 1 — no auditor spawn); mitigations verified against shipped code + green suites (vitest 112 files / 2481 tests EXIT=0; e2e tail gate 659 passed EXIT=0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-15
