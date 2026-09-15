---
phase: 8
slug: guided-restore-real-device-verification
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-15
---

# Phase 8 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser SPA ↔ `/api` | Same-origin, HTTP-only cookie session, CSRF-gated JSON envelope (`internal/api/handlers.go`) | Restore commands, scrubbed error text, run state |
| Operator's mobile device ↔ SPA | Real-device touch input at ~360 CSS px (D-11 UAT); no privileged channel — same origin, same session | Touch affordances, confirm dialogs, non-color status signals |
| restic repo ↔ appdata | Restore path output crossing back into the UI | Restore reasons (scrubbed, ≤300 chars), `[path]`-redacted paths |

---

## Threat Register

Register authored at PLAN time (all five phase PLANs carry `## Threat Model` blocks); this run aggregated the five per-plan registers into the eight unique threats below and verified each mitigation against shipped code.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Tampering | Restore controls (per-item, config, restore-all) | high | mitigate | Every destructive restore action sits behind a `ConfirmSheet` gate with the destructive action on top and the safe cancel at the bottom (D-03). Evidence: `Recovery.tsx:2753` (shared restoreAll handler behind its ConfirmSheet gate), `Recovery.tsx:3037` (confirm() promise presents ConfirmSheet below md). Device-verified D-11. | closed |
| T-08-02 | Spoofing | Hover-only affordances on touch devices | medium | mitigate | Tailwind v4 compiles `hover:` variants behind `@media (hover: hover)` — no hover state can activate on touch. Tap surfaces (`TapPopover` in `ColorPickerPopover.tsx`, `FilterPopover.tsx`) provide the below-md interaction path. Lint guard enforces no hover-only control variant (`web/src/lib/uiConventions.test.ts:309,335-336`). | closed |
| T-08-03 | Information Disclosure | Backend error rendering in restore UI | medium | mitigate | Backend error text is shown verbatim BUT is pre-scrubbed server-side (`scrubError`/`scrubSecrets` — paths→`[path]` first, then credentials→`[redacted]@`; order load-bearing). `appKeyRemedy` remap in `Config.tsx` + `Recovery.tsx` keeps APP_KEY diagnosis text generic. | closed |
| T-08-04 | Information Disclosure | Credential attach flows (cloud/cred sets) | high | mitigate | Write-only secret contract: GET returns `""` + `*Set` flag, blank on save keeps stored value, Clear flag/DELETE removes. Evidence: `CloudCredSetsCard.tsx:29` ("Same write-only-secret contract as CloudCard"). D-05. | closed |
| T-08-05 | Repudiation | Run status communicated by color alone | medium | mitigate | Four run statuses render as TEXT badges (WCAG 1.4.1 use of color) — `Badge.tsx` + `Badge.test.ts`. Strongest evidence: device-verified in D-11 UAT (08-UAT.md checklist item 5, PASS). | closed |
| T-08-06 | Tampering | Stale artifact redeploy (SPA/binary mismatch) | low | mitigate | Runbook step 1 mandates rebuild before deploy; `/api/health` carries the build stamp and the served `index.html` sha256 is compared against the local build (deploy procedure, 08-UAT.md). Proven twice this milestone (nsv, p9a deploys). | closed |
| T-08-07 | Information Disclosure | Runbook coordinates in a public repo | high | mitigate | Runbook in 08-UAT.md uses placeholders (`<server-ip>`, `<app-key>`); grep for IP-regex patterns over 08-UAT.md = 0 matches. Production container `BombVault` never touched — test instance only, LAN-only port. | closed |
| T-08-SC | Tampering | Supply chain (npm installs during phase) | high | accept | Phase D-12 constraint held: zero npm installs during the phase — no dependency surface changed, so no supply-chain window opened. Risk accepted as structurally absent rather than mitigated. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-08-SC | T-08-SC | Zero npm installs during the phase (D-12) — the supply-chain window this threat describes never opened; nothing to mitigate. Re-evaluates naturally at the next phase that touches dependencies. | Operator (session D-12 constraint) | 2026-09-15 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-15 | 8 | 7 (+1 accepted) | 0 | secure-phase (short-circuit: threats_open 0, register authored at plan time, ASVS 1 — no auditor spawn) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-15
