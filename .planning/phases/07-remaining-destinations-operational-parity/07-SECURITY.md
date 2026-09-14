---
phase: 7
slug: remaining-destinations-operational-parity
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-14
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (8/8 PLANs carried `<threat_model>` blocks); verified from artifacts after execution.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| SPA ↔ /api | The phase is presentation-only: every mobile write rides an existing desktop chain (queueSettingsWrite + savedBaseline merge-only-changed-field, targeted peer/repo/offsite CRUD, useConfirm-wrapped deletes). Zero new endpoints, auth paths, file access, or schema surface. | Same as desktop — no new data crosses |
| Secrets (write-only) | Receiver APP_KEY + Fleet peer tokens (T-07-11) and notify/offsite secret fields (T-07-24) keep the write-only contract: GET returns "" + `has*` flag, blank-on-save keeps, Clear-only removes. | Secrets never echoed to the client |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Tampering (attribute injection) | platform.ts stored-value read | medium | mitigate | `isPlatform` coercion against the closed union before any setAttribute; invalid stored values fall back to DEFAULT_PLATFORM (`platform.test.ts`, created + green this phase) | closed |
| T-07-02 | Tampering (desktop regression via attribute) | index.css `[data-platform]` blocks | medium | mitigate | Blocks redefine only `--mob-*` custom properties consumed below md; `platform-chrome.spec.ts` desktop-1280 asserts the shell unchanged (passing — the 2 known failures are mobile-android checkbox probes, tracked as debt) | closed |
| T-07-03 | Information disclosure | Fab / platform layer | low | accept | Layer carries no user data — chrome constants + a two-value preference | closed |
| T-07-04 | Tampering (i18n drift) | locales codemod sweep | medium | mitigate | Parity + orphan tests fence the sweep; a missed table fails the suite (`i18n.parity.test.ts` / `i18n.preseed.test.ts` green) | closed |
| T-07-05 | Tampering (desktop regression) | Dashboard spacing normalization | medium | mitigate | Only mobile-block utilities change; desktop-untouched battery (extended 07-08, dual-direction six routes) green in the closing full-suite pass | closed |
| T-07-06 | Information disclosure | useLoadMore / ListToolbar | low | accept | Pure slicing math + text input over existing state — no new boundary | closed |
| T-07-07 | Tampering (settings clobber) | Flash zip-export toggle write | high | mitigate | Rides queueSettingsWrite + savedBaseline with merge-ONLY-the-changed-field (phase-6 save-bar contract); never a captured full-object PUT; e2e green | closed |
| T-07-08 | Tampering (desktop regression) | VMs/Flash double gate | medium | mitigate | Desktop JSX inside max-md:hidden; existing VMs.test.tsx landmarks pass; Task 3 dual-direction e2e green | closed |
| T-07-09 | Repudiation (unintended trigger) | per-card backup trigger rows | low | accept | Reuses existing BackupButton semantics incl. desktop consequence confirms; no new destructive surface | closed |
| T-07-10 | Information disclosure | card meta lines | low | accept | Renders only fields the wire already carries to desktop (frozen-API honesty) | closed |
| T-07-11 | Information disclosure (secret echo) | Receiver APP_KEY + Fleet token editors | critical | mitigate | Write-only contract via RevealInput + `has*` flags; e2e asserts rendered value attribute empty and PUT body omit/keep correct (`destination-config-receiver-fleet.spec.ts` / `settings-editors.spec.ts`, green) | closed |
| T-07-12 | Tampering (restore misuse) | Config restore sheet | high | mitigate | Guard chain renders read-only ABOVE the outcome-naming confirm (D-03); sheet narrates and fires the same guarded Recovery call; useConfirm/ConfirmSheet destructive tone | closed |
| T-07-13 | Tampering (settings/peer clobber) | configEnabled toggle + editor saves | high | mitigate | All writes ride existing chains (queueSettingsWrite merge-only / existing peer-repo saves); no captured full-object PUT; e2e concurrent-change scenario green | closed |
| T-07-14 | Misrepresentation (reachability language) | Receiver/Fleet status rendering | medium | mitigate | Four-status text-labelled badges only; offsite-blue banned for reachability; e2e asserts no offsite class on reachability elements | closed |
| T-07-15 | Tampering (desktop regression) | Config/Receiver/Fleet double gates | medium | mitigate | Desktop JSX in max-md:hidden halves; existing dom tests unchanged; Task 3 dual-direction e2e green on all three routes | closed |
| T-07-16 | Tampering (settings fork) | Settings chip strip / stacked cards | high | mitigate | Strip sets the EXISTING TabKey state; cards keep the page's existing save flows — no second state, no second write path; e2e scenario 2 asserts | closed |
| T-07-17 | Tampering (desktop regression) | Settings double gate | medium | mitigate | Desktop keeps PAGE_SHELL_TABBED inside max-md:hidden; every existing Settings dom test passed unchanged; dual-direction e2e green | closed |
| T-07-18 | Misrepresentation (accent drift) | chip strip active state | low | mitigate | Accent on active chip only (reservation 10), e2e-asserted; inactive chips carbon-surface2 | closed |
| T-07-19 | Information disclosure | stacked settings cards | low | accept | Re-renders data the desktop already renders for the same user; no new exposure | closed |
| T-07-20 | Tampering (state fork) | mobile toolbars | medium | mitigate | Toolbars bind desktop-owned states; e2e asserts a mobile filter change is the same state desktop controls read | closed |
| T-07-21 | Tampering (desktop regression) | Containers/Files/ActivityLog retrofits | medium | mitigate | Desktop variants byte-identical; existing dom tests pass unchanged; 07-08 battery re-proves all routes | closed |
| T-07-22 | Denial of service (runaway render) | useLoadMore consumption | low | accept | Window math bounded (20/step 20 over client-side arrays); no-auto-load prohibition prevents unbounded growth | closed |
| T-07-23 | Repudiation (log fidelity) | ActivityLog mobile variant | low | accept | Same buildLogLines output through the same glyphs/colors — presentation only | closed |
| T-07-24 | Information disclosure (secret echo) | notify + offsite secret fields in sheets | critical | mitigate | Write-only contract carried into both sheets (blank + Set badge from `has*` flags, blank-keeps, Clear-removes); e2e asserts value attribute empty on first open AND on reopen after edit | closed |
| T-07-25 | Tampering (stale capture overwrite) | sheet draft state | high | mitigate | Sheets submit only through setNotify / targeted CRUD with single-field semantics; e2e concurrent-change scenario stages a mid-edit server change and asserts the submit body carries only the edited field | closed |
| T-07-26 | Tampering (destructive misuse) | target delete | medium | mitigate | deleteOffsiteTarget rides useConfirm → ConfirmSheet with existing outcome-naming copy; no default-focused destructive control | closed |
| T-07-27 | Tampering (desktop regression) | NotifyCard/OffsiteTargetsSection gates | medium | mitigate | Gates internal; desktop forms unchanged (existing Settings dom tests pass); Task 3 dual-direction e2e asserts no sheets at >=48rem | closed |
| T-07-28 | Tampering (stale embed) | web/dist at phase close | high | mitigate | npm run build + fresh dist committed as a closing acceptance criterion (and re-committed after review fixes, 94562d1f) — the binary ships this phase's interface | closed |
| T-07-29 | Tampering (guard erosion) | mobileShellSource sweep | medium | mitigate | Guard needles/file-list change only with a written why; anti-shrink markers assert; suite green in the full vitest gate (2446/2446) | closed |
| T-07-30 | Tampering (desktop regression at the boundary) | desktop-untouched battery | medium | mitigate | Six-route dual-direction extension asserts both directions at >=48rem; ran green in the closing full-suite pass | closed |
| T-07-31 | Repudiation (flaky green) | Windows Playwright runs | low | accept | Known wedge modes handled by the recorded discipline (manual webServer, no piping, orphan cleanup, individual re-runs); wedge-vs-failure distinguished per task instructions | closed |
| T-07-SC (×8 plans) | Tampering (supply chain) | npm installs | low | accept | Zero package installs the entire phase (presentation-only, locked decision; Package Legitimacy Audit: none in every plan) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-07-03 | Fab/platform layer carries no user data | plan (07-01) | 2026-09-13 |
| AR-02 | T-07-06 | useLoadMore/ListToolbar cross no new boundary | plan (07-02) | 2026-09-13 |
| AR-03 | T-07-09 | Per-card triggers reuse existing confirm semantics | plan (07-03) | 2026-09-13 |
| AR-04 | T-07-10 | Card meta renders wire fields desktop already receives | plan (07-03) | 2026-09-13 |
| AR-05 | T-07-19 | Stacked cards re-render desktop-visible data | plan (07-05) | 2026-09-13 |
| AR-06 | T-07-22 | Load-more window bounded by design | plan (07-06) | 2026-09-13 |
| AR-07 | T-07-23 | Mobile log variant is presentation-only | plan (07-06) | 2026-09-13 |
| AR-08 | T-07-31 | Windows Playwright wedge handled by recorded discipline | plan (07-08) | 2026-09-13 |
| AR-09 | T-07-SC | Zero npm installs the whole phase | all plans | 2026-09-13 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-14 | 39 (31 unique + SC repeat) | 39 | 0 | /gsd-secure-phase 7 (verify:post hook) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-14 by `/gsd-secure-phase 7` (verify:post hook)
