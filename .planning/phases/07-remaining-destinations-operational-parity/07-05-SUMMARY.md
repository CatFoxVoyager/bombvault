---
phase: 07-remaining-destinations-operational-parity
plan: "05"
subsystem: web-settings-mobile
tags: [MORE-02, PLAT-01, settings, mobile-chip-strip, e2e, playwright]
requires:
  - 07-01 (platform token axis: --mob-chip-radius, data-platform attribute)
  - 07-02 (pre-seeded phase 7 i18n keys: settings.tabsNavigation + tab labels)
  - phase 5 mobile shell (useIsDesktop, D-01 double gate, bottom nav)
  - phase 6 tap primitives (TapPopover, ColorPickerPopover, ConfirmSheet)
provides:
  - /settings mobile treatment: horizontally scrollable tonal chip strip + stacked full-width cards below md
  - one tab state, two presentations (desktop Selector + mobile chips through one switchTab handler)
  - PAGE_SHELL_TABBED responsive gap (gap-6 md:gap-10) in pageShell.ts
  - Toggle 44px mobile hit area (max-md ::after bleed)
  - destination-settings.spec.ts e2e over the four-project harness
affects:
  - 07-07 (operational-sheet plans may reuse the stacked-card sweep patterns)
  - phase 8 real-device validation (chip strip ergonomics, touch-target ledger)
tech-stack:
  added: []
  patterns:
    - D-01 double gate with role-query includeHidden for the mounted-hidden half
    - shared panels (stacked cards ARE the desktop tab panels; only navigation forks)
tech-files:
  created:
    - web/e2e/destination-settings.spec.ts
  modified:
    - web/src/pages/Settings.tsx
    - web/src/lib/pageShell.ts
    - web/src/components/Toggle.tsx
    - web/dist/index.html
decisions:
  - one state, two presentations: switchTab + tabItems hoisted once and shared by the desktop Selector (role tablist/tab) and the mobile chips (nav + aria-current buttons); the stacked cards below md ARE the desktop tab panels, only the navigation forks (T-07-16)
  - PAGE_SHELL_TABBED grew the responsive gap IN the constant (gap-6 md:gap-10) because page-uses-page-shell only recognises the bare identifier at the call site; md:gap-10 IS gap-10 so desktop is identical by construction
  - mobile strip mounts behind !isDesktop while the desktop strip stays mounted under max-md:hidden; the panels maxWidth is isDesktop- AND truthy-gated so a hidden strip's 0px measurement can never crush the Cards flat
  - Toggle grows a 44px activation box below md via an empty max-md ::after bleed (pseudo-element is part of its button); visual size frozen, desktop byte-identical
  - FAB audit came back negative: every add-style action in the strip's tabs already renders in an in-card row, so a Fab would duplicate a visible action (prohibited) — none is rendered
  - e2e stages /api/settings field-for-field and METHOD-BRANCHES display-prefs (GET abort = boot-look cut, PUT ok) so pref saves never error and no spec write reaches the harness DB
  - VERIFY-04 disposition: the e2e touch-target backstop enforces the NEW mobile primitives (chips min-h-11, Toggle bleed); the app-wide desktop-era control scale (Button 32px, Selector segments 37.6px) is recorded as a phase 8 validation item, not silently widened
metrics:
  duration: 1h 29m
  completed: 2026-09-13
  tasks: 3
  commits: 3
status: complete
actuals:
  tokens: 9300
  tasks: 3
  commits: 3
---

# Phase 7 Plan 5: Settings Mobile Treatment Summary

**One-liner:** /settings below md swaps the 7-tab Selector for a scrollable accent-tonal chip strip bound to the SAME tab state, with the active tab's unchanged panels stacked full-width — desktop >=48rem byte-identical, proven by a new four-project e2e spec on the real binary.

## What Was Built

### Task 1 — chip strip + stacked panels on the one tab state (commit a09e6b18)

- `switchTab` (direction computation + state write + hash sync) and `tabItems` (7 entries from TAB_ORDER + i18n labels + TAB_ICON glyphs) hoisted once in SettingsPage; the desktop `Selector` now consumes both, so the mobile chips and the desktop strip cannot drift (T-07-16).
- Mobile chip strip: `<nav aria-label={t("settings.tabsNavigation")}>` mounting behind `!isDesktop`, `-mx-1 px-1 py-1` so chip focus rings are not clipped by the overflow-x-auto scroller; chips are `min-h-11` (44px) buttons with `title={label}`, active = `bg-accentSoft text-accentText`, inactive = `bg-carbon-surface2 text-carbon-textMuted`, radius `rounded-(--mob-chip-radius)` (999px on both data-platform values) with a `bv-convention-exception: control-reads-engine-tokens` marker (Fab.tsx precedent).
- Desktop strip wrapper gains `max-md:hidden` (plain div wins over layered utilities) with the hidden-box-measures-0 why-comment; the panels wrapper's `maxWidth` is `isDesktop ? (tabStripWidth || undefined) : undefined` — the `||` (not `??`) is deliberate so a measured 0 during the mobile->desktop crossing falls through to UNCAPPED.
- `pageShell.ts`: `PAGE_SHELL_TABBED` = `flex flex-col gap-6 md:gap-10 flex-1` (see Deviations).
- Desktop JSX untouched elsewhere; every existing Settings.*.dom.test.tsx keeps passing unchanged (jsdom answers desktop, so the chip strip never mounts there).

### Task 2 — operability sweep (commit f824d12c)

- `Toggle.tsx`: below md the track button grows an invisible 60x44 activation box (`max-md:after:absolute max-md:after:-inset-3 max-md:after:content-['']`); the 36x20 visual is frozen, desktop untouched, and the 12px bleed into row gaps is documented as intended forgiveness. This covers every ToggleRow switch in the stacked cards.
- FAB audit: negative (see Decisions) — recorded in the commit message so the UI-SPEC FAB surface resolution is traceable.

### Task 3 — e2e on the real binary (commit 77044328)

- New `web/e2e/destination-settings.spec.ts` over the four-project harness (mobile-iphone WebKit 390x844, mobile-android Chromium 360x800, desktop-1280, desktop-768 = the breakpoint boundary), webServer = real bombvault.exe over a wiped DB; `/api/settings` staged field-for-field, display-prefs METHOD-BRANCHED; `test.use({ locale: "en-US" })`.
- Five scenarios, 10 executed / 10 project-gated skips, all green (4.6m run):
  1. chip strip renders 7 chips, desktop strip MOUNTED-but-HIDDEN (count 1, not visible), panels carry NO max-width, strip genuinely overflows (scrollWidth > clientWidth), last chip reachable via scroll;
  2. every chip tap swaps the stacked landmark AND the hidden desktop tab's `aria-selected` follows; active/inactive tonal pairs + computed 999px radius asserted per tab; ended panels really swap (other landmarks count 0);
  3. accent preset opens the phase 6 TapPopover picker and a hex selection applies to the live `--accent` token;
  4. dark mode flips from the stacked Theme card (data-theme attribute);
  5. desktop dual-direction guard at 1280 AND 768: desktop chrome present, measured px max-width cap on the panels, zero mobile chrome (nav unmounted, no `button.h-13`, no `[role="dialog"].h-dvh`).
- `web/dist/index.html` rebuilt and shipped with this commit (07-04 convention); bombvault.exe rebuilt locally (gitignored).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Responsive gap had to live in pageShell.ts (file outside the plan's files list)**
- **Found during:** Task 1
- **Issue:** the plan's `max-md:gap-6`-at-the-call-site shape is impossible: page-uses-page-shell recognises the page root only as the bare `{PAGE_SHELL_TABBED}` identifier, so a composed className reads to the rule as an unshelled page and fails the build gate.
- **Fix:** moved the responsive gap into the constant (`gap-6 md:gap-10`), with a why-comment paragraph; Settings is the constant's only consumer so nothing else can drift. Desktop >=md identical by construction (md:gap-10 IS gap-10).
- **Files modified:** web/src/lib/pageShell.ts (extra), web/src/pages/Settings.tsx
- **Commit:** a09e6b18

**2. [Rule 2 - Critical functionality] Toggle 44px mobile hit area (file outside the plan's files list)**
- **Found during:** Task 2
- **Issue:** VERIFY-04's touch-target floor (>=44px below md) is unmet by the 36x20 shared track every stacked-cards row reuses; inflating the visual would violate the design language, and row-level click plumbing would change desktop behaviour.
- **Fix:** CSS-only `max-md` ::after bleed on the track button (part of its own hit target, zero visual change at any width), with the full why-comment.
- **Files modified:** web/src/components/Toggle.tsx (extra)
- **Commit:** f824d12c

**3. [Rule 1 - Bug] Two spec-honesty fixes in the new e2e (found live, pre-commit)**
- **Found during:** Task 3's first four-project run (2 mobile tests failing, ~5.7s each)
- **Issue:** (a) `getByRole` matches only the accessibility tree, and the `max-md:hidden` desktop strip is OUT of it at phone width — the mounted-hidden assertion resolved to 0 elements; (b) the Card heading h2 is a zero-height box (its only child is the absolutely-positioned notch Badge, Badge.tsx `absolute top-0 -translate-y-1/2`), so `toBeVisible` on the h2 fails at every viewport — the app is correct, the assertion target was wrong.
- **Fix:** `includeHidden: true` on the tablist (and its tabs) role queries; heading visibility asserts drill to the badge span, which carries the real box. Both fixes documented in comments at the helpers.
- **Files modified:** web/e2e/destination-settings.spec.ts
- **Commit:** 77044328

### File-list additions (documented, Rule 3 class)

- web/src/lib/pageShell.ts, web/src/components/Toggle.tsx — see above.
- web/dist/index.html — rebuilt SPA shipped with the last task per the 07-04 convention (the plan predates the convention; the embedded binary requires the rebuild after any web/ change). bombvault.exe is rebuilt locally too but gitignored.

## Known Stubs

None — no placeholder data paths, no skipped coverage (the spec's `test.skip` calls are project gating: mobile-only and desktop-only scenarios each run on their designated projects), no unwired components.

## TDD Gate Compliance

Not applicable — plan type is `execute`, no tdd tasks.

## Threat Flags

None — presentation-layer rehosting of existing controls and a test spec; no new endpoints, auth paths, file access, or schema surface. T-07-16 (no second tab state to desync) is mitigated by construction and asserted by e2e scenario 2.

## Verification

- `tsc --noEmit` clean (includes the new spec).
- Full dom suite green (Tasks 1-2, jsdom desktop identity — every existing Settings.*.dom.test.tsx unchanged and passing).
- `eslint` clean on src (e2e is outside its scope by configuration).
- Full e2e spec: **10 passed / 10 skipped, 4.6m** across mobile-iphone, mobile-android, desktop-1280, desktop-768 (exit 0). Known Windows teardown wedge hit after results flushed; bombvault.exe killed manually per the recorded STATE.md discipline.

## Self-Check: PASSED
