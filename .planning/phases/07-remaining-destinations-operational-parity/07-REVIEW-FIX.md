---
phase: 07-remaining-destinations-operational-parity
fixed_at: 2026-09-14T00:05:00Z
review_path: .planning/phases/07-remaining-destinations-operational-parity/07-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-09-14T00:05:00Z
**Source review:** .planning/phases/07-remaining-destinations-operational-parity/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (Critical + Warning; fix_scope=critical_warning)
- Fixed: 3
- Skipped: 0

All work ran in the main checkout on branch `docker-folders` (`workflow.use_worktrees: false` — no isolation worktree, per the documented opt-out).

## Fixed Issues

### WR-01: VMs mobile next-fire chip can show the wrong VM's (or the domain job's) next fire

**Files modified:** `web/src/pages/VMs.tsx`
**Commit:** da9d309e
**Status:** fixed — requires human verification (data-selection logic; the display correctness depends on backend schedule registration semantics, syntax/type checks cannot prove it)

**Applied fix:** `MobileVMsBlock` no longer feeds the chip `rows.find((r) => r.domain === "vms")` — with per-item overrides (#121) and the domain job wire-identical (`job: "backup"`, `domain: "vms"`, `NextRuns` sorted soonest-first), `find()` surfaced whichever row fired soonest. The block now filters the vms-domain rows and keeps state only when **exactly one** exists; with more than one the chip renders nothing and the card shows the cadence label alone (the review's interim frontend-only honesty: ambiguous never renders as a specific, possibly wrong, fire). No backend change — `internal/schedule/schedule.go` was read for confirmation only and stays untouched (frozen). The stale "one entry serves every card" comment was rewritten to document the ambiguity mechanism and the fallback.

**Verification:** `npx tsc --noEmit` clean; `npx vitest run` 2446/2446 green (VMs.test.tsx mocks `getScheduleNext` with `[]` — unaffected); targeted e2e `destination-vms-flash.spec.ts` passed on all four projects, including both mobile runs of "the server-derived next-fire chip follows an active override" (the spec stages exactly one vms row, so the single-row contract it pins still holds — the multi-row scenario remains IN-03's, routed elsewhere).

### WR-02: Files mobile Save bar outlives its editor under search; stale flush ref commits hidden edits

**Files modified:** `web/src/pages/Files.tsx`
**Commit:** 4bced30d
**Status:** fixed — requires human verification (state-lifetime logic across two components)

**Applied fix:** Both halves of the review's fix, with one deliberate tightening. (1) The page now derives `expandedVisible = expandedSetId !== null && visibleSets.some((s) => s.id === expandedSetId)` and the mobile Save bar gates on it in addition to `expandedSet !== null && expandedSet.path !== ""`. The review suggested `matchedSets`; `visibleSets` (the load-more window the editor actually mounts in) is used instead — it is the exact mount set, so it also covers the case where a search reset drops the expanded set beyond the pagination window. A search that hides the expanded set now unmounts its editor AND its bar together, including over the zero-match card. (2) `FileSetFoldersEditor`'s per-render `flushRef` assignment gained an unmount cleanup that nulls the ref, so a stale Save press after the editor is gone no-ops (`saveFlushRef.current?.()`) instead of flushing the discarded queue through the surviving mirror refs. The flushRef/onSaveState prop docs were updated to record the contract.

**Verification:** `npx tsc --noEmit` clean; `npx vitest run` 2446/2446 green; eslint clean on the file. No targeted e2e exists for the Files mobile Save bar + search interaction (the maquette-screens Save-bar tests target the /containers FoldersEditor, and no Files spec expands a set under a search filter), so per the verification discipline this fix rests on tsc + unit tests + review of the mount/unmount ordering (unmount cleanup runs before the next editor's assign in the same commit, so editor-to-editor handoffs keep the ref populated).

### WR-03: Flash mobile hero claims "never backed up" while the snapshot list is still loading

**Files modified:** `web/src/pages/Flash.tsx`
**Commit:** 38161c89
**Status:** fixed

**Applied fix:** The mobile hero's last-backup line renders `loading ? t("dashboard.checking") : newest ? formatTs(newestUnix) : t("containers.never")` — the exact shape from the review, mirroring the desktop hero's `{loading && checking}` paragraph (Flash.tsx:506) and `MobileConfigBlock`'s `lastRunLine` (Config.tsx:847-856). The status Badge directly beneath made the identical false "Never" claim while loading, so it got the same gate (`loading ? checking : never` in the neutral arm), matching Config's `statusBadge` precedent — both surfaces of the hero card now claim "never" only once the list has settled empty. No new i18n keys (reuses `dashboard.checking` / `containers.never`, already in all locales).

**Verification:** `npx tsc --noEmit` clean; `npx vitest run` 2446/2446 green; targeted e2e `destination-vms-flash.spec.ts` passed, including both mobile runs of "mobile /flash: hero card, snapshot pagination, tonal download entries" (its `Last backup: <time>` assertion exercises the loaded state, which is byte-identical to before).

## Skipped Issues

None — all in-scope findings were fixed.

## Out-of-scope (not attempted, per fix_scope=critical_warning)

- IN-01 (Flash Fab gate parity on failed settings fetch), IN-02 (MobileZipSheet one-shot `loaded` gate), IN-03 (wire-inaccurate schedule-next e2e fixtures) — routed elsewhere by the orchestrator. Note for whoever takes IN-03: the WR-01 interim keeps the existing single-row fixtures green, but the "two vms-domain rows assert each card's own fire" scenario it proposes cannot pass until the backend gives `NextRun` a per-item identity (WR-01's frontend cannot match rows it cannot distinguish — with two rows the interim correctly hides the chip instead).

## Commits

| Commit | Finding |
|--------|---------|
| da9d309e | fix(07): WR-01 VMs next-fire chip renders only when the payload is unambiguous |
| 4bced30d | fix(07): WR-02 scope the Files mobile Save bar to the visible editor, no-op a stale flush |
| 38161c89 | fix(07): WR-03 Flash mobile hero reports checking while the snapshot list loads |
| 94562d1f | fix(07): rebuild web/dist after review fixes (tracked half = index.html entry reference; assets gitignored, per `chore(05)` precedent) |

## Verification summary

Where gates ran: **main checkout** (`D:\code\bombvault`, branch `docker-folders` at 38161c89 + dist commit) — no isolation worktree.

- `npx tsc --noEmit` (web): clean after each fix.
- `npx vitest run`: 109 files / 2446 tests, all passing (run after WR-01 and again after WR-02+WR-03).
- `npx eslint src/pages/Flash.tsx src/pages/VMs.tsx src/pages/Files.tsx`: clean.
- `go build ./...`: clean (frozen-tree sanity; no Go sources touched).
- Targeted e2e: `npx playwright test e2e/destination-vms-flash.spec.ts` against a fresh `npm run build` dist embedded in a rebuilt `bombvault.exe` — **14 passed / 14 skipped, exit 0** (13.7m, all four projects). Full suite intentionally not run (phase tail gate).
- `go vet`/`gofmt`/`golangci-lint` not run separately: no Go files changed.

---

_Fixed: 2026-09-14T00:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
