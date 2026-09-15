# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Tree-Based Sub-Folder Backup Selection

**Shipped:** 2026-09-11
**Phases:** 4 | **Plans:** 15 | **Sessions:** ~15 plan executions (orchestrator + subagent per plan)

### What Was Built
- One normalization contract (`internal/api/selection.go`) over the unchanged flat `backupPaths` set — bare + `!`-prefixed entries, maximal-root positionals, descendant exclusions enforced as restic `--exclude` at the single `BackupDeps.Excludes` site; zero migration for deployed instances
- One tree component (`SelectionTree.tsx` + `selectionTree.ts`) powering container mounts AND file sets — lazy tri-state nodes derived purely from the (includes, exclusions) sets, full APG keyboard operation, D-04/D-06 zero-include guards, one-deep serialized PATCH queue with live-mirror revert
- `/api/browse` hardened into the tree's node listing: os.Root containment, status trio (ok/missing/restricted/error), 500-entry cap + truncated flag, pinned `?hidden=1`
- Restore safety: selectors map onto the chosen snapshot's recorded Paths (two-pass longest-prefix), empty intersections abort before destructive teardown, per-path skips as scrubbed run notes; restic 0.17 positional behaviors contract-pinned for CI
- Trust controls: per-root "{n} paths" preview agreeing with restic positionals, reviewable exclusions disclosure, fail-tone confirmed Reset exit, per-root CACHEDIR.TAG toggle → `--exclude-caches` (migration v100)
- File sets parity: three-state pointer PATCH (absent/[]/list, 64-cap, containment), path-edit clear-wins to SQL NULL, NULL-seeded synthetic root with zero writes, D-08 in-place restore guard

### What Worked
- Keystone-first ordering: Phase 1 proved maximal-roots ↔ restic positional targets end-to-end (engine + tests, no UI) before any component existed — Phases 2-4 became assembly, never re-litigation
- The zero-second-implementation lock held by construction: additive-optional props on `SelectionTree` let Phase 4 mount the exact Phase 2/3 component; the integration checker found no duplicated "!" logic in `web/src`
- Locked decisions written once (CONTEXT.md → PROJECT.md Key Decisions) — plans across 4 phases never re-argued the encoding, the queue, or the persistence format
- Contract-pinning hostile behaviors (restic excludes-with-positionals, os.Root escapes) as tests that skip locally and prove on CI kept Windows dev honest without weakening Linux CI

### What Was Inefficient
- GSD frontmatter field-name drift: `requirements-completed:` (dash, not underscore) defeated repeated `summary-extract` queries before a direct grep settled it
- The deferred-items CLI writer rejects this repo's heading-delimited shape (#3457): two failed acknowledge attempts before reading the scanner source and editing the files directly (bare `Status:` value + HTML-comment annotation)
- The milestone-complete CLI archives an audit named `v{version}-MILESTONE-AUDIT.md`; the file was first written as `v1-MILESTONE-AUDIT.md` and needed a manual `mv`
- All four phase VALIDATION.md files closed as nyquist `draft` (tracked as tooling debt, not phase failures) — nothing during execution forces the nyquist pass until audit time

### Patterns Established
- Three-state pointer fields for selection PATCH bodies: absent = untouched, `[]` = coded refusal, list = atomic validated overwrite — explicit shape beats payload sniffing
- One-deep serialized save queue per editor; failure reverts re-derive from the live mirror by set-difference inverse, never a captured snapshot
- Node classification from stored sets only — collapsed/never-loaded subtrees classify correctly with zero browsing
- Exclusions are a distinct class in the flat set: never positionals, never derived flags except at the single `BackupDeps.Excludes` enforcement site
- deferred-items entries carry a bare `Status:` value (strict equality in the scanner) with explanations in HTML comments

### Key Lessons
1. Proving the riskiest seam first (selection encoding ↔ restic argv) without UI cost the least and de-risked everything after — the tracer-first instinct is correct for contract-heavy features
2. Compatibility locks (zero migration, flat set) paid for themselves: every phase was additive because the storage format never moved
3. When tooling rejects a file shape, read the scanner/parser source — the canonical format lives in code, not docs
4. UI semantics that document a backend guard (INTEG-04) belong on the same phase boundary as the guard; splitting them across phases leaves a requirement artificially "partial" at every intermediate verification

### Cost Observations
- Model mix: not tracked (executions dispatched to subagents with inherited model)
- Sessions: ~15 plan executions + audit + closeout
- Notable: keystone-first kept re-planning at zero; the only rework in the milestone was review-driven gap closure (01-05 exclusion enforcement), absorbed inside its phase

---

## Milestone: v1.1 — Mobile Interface

**Shipped:** 2026-09-15
**Phases:** 4 | **Plans:** 26 | **Sessions:** ~30 plan executions + 6 quick tasks + audit + closeout (fully autonomous /gsd-autonomous run)

### What Was Built
- Playwright e2e harness (VERIFY-01): exact-pinned @playwright/test 1.63.0, 4 device projects (desktop-1280/768, mobile-iphone/android) booting the real compiled Go binary with a fresh DB per run — the verification spine of every later phase and the 659/659 milestone tail gate
- ONE mobile shell: single 48rem chrome switch (`Layout.tsx` h-dvh), `navModel.ts` registry driving Sidebar AND BottomNav/MoreSheet, BottomSheet/ConfirmSheet/TapPopover/StickyActionBar primitives, safe-area + dvh + iOS keyboard correctness, FOUC script byte-guard
- Maquette screens: glanceable Home with thumb-zone backup trigger (consequence confirm → live run sheet), touch selection tree (interactionMode), tap popovers, RunDetailSheet with frozen-API stat tiles + useVisibilityGate reconcile
- Remaining destinations: VMs/Flash/Config/Receiver/Fleet/Settings in the mobile card language — TimePicker/CadenceBuilder/notify/offsite full-screen sheet editors, tonal chip-strip Settings nav, list ergonomics (useLoadMore, sticky search), `data-platform` material|cupertino chrome layer
- Guided restore end-to-end on mobile (D-01 double gate, guard-chain narration, ConfirmSheet-gated restores) closed by the D-11 real-device session: Android cells + Procedure R PASS, VERIFY-02 satisfied, iPhone dispositioned Android-only
- Security posture: 4/4 phases verified, threats_open 0, ASVS L1 (12-threat phase-5 register incl. the npm supply-chain legitimacy gate); nyquist 4/4 COMPLIANT; milestone audit 29/29 requirements, integration checker PASS (11 seams)

### What Worked
- The harness first: shipping Playwright in phase 5 wave 1 turned "does it work on mobile?" into a CI assertion — every phase had its net, and the milestone tail gate re-proved all four phases in one green run
- `desktop-untouched.spec.ts` dual-direction leakage needles made the byte-identity constraint machine-enforced from day one — zero end-of-milestone "desktop broke" surprises, across 231 commits
- Locked decisions from planning never re-litigated: one breakpoint (source-asserted DESKTOP_QUERY), one nav registry, frozen `api.ts`/`router.tsx`/`internal/**` — the integration checker confirmed zero second implementations
- Per-cell 48rem landscape derivations in the e2e specs made the D-11 device session confirmatory: no unexpected discrepancies on real hardware
- Retroactive reconciliation of phases 5–6 VALIDATION/SECURITY at audit time found 0 gaps — plans had carried their `<automated>` verifies and threat models from the start

### What Was Inefficient
- The verify:post hook ran for phases 7–8 only; phases 5–6 left VALIDATION/SECURITY stubs that needed retroactive reconstruction at audit time (correct outcome, avoidable cost)
- audit-open flagged two stale post-D-11 markers (08-VERIFICATION `human_needed` frontmatter, 08-UAT with no frontmatter at all): the scanner reads frontmatter tokens, not body verdicts — three doc commits to sync what was already consigned in-body
- Phase 6 UI review scored 17/24 and needed three corrective quickplans; no formal re-score was recorded — fixing findings mid-phase (as 7 and 8 did) beats re-auditing after
- Seven integration/guard SUMMARYs carry no `one_liner`, so summary-extract under-reports; their accomplishment text lives in the audit's traceability section instead

### Patterns Established
- Responsive identity is machine-pinned: ONE breakpoint constant, ONE navModel registry, ONE Layout switch — each under a source-assert or e2e loop
- `max-md:`-scoped-only class additions keep desktop DOM byte-identical by construction; mobile-only behavior gates on `useIsDesktop` (D-01 double-gate family)
- `data-platform` attribute layer: Material 3 / HIG translate the chrome only — same information architecture beneath
- Device sessions execute a written protocol (08-UAT.md: matrix cells, inherited checklist, redeploy runbook) — human verdicts stay auditable and scanner-readable
- Harness hygiene: fresh DB, `HTTP_ONLY=true`, throwaway APP_KEY, gitignored artifact dirs — no real secret ever enters the test env

### Key Lessons
1. Build the verification net before the feature wave it protects; a harness shipped late protects nothing
2. A byte-identity constraint only holds if asserted at every phase boundary, not checked once at the end
3. Per-phase hooks (verify:post) exist to prevent audit-time archaeology — run them every phase; retroactive reconciliation works but is the expensive path
4. Frontmatter status tokens are the tooling contract — update `status:`/`score:` the moment a verdict lands (D-11), not at closeout
5. Writing the device protocol for a human executor made the real-hardware session delegable, bounded, and fully consigned — the honest-labeling section carried the iPhone limitation without blocking the milestone

### Cost Observations
- Model mix: not tracked (subagent executions inherit the active model — glm-5.3-flash this milestone)
- Sessions: ~30 plan executions + 6 quick tasks + audit + closeout, one continuous autonomous run
- Notable: only user pauses were designed checkpoints (D-06 reviews, D-11 device session); zero unplanned stops — the locked-decision discipline from v1.0 carried over intact

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~15 | 4 | Keystone-first decomposition; locked-decision docs reused across phases without re-litigation |
| v1.1 | ~36 | 4 | Harness-first verification: the Playwright real-binary e2e net shipped in wave 1 gated every later phase; responsive identity machine-pinned (one breakpoint, one nav registry, byte-identity needles) |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | — (not aggregated; all phases green incl. 04-UAT 22/22, 53/53 requirement checks) | — | 0 (stdlib + existing toolchain only) |
| v1.1 | vitest 2481 + e2e 659/659 (milestone tail gate at HEAD, 4 device projects) | — | 0 new runtime deps (@playwright/test is an exact-pinned devDependency) |

### Top Lessons (Verified Across Milestones)

1. **Read the scanner/parser source when tooling rejects a format** (v1.0) — re-confirmed in v1.1: audit-open reads frontmatter tokens, not body prose; the deferred-items writer and the UAT scanner both had their canonical contract in code
2. **Locked decisions prevent re-litigation** (v1.0) — held across a 4× larger milestone: 26 plans, one breakpoint, one nav registry, frozen API/router surfaces, zero second implementations found by the integration checker
3. **Build the verification net before the wave it protects** (v1.1, new) — the harness shipped in phase 5 wave 1 made every later "does it still work" question a CI assertion
4. **Run per-phase hooks every phase** (v1.1, new) — skipping verify:post on phases 5–6 converted into audit-time archaeology; retroactive reconciliation worked, but is the expensive path
