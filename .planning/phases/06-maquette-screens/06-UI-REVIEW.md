# Phase 06 — UI Review (maquette-screens)

**Audited:** 2026-09-13
**Baseline:** 06-UI-SPEC.md (approved design contract) + design/mobile/README.md carbon language
**Screenshots:** Code-only auditor pass (no dev server at audit time; e2e/dom tests cited as behavioral evidence) **plus an orchestrator-side automated visual pass** against the real-binary Playwright harness — see "Automated Visual Verification" below.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All contracted keys shipped in en+de+42 locales, but `home.newBackupConfirm` diverges from the contracted verbatim sentence |
| 2. Visuals | 3/4 | Clear hierarchy and labeled controls throughout; touch chevron `aria-label` omits the row name the spec required |
| 3. Color | 3/4 | Token discipline excellent (closed tone union, offsite-blue token); one raw `bg-black/20` carried into new code |
| 4. Typography | 2/4 | New code introduces `font-medium` (500) in ≥5 places; run-detail stat tiles render `text-sm` not the contracted `text-heading font-semibold` |
| 5. Spacing | 2/4 | ~24 added 12px values (`gap-3`/`px-3`/`py-3`) across Phase 6 files — the spec's explicit "8/16 stops ONLY" scale decision is not met |
| 6. Experience Design | 4/4 | Loading/error/empty/destructive coverage is exemplary: fail-tone sheet with safe-default focus, shake-on-fail, visibility gate, deep-link latch |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Run-detail stat triad breaks the typography contract** — the spec's Typography table says stat tiles render `text-heading font-semibold tabular-nums` (20px/600); `RunDetailSheet.tsx:500,505,512` render `text-sm font-medium` (14px/500), collapsing the sheet's focal data row into body register and minting a third weight. Fix: change the three value spans to `text-heading font-semibold` and sweep the new `font-medium` uses (`RunDetailSheet.tsx:285`, `Containers.tsx` new line, stat tiles) to 400/600.
2. **12px spacing values across Phase 6 files** — the spec's "Phase 6 scale decision" states "No new 12px values (`gap-3`/`px-3`) in any Phase 6 file", yet ~24 were added (e.g. `RunDetailSheet.tsx:421,422,450,487`, `ConfirmSheet.tsx:82`, Containers/Files card rows `gap-3`, `Dashboard.tsx` mobile rows). Fix: normalize in-card gaps to `gap-2`/`gap-4` and `px-3` paddings to `px-4` (or `px-2`) in the Phase 6 files; keep the one documented `max(0.75rem, safe-area)` exception in StickyActionBar.
3. **Confirm copy and chevron label vs contract** — `home.newBackupConfirm` (i18n.ts:137) reads "…Containers are stopped and restarted. Restore keeps only what the next run saves." instead of the contracted "…stopped and restarted one at a time while their backup runs." (SCRN-01/Copywriting table); and the touch chevron label (`SelectionTree.tsx:638`) is bare "Expand"/"Collapse" where the spec requires the row-naming form ("{path} expand"). Fix: align the de/en strings to the contract (or amend the spec with a recorded deviation) and interpolate the path into the chevron `aria-label`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- Contracted keys all present and translated: `home.newBackup` (i18n.ts:136), `folders.handedToRestic` "{n} folders handed to restic" (i18n.ts:798, de at :2569 — invariant {n}, no plural fork, as contracted), `common.back` (:1214), `files.emptyRule` (:1685 — verbatim including the `{action}` interpolation of `files.deleteSet`), `nav.mobileNavigation` (:78), `common.expand`/`common.collapse` (:1210-1211). 42-locale parity is enforced by `i18n.parity.test.ts`.
- **Deviation:** `home.newBackupConfirm` (i18n.ts:137) does not match the contracted consequence sentence — the "one at a time while their backup runs" clause was replaced with a restore-oriented clause. The shipped copy is consequence-naming and arguably stronger, but the contract declared the en string verbatim; the change is unrecorded in the spec.
- Reuse discipline held: Save button = `folders.save`, cancel = `common.cancel`, tree errors reuse `folders.couldNotRead`/retry family, backend error text verbatim with `dir` handling (`RunDetailSheet.tsx:485-492`).

### Pillar 2: Visuals (3/4)
- Strong hierarchy: mobile Home renders the four contracted blocks in order (`Dashboard.tsx:2936-2938`) with section labels; every icon-only control carries a label (chevron `SelectionTree.tsx:638`, back row `Containers.tsx:1738` with container name + "Back", recent-run rows `Dashboard.tsx:2205`).
- Sticky bars, sheet footers, and stacked detail all reuse the established chrome language (`StickyActionBar.tsx:32` — sidebar surface + hairline; documented sticky-in-flow rationale, never `fixed`).
- **Finding:** chevron `aria-label` names the action only; SCRN-03 requires the "{path} expand/collapse" form (the checker had folded this in as dimension-2 recommendation). The file comment argues the treeitem names the path, but the contract text was explicit — warning, not blocker.
- **Additional finding (orchestrator visual pass):** the file-set editor header row overflows horizontally at 360px — the "Retirer" delete button is clipped at the right viewport edge (`Files.tsx:1661-1689`: `flex items-center gap-1.5` edit/delete pair + `ms-auto` backup button, no `flex-wrap`). Long French labels ("Modifier le jeu de dossiers") guarantee the overflow; English labels are shorter and mask it. Minor (no function lost, save bar unaffected), but a real narrow-viewport defect the e2e suite does not assert.

### Pillar 3: Color (3/4)
- Tokens only on every new control: fail-tone sheet via a closed tone union mapping to `bg-statusFailBg border-statusFailBorder` (`BottomSheet.tsx:106`), accent confined to the reserved list (Home trigger `Dashboard.tsx:3076-3089`, Save flush buttons `tone="accent"` `Containers.tsx:4327`/`Files.tsx:2287`, accentSoft next-run avatar + time chip `Dashboard.tsx:2147,2162`, count chip Badge `Containers.tsx:4324`), offsite identity on `text-statusOffsite` (`Dashboard.tsx` repo-health card) — never a fifth status hue.
- Destructive-on-control exception correctly re-declared at the site (`ConfirmSheet.tsx:83-90` bv-convention-exception).
- **Finding:** `RunDetailSheet.tsx:183` hard-codes `bg-black/20` in LogList. It is copied class-for-class from the existing `ActivityLog.tsx:390` (which the spec's monospace-register rule mandated "verbatim"), but the duplication now puts a raw non-token color in a second file. Fix: promote it to a token/engine class or accept the twin with a comment naming the origin.

### Pillar 4: Typography (2/4)
- Mono register correct: snapshot id `font-mono` + full id as `title` (`RunDetailSheet.tsx:512`), log timestamps `font-mono text-xs` + `tabular-nums` + `formatLogDate` (`RunDetailSheet.tsx:183-192`), counts `tabular-nums` in both Save bars.
- **Finding 1:** stat triad values at `text-sm font-medium` (`RunDetailSheet.tsx:500,505,512`) instead of the contracted `text-heading font-semibold` (20px/600). This is the sheet's data focal point; the contract named the exact token.
- **Finding 2:** new 500 weight in new code: `RunDetailSheet.tsx:285` (SheetActionRow), `:500/:505/:512` (tiles), plus the newly added `font-medium` lines in `Containers.tsx` and `FilterPopover.tsx` (git diff vs phase baseline 86b70d0e). Spec: "Weights: exactly 2 for all NEW code — regular 400 and semibold 600. No new 500s."
- Body/label registers (14px body, 12px meta, 11px captions via `MobileSectionLabel`/Badge) match the contract elsewhere.

### Pillar 5: Spacing (2/4)
- Contract wins: `PAGE_SHELL_RESPONSIVE` (`pageShell.ts:105` = `gap-6 md:gap-10`) on all three maquette pages; `main` at `p-4 md:p-6` (`Layout.tsx:295`); touch rows `min-h-[2.75rem]` everywhere (`SelectionTree.tsx:531,764`, `RunDetailSheet.tsx:285`, `Dashboard.tsx:2206`, save bars); chevron zone `h-11 w-11` (`SelectionTree.tsx:643`); TapPopover trigger floor `min-h-11 min-w-11` (`TapPopover.tsx:205`); safe-area insets via `max(1rem, var(--safe-area-*))` in BottomSheet (`:254,292,302`).
- **Finding:** the spec's explicit Phase 6 scale decision ("8/16 stops ONLY. No new 12px values (`gap-3`/`px-3`) in any Phase 6 file") is violated ~24 times in added lines: card internal rhythm `gap-3` (Containers/Files coverage cards, Dashboard mobile rows), `px-3 py-2.5` fail banners (`RunDetailSheet.tsx:450,487`), `px-4 py-3` footers (`ConfirmSheet.tsx:82`, `RunDetailSheet.tsx:421`), `grid-cols-2 gap-3` (`RunDetailSheet.tsx:422`). Not a layout breaker (12px reads fine), but it is a flat contradiction of a written contract clause and erodes the scale discipline the phase was supposed to close out (05 review finding 4).

### Pillar 6: Experience Design (4/4)
- Loading: `dashboard.checking` rows (`Dashboard.tsx:2144,2330`), save-bar spinner keyed to real PATCH state (`Files.tsx:1224`), ProgressBar in the live run section gated on visibility (`RunDetailSheet.tsx:234,530-536`).
- Error: tree errors with retry; failed flush toasts AND shakes via re-keyed shake nonce (`Containers.tsx:4319-4331`, `Files.tsx:2285-2297`); verify failure renders the scrubbed server reason (`RunDetailSheet.tsx:449-453`); failed runs render `runReason` with the `dir` contract.
- Destructive: fail-tone sheet (`ConfirmSheet`) with destructive on TOP, safe cancel bottom-most, initial focus on the sheet close (never the destructive control) — asserted in `ConfirmSheet.dom.test.tsx`; the sanctioned danger tone carries the documented exception.
- State integrity: PRIM-04 visibility gate (`useVisibilityGate.ts`, useSyncExternalStore, visible-default), fresh-success CheckDraw gate only for witnessed busy→success transitions (`RunDetailSheet.tsx:380-390`), deep-link re-arm latch (commit 6399720d), per-domain honest degradation (no dead browse/verify rows for domains without endpoints).
- E2E coverage exists for every contract behavior: `e2e/touch-tree.spec.ts`, `tap-popovers.spec.ts`, `home-trigger.spec.ts`, `maquette-screens.spec.ts`, `run-detail-visibility.spec.ts`, `narrow-viewport.spec.ts`, plus the max-md-leakage pass in `desktop-untouched.spec.ts`.

---

## Automated Visual Verification (orchestrator pass)

The auditor pass above is code-only. Per the ui-review workflow, the orchestrator additionally ran a live visual pass when browser automation was available, using the phase's own Playwright harness recipe (real `bombvault.exe`, fresh DB via `wipe-e2e-data.mjs`, `APP_KEY` of 64 zeros, `HTTP_ONLY=true`, `PORT=3000`), at a 360×800 viewport, with the e2e route-layer fixtures replayed (`/api/display-prefs` aborted so the seeded `fr` locale survives server reconciliation; container/mounts/browse/file-set/run fixtures as Go-JSON field-for-field shapes; `bombvault.advanced=1` seeded). Screenshots captured to the repo root were inspected then deleted — never committed.

**Captures inspected (6):**

| Capture | Verdict |
|---------|---------|
| Home 360px | ✓ Conforms — bottom bar 4 slots, 4-status badges, accent sticky trigger in the thumb zone, text-only offsite chip, accent recovery card; "Non planifié" on next-backup is a fixture-shape artifact (schedule payload not consumed by the card), not a rendering defect |
| Containers list 360px | ✓ Conforms — order chip with count, Monte/Descends order list, filter + select-all row, bulk bar, "2 Conteneurs · 2 Planifié" line, avatar cards with running badge |
| Containers tree 360px | ✓ Conforms — stacked detail, accent "Sauvegarder maintenant", touch tree with honest containment error row, CACHEDIR.TAG toggle + InfoBubble, sticky save bar with count line |
| Files tree 360px | ✓ Conforms except the editor header row overflow recorded as an additional Visuals finding above (Files.tsx:1661-1689) |
| More sheet 360px | ✓ Conforms — content-sized sheet (not fullHeight), accent "PLUS" chip, 44px close, scrim; only "Récupération" listed because every other destination is settings-gated off on a fresh DB (phase 5 `destinations()` contract, expected) |
| Desktop 1280px sanity | ✓ Conforms — sidebar rail intact, zero mobile blocks (no bottom bar, no stacked view, no full-width accent trigger), desktop summary-tile grid + activity journal + counter row; the 48rem width-only switch holds in both directions |

**`needs_human_review: true`** — the automated pass verifies structure, chrome, tokens, and defects against the spec; the feel-level judgments (brand warmth, motion quality, thumb ergonomics on real hardware) remain for the operator, and the phase 8 real-device validation is the scheduled venue for them.

---

## Registry Safety
Not applicable — no `components.json`, no third-party registries (project constraint: no UI kit). Confirmed against the spec's Registry Safety table.

## Freeze check
`web/src/lib/api.ts`, `web/src/lib/progress.ts`, `web/src/app/router.tsx`, and `internal/**` show no commits after the phase baseline — the frozen-file contract held.

## Files Audited
- `web/src/components/mobile/`: BottomSheet.tsx, BottomNav.tsx, ConfirmSheet.tsx, MoreSheet.tsx, RunDetailSheet.tsx, StickyActionBar.tsx, TapPopover.tsx (+ dom tests)
- `web/src/components/`: SelectionTree.tsx, FilterPopover.tsx, InfoBubble.tsx, ActivityLog.tsx, Button.tsx (tone surface)
- `web/src/pages/`: Dashboard.tsx (mobile Home blocks), Containers.tsx (stacked detail, Save bar), Files.tsx (coverage cards, Save bar)
- `web/src/lib/`: useVisibilityGate.ts, useConfirm.tsx, useMediaQuery.ts, pageShell.ts, i18n.ts, runDisplay.ts, activityLog.ts
- `web/src/app/Layout.tsx`, `web/src/index.css`
- `web/e2e/`: touch-tree, tap-popovers, home-trigger, maquette-screens, run-detail-visibility, narrow-viewport, desktop-untouched specs
