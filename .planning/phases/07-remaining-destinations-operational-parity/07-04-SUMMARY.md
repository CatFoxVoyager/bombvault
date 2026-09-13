---
phase: 07-remaining-destinations-operational-parity
plan: 04
subsystem: web-spa
tags: [mobile, destinations, config, receiver, fleet, write-only-secrets, d01-double-gate, e2e]
requires:
  - 07-01 (mobile primitives: BottomSheet fullHeight/content-sized, StickyActionBar, MobileSectionLabel)
  - 07-02 (ListToolbar/LoadMore + phase 7 i18n pre-seed: config.restoreChain.*, receiver.*, fleet.*)
  - 05 (D-01 double gate, destinations gate, queueSettingsWrite chain, useConfirm ConfirmSheet)
provides:
  - Config mobile block: status card + server-derived next-fire chip, guard-chain restore sheet, queue-chain toggle, CadenceBuilder schedule sheet
  - Receiver mobile block: four-status reachability cards, content-sized inventory detail sheet, write-only APP_KEY fullHeight editor
  - Fleet mobile block: peer cards with protection chips via the shared PeerScorecard, content-sized scorecard detail sheet, write-only token fullHeight editor
  - Desktop dual-direction e2e guard for /config /receiver /fleet on desktop-1280 + desktop-768
affects: [07-05 (remaining destinations reuse the wrapper-hide + card language), phase 8 real-device pass]
tech-stack:
  added: []
  patterns:
    - D-01 double gate per page (desktop JSX max-md:hidden always rendered; mobile block mounted only under !isDesktop, owning its mobile-only gate fetch)
    - One shared editor state, two presentations (desktop portal dialog above md, fullHeight BottomSheet below)
    - Wrapper-div hide for glim-btn controls under max-md (unlayered author CSS beats layered utilities)
key-files:
  created:
    - web/e2e/destination-config-receiver-fleet.spec.ts
  modified:
    - web/src/pages/Config.tsx
    - web/src/pages/Receiver.tsx
    - web/src/pages/Fleet.tsx
    - web/src/pages/Fleet.peerCard.dom.test.tsx
    - web/dist/index.html
decisions:
  - Desktop Add triggers hide on a wrapper div, never on the Button: .glim-btn is unlayered author CSS (display:inline-flex) that beats Tailwind v4's layered max-md:hidden on the same element (06-03 .glim-picker lesson re-learned live)
  - Write-only secrets machine-asserted as empty value attribute + blank-keeps PUT body; the frozen ReceivedRepoInput/FleetPeerInput has no removal flag and no "Set" i18n key exists, so the has* keep-placeholder IS the stored-key signal
  - Protection scorecard on Fleet mobile CALLS the desktop PeerScorecard renderer (protectionTone/protectionLabelKey) — one mapping, two presentations, never forked
  - Detail sheets content-sized (D-04), editors fullHeight (D-05) across all three destinations; deletes on mobile ride useConfirm tone "warn" (reversible monitoring-entry removal) while desktop keeps its inline confirms
  - Config mobile omits OffsiteIndicator (desktop Config never speaks offsite since #176; the component's Domain union lacks "config"); Receiver per-card size meta lives in the detail sheet inventory (ReceivedRepoStatus carries no size; no N+1 fetches)
metrics:
  duration: 1h 39m
  completed: 2026-09-13
  tasks: 3
  files: 6
actuals:
  tokens: 42000
  tasks: 3
  commits: 4
status: complete
---

# Phase 07 Plan 04: Config/Receiver/Fleet Mobile Blocks Summary

Config, Receiver, and Fleet now carry the D-01 double gate with mobile card blocks: a narrated guard-chain restore sheet, four-status reachability language, protection scorecards through the shared PeerScorecard renderer, and write-only secret editors whose blank-keeps contract is machine-asserted in e2e PUT bodies — with desktop identity dual-direction-guarded on all three routes.

## What Was Built

- **Config (Task 1, f79b057c)** — status card (newest-wins last-run line + relative-age badge), configEnabled autosave toggle on the re-fetch → merge-only-changed-field → queueSettingsWrite chain with `bv:settings-changed` dispatch, schedule entry opening a fullHeight CadenceBuilder sheet (PUT + server-refreshed accentText chip), restore entry opening a content-sized sheet whose numbered `<ol>` guard chain renders BEFORE the outcome-naming confirm (DOM-order asserted), Fab sharing the desktop trigger via fireRef, honest gate-off card linking Settings.
- **Receiver (Task 2, 1e0817c0)** — repo cards with the desktop's four-status badge order (monitoringOff / reachable / unreachable, zero offsite tokens), relative lastReceived + tabular snapshot counts, content-sized detail sheet hosting the inventory drill-down (per-source rows + totals, humanBytes) plus Check-now/deep-check/Edit/Remove rows, fullHeight editor re-hosting the ReceiverDialog field set with write-only APP_KEY (RevealInput, hasAppKey keep placeholder, blank-keeps), useConfirm delete, empty/retry honesty.
- **Fleet (Task 3, a54d676c)** — peer cards keyed by the 32-hex id, instance-name identity (`lastPollInstanceName || name`), desktop poll-badge mapping verbatim (pollNever neutral / pollOk / pollFailed), relative tabular last-polled line with pollNever for 0, protection chips through the SAME PeerScorecard the desktop disclosure renders, content-sized detail sheet (scorecard title + full scorecard + Poll-now with desktop handlePoll semantics + Edit/Remove), fullHeight token editor with the hasToken keep placeholder and blank-keeps on the wire, gate-off card, empty honesty card.
- **Desktop identity** — `Fleet.peerCard.dom.test.tsx` extended with desktop-identity assertions (desktop peer surface inside the max-md:hidden wrapper; mobile block unmounted in jsdom; single copy of peer data); e2e dual-direction guard on /config /receiver /fleet for desktop-1280 + desktop-768 (Sidebar visible, bottom-nav 0, no `button.h-13` Fab, no `[role="dialog"].h-dvh`, singular desktop action per route).
- **E2e harness** — `destination-config-receiver-fleet.spec.ts`: 15 scenarios × 4 projects; config/receiver/fleet/settings/schedule-next domains staged at the route layer field-for-field with the Go JSON shapes (fresh harness DB can never hold these); en-US locale pinning; display-prefs abort for the boot-look cut.

## Verification Results

- `vitest run Config.autosave.dom.test.tsx Fleet.peerCard.dom.test.tsx` — 8/8 green
- `playwright test e2e/destination-config-receiver-fleet.spec.ts` — 30 passed / 30 skipped, 0 failed (6.5m; first full run surfaced 13 failures, all diagnosed and fixed, see Deviations)
- `tsc --noEmit` and `eslint` clean on Config/Receiver/Fleet + the dom test
- Source checks: no offsite tokens in Receiver/Fleet reachability rendering; no accent classes on restore entries; the guard-chain `<ol>` precedes the confirm in Config.tsx

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Desktop Add triggers now hide on a wrapper div (Fleet.tsx AND Receiver.tsx)**
- **Found during:** Task 3 (live e2e, mobile-android token editor strict-mode failure)
- **Issue:** `max-md:hidden` placed on the `Button` itself never hid it below md — `.glim-btn` is unlayered author CSS (`display: inline-flex`) which beats Tailwind v4's layered utility on the same element (the 06-03 `.glim-picker` width lesson). Receiver.tsx carries the same Task 2 edit, so both pages were fixed.
- **Fix:** wrapper `<div className="shrink-0 max-md:hidden">` around the desktop trigger, with a why-comment at both sites; utility wins on a plain div (Flash/VMs precedent).
- **Files modified:** web/src/pages/Fleet.tsx, web/src/pages/Receiver.tsx (Receiver touched under Task 3, outside its task's file list — Rule 1 justification above)
- **Commit:** a54d676c

**2. [Rule 1 - Bug] E2e assertion corrections from the first live run**
- **Found during:** Task 3 verification (13 first-run failures, all spec-side or the wrapper bug above; zero product logic defects)
- **Issue/Fix:**
  - The newest staged config snapshot is 26 minutes old (fixture stages 30 + 26) — the badge assertion now expects "26 minutes ago" and the fixture comment states the real ordering.
  - Text assertions in the mobile Receiver/Fleet card tests are `.filter({ visible: true })`-scoped: the desktop page's own hidden cards render identical copy and unfiltered getByText counts display:none nodes (getByRole already excludes them).
  - The desktop fullHeight-sheet leak check is dialog-scoped (`[role="dialog"].h-dvh`): the app shell ROOT legitimately carries h-dvh (SHELL-05) on every route.
- **Files modified:** web/e2e/destination-config-receiver-fleet.spec.ts
- **Commit:** a54d676c

**3. [Rule 1 - Honesty] Mobile blocks consume their loading/error props**
- **Found during:** Task 1/2 (eslint flagged the unused `loading` prop in MobileConfigBlock)
- **Issue:** the block accepted but ignored `loading`, leaving the busy state unrendered.
- **Fix:** derived `lastRunLine`/`statusBadge` render the loading state via `dashboard.checking`; Receiver/Fleet blocks gate the add-entry row and retry row on `loading`/`error`.
- **Commits:** f79b057c, 1e0817c0, a54d676c

### Plan-Text vs Frozen-Reality Notes (documented in-file)

- **Write-only "Set badge"/"Clear" phrasing:** the frozen `ReceivedRepoInput`/`FleetPeerInput` have NO removal flag (api.ts: "On PUT an empty appKey/token keeps the stored key") and no "Set" i18n key exists (07-02 single-writer preseed pinned exactly nine keys, guarded by i18n.preseed.test.ts). The desktop's stored-key signal IS the has* keep-placeholder, so the machine-asserted contract here is strictly stronger where it matters: the input's value attribute is EMPTY while a secret is stored (never echoed) and the blank save's PUT body carries `appKey: ""` / `token: ""` — no secret bytes render or travel. Documented in the spec header (Receiver note + Fleet section note).
- **"size meta" on receiver cards (MORE-01b):** ReceivedRepoStatus carries no size field; sizes render in the detail sheet's inventory drill-down only — which also avoids N+1 per-card inventory fetches.
- **Mobile delete via useConfirm (tone "warn"):** the plan mandates useConfirm for mobile deletes while the desktop Fleet card deliberately keeps its two-click inline confirm; mobile uses the warn branch citing the same reversible-action reasoning (monitoring-entry removal never contacts the peer).
- **Fleet mesh-offers card stays shared below md:** the plan's mobile scope is peers + scorecard + editor; the desktop mesh-offers review/accept card is left working below md rather than hiding a live approval flow behind max-md:hidden.
- **OffsiteIndicator omitted on mobile Config:** desktop Config never speaks offsite (since #176) and the component's Domain union lacks "config" — nothing to reuse, nothing banned.

### Convention Notes

- `web/dist/index.html` (rebuilt SPA entry refs) committed with Task 3 per the repo rule that web changes ship with a fresh build (07-03 precedent 5e4c6b0b).
- E2e domains staged at the Playwright route layer — the reused Rule 3 harness-honesty deviation from 07-03 (the real binary + real SPA + real route shapes; only payloads staged).

## Auth Gates

None.

## Known Stubs

None — all mobile surfaces fetch and render live staged-API data; no placeholder data sources, no TODO/FIXME left behind.

## Threat Flags

None — no new endpoints, auth paths, file access, or schema changes; all mobile writes ride the existing desktop chains and the T-07-11..15 mitigations are in place (write-only blanks asserted on the wire, guard chain ordered before confirm, merge-only settings writes, text-only reachability labels, dual-direction desktop guard).

## Self-Check: PASSED

- Files exist: web/src/pages/Config.tsx, web/src/pages/Receiver.tsx, web/src/pages/Fleet.tsx, web/src/pages/Fleet.peerCard.dom.test.tsx, web/e2e/destination-config-receiver-fleet.spec.ts, web/dist/index.html — all FOUND
- Commits exist: f79b057c (Task 1), 1e0817c0 (Task 2), a54d676c (Task 3) — all FOUND in git log
