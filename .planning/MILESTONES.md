# Milestones

## v1.1 Mobile Interface (Shipped: 2026-09-15)

**Phases completed:** 4 phases, 26 plans, 39 tasks

**Key accomplishments:**

- Playwright e2e harness: exact-pinned @playwright/test 1.63.0 with 4 device projects that boot the compiled Go binary via webServer and pass the /api/health smoke — proven green on two full local runs.
- ONE pure nav registry (navModel.ts) now drives the desktop Sidebar with byte-identical hue-counter semantics, and useIsDesktop() lands the single (min-width: 48rem) breakpoint literal under a source-assert guard, with a guarded jsdom matchMedia stub wired in the same change
- PRIM-01 BottomSheet now lifts useConfirm's proven modal mechanism (portal, document-level Escape, FOCUSABLE_SELECTOR Tab trap, focus capture/restore) into a token-clean bottom-anchored sheet with the 85dvh/overscroll/safe-area viewport contract, and the nav.more key + IconEllipsis glyph exist across all 42 locale surfaces and the glyph family
- Safe-area custom properties + viewport-fit=cover, dvh-first mobile-correct login with 16px-effective inputs, and theme-color mirroring from paint() — all pinned by a 22-test source-assert suite with the FOUC script byte-guarded and the byte guard proven live
- The ONE SelectionTree gains an additive `interactionMode` prop — row tap toggles through the guarded Space pipeline, a dedicated >=44x44 labelled chevron expands — driven by a new `useIsCoarsePointer()` capability hook and pinned by touch dom twins plus a Playwright geometry gate on both mobile projects
- ONE useConfirm promise API now wears two faces — the desktop ConfirmDialog card byte-identically at/above 48rem, a fail-toned ConfirmSheet below it with the destructive control stacked away from the thumb — on a BottomSheet primitive extended additively (fullHeight, footer slot, 44px close, inset-clamped padding) and a scroller whose mobile gutter tightens to p-4
- The phone Home now reads glanceably in the maquette's four-block order and starts a Backup Everything pass from the thumb zone through a consequence confirm that lands the user inside the live run sheet - with desktop byte-identical and all four Playwright projects green.
- data-platform (material|cupertino) attribute layer — coerced bv-platform persistence through one applyPlatform choke point, --mob-* custom properties consumed below md, and a null-under-cupertino Fab — with UA-sniffing guard needles and desktop-untouched e2e proof.
- The mobile card language's shared primitives extracted and locked: MobileSectionLabel, useLoadMore (20/20 constant window), ListToolbar (sticky-in-flow search), and the phase's nine i18n keys pre-seeded across all 42 tables with the backup-confirm copy aligned to the one-at-a-time guard chain
- /settings below md swaps the 7-tab Selector for a scrollable accent-tonal chip strip bound to the SAME tab state, with the active tab's unchanged panels stacked full-width — desktop >=48rem byte-identical, proven by a new four-project e2e spec on the real binary.
- Carried 06-UI-REVIEW fixes landed and pinned, the spacing/weight discipline and six-route dual-direction desktop battery are machine-enforced, de/fr 320-360px sweeps cover every phase surface, and the phase closes green end-to-end (vitest 2446/2446, Playwright 287/0 on four projects, fresh committed web/dist, Go chain green).
- 08-UAT.md: the D-11 protocol a human executes on real hardware - six-cell device matrix with per-cell 48rem landscape derivations, origin-named inherited checklist (WR-01/WR-02/fix 1/themes/four-status/ForeignRestoreCard), and the dist-rebuild + BombVault-test-only redeploy runbook; VERIFY-02 stays honestly open until the session runs.

---

## v1.0 Tree-Based Sub-Folder Backup Selection (Shipped: 2026-09-11)

**Phases completed:** 4 phases, 15 plans, 30 tasks

**Known verification overrides:** 2 newly acknowledged, 0 carried forward from a prior close (see STATE.md Deferred Items)

**Key accomplishments:**

- Flat "!"-prefixed selection encoding with per-class maximal-root pruning: mixed tree selections store canonically in the existing backupPaths set (zero migration), readers classify includes vs explicit-none, and backups hand restic maximal-include positionals with zero derived --exclude flags
- GET /api/browse hardened into the tree's node listing: os.Root containment behind the unchanged lexical reject, additive status trio (ok/missing/restricted/error), 500-entry cap with truncated flag, and a pinned ?hidden=1 opt-in — FolderBrowser contract byte-identical.
- Restore selectors now map onto the CHOSEN snapshot's recorded Paths (two-pass longest-prefix) with per-path skips recorded as scrubbed run notes, empty intersections aborting before any destructive teardown, and the restic 0.17 positional behaviors the design relies on contract-pinned for CI.
- Mounts endpoint renders stored exclusions as a first-class host-form `excluded` array (never stale custom paths), and a tree-source deselect-everything is refused at the PATCH boundary with a machine-routable `code:"empty-selection"` — the backend half of INTEG-04, plus the roadmap-prescribed Key Decisions bookkeeping
- Stored exclusion branches are now enforced as restic `--exclude` patterns on the backup argv (positionals stay maximal-root includes), closing the gap where the engine backed up branches the UI advertised as excluded — plus the four planning-doc drifts realigned.
- TREE-06/D-06 outcome rows pinned by dom tests (retry refetch, truncated notice outside the tree, rejected promises settle) and the FoldersEditor save flow hardened with a one-deep serialized PATCH queue whose failure revert re-derives from the live mirror, plus the full D-04 zero-include block (shake + warn line, whole-item counting, coded-envelope backstop).
- The selection tree is now fully keyboard-operable per the APG TreeView checkbox variant (roving tabindex over the same flat model that renders, Space riding the exact click pipeline) with uniform lazy-node aria geometry, and the INTEG-01 seam is closed: sub-includes the server classifies as custom rows are absorbed under their reachable mount — one presentation per path — with the wire contract, D-04 guard, reopen cache, and 64-cap pinned through the real FoldersEditor.
- Per-root exclude-caches toggle persisted as a targets JSON map (migration v100) and compiled at backup time into restic's constant --exclude-caches flag through Mode threading, with atomic PATCH validation and nil-safe mounts serving
- Per-root "{n} paths" preview and collapsible "{n} exclusions" review list derived purely from the stored flat-selection mirror — zero new endpoints, zero new state sources (D-01, D-03, D-04).
- Reset-selection exit to auto-detection, a lastBackup-gated narrowing note, and the per-root CACHEDIR.TAG switch — all three riding the one-deep serialized PATCH queue, now generalized to compose a single body from two owed mutation classes.
- A file set's tree selection now compiles at backup time into maximal-root restic positionals with derived excludes at the single site — while a set never touched by the tree backs up byte-identically to before (NULL-column legacy switch, pinned by the untouched TestBackupFileSet).
- A file set's tree selection is now writable through PATCH — validated per entry against the resolved root before any store write, normalized, capped, refused when empty (D-06) — and an in-place restore whose snapshot contains none of what the set selects now aborts synchronously before tearing anything down (D-08).
- The Phase 2 SelectionTree mounts on every file-set card behind a Choose folders disclosure - one synthetic root seeded honestly from the NULL column, one-deep serialized saves with D-06 refusal on both halves, and 4 new i18n keys across all 42 locales.
- The file-set dialog now warns that a path edit clears the ticked selection, the exclusions review list is pinned onto the Files page's shared tree, and the phase gate is green end to end.

---
