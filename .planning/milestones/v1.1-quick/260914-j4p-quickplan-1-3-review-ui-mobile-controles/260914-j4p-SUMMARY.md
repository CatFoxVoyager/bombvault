---
phase: quick
plan: 260914-j4p
subsystem: web-spa-mobile-layout
tags: [mobile, layout, selector, settings, list-toolbar, language-card, max-md, ui-review-lot1]
requires:
  - web/src/lib/useMediaQuery.ts (DESKTOP_QUERY — the only breakpoint authority)
  - web/src/components/Selector.tsx (pinWidth pipeline, items 5b/5c)
provides:
  - pinWidth desktop gate (Selector pinning suppressed below 48rem, header item 5d)
  - mobile wrap behavior for ListToolbar chips row and Settings section chip strip
  - full-width Language trigger below md (wrapper included)
  - Selector.mobile.dom.test.tsx (phone-environment matchMedia stub suite)
affects:
  - Settings > General pickers at 390px (Theme/Corners/Animations/Labels now content-hugging, wrap)
  - Containers/VMs toolbars at 390px (chips wrap instead of clipping)
  - Settings section nav at 390px (all 7 chips reachable)
  - Desktop rendering of every touched surface (unchanged by construction)
tech-stack:
  added: []
  patterns:
    - useIsDesktop gate conjoined into an existing JS branch (single DESKTOP_QUERY authority)
    - max-md:-scoped-only class additions (desktop DOM byte-identical)
    - suite-local window.matchMedia stub keyed on the imported DESKTOP_QUERY constant
key-files:
  created:
    - web/src/components/Selector.mobile.dom.test.tsx
  modified:
    - web/src/components/Selector.tsx
    - web/src/components/mobile/ListToolbar.tsx
    - web/src/pages/Settings.tsx
    - web/src/pages/settings/LanguageCard.tsx
    - web/dist/index.html
decisions:
  - "Selector pinWidth now also requires useIsDesktop — the 200px pin is a desktop-scale decision (P1-9 measured: 12+ pinned 200x43 blocks stacking ~2400px of page scroll at 390px); documented as header item 5d"
  - "ListToolbar chips row and the Settings mobile section strip wrap below md — clipped signaller-less overflow ruled worse than a taller toolbar; #178/desktop-strip histories kept and distinguished from the mobile halves"
  - "LanguageCard full-width trigger required TWO max-md classes: the button width AND inline-block-to-block on the wrapper (an inline-block parent shrink-wraps a full-width child back to label width)"
metrics:
  duration: 14min
  completed: 2026-09-14
status: complete
actuals:
  tokens: 5045
  tasks: 3
  commits: 3
---

# Quick Task 260914-j4p: Mobile controls fix batch (UI review lot 1, P1-9/P1-2/P1-3/P2-10) Summary

Gated Selector's 200px equalWidth pinning below 48rem, made the Containers/VMs filter chips and the Settings section chip strip wrap on phones, and took the Language trigger full-width below md — every added class max-md:-scoped, desktop DOM byte-identical by construction.

## Tasks Delivered

| Task | Finding | Commit | Files |
| ---- | ------- | ------ | ----- |
| 1 | P1-9 — Selector equalWidth pinning stacked 200px blocks on phones | baa28f58 | Selector.tsx, Selector.mobile.dom.test.tsx (new), web/dist/index.html |
| 2 | P1-2 — ListToolbar chips clipped mid-word at 390px (451px in 343px) | f10c9ac0 | mobile/ListToolbar.tsx, web/dist/index.html |
| 3 | P1-3 + P2-10 — Settings section nav hid 5/7 pills (617px in 351px); Language trigger orphaned 192px | 29cb402e | Settings.tsx, settings/LanguageCard.tsx, web/dist/index.html |

## What Changed

- **Selector.tsx** — `pinWidth` now reads `isDesktop && equalWidth && !(labelsOffScreen && size !== "lg")` with `isDesktop` from `useIsDesktop()` (the single DESKTOP_QUERY hook; no new width literal). Measurement effects, inline-width merge, and segment class branches untouched: below 48rem segments simply lose the inline width and fall back to the content-hugging presentation inside the track's existing flex-wrap. Header gains item 5d (the mobile decision, citing the P1-9 measurement); the pinWidth line comment names the suppression.
- **Selector.mobile.dom.test.tsx (new)** — stubs `window.matchMedia` wholesale (matches:false for every query, keyed on the imported DESKTOP_QUERY constant) and proves, for both variants, that no segment carries an inline width below 48rem (not the 260px widest-match, not the 200px MIN_PINNED_WIDTH floor), that suppression survives a re-render, that the equalWidth scale classes survive the fallback, and that the gate actually consults the shared width axis.
- **ListToolbar.tsx** — chips row appends the mobile wrap override (base `flex items-center gap-2 overflow-x-auto flex-nowrap` untouched); the never-wrap comment rewritten as a documented reversal citing the P1-2 measurement, the consumer split (Containers FilterControl+ChipFilter, VMs ChipFilter, Files renders no row), and the sticky-in-flow rationale.
- **Settings.tsx** — mobile section chip nav (the `!isDesktop` half, invisible to jsdom) appends the mobile wrap override; per-chip `min-h-11 shrink-0 whitespace-nowrap` untouched (the ROW wraps, chips stay one line at the 44px floor). "Scroll, never wrap" paragraph rewritten to the reversal (P1-3 measurement, #178 history kept and scoped to the desktop strip).
- **LanguageCard.tsx** — trigger button appends the mobile full-width override beside the untouched `w-48`, AND the wrapper flips `inline-block` to block below md (an inline-block parent shrink-wraps its content and would silently no-op the button fix). DropdownListbox already sizes its portalled panel to the trigger's measured width, so the mobile panel follows with no second width literal and no new key. w-48 comment block extended with the closing passage.

## Verification

- Targeted suites, all green: Selector.test.ts + Selector.dom.test.tsx + Selector.mobile.dom.test.tsx + mobileShellSource.test.ts + Settings.languageCard.dom.test.tsx + Settings.settingsWrites.dom.test.tsx + Settings.themeCard.dom.test.tsx — **142/142 tests pass**, with every pre-existing Selector pinning assertion passing UNMODIFIED (jsdom answers desktop via the guarded setup stub).
- Greps: `max-md:flex-wrap` count 1 in ListToolbar.tsx and 1 in Settings.tsx; `max-md:w-full` and `max-md:block` count 1 each in LanguageCard.tsx (no comment tombstones inflate any count).
- Build gate: `tsc --noEmit && vite build` green after every task; web/dist/index.html placeholder committed in each task's commit.
- desktop-untouched.spec.ts NOT run — not runnable in a quick task (needs a built binary + served harness); desktop identity holds by construction (zero non-max-md class changes, pinWidth evaluates identically when DESKTOP_QUERY matches, proven by the unmodified desktop dom suite) and is re-proven at the next full e2e gate, per the plan.
- jsdom limitation, by design: no test asserts max-md CSS behavior (jsdom applies no media queries); the new suite locks the testable JS half.

## Deviations from Plan

**1. [Rule 3 - Blocking] Verify commands executed via direct node entry points**
- **Found during:** Task 1 (first verify run)
- **Issue:** `npx vitest` and `npm run build` fail on this Windows machine — the npm/npx cmd shims spawn a cmd child that cannot resolve node ("node n'est pas reconnu") even though node works in Git Bash (scoop shims).
- **Fix:** Same commands, same suites, invoked directly: `node node_modules/vitest/vitest.mjs run ...`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`. No scope change; logged to the task-observer log (observation 0013) for future sessions.
- **Files modified:** none (environment workaround)

**2. [Process] TDD executed RED-to-GREEN but committed atomically per task**
- The orchestrator's constraint ("commit each task atomically", dist in the same commit) overrides the default TDD two-commit (test/feat) split. Task 1 still ran the full RED gate first: the new mobile suite failed 4/4 against the un-gated code (segments pinned at 260px/200px in the phone env; DESKTOP_QUERY never consulted) before the implementation landed and turned it 4/4 green.

**3. [Process, self-caught] Transient duplicate nav block during Task 3's comment rewrite**
- The Settings.tsx comment replacement briefly re-included the nav JSX opening that followed it (duplicate block). Caught by the post-edit read-back before any test or commit; removed in a follow-up edit. Final file verified correct (build + suites green). Lesson logged as observation 0014.

No plan-content deviations: all file paths, class additions, comment requirements, and verify steps matched the plan as written.

## Constraints Audit

- DESKTOP_QUERY: only breakpoint authority touched — the one JS change keys on `useIsDesktop`; zero new width literals or media query strings (the new suite asserts the shared constant is what gets consulted).
- Desktop byte-identical: every added class is `max-md:`-scoped; base class lists untouched (ListToolbar keeps `flex-nowrap`; LanguageCard keeps `w-48`; Settings nav base classes unchanged).
- D-06 44px floor: no control height reduced anywhere; only width/wrap changed.
- Zero npm dependencies, zero backend, zero changes outside web/src, zero new locale keys, zero user-visible strings.
- Comment discipline: every reversed decision rewritten in the house narrative voice (Selector item 5d, ListToolbar reversal paragraph, Settings REVERSED paragraph, LanguageCard closing passage) — no stale rationale left contradicting the code.
- Pre-existing untracked artifacts (ui-*.png, uat-*.png, .playwright-mcp/, .gsd/, web/pw-*.log, research caches, web/e2e/guided-restore.spec.ts, Recovery.mobile.dom.test.tsx) untouched; `web/e2e/desktop-untouched.spec.ts` local modification left uncommitted as instructed.

## Known Stubs

None.

## Self-Check: PASSED

- web/src/components/Selector.mobile.dom.test.tsx: FOUND
- web/src/components/Selector.tsx / mobile/ListToolbar.tsx / Settings.tsx / settings/LanguageCard.tsx: FOUND (all committed)
- Commits baa28f58, f10c9ac0, 29cb402e: FOUND on docker-folders (parent 2aa61ccf)
- No tracked-file deletions in any commit; working tree clean of this task's edits.
