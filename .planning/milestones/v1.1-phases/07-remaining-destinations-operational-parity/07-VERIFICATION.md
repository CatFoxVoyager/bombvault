---
phase: 07-remaining-destinations-operational-parity
verified: 2026-09-14T08:30:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "WR-01 refinement — the VMs next-fire chip hides when the /api/schedule/next payload carries MORE than one vms-domain row (ambiguous never renders as a specific fire)"
    test: "Stage two vms-domain rows (domain entry + per-item override) on /vms mobile; confirm both override cards render the cadence label alone with no fire-time chip"
    expected: "Chip absent on every card while the payload is ambiguous; single-row payloads still render the chip (that half is e2e-pinned by destination-vms-flash.spec.ts, re-run green post-fix per 07-REVIEW-FIX)"
    why_human: "The hide branch is implemented (web/src/pages/VMs.tsx:2174-2175) but the e2e stages exactly one vms row, so no automated run exercises the multi-row path (review IN-03, routed elsewhere)"
  - truth: "WR-02 refinement — the Files mobile Save bar hides when a search hides the expanded set, and a stale Save press after unmount no-ops"
    test: "On /files mobile, expand a set editor, type in the sets search so the expanded set no longer matches; confirm the Save bar disappears with the editor; press Save location after remount of a different editor and confirm no hidden queue is committed"
    expected: "Save bar and editor unmount together (including over the zero-match card); saveFlushRef.current is null after unmount so a stale press no-ops"
    why_human: "Implemented (web/src/pages/Files.tsx:1965, :1402-1406, :2379) but no targeted e2e/dom test expands a set under a search filter (noted in 07-REVIEW-FIX; the fix rests on tsc + unit suites + source-order review)"
---

# Phase 7: Remaining Destinations & Operational Parity — Verification Report

**Phase Goal:** Every remaining destination — VMs, Flash, Config, Receiver, Fleet, Settings — operates in the same mobile card language with sheet editors, schedule/notification/replication parity, list ergonomics, and the design bible's platform-adaptive chrome, closing the "no desktop-only settings" contract.
**Verified:** 2026-09-14T08:30:00Z
**Status:** passed
**Re-verification:** No — initial verification
**Tree verified:** HEAD `0bed9eba` (includes 07-08 Task 3 commit `da66b120` and review-fix commits `da9d309e`, `4bced30d`, `38161c89`, dist rebuild `94562d1f`); tracked tree clean.

## Goal Achievement

### Observable Truths (roadmap Success Criteria = the contract)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | VMs / Flash / Config / Receiver / Fleet render block-level item cards with status, last run, offsite state; trigger + schedule entry points; Config's restore guard chain readable; Fleet peers show reachability, last contact, protection summary | ✓ VERIFIED | D-01 double gate present in all six pages (`max-md:hidden` + `!isDesktop` counts checked per file). VMs mobile cards carry `OffsiteIndicator` (VMs.tsx:1806) + trigger deep-link + schedule entry; Flash hero card has status badge, last-backup line, `OffsiteIndicator` (Flash.tsx:720) with the WR-03 loading gate (:702, :716-717); Config restore chain renders as a real numbered `<ol>` of the five pre-seeded steps BEFORE the confirm (Config.tsx:1187-1197), restore entry tonal (:960); Receiver reachability is text-labelled four-status with zero offsite tokens (Receiver.tsx:1001-1002 documents the ban); Fleet peer cards use the desktop poll-badge mapping, relative last contact, and the shared PeerScorecard in a content-sized (not fullHeight) detail sheet (Fleet.tsx:1469-1472). Mobile e2e suites recorded green on the final four-project run (287/0, 07-08-SUMMARY) |
| 2 | Schedule editing on the phone: TimePicker/CadenceBuilder as full-screen sheets, effective-schedule preview visible on the invoking card, server-derived | ✓ VERIFIED | `CadenceBuilder` hosted in fullHeight BottomSheets: VMs.tsx:2542-2557 (EXACT_CADENCE_MODES restriction), Config.tsx:1008+. Preview chips read `getScheduleNext()` (api.ts:1964) at VMs.tsx:2171 and Config.tsx:817 — never client clock math; the WR-01 fix (`vmsRows.length === 1 ? vmsRows[0] : null`, VMs.tsx:2174-2175, commit `da9d309e`) keeps ambiguity from ever rendering a wrong fire. The single-row chip text is e2e-pinned (destination-vms-flash.spec.ts, re-run green post-fix). 07-07's sweep found no second derivation helper and no client schedule math in Settings surfaces |
| 3 | Notification channels and off-site replication targets fully editable on mobile — no desktop-only settings remain | ✓ VERIFIED | NotifyCard re-hosts the SAME form in a fullHeight BottomSheet on the ONE `setNotify` chain (NotifyCard.tsx:64-67, :255, :337-345). OffsiteTargetsSection rides only the four existing CRUD fns (`createOffsiteTarget` :295, `updateOffsiteTarget` :315, `deleteOffsiteTarget` :342, `testOffsiteTarget` :138) with `useConfirm` deletes (:231) and BottomSheet shells — zero new endpoints or write shapes. The 07-07 FLOW-02 audit table records all 7 TAB_ORDER sections mobile-operable; e2e asserts the Notifications entry row opens the sheet (destination-settings.spec.ts, updated in `da66b120`) |
| 4 | Settings works on the phone (stacked cards, sheet editors, dark/language/accent as today, defined 7-tab strip treatment) and long lists offer sticky search + filter chips, load-more, ≥44px rows | ✓ VERIFIED | Chip strip: one chip per `TAB_ORDER` (Settings.tsx:849) bound to the SAME tab state through the shared `switchTab` (desktop Selector :2608 and mobile chips both call it — no second state), aria-label `settings.tabsNavigation` (:2657), radius `rounded-(--mob-chip-radius)` (:2642); pickers reuse the phase 6 primitives (ColorPickerPopover/TapPopover). Lists: `useLoadMore` (constant 20/20, hasMore-gated button, identity reset, live-feed preserveKey) is the only pagination and is consumed by Containers, Files, Flash, VMs, ActivityLog; ListToolbar input is h-11 (ListToolbar.tsx:57), sticky-in-flow with no `position:fixed`; zero IntersectionObserver/scroll listeners in src (grep clean); the 44px floor is bounding-box-asserted in e2e (list-ergonomics.spec.ts:369-383); carried Files header fix landed (flex-wrap + shrink-0 removal, mutation-proven in 07-06) and is regression-asserted in the narrow sweeps |
| 5 | Android Material 3 expression (FAB primary action, tonal chips) and iOS HIG expression (large title, circular checks) — same IA, translated chrome | ✓ VERIFIED | `web/src/lib/platform.ts` full read: closed `"material" \| "cupertino"` union, `bv-platform` persistence, `isPlatform` validate-or-fall-back coercion, `applyPlatform` as the single `setAttribute` choke point, `applyStoredPlatform` wired at boot (:25) and inside the ADOPTED_EVENT listener (:39) — both after `applyStoredLabelModes()`. index.css :615-704 defines all five `--mob-*` vars for BOTH attribute values with below-md consumer rules (cupertino page-title rule :683-685; checkbox radius rule :704). Fab renders null under cupertino (Fab.tsx:57), h-13 (52px), in-flow with the recorded D-12 placement-deviation comment. UA-sniffing ban holds: `navigator.userAgent`/`userAgentData` appear ONLY inside the guard test (mobileShellSource.test.ts:508-509). Desktop identity is machine-enforced: desktop-untouched.spec.ts covers all six phase routes in both directions (PHASE7_ROUTES :145-148) |

**Score:** 5/5 truths verified (2 review-fix refinements present but not behavior-test-exercised — see behavior_unverified_items; neither is a roadmap SC failure)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `web/src/lib/platform.ts` | Platform union + coercion + single choke point | ✓ VERIFIED | Full read; substantive, wired via main.tsx + Fab |
| `web/src/lib/platform.test.ts` | Coercion/persistence/attribute tests | ✓ VERIFIED | Passes on HEAD (part of 77-test spot run) |
| `web/src/index.css` `[data-platform]` blocks | All five --mob-* vars, both values, consumers | ✓ VERIFIED | :626-657 vars; :683-685 title; :704 check |
| `web/src/main.tsx` wiring | applyStoredPlatform twice, correct order | ✓ VERIFIED | :25 boot, :39 adoption |
| `web/src/components/mobile/Fab.tsx` | Material-only FAB, 52px, in-flow | ✓ VERIFIED | Full read; consumed by VMs/Flash/Config blocks |
| `web/src/lib/useLoadMore.ts` (+test) | Constant-threshold pagination | ✓ VERIFIED | Full read; 5 consumers; 15+4 unit tests pass |
| `web/src/components/mobile/ListToolbar.tsx` | Sticky-in-flow search + chips | ✓ VERIFIED | h-11 input; no fixed; why-comment present |
| `web/src/components/mobile/MobileSectionLabel.tsx` | Single source, promoted | ✓ VERIFIED | Exactly 1 definition repo-wide; 8 consumers |
| `web/src/pages/{VMs,Flash,Config,Receiver,Fleet,Settings}.tsx` | Mobile blocks behind double gate | ✓ VERIFIED | max-md:hidden + !isDesktop in every file |
| `web/src/pages/settings/NotifyCard.tsx` | Sheet re-host on setNotify | ✓ VERIFIED | BottomSheet + setNotify, write-only contract |
| `web/src/components/OffsiteTargetsSection.tsx` | CRUD sheets on existing fns | ✓ VERIFIED | 4 CRUD fns + useConfirm + BottomSheet |
| `web/src/app/mobileShellSource.test.ts` | Phase-7 sweep guard | ✓ VERIFIED | PHASE-07 describe :578+, needles + anti-shrink markers; green |
| `web/e2e/desktop-untouched.spec.ts` | Six-route dual-direction battery | ✓ VERIFIED | PHASE7_ROUTES :145, loop :148 |
| `web/e2e/narrow-viewport.spec.ts` | de/fr × 320/360 sweep matrix | ✓ VERIFIED | locales ["de","fr"] :74, widths [320,360] :75, phase-7 loop :536-540 |
| `web/dist` | Fresh build committed | ✓ VERIFIED | Rebuilt+committed at `94562d1f`; `git diff HEAD -- web/dist` empty |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| main.tsx boot/adoption | platform.ts applyStoredPlatform | boot + ADOPTED_EVENT listener | ✓ WIRED | :25 and :39, both after applyStoredLabelModes |
| Fab.tsx | platform.ts usePlatform | the one sanctioned structural switch | ✓ WIRED | renders null under cupertino |
| VMs/Config schedule sheets | CadenceBuilder | fullHeight BottomSheet host | ✓ WIRED | VMs.tsx:2557, Config.tsx (EXACT_CADENCE_MODES in VMs) |
| VMs/Config preview chips | api.ts getScheduleNext | server-derived preview (D-06) | ✓ WIRED | VMs:2171 (WR-01 gate), Config:817 |
| Flash zip toggle + Config configEnabled | queueSettingsWrite + savedBaseline | the one settings write chain | ✓ WIRED | re-fetch → merge-only-changed-field shape (verified in review + WR-01..03 re-reads) |
| NotifyCard sheet | api.ts setNotify | the one notify write chain | ✓ WIRED | :255 |
| OffsiteTargetsSection sheets | create/update/delete/testOffsiteTarget | the four existing CRUD fns | ✓ WIRED | :295/:315/:342/:138 |
| Settings chip strip | TAB_ORDER + shared switchTab | one state, two presentations | ✓ WIRED | :849/:1145/:2608/:2657 |
| All five list surfaces | useLoadMore | THE pagination mechanism | ✓ WIRED | Containers/Files/Flash/VMs/ActivityLog |
| mobileShellSource sweep | phase-7 file list | anti-shrink marker asserts | ✓ WIRED | sweep + file-existence test green on HEAD |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| VM/Flash/Config/Receiver/Fleet mobile cards | per-domain list payloads | existing page fetches (listVMs, flash snapshots, config status, received repos, fleet peers) | Yes — same wire data the desktop renders (frozen-API honesty) | ✓ FLOWING |
| Schedule preview chips | ScheduleNext[] | GET /api/schedule/next via getScheduleNext | Yes — server-derived; no client cadence math (grep-confirmed) | ✓ FLOWING |
| Settings stacked cards | settings row | existing getSettings/queueSettingsWrite | Yes — desktop state, two presentations | ✓ FLOWING |
| Mobile editor sheets (Receiver/Fleet) | repo/peer drafts | existing dialog state (one state, two presentations) | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase-7 source guards (UA ban, single setAttribute writer, spacing/weight sweep w/ anti-shrink markers) + platform coercion/persistence + load-more window math | `npx vitest run src/app/mobileShellSource.test.ts src/lib/platform.test.ts src/lib/useLoadMore.test.ts` | 3 files / 77 tests passed (1.58s) on HEAD | ✓ PASS |
| Full Playwright four-project gate | (not re-run — 12-14 min + Windows teardown wedge; server start prohibited by spot-check constraints) | Recorded green at close: 287 passed / 0 failed (07-08-SUMMARY, commit `da66b120`); destination-vms-flash re-run 14 passed / 0 failed post-review-fixes against the rebuilt binary+dist (07-REVIEW-FIX) | ✓ PASS (recorded, current tree = those commits) |
| Prior platform-chrome /vms checkbox failures (deferred-items.md) | n/a | Resolved in `da66b120`: vmsEnabled route-staging + resilient rule-walk/token probe + MobileVMCard paint proof; final full run 287/0 includes this spec | ✓ RESOLVED |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| (none declared) | `find scripts -path '*/tests/probe-*.sh'` + PLAN grep | No probe scripts exist or are declared for this phase | N/A |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MORE-01 | 07-03, 07-04, 07-08 | VMs/Flash/Config/Receiver/Fleet in the mobile card language | ✓ SATISFIED | Truth 1 above (all five surfaces verified in code + e2e) |
| MORE-02 | 07-05, 07-08 | Settings: stacked cards, sheet editors, pickers as-today, 7-tab strip treatment | ✓ SATISFIED | Truth 4 (chip strip on shared state, stacked cards, narrow-sweep proof) |
| FLOW-01 | 07-03, 07-04, 07-07, 07-08 | CadenceBuilder full-screen sheets + effective-schedule preview on the invoking card | ✓ SATISFIED | Truth 2 (sheets + server-derived chips; WR-01 fix landed in `da9d309e`) |
| FLOW-02 | 07-07, 07-08 | Notifications + off-site replication editable on mobile; no desktop-only settings | ✓ SATISFIED | Truth 3 (sheets on existing write chains; per-section audit table in 07-07-SUMMARY) |
| LISTS-01 | 07-02, 07-03, 07-06, 07-08 | Sticky search + chips, load-more (never infinite scroll), ≥44px rows | ✓ SATISFIED | Truth 4 (useLoadMore everywhere, no observers, 44px e2e floor, i18n preseed keys bound) |
| PLAT-01 | 07-01, 07-03, 07-05, 07-08 | Material 3 / HIG translated chrome from one codebase | ✓ SATISFIED | Truth 5 (platform layer + consumers + dual-direction desktop battery) |

All six requirement IDs are mapped to Phase 7 in REQUIREMENTS.md (lines 132-137, status Complete) and claimed in plan frontmatter — no orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| pages/VMs.tsx | 762 | `TODO(#follow-up)` — deferred richer delete-all copy (carried from the confirm-dialog mechanism swap, desktop half, documented deferral + cross-references) | ℹ️ Info | None — pre-existing, documented, outside phase-7 mobile code |
| pages/Settings.tsx | 507 | "not yet implemented in Phase 1" — historical narrative inside a why-comment about a REMOVED stale paragraph | ℹ️ Info | None — not a placeholder |

No TBD/FIXME/XXX blockers. No disabled/skipped tests in any requirement-linked test file. No stub patterns: every mobile block fetches and renders live wire data; no `return null` placeholders (Fab's null is the sanctioned cupertino branch), no empty handlers, no hardcoded empty data flowing to render.

### Decision Coverage (CONTEXT.md gate)

All 12 trackable CONTEXT.md decisions (D-01..D-12) are honored by shipped artifacts (`check.decision-coverage-verify`: honored 12 / total 12, not_honored: []). Note: D-12's `useIsCoarsePointer` phrasing was superseded during planning by the UI-SPEC's recorded no-OS-detection decision — implemented as the closed union + persisted preference with the rationale documented at platform.ts:14-22; the decision's mechanism contract (data-platform attribute + CSS custom-property variants + FAB/tonal chips/large titles/circular checks) is fully honored.

### Review-Fix Verification (post-review hardening)

| Finding | Commit | Source evidence on HEAD | Status |
| --- | --- | --- | --- |
| WR-01 VMs next-fire ambiguity | `da9d309e` | VMs.tsx:2174-2175 filters vms rows and keeps state only when exactly one exists; comment documents the mechanism | ✓ FIXED (hide branch itself untested — see behavior_unverified_items) |
| WR-02 Files Save bar lifetime + stale flush | `4bced30d` | Files.tsx:1965 `expandedVisible` gate; :2379 bar condition; :1402-1406 unmount nulls the flush ref | ✓ FIXED (interaction path untested — see behavior_unverified_items) |
| WR-03 Flash hero false "never" while loading | `38161c89` | Flash.tsx:702 `loading ? checking : newest ? time : never`; badge arm :716-717 | ✓ FIXED (e2e re-run green post-fix) |

Out-of-scope review infos (IN-01/IN-02/IN-03) remain routed by the orchestrator; none is a phase must-have.

### Human Verification Required

None for this phase — per the verification discipline, device-real validation (touch ergonomics, real Material/HIG rendering, keyboard interplay) is explicitly scheduled for phase 8's exit criteria (VERIFY-02..05). The two behavior_unverified_items above are recorded in frontmatter and should be folded into that pass (or closed with a targeted jsdom/e2e test).

### Gaps Summary

None. All five roadmap success criteria are implemented, wired, and proven in the current HEAD tree: the six destinations render the mobile card language behind the D-01 double gate with desktop identity machine-enforced in both directions; schedule editing is sheet-based with server-derived previews (hardened by WR-01); notifications and off-site replication are fully operable on mobile through the existing write chains; Settings presents the chip strip + stacked cards with the 7-tab treatment defined; the platform chrome layer (material/cupertino, FAB, tonal chips, large titles, circular checks) is real, coerced, persisted, and UA-sniff-free; lists meet the ergonomics contract; the guards, batteries, narrow sweeps, and fresh committed web/dist seal the phase. The full vitest suite (2446 tests), the four-project Playwright run (287/0), and the review-fix regression pass are recorded green at the exact commits now at HEAD.

---

_Verified: 2026-09-14T08:30:00Z_
_Verifier: Claude (gsd-verifier)_
