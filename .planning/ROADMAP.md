# Roadmap: BombVault

## Milestones

- ✅ **v1.0 Tree-Based Sub-Folder Backup Selection** — Phases 1-4 (shipped 2026-09-11)
- ✅ **v1.1 Mobile Interface** — Phases 5-8 (shipped 2026-09-15)

## Phases

<details>
<summary>✅ v1.0 (Phases 1-4) — SHIPPED 2026-09-11</summary>

- [x] **Phase 1: Selection Engine & Restore Safety** (5 plans) — Selections normalize losslessly into the unchanged flat `backupPaths` set, node listings are cheap and containment-safe, and restores survive selection changes — the risky keystone (maximal-roots ↔ restic positional targets) proven end-to-end before any UI. Full details: `.planning/milestones/v1.0-phases/01-selection-engine-restore-safety/`
- [x] **Phase 2: Container Panel Tree Selection** (3 plans) — In the container panel, users can unfold any discovered mount or custom path and pick subfolders with cascade semantics, mixed-state parents, and full keyboard access — and what they see on reopen is exactly what they left. Full details: `.planning/milestones/v1.0-phases/02-container-panel-tree-selection/`
- [x] **Phase 3: Selection Trust & Controls** (3 plans) — Users can see and control exactly what a selection will back up — per-mount effective-selection preview with narrowing note, reviewable exclusions, defined deselect-everything semantics, and a per-root CACHEDIR.TAG toggle. Full details: `.planning/milestones/v1.0-phases/03-selection-trust-controls/`
- [x] **Phase 4: File Sets Parity** (4 plans) — Choosing what a File Set covers uses the same collapsible tree with the same cascade/mixed-state/persistence semantics — file sets gain sub-folder granularity with zero second implementation of selection. Full details: `.planning/milestones/v1.0-phases/04-file-sets-parity/`

</details>

<details>
<summary>✅ v1.1 Mobile Interface (Phases 5-8) — SHIPPED 2026-09-15</summary>

- [x] **Phase 5: Mobile Shell & Navigation Foundation** (6 plans) — One quarantined 48rem breakpoint decision swaps the Sidebar for the bottom bar + More sheet with safe-area, viewport-height, and keyboard correctness; ONE nav registry feeds every chrome; the Playwright harness (4 device projects over the real compiled binary) gates responsive regressions from day one. Full details: `.planning/milestones/v1.1-phases/05-mobile-shell-navigation-foundation/`
- [x] **Phase 6: Maquette Screens** (7 plans) — The design bible's core surfaces live on a phone: glanceable Home with the thumb-zone backup trigger, touch selection tree, tap popovers, fail-tone ConfirmSheet, and run detail with visibility-aware live progress — desktop byte-identical above the breakpoint. Full details: `.planning/milestones/v1.1-phases/06-maquette-screens/`
- [x] **Phase 7: Remaining Destinations & Operational Parity** (8 plans) — VMs, Flash, Config, Receiver, Fleet, and Settings in the mobile card language: sheet editors, schedule/notification/replication parity, list ergonomics, and the M3/HIG platform-adaptive chrome — no desktop-only settings remain. Full details: `.planning/milestones/v1.1-phases/07-remaining-destinations-operational-parity/`
- [x] **Phase 8: Guided Restore & Real-Device Verification** (5 plans) — The guided restore flow runs end-to-end from a phone on proven primitives, closed by the D-11 real-device session (Android cells + Procedure R PASS, VERIFY-02 satisfied; iPhone dispositioned Android-only), with 42-locale i18n, ≥44px touch targets, and both themes verified. Full details: `.planning/milestones/v1.1-phases/08-guided-restore-real-device-verification/`

</details>
