---
phase: 6
slug: maquette-screens
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-13
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User tap → destructive server action | Touch surfaces (tree rows, sheet buttons, sticky trigger) can trigger backups/resets; accidental activation is the phase's dominant threat | Backup/reset POSTs against the live server |
| Server/user strings → DOM | Run meta, paths, log lines, translated strings rendered in sheets/cards/popovers | Untrusted-ish text; XSS surface |
| Page background/foreground lifecycle | Mobile browsers freeze timers/SSE in background tabs; stale progress could misrepresent a running backup | Live run state vs rendered claims |
| npm registry → build | Every plan installs no new deps; `npm ci` from the committed lockfile | Supply chain |
| web/src → web/dist → embedded binary | The SPA is embedded via `go:embed`; a stale dist would ship stale security-relevant UI | Build artifact freshness |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-06-01 | Tampering (stale-state misrepresentation) | Live progress, run sheets, recent runs, embedded SPA | high | mitigate | `useVisibilityGate` consumer-side gate + visible refetch of listRuns FIRST with baseline-id reconcile (`web/src/lib/useVisibilityGate.ts`, `RunDetailSheet.tsx:378-387`); `web/dist` rebuilt and committed in every web-changing commit (last: 6399720d) | closed |
| T-06-02 | Tampering (accidental destructive activation) | Touch hit zones, ConfirmSheet, tree save/reset, Home sticky trigger | high | mitigate | >=44px full-row targets with chevron/toggle x-intervals asserted disjoint (`web/e2e/touch-tree.spec.ts:146-176`); destructive confirms route through `useConfirm` → `ConfirmSheet` below 48rem (destructive top, safe cancel thumb-default); D-04 zero-include guard refuses emptying selections; Home trigger confirm `home.newBackupConfirm` in all 42 locale tables | closed |
| T-06-03 | Tampering (tap-through to background controls) | BottomSheet scrim, TapPopover backdrop | medium | mitigate | Scrim is panel-as-sibling (aria-hidden but hit-tested — the Phase 5 `inert` fix); TapPopover's backdrop consumes clicks (z-40 under sheet z-50) so taps cannot fall through to page controls | closed |
| T-06-04 | Information disclosure | Sheet content vs camera cutouts, focus handling | low | accept | Cosmetic-only exposure below display cutouts; sheets clamp to safe-area insets (SHELL-04 pairing); no secrets rendered in any sheet | closed (accepted) |
| T-06-05 | Tampering (XSS / regression reintroduction) | All rendered strings; eslint house rules | medium | mitigate | React escaping only — zero `dangerouslySetInnerHTML` in `web/src` (grep-verified 2026-09-13); every user-visible string via `t()` (lint-enforced); 8 `bombvault/*` eslint rules gate convention regressions, exceptions declared in config never inline | closed |
| T-06-06a | Tampering (stale editor state) | `openContainer` local state, RunDetailSheet freshness | medium | mitigate | Component-local open state with `cardMountsCache` invalidation on save (`Containers.tsx:3617-3621`); `openRef`/`freshOk` gate blocks render until post-open refetch lands (`RunDetailSheet.tsx:378-387`, hardened by review fix WR-01) | closed |
| T-06-SC | Tampering (supply chain) | npm installs | low | accept | `npm ci` from the committed lockfile only; milestone rule: zero new runtime dependencies; Renovate weekly with digest-pinned base images | closed (accepted) |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-04 | Cutout-region overlap is cosmetic; safe-area clamping shipped in Phase 5 and no sheet renders secret material | Plan register (disposition authored at plan time); ratified in autonomous run | 2026-09-13 |
| AR-06-02 | T-06-SC | Installs are lockfile-pinned `npm ci`; the milestone forbids new runtime dependencies outright; Renovate keeps bases digest-pinned | Plan register (disposition authored at plan time); ratified in autonomous run | 2026-09-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-13 | 7 | 7 | 0 | Orchestrator, L1 grep-depth per ASVS L1 short-circuit (threats_open: 0 + register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-13
