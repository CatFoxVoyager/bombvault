---
phase: 08-guided-restore-real-device-verification
plan: 04
subsystem: ui
tags: [d06-review-fixes, verify-04, verify-05, touch-targets, bleed-pattern, source-guard, e2e-backstop]
requires:
  - "07-05/07-UI-REVIEW D-06 fixes 1-3 (carried) + the Toggle.tsx:105 bleed pattern (phase 7)"
  - "mobileShellSource.test.ts phase-7 sweep (WHOLLY_PHASE7_FILES / MIXED_FILES geography)"
  - "destination-settings.spec.ts staged-domain harness (07-05) incl. TAB_LANDMARKS + chip strip locators"
provides:
  - "44px bleed hit areas on every default-variant glim-btn (MOBILE_BLEED on the shared Button) + the Language card's raw trigger and listbox options (max-md:-scoped, desktop byte-identical)"
  - "ActivityLog mobile day chip tonal resolution (bg-accentSoft/text-accentText, py-1) with the desktop :418 twin deliberately solid"
  - "The guard's D-06 fix-3 mobile-regions scope comment (desktop byte-identity WINS over the guard's letter) + WHOLLY_PHASE8_FILES extension with a mutation-proven gate"
  - "destination-settings touch-target e2e backstop: computed-style ::after hit geometry (hitBoxes helper) over the fixed controls"
affects:
  - "08-03 Task 2 calibrates Recovery.tsx's MIXED_FILES geography entry (deliberately NOT recorded here - Plan 03 is the last writer)"
  - "08-05 completes VERIFY-05's second declared half (requirements gate holds it Pending until then)"
tech-stack:
  added: []
  patterns:
    - "MOBILE_BLEED lifted from Toggle.tsx into the shared Button's className template, default variant only (chip variant excluded: an 18px remove glyph inside a pill must not swallow its host's taps)"
    - "e2e hit-box proof via getComputedStyle(el, '::after') insets grown over the border box - an ::after is invisible to getBoundingClientRect, and elementFromPoint probing was rejected because adjacent option bleeds overlap by design (later sibling wins)"
    - "bled (content !== 'none' && position === 'absolute') asserted on every measured control - the regression tell for a dropped max-md: bleed class"
key-files:
  created: []
  modified:
    - web/src/components/Button.tsx
    - web/src/pages/settings/LanguageCard.tsx
    - web/src/components/ActivityLog.tsx
    - web/src/app/mobileShellSource.test.ts
    - web/e2e/destination-settings.spec.ts
key-decisions:
  - "Fix 1 rides the SHARED Button (not per-site classes): the Settings stacked cards ARE the desktop panels (07-05 shared-panels decision), so every Button a card renders is also a phone-surface button; max-md:relative is required there because glim-btn itself is unpositioned (the bleed would otherwise resolve against a wrapping Card)"
  - "Chip variant deliberately excluded from the bleed: it is the engine-deliberate 18px remove control inside a pill - a 12px bleed would swallow taps meant for the pill's text; it rides its host row's own floor"
  - "Fix 2 resolved TONAL: the mobile day chip takes bg-accentSoft/text-accentText (accent reservation 10, the Settings tab chips' active-selection language) + py-0.5 normalized to py-1; the desktop :418 twin keeps its solid accent pill - a filter chip is an active-SELECTION state, which the mobile chip language renders tonal, never solid"
  - "The e2e battery sweeps only the FIXED controls (shared glim-btn non-chip, Language trigger/options, Notify entry row); Selector tabs (37.6px), ColorPickerSwatch swatches (28px), and native selects are the separately recorded D-11 real-device items (07-05 VERIFY-04 disposition), not this plan's fixes"
  - "WHOLLY_PHASE8_FILES = [e2e/guided-restore.spec.ts] only: Plans 01-02 created exactly one non-test source file (the mobile step flow lives INSIDE Recovery.tsx, a MIXED file whose geography entry Plan 03 Task 2 calibrates as the last writer); Recovery.mobile.dom.test.tsx is a dom TEST, not a swept source file"
metrics:
  duration: 38m
  completed: 2026-09-14
actuals:
  tokens: 5920
  tasks: 3
  commits: 3
requirements-completed: [VERIFY-04]
requirements-progressed: [VERIFY-05]
coverage:
  - id: D1
    description: "D-06 fix 1: 44px bleed hit areas on the Settings stacked-card controls - MOBILE_BLEED on the shared Button (default variant) + the Language card's raw trigger and listbox options, all max-md:-scoped"
    requirement: VERIFY-04
    verification:
      - kind: unit
        ref: "vitest full run 110 files / 2456 tests green (post-fix, twice across the session)"
        status: pass
      - kind: e2e
        ref: "destination-settings.spec.ts battery (both mobile projects): hit >= 44px on every swept glim-btn and both raw sites, bled true, trigger visual height < 44 (no visual inflation)"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-06 fix 2: the ActivityLog mobile day chip is tonal (bg-accentSoft/text-accentText, py-1) while the desktop :418 twin keeps its solid accent pill"
    requirement: VERIFY-05
    verification:
      - kind: other
        ref: "diff review: the only ActivityLog.tsx change sits inside the !isDesktop mount (line 474); desktop :418 line verified byte-identical (bg-accent text-accentContrast ps-2.5 pe-1 py-0.5 text-xs font-medium)"
        status: pass
      - kind: unit
        ref: "vitest full run green incl. ActivityLog dom tests + the file's MIXED_FILES sweep entry (2 isdMounts, 1500-char floor)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-06 fix 3 (automated half): the guard carries the mobile-regions scope comment (desktop byte-identity above 48rem WINS - Dashboard 12px twins and the desktop chip are never 'normalized') and WHOLLY_PHASE8_FILES extends the wholly sweep"
    requirement: VERIFY-05
    verification:
      - kind: unit
        ref: "mutation test: gap-3 planted in guided-restore.spec.ts + a removed !isDesktop mount in ActivityLog.tsx failed exactly 2 tests; restored; guard 50/50 green, full vitest 2456 green"
        status: pass
    human_judgment: false
  - id: D4
    description: "destination-settings touch-target e2e backstop: the hitBoxes helper proves the bleed's real geometry (computed ::after insets grown over the border box) because boundingBox cannot see a pseudo-element"
    requirement: VERIFY-04
    verification:
      - kind: e2e
        ref: "npx playwright test e2e/destination-settings.spec.ts --timeout=20000 -> 12 passed / 12 project-skipped / 0 failed (fresh SPA build + binary; teardown hang cleared by killing orphaned bombvault.exe)"
        status: pass
    human_judgment: false
status: complete
---

# Phase 8 Plan 4: Carried Review Fixes + Touch Guards Summary

D-06 fixes 1+2 land as max-md:-scoped bleed hit areas on the Settings stacked cards (shared Button + the Language card's two raw sites) and a tonal mobile day chip, plus the guard's fix-3 scope comment and phase-8 sweep extension, backstopped by an e2e battery that measures the ::after bleed's computed-style hit geometry because boundingBox is blind to pseudo-elements.

## What Was Done

### Task 1: D-06 fixes 1+2 (Button.tsx, LanguageCard.tsx, ActivityLog.tsx) - commit 93c91de5

- `MOBILE_BLEED` lifted from Toggle.tsx:105 into the shared Button's className template (`max-md:relative max-md:after:absolute max-md:after:-inset-3 max-md:after:content-['']`): glim-btn's frozen --btn-h (32px) becomes a 56px activation box below md; the chip variant is excluded in the template (`chip ? "" : ...`) with a why-comment. `max-md:relative` is load-bearing there - glim-btn itself is unpositioned, so without it the bleed would resolve against a wrapping Card and stretch one button's hit area across the whole card.
- LanguageCard trigger (:82) and listbox option rows (:109): the same card-local bleed classes with their own why-comments (~33px / ~37px sites that do not route through the shared Button; adjacent options' bleeds overlap in the row gap - the Toggle pattern's intended forgiveness).
- ActivityLog mobile day chip (:474, inside the `!isDesktop` mount): tonal `bg-accentSoft text-accentText` + py-0.5 normalized to py-1; desktop twin at :418 untouched.

Measured-compliant no-touch findings recorded during the sweep: NotifyCard entry row (min-h-[2.75rem] = 44px), the Settings chip strip (min-h-11), and shared.tsx (no raw buttons). Selector tabs (37.6px), ColorPickerSwatch swatches (28px) and native selects stay out of scope - the D-11 real-device items 07-05 already recorded under VERIFY-04's disposition.

Verification: `cd web && npx vitest run` (full suite, D-12) - 110 files / 2456 tests, exit 0.

### Task 2: guard scope comment + phase-8 sweep extension (mobileShellSource.test.ts) - commit a0c853b7

- The describe's contract comment now carries the D-06 fix-3 paragraph: the mobile-regions scoping IS the contract - desktop halves of MIXED files legitimately keep legacy values (Dashboard.tsx:3029/:3037, ActivityLog.tsx:418 are named as never-normalized), and desktop byte-identity above 48rem WINS over the guard's letter; a future desktop normalizing sweep would be a desktop-change plan, never an edit to this guard.
- `WHOLLY_PHASE8_FILES = ["e2e/guided-restore.spec.ts"]` with the why-comment recording the survey: Plans 01-02 created exactly one non-test source file; Recovery.tsx's MIXED geography entry is deliberately Plan 03 Task 2's (the last writer) so the anti-shrink floor lands against final geography.
- Existence + wholly-sweep tests extended over the union; describe title reads PHASE-07/08.

Verification: mutation test (Rule-of-the-guard) - planted `gap-3` in guided-restore.spec.ts and `sed`-flipped one ActivityLog `!isDesktop` mount: exactly 2 tests failed (needle hit + mount count 1 != 2), both files restored via `git checkout --`, guard re-run 50/50 green; full vitest 2456 green after restore.

### Task 3: destination-settings touch-target backstop (destination-settings.spec.ts) - commit 269e59a7

- `hitBoxes(locator)` helper: per located button, the border box, the bleed-grown hit box (negative ::after computed insets), and `bled` (content !== "none" && position === "absolute") - with the load-bearing comment on WHY computed style instead of plain boundingBox (an ::after is not part of the DOM bounding box; elementFromPoint probing rejected because adjacent bleeds overlap by design).
- New scenario 5 test (mobile projects): sweeps every `#bv-main button.glim-btn:not(.glim-btn-chip)` across all seven TAB_LANDMARKS tabs (landmark-waited per tab so measurement never races the panel swap; Notifications via the entry row), self-guarded at >= 4 measurements, asserting hit >= 44px on every control and `bled` true on every shared Button (the dropped-MOBILE_BLEED regression tell); then the Language trigger (visual height < 44 proves no visual inflation, hit >= 44 via bleed), the opened listbox's options (>= 2 self-guard, all hit >= 44, Escape close), and the Notify entry row's plain boundingBox >= 44 (min-height floor, no bleed machinery).
- Scenario header renumbered (dark mode 4, new 5, desktop 6).

Verification: fresh `npm run build` + `go build -o bombvault.exe ./cmd/bombvault` (the binary embeds the SPA), then `npx playwright test e2e/destination-settings.spec.ts --timeout=20000` -> 12 passed / 12 skipped / 0 failed (the new battery ok on mobile-android at 1.7s and mobile-iphone at 3.3s); the Windows teardown hang cleared by killing the orphaned bombvault.exe; `web/dist/index.html` placeholder restored before commit; the guard re-run green over the edited wholly-swept spec (50/50).

## Accomplishments

- All three carried D-06 review items that belong to this plan are landed and machine-proven; the desktop surface above 48rem is byte-identical (every added class is max-md:-scoped; the one ActivityLog change sits inside the mobile mount).
- VERIFY-04's automated half is complete for the Settings surface; the sweep-list extension gives the phase-8 source discipline a mutation-proven gate instead of a comment.

## Task Commits

- 93c91de5 fix(08-04): D-06 fixes 1+2 - Settings 44px bleed hit areas + tonal day chip
- a0c853b7 test(08-04): guard sweep-list extension + D-06 fix-3 mobile-regions scope comment
- 269e59a7 test(08-04): destination-settings touch-target e2e backstop (D-06 fix 1)

## Files Created/Modified

- web/src/components/Button.tsx (MOBILE_BLEED + template change)
- web/src/pages/settings/LanguageCard.tsx (trigger + option bleed)
- web/src/components/ActivityLog.tsx (mobile day chip tonal)
- web/src/app/mobileShellSource.test.ts (scope comment + WHOLLY_PHASE8_FILES)
- web/e2e/destination-settings.spec.ts (hitBoxes helper + scenario 5 battery)

## Deviations from Plan

None - plan executed exactly as written. (The Recovery.tsx MIXED_FILES entry is explicitly Plan 03 Task 2's, per this plan's own sweep-contract text; the wholly-file survey confirming guided-restore.spec.ts as the only candidate matched the plan's expectation.)

## Known Stubs

None.

## User Setup Required

None.

## Next Phase Readiness

- 08-05 (VERIFY-05's other declared half) can proceed; the requirements gate keeps VERIFY-05 Pending until its last declarer completes.

## Self-Check: PASSED

- All 5 modified files exist on disk (FOUND each).
- All 3 task commits exist in history: 93c91de5, a0c853b7, 269e59a7 (FOUND each).
- Task verification re-confirmed at self-check time: vitest full suite green (2456, Task 1), guard 50/50 green incl. post-Task-3 re-run over the wholly-swept spec (Tasks 2-3), destination-settings.spec.ts e2e 12 passed / 0 failed (Task 3).
- Working tree clean of task files (only .planning/ artifacts + never-commit untracked logs/snapshots remain).
