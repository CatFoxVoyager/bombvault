---
phase: 7
plan: 3
subsystem: ui
tags: [mobile, more-screen, destinations, vms, flash, e2e, d-01-double-gate]
requires:
  - 07-01 (mobile language primitives: glim cards, Fab, BottomSheet, ListToolbar, useLoadMore)
  - 07-02 (Containers mobile block: the FLOW-03 deep-link + latch precedent this plan mirrors)
provides:
  - VMs mobile card block (gate, toolbar, cards, trigger deep-link, schedule sheet, load-more)
  - Flash mobile hero block (gate, hero card, snapshot pagination, zip-export toggle sheet)
  - Staged mobile e2e for both destinations + desktop dual-direction guard
affects:
  - 07-04..07-08 (remaining destination blocks follow this plan's shape verbatim)
tech-stack:
  added: []
  patterns:
    - D-01 double gate (desktop JSX always rendered under max-md:hidden + mobile block behind !isDesktop)
    - component-local RunDetailSheet with sheetDismissed latch (Containers.tsx MobileContainerDetail verbatim)
    - Fab firing the page's ONE accent action through the shared watcher (fireRef)
    - route-staged Go-JSON e2e fixtures (the maquette staging model)
key-files:
  created:
    - web/e2e/destination-vms-flash.spec.ts
  modified:
    - web/src/pages/VMs.tsx
    - web/src/pages/Flash.tsx
    - web/src/pages/VMs.test.tsx
    - web/src/pages/Flash.desktop.dom.test.tsx
    - web/dist/index.html (build artifact refresh, see Deviations)
key-decisions:
  - Mobile blocks are per-page components (MobileVMsBlock / MobileFlashBlock) behind the D-01 gate; desktop JSX stays byte-identical and always rendered (max-md:hidden) so desktop fetch discipline is unchanged.
  - The VM schedule sheet restricts CadenceBuilder to EXACT_CADENCE_MODES (off/daily/weekly/cron) and PATCHes the raw libvirtName, matching the backend's per-item override contract (#166).
  - Flash's Fab and hero trigger are ONE action - the Fab fires the hero's own useBackupWatch watcher through fireRef, preserving the surface's single accent reservation.
  - e2e stages the VM/flash/settings/schedule/runs domains at the route layer (Go-JSON shapes field-for-field) because a fresh harness DB can never hold a VM or flash snapshots; SPA, binary and routes are real.
requirements-completed: [MORE-01, FLOW-01, LISTS-01, PLAT-01]
actuals:
  tokens: 24050
  tasks: 3
  commits: 3
duration: 1h 51m
completed: 2026-09-13
status: complete
---

# Phase 7 Plan 3: VMs & Flash Mobile Destinations Summary

VMs and Flash join the mobile card language: per-VM cards with the FLOW-03 trigger deep-link into a component-local RunDetailSheet, a fullHeight CadenceBuilder override sheet, server-derived next-fire chips and 20/20 load-more; a Flash hero card with snapshot pagination and a zip-export toggle sheet riding the existing settings write chain - all behind the D-01 double gate, pinned by dom-twin tests and a 7-scenario staged e2e.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | VMs mobile block | 828c9f20 | web/src/pages/VMs.tsx, web/src/pages/VMs.test.tsx |
| 2 | Flash mobile block | 163706cc | web/src/pages/Flash.tsx, web/src/pages/Flash.desktop.dom.test.tsx |
| 3 | Staged mobile e2e | 5e4c6b0b | web/e2e/destination-vms-flash.spec.ts (+ web/dist/index.html refresh) |

## What Was Built

- **VMs mobile block** (MORE-01a): gate-off honesty card (hint + settings link, nothing else), summary counts line ("40 VMs · 40 Scheduled"), ListToolbar with lifted search + chip filters + sort, per-VM cards (monogram header, combined last-backup line, accent trigger, tonal schedule entry + restore/snapshots entries), trigger deep-link with the sheetDismissed latch, fullHeight schedule sheet (exact-cadence modes only, explicit Cancel/Done, raw libvirtName PATCH), 20/20 load-more with reset-on-identity, Discover Fab.
- **Flash mobile block**: gate-off card, hero card (title, last-backup line, relative-age badge, OffsiteIndicator, accent trigger, progress bar), snapshot rows (mono id slice + localized time, tonal download/delete - never accent), 20/20 load-more, zip-export tonal entry reusing FlashZipExportCard's single serialized putSettings chain, Fab firing the shared watcher.
- **Desktop dual-direction**: dom twins (VMs.test.tsx / Flash.desktop.dom.test.tsx) pin the jsdom desktop identity - max-md:hidden present, mobile block never mounted, desktop list unwrapped; the e2e pins the >=48rem direction on desktop-1280 AND desktop-768 (no schedule rows, no Load more, no summary line, no `button.h-13.bg-accent` Fab signature).
- **Staged e2e** (7 scenarios x 4 projects = 28 green): populated list + window + search reset; deep-link + never-reopen latch; override sheet + PATCH assertion; next-fire chip text pinned via `test.use({ locale: "en-US" })`; gate-off absences-then-link; flash hero/pagination/tonal-entries; desktop dual-direction. Payloads staged route-level (Go-JSON field-for-field) because a fresh harness DB can never hold a VM; display-prefs aborted to keep default English labels.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] web/dist/index.html refreshed in the Task 3 commit**
- **Found during:** Task 3 (e2e run)
- **Issue:** The served SPA is embedded in bombvault.exe (web/embed.go); dist predated the Task 1-2 source commits, so the e2e would have run against an SPA without the mobile blocks. CLAUDE.md's web-build rule requires rebuilding (and committing) web/dist after any web/ change.
- **Fix:** `npm run build` + `go build ./cmd/bombvault` before the e2e; the rebuilt `web/dist/index.html` (new asset hashes) is committed with Task 3. Outside the plan's declared file list - logged here per the deviation protocol.
- **Files modified:** web/dist/index.html
- **Commit:** 5e4c6b0b

**2. [Rule 1 - Bug, test-side] e2e run target used the display name**
- **Found during:** Task 3 (first e2e run: deep-link test failed on both mobile projects)
- **Issue:** The staged run's `target` was the display name ("vm-00"), but MobileVMCard passes `vm.libvirtName` into VMBackupButton and the backend records the run's target as that raw identifier - matchRun (`r.target === libvirtName`) never correlated, so the sheet never opened. Also: the gate-off Settings link collided strict-mode with the mobile bottom-nav's Settings tab.
- **Fix:** Staged run target = "id-00" (and sheet title "Backup · id-00"); Settings link scoped to `#bv-main`. Re-verified green.
- **Files modified:** web/e2e/destination-vms-flash.spec.ts
- **Commit:** 5e4c6b0b

### Process notes (not code deviations)

- Windows Playwright teardown hang (STATE.md blocker) recurred on all three runs: tests completed, the webServer survived; `bombvault.exe` + playwright node processes were killed manually after each run. Output was never piped through `tail` (only `2>&1`), and the line reporter's inline failure blocks were used as the green/red signal.
- eslint does not lint `web/e2e/` (existing project scope - same for all e2e specs); the four src files lint clean.

## Verification

- `npx playwright test e2e/destination-vms-flash.spec.ts`: 28/28 green across desktop-1280, desktop-768, mobile-iphone, mobile-android (fresh binary + fresh dist).
- `npx vitest run src/pages/VMs.test.tsx src/pages/Flash.desktop.dom.test.tsx`: 8/8 green.
- `tsc --noEmit` (via `npm run build`): clean; eslint on the four src files: clean; gofmt untouched (no Go changes).
- Source checks: no IntersectionObserver in either page; the only settings writes are the api.ts setters (setVMScheduleCadence, putSettings via the shared FlashZipExportCard chain); restore/download entries carry no accent classes.

## Known Stubs

None.

## Notes for Successor Plans

- The 07-04..07-08 destination blocks should copy MobileVMsBlock's shape (gate -> toolbar -> cards -> deep-link -> load-more -> Fab -> component-local RunDetailSheet) rather than inventing structure; MobileFlashBlock is the variant when the surface has a hero instead of a list.
- The e2e staging helpers (stageVmsDomain / stageFlashDomain / settingsBody) are the template for the remaining destinations' specs; `test.use({ locale: "en-US" })` + Node-side `toLocaleString("en-US")` is the pattern for pinning any localized-text assertion.
- Shared-label surfaces MUST use `.filter({ visible: true })` in mobile e2e - the desktop DOM stays in the page (hidden) under D-01.
