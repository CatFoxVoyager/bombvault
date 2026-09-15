---
phase: quick
plan: 260914-k2r
subsystem: web-spa-mobile-layout
tags: [mobile, layout, sticky-action-bar, files, dashboard, destructive-tone, max-md, ui-review-lot2]
requires:
  - web/src/pages/Files.tsx (FileSetRow, mobile list, Save bar)
  - web/src/pages/Dashboard.tsx (New-backup bar)
  - web/src/components/mobile/StickyActionBar.tsx (last-direct-child contract, header lines 10-17)
  - web/src/components/Button.tsx (tone table, danger entry)
provides:
  - P1-13 — single set-name header on mobile Files (expanded row defers to the MobileFileSetCard above)
  - P2-14 — Remove set reads destructive below 48rem via the shared Button danger tone (desktop byte-identical)
  - P1-11/P1-12 — measured dispositions: both sticky bars re-verified against the Containers last-child pattern, evidence recorded, NOTHING moved
affects:
  - Files > Ordres de sauvegarde at 390px (expanded set: one name header; destructive action visually distinct from CTAs)
  - Desktop rendering of every touched surface (unchanged by construction — class addition max-md:-scoped; tone gate keys on useIsDesktop)
tech-stack:
  added: []
  patterns:
    - max-md:-scoped-only class addition (desktop DOM/render byte-identical)
    - useIsDesktop-gated component prop (D-01 double-gate family) for a mobile-only tone
    - verify-first reconciliation of live-measured review findings against the source tree (both branches fully specified)
key-files:
  created: []
  modified:
    - web/src/pages/Files.tsx
    - web/dist/index.html
decisions:
  - "P1-11/P1-12 disposition: source-verified 2026-09-14 — both StickyActionBars are ALREADY the last visible direct child of their PAGE_SHELL_RESPONSIVE column (Files.tsx bar gate at 2417 inside the root opened at 2098; Dashboard.tsx bar 3079-3094 inside the root opened at 2768), with the Containers.tsx:4401 comment's exact contract. The measured geometry (bar overlapping the STORAGE card at rest; scrollH 1439 / clientH 787) is normal PINNED-sticky behavior, not mid-page nesting. Nothing moved — a no-op JSX shuffle would churn desktop-identity risk for zero effect."
  - "P2-14 uses Button.tsx's EXISTING tone='danger' (bg-statusFailSolid/text-carbon-background — the ConfirmDialog recipe adopted into the tone table), gated tone={isDesktop ? 'accent' : 'danger'} (Files.tsx:1714) because desktop >48rem identity is a non-negotiable constraint; jdp's 'Keine Sonderfarbe' ruling is rewritten as a scoped decision (desktop clause kept true), not deleted."
  - "No new locale keys, no npm dependencies, no backend, no Layout.tsx changes (scroll-padding on main#bv-main out of scope by the two-file constraint)."
metrics:
  duration: 12min
  completed: 2026-09-14
status: complete
actuals:
  tokens: 2300
  tasks: 3
  commits: 2
---

# Quick Task 260914-k2r: Review UI mobile lot 2/3 — barres sticky + éditeur Files (P1-11..P2-14) Summary

Fixed the two actionable 390px findings in Files.tsx — expanded-set name rendered twice, and the destructive Remove-set action wearing the primary-CTA accent — and closed the two geometric findings (P1-11/P1-12) with source-verified evidence: both sticky bars already satisfy the Containers last-direct-child contract, so nothing was moved.

## P1-11/P1-12 dispositions (verify-first — NOTHING moved)

The review brief's structural claim ("sticky bar nested mid-page, NOT the last visible child — move it per the reference pattern") is contradicted by the current source tree. Verification, done at execution time against content anchors (not the brief's line numbers):

**P1-11 — Files Save bar (CONFORMANT, no move):**
- The bar block (`{!isDesktop && expandedVisible && expandedSet !== null && expandedSet.path !== "" && (<StickyActionBar className="md:hidden">`) sits at Files.tsx:2417, a DIRECT JSX child of the `<div className={PAGE_SHELL_RESPONSIVE}>` root opened at Files.tsx:2098 and closed at the component's end. No wrapper between bar and root.
- Placement: AFTER the whole mobile list block (opens 2291, closes 2408 — the expanded FileSetRow renders inside it), BEFORE the RunDetailSheet portal (2448) and FileSetDialog portal (2460). The portals render nothing in-flow when closed, so the bar IS the column's last VISIBLE child — exactly the Containers.tsx:4401 contract ("the page column's LAST visible child, so its sticky positioning resolves against main#bv-main — Pitfall 3") and the components/mobile/StickyActionBar.tsx header contract (lines 10-17, "WHY THE LAST DIRECT CHILD OF THE PAGE COLUMN").
- Action taken per plan (conformant branch): extended the bar's comment with the why-last-child paragraph (Files.tsx:2403-2419), citing both reference contracts and recording the verification date.

**P1-12 — Dashboard New-backup bar (CONFORMANT, no change):**
- Bar block at Dashboard.tsx:3079-3094, a DIRECT child of the root opened at 2768, last content child before `{confirmDialog}` (3095); RunDetailSheet (3060-3069) is a portal, nothing in-flow when closed. Its comment (3071-3078) ALREADY documents "the LAST DIRECT CHILD of the page column — sticky resolves against main#bv-main, so nothing may wrap it" — the full StickyActionBar.tsx:10-17 contract in compressed form; nothing missing, left untouched per plan.
- Task 3 verify passed on the no-change branch: `git diff --quiet -- src/pages/Dashboard.tsx` true + `grep -c 'LAST DIRECT CHILD' >= 1` (1 hit). No commit.

**Padding-bottom check (orchestrator constraint — both pages):** no fix needed, and none would be legitimate here. StickyActionBar is `sticky bottom-0` IN-FLOW (the phase-5 discipline: never position:fixed) — it reserves its own box at the end of the column, so at scrollTop max the bar rests at its natural in-flow position and the content above it is fully visible; nothing is ever covered at max scroll. The measured overlap (bar over the STORAGE card / Back up now at scrollTop=0, main scrollH 1439 vs clientH 787) only occurs mid-scroll while the bar is pinned over content it has not yet reached — the definition of a correctly pinned sticky bar. A mobile-only padding-bottom would add dead space for a problem that does not exist at the scroll position where content legibility matters. Documented in the Files comment ("no move, no padding hack").

## Tasks Delivered

| Task | Finding | Commit | Files |
| ---- | ------- | ------ | ----- |
| 1 | P1-13 — expanded set showed its name twice at 390px; P1-11 disposition (Save bar verified last child) | e56d1e3b | web/src/pages/Files.tsx, web/dist/index.html |
| 2 | P2-14 — Remove set carried the primary-CTA accent below 48rem | 27f9c426 | web/src/pages/Files.tsx, web/dist/index.html |
| 3 | P1-12 disposition (Dashboard bar verified last child) | none needed | (no code change — expected branch) |

## What Changed

- **Files.tsx:1575 (P1-13)** — the expanded row's name span gains `max-md:hidden` (the ONLY class change). Below 48rem the MobileFileSetCard disclosure header directly above the expanded row already renders the same set name (the card IS the disclosure header); the expanded panel repeated it — two name spans visible at once. Desktop >=48rem keeps the span: the desktop list renders FileSetRow bare, so it is THE row title there. Why-comment added above the span (paraphrased — no grep-gate literal in it).
- **Files.tsx:2403-2419 (P1-11)** — Save-bar comment extended with the why-last-child paragraph (verified date, Containers.tsx D-03 block and StickyActionBar.tsx header cited, sticky-in-flow space-reservation noted). Zero JSX moved.
- **Files.tsx:1714 (P2-14)** — remove-set Button tone flips to `tone={isDesktop ? "accent" : "danger"}`; `const isDesktop = useIsDesktop()` added to FileSetRow's hooks (import pre-existed at line 37). Button.tsx's `danger` entry (bg-statusFailSolid/text-carbon-background — the ConfirmDialog pairing adopted into the TONE_CLASS table) supplies the colour: no new colour, no status class at the call site, no eslint exception. jsdom suites see desktop (guarded matchMedia stub) → accent, byte-identical. Geometry untouched (same badge, 44px mobile bleed intact).
- **Files.tsx comment rewrite (P2-14)** — the two passages that contradicted the new mobile behaviour ("The remove badge gets NO special colour treatment…" and the unscoped "Keine Sonderfarbe fuer den Entfernen-Badge." citation) rewritten as one SPLIT-BY-WIDTH decision: the jdp ruling quoted in full and scoped to the desktop tab where it still holds; the mobile divergence justified (irreversible action must not wear the primary-CTA colour). Still-true paragraphs kept verbatim (icon-badge recipe, in-flight state, glyphs, gap-1.5, flex-wrap). Destructive meaning still carried by IconTrash + tip bubble + useConfirm — untouched. Other destructive call sites (snapshot rows, RestorePanel) untouched by scope.

## Verification

- Task 1: `tsc --noEmit` + `vite build` green; `vitest run src/lib/i18n.preseed.test.ts` 20/20 (zero new locale keys); grep `text-sm truncate max-md:hidden` = 1.
- Task 2: `tsc --noEmit` + `vite build` green; `eslint src/pages/Files.tsx` clean (no new exceptions, no disable comments); grep `isDesktop ? "accent" : "danger"` = 1.
- Task 3: no Dashboard diff + `LAST DIRECT CHILD` present (1 hit) — verify passed on the no-change branch.
- All builds invoked via direct node entry points (`node node_modules/typescript/bin/tsc`, `node node_modules/vite/bin/vite.js build`, `node node_modules/vitest/vitest.mjs`, `node node_modules/eslint/bin/eslint.js`) — the npm/npx cmd shims lose node on this machine (lot-1 lesson).
- web/dist/index.html rebuilt and committed in each code commit (asset-hash line follows the build, quickplan-1 convention).
- desktop-untouched.spec.ts NOT run — not executable in a quick (needs binary + harness); desktop identity holds by construction (the one class addition is max-md:-scoped; the tone gate evaluates to "accent" whenever DESKTOP_QUERY matches) and is re-proven at the next full e2e gate, per plan.
- jsdom limitation by design: no test asserts max-md CSS behaviour; no Files/Dashboard dom suite exists (plan-verified glob), so no suite updates were owed.

## Deviations from Plan

**1. [Process] No docs/SUMMARY commit**
- The plan's success criteria called for a third docs commit carrying the SUMMARY; the orchestrator constraint for this run overrides ("the orchestrator handles the docs commit"). This file is written but uncommitted, like STATE.md. Code commits are exactly the 2 atomic code+dist commits the plan required.

**2. [Process, resolved by precedent] web/dist/index.html committed rebuilt, not "restored"**
- The plan's context line says to "restore the placeholder web/dist/index.html if the build replaced it"; the repo's actual quick-task convention (quickplan-1 commit 29cb402e, "web/dist/index.html placeholder rebuilt", +4-4 lines) commits the REBUILT index.html — its asset-hash line tracking the build — in the same code commit, and only index.html is tracked under web/dist (assets gitignored). Followed the precedent; the orchestrator's own constraint ("chaque commit de code … DOIT inclure le rebuild web/dist dans le MÊME commit") says the same. The "restore placeholder" phrasing belongs to the phase-8 UAT device-runbook, not quick commits.

**3. [Rule 3 - Blocking] Verify commands executed via direct node entry points**
- Same environment workaround as lot 1 (observation 0013): npm/npx shims lose node, so every verify command ran as `node node_modules/<entry>`. No scope change.

No plan-content deviations: all anchors existed where the plan said (content-verified), both code tasks landed exactly as prescribed, and the P1-11/P1-12 conformant branches produced the expected no-move outcome.

## Constraints Audit

- DESKTOP_QUERY: only breakpoint authority — the one JS gate keys on the existing `useIsDesktop` (import already at Files.tsx:37); zero new width literals.
- Desktop byte-identical: the only class addition is `max-md:`-scoped; the tone ternary resolves to `"accent"` whenever the desktop query matches (jsdom stub included); Dashboard.tsx untouched entirely.
- D-06 44px floor: no control height changed; tone swap is colour-only.
- Zero npm dependencies, zero backend, zero changes outside Files.tsx + dist (Dashboard verify-only), zero new locale keys (i18n preseed green), zero Layout.tsx changes.
- Comment discipline: both rewritten/extended comment blocks paraphrase the grep-gate literals (counts stayed 1); no comment contradicts the code.
- Pre-existing untracked artifacts (ui-*.png, uat-*.png, .playwright-mcp/, .gsd/, web/pw-*.log, research caches, web/e2e/guided-restore.spec.ts, Recovery.mobile.dom.test.tsx) untouched; `web/e2e/desktop-untouched.spec.ts` local modification left uncommitted as instructed.

## Known Stubs

None.

## Self-Check: PASSED

- Files.tsx:1575 (max-md:hidden name span), 1714 (tone ternary), 2403-2419 (why-last-child paragraph): FOUND in working tree and commits.
- Commits e56d1e3b, 27f9c426: FOUND on docker-folders (parent 97f71b63, the plan commit).
- web/dist/index.html committed in both code commits; working tree clean of this task's tracked-file edits.
- No tracked-file deletions in either commit; Dashboard.tsx byte-identical to its pre-task state.
