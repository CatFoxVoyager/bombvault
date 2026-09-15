---
phase: 05-mobile-shell-navigation-foundation
plan: 04
subsystem: ui
tags: [safe-area, viewport, dvh, theme-color, fouc, tailwind, source-assert, vitest, ios, android]

# Dependency graph
requires:
  - phase: 05-mobile-shell-navigation-foundation (plan 03)
    provides: BottomSheet already referencing pb-[var(--safe-area-bottom)] forward-compatibly - this plan defines the property it resolves against
  - phase: pre-existing theme foundation
    provides: theme.ts paint() as the single application choke point and the keep-index.html-in-sync convention this plan extends
provides:
  - SHELL-04: --safe-area-top/right/bottom/left :root custom properties (max(env(safe-area-inset-*), 0px)) in web/src/index.css, resolvable because web/index.html declares viewport-fit=cover - the pairing is one contract
  - SHELL-06: extended viewport meta (viewport-fit=cover + interactive-widget=resizes-content) and the static #161616 theme-color first-paint fallback, added below the FOUC script whose bytes are proven identical (sha256 over lines 1-33)
  - SHELL-06: theme.ts paint() mirrors the resolved theme into meta[name=theme-color] (#161616 dark / #f4f4f4 light), null-guarded, covering every theme-application path
  - SHELL-05/07: mobile-correct login - min-h-dvh root, max-md:text-base on both inputs (16px effective, no iOS zoom-on-focus), safe-area container padding, chrome-free by the pinned structural early return
  - web/src/app/mobileShellSource.test.ts: the 22-test source-assert guard suite (node env) plan 05 extends with the Layout/mobile-shell asserts
affects: [05-05 (mobile shell consumes the custom properties and extends this guard suite), 05-06 (embedded build), Phase 6 touch surfaces]

# Actuals (#2632) - chars/4 over the realized diff (23,093 chars across 5 files), never a harness token count.
actuals:
  tokens: 5773
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: [] # no new dependencies; viewport-fit=cover / interactive-widget=resizes-content / dvh are platform directives, not packages
  patterns:
    - Source-assert guard suite: declarative viewport contracts pinned by node-env tests that read source text (routedPages.test.ts idiom), with per-family self-guards so a silent no-match cannot pass
    - Byte-constant guard: guarded file text copied verbatim into the test as an inline constant; any mutation fails CI and the constant is updated in the same deliberate commit
    - Paired-change comment for browser-chrome values: index.html static fallback and theme.ts mirror must change together, citing the established keep-in-sync convention
    - max(env(safe-area-inset-*), 0px) as the safe-area definition form - the clamp keeps every consumer's padding a valid length where env() resolves to nothing

key-files:
  created:
    - web/src/app/mobileShellSource.test.ts
  modified:
    - web/src/index.css
    - web/index.html
    - web/src/lib/theme.ts
    - web/src/pages/Login.tsx

key-decisions:
  - "Safe-area properties live in their own :root block with a banner naming the viewport-fit=cover pairing as ONE contract - env() reads 0px everywhere without the meta directive, so the two files cannot be allowed to drift apart silently"
  - "index.html edits confined to the viewport meta line and below; comments explaining the new directives also sit BELOW the meta line so the diff provably starts at it - lines 1-33 sha256-identical before and after (T-05-03)"
  - "paint() mirrors via a THEME_COLOR Record<ResolvedTheme, string> lookup with ?. null guard - jsdom suites have no meta tag; setTheme/applyStoredTheme/system-flip all funnel through paint(), so one write covers every path"
  - "The banned literals 100vh/min-h-screen appear in the guard suite ONLY as negative-assertion needles; my first Login.tsx comment mentioning them tripped the plan's own acceptance gate and was reworded - the ban is file-wide and byte-literal"
  - "Layout-scoped asserts are ORDER-only (blocked return before shell root, matched by a className=\"flex prefix): Layout still carries the desktop root class until plan 05 rewires it, and plan 05 EXTENDS this file - asserting viewport classes early would leave Wave 1 red"

patterns-established:
  - "Plan 05 extends mobileShellSource.test.ts instead of inventing its own guard file; new mobile surfaces must be source-pinned here"
  - "Viewport-height discipline: dvh/svh exclusively in the mobile shell; the static units are CI-banned per surface by negative source asserts"
  - "Any future head-region byte-critical script gets the same inline-constant byte guard treatment"

requirements-completed: [SHELL-04, SHELL-05, SHELL-06, SHELL-07]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Safe-area custom properties --safe-area-top/right/bottom/left as max(env(safe-area-inset-*), 0px) in :root, resolvable under the viewport-fit=cover meta (one contract, banner-commented)"
    requirement: SHELL-04
    verification:
      - kind: unit
        ref: "web/src/app/mobileShellSource.test.ts#SHELL-04 describe (5 tests: block-vacuity guard + per-side env-pairing forms)"
        status: pass
      - kind: build
        ref: "tsc --noEmit exit 0; vite build exit 0; full vitest 2294 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Extended viewport meta (width/device-width + initial-scale kept, viewport-fit=cover, interactive-widget=resizes-content) and the static #161616 theme-color fallback positioned BELOW the byte-identical FOUC script, with the byte-identity guard proven live by mutation"
    requirement: SHELL-06
    verification:
      - kind: unit
        ref: "web/src/app/mobileShellSource.test.ts#SHELL-06 describes (8 tests: meta directives, FOUC byte-constant, ordering); mutation demo: one-byte FOUC edit -> suite red -> restored -> green"
        status: pass
      - kind: other
        ref: "sha256 over index.html lines 1-33 identical pre/post (c036cc9d41453912dfccbcdde9d804d2329ec00142a4258ad672510aa7b1f580); git diff hunk starts at the viewport meta line"
        status: pass
    human_judgment: false
  - id: D3
    description: "theme.ts paint() mirrors the resolved theme into meta[name=theme-color] (#161616 dark / #f4f4f4 light), null-guarded, with the paired-change comment citing the keep-index.html-in-sync convention"
    requirement: SHELL-06
    verification:
      - kind: unit
        ref: "web/src/app/mobileShellSource.test.ts#SHELL-06 paint() mirror test; Settings.themeCard.dom.test.tsx green in the full run (theme paths exercise paint() under jsdom where the meta is absent - the null guard holds)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Login viewport discipline: min-h-dvh root, zero banned static viewport literals in Login.tsx and index.css - negatives proven live by mutation"
    requirement: SHELL-05
    verification:
      - kind: unit
        ref: "web/src/app/mobileShellSource.test.ts#SHELL-05/07 describes (6 tests); mutation demo: min-h-screen reintroduced -> negative assert red -> restored -> green"
        status: pass
    human_judgment: false
  - id: D5
    description: "Login SHELL-07 source contract: max-md:text-base on both fields, safe-area left/right/bottom container padding, glim-field-focus and tracking-[0.35em] preserved, LoginPage returned before any shell renders (structural no-chrome, order-pinned in Layout.tsx)"
    requirement: SHELL-07
    verification:
      - kind: unit
        ref: "web/src/app/mobileShellSource.test.ts#SHELL-05/07 + SHELL-07 structural describes (order assert + self-guards); full vitest 2294 passed"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual outcome of the login changes: card clears notches/home indicator in every orientation, no iOS zoom-on-focus on a real device, and desktop rendering is visually unchanged"
    requirement: SHELL-07
    verification: []
    human_judgment: true
    rationale: "The source contract and built CSS are machine-proven (max-md variant scoped below 48rem, safe-area vars resolve to 0 on desktop), but the on-device visuals - real insets, real keyboard, no zoom - are exactly what 05-05's mobile-shell e2e plus the milestone real-device exit criterion exist to sign off; jsdom cannot carry them."

# Metrics
duration: 13min
completed: 2026-09-11
status: complete
---

# Phase 5 Plan 4: Viewport Correctness Contract Summary

**Safe-area custom properties + viewport-fit=cover, dvh-first mobile-correct login with 16px-effective inputs, and theme-color mirroring from paint() — all pinned by a 22-test source-assert suite with the FOUC script byte-guarded and the byte guard proven live**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-11T21:34:40Z
- **Completed:** 2026-09-11T21:47:50Z
- **Tasks:** 3
- **Files:** 5 (1 created, 4 modified)

## Accomplishments

- Added the `--safe-area-top/right/bottom/left` :root block to `web/src/index.css` as `max(env(safe-area-inset-*), 0px)` with a banner comment naming the `viewport-fit=cover` pairing as one contract and the plan-05 consumers (bar/sheet bottom padding; BottomSheet's plan-03 forward reference now resolves).
- Extended the `web/index.html` viewport meta with `viewport-fit=cover` + `interactive-widget=resizes-content` (original directives intact, single-line edit) and added the static `#161616` theme-color first-paint fallback below the FOUC script, with paired-change comments. Lines 1-33 are sha256-identical to pre-change; the diff hunk starts at the viewport meta line.
- Extended `theme.ts` `paint()` to mirror the resolved theme into `meta[name=theme-color]` (`#161616` dark / `#f4f4f4` light), null-guarded for jsdom, so browser chrome follows every theme-application path (setTheme, applyStoredTheme, system flip).
- Made the login page mobile-correct (SHELL-07): root `min-h-dvh`, both inputs `max-md:text-base` (16px effective on narrow viewports — no iOS zoom-on-focus), container padded with the safe-area left/right/bottom properties; card classes, `glim-field-focus`, `tracking-[0.35em]`, and all copy preserved; no chrome change (Layout's blocked branch returns LoginPage before any shell renders).
- Created `web/src/app/mobileShellSource.test.ts` — 22 node-env source-assert tests with per-family self-guards, pinning SHELL-04/05/06/07 including the FOUC byte-identity constant and the LoginPage-before-shell source order. Both mutation-prone guard families (byte identity, banned literals) were demonstrated live: mutate → red → restore → green.
- Full suite at close: 97 test files / 2294 tests passed; `tsc --noEmit` and `vite build` exit 0; eslint clean on all three touched/created TS files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Safe-area custom properties + viewport meta + theme-color mirror** - `307c4871` (feat)
2. **Task 2: Mobile-correct login page (SHELL-07)** - `5d9dce7d` (feat)
3. **Task 3: mobileShellSource.test.ts guard suite** - `ada102cf` (test)

**Plan metadata:** committed atomically with this SUMMARY (docs commit) plus the STATE/ROADMAP metadata commit.

## Files Created/Modified

- `web/src/index.css` - `:root` safe-area block (4 properties, max(env(), 0px) form) + banner comment
- `web/index.html` - extended viewport meta + static theme-color fallback below the byte-untouched FOUC script
- `web/src/lib/theme.ts` - `THEME_COLOR` record + paint() mirror with null guard and paired-change comment
- `web/src/pages/Login.tsx` - `min-h-dvh` root, `max-md:text-base` on both inputs, safe-area container padding, explanatory comments
- `web/src/app/mobileShellSource.test.ts` - the 22-test SHELL-04/05/06/07 guard suite (created)

## Decisions Made

See key-decisions in the frontmatter; the two load-bearing ones:

- **The meta line and the CSS block are guarded as one contract:** env(safe-area-inset-*) silently reads 0px everywhere without `viewport-fit=cover`, so the banner comment in index.css and two guard tests pin both halves; dropping the directive fails CI rather than silently disabling every safe-area consumer.
- **Banned literals are file-wide byte bans:** my first Login.tsx comment mentioned `100vh`/`min-h-screen` to explain the change and the plan's own acceptance gate caught it — the ban is byte-literal and file-wide, which is exactly the property that makes the guard future-proof. The comment was reworded; the literals now exist only as the guard suite's negative-assertion needles.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX comments placed between element attributes broke the parse**
- **Found during:** Task 2 (first build attempt)
- **Issue:** the explanatory comments for the two `max-md:text-base` edits were initially written between JSX attributes, which is a syntax error (TS1005) — `{/* ... */}` is only valid in child position
- **Fix:** moved the comments above the `<RevealInput>` / `<input>` elements as JSX children
- **Files modified:** web/src/pages/Login.tsx
- **Verification:** `tsc --noEmit` exit 0; full suite green
- **Committed in:** `5d9dce7d` (fixed before the task commit; never committed broken)

---

**Total deviations:** 1 auto-fixed (Rule 1) — caught and resolved inside Task 2 before its commit.
**Impact on plan:** none on scope; the plan executed as written otherwise.

## Issues Encountered

- **Broken npx/npm .cmd shims in the executor shell** (known from 05-01/05-02/05-03): worked around with direct invocations (`node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`, `node node_modules/vitest/vitest.mjs run`, `node node_modules/eslint/bin/eslint.js`). No repo change.
- **`web/dist/index.html` rebuilt** by the build verifies — left unstaged per the web/dist discipline (05-06 owns the final embedded build).

## Requirement Completion Note

`requirements-completed: [SHELL-04, SHELL-05, SHELL-06, SHELL-07]` records this plan's declaration verbatim. The shared-ID gate was checked with `requirements.ready-ids`: SHELL-05 is co-declared by 05-05 which lacks a SUMMARY, so only ready IDs were marked via `requirements.mark-complete` — a shared ID is never marked while its siblings are incomplete.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 can consume the custom properties directly (`var(--safe-area-bottom)` in BottomNav/MoreSheet) and should EXTEND `mobileShellSource.test.ts` with the Layout/mobile-shell asserts (the file's Layout section is order-only today, with an explicit scope-note comment marking the deferral).
- The viewport contract is now enforced from this phase on: dropping `viewport-fit=cover`, mutating the FOUC bytes, reintroducing static viewport units in Login, or reordering the login-before-shell return all fail CI.
- No blockers.

## Self-Check: PASSED

- Files verified: all 5 key files exist on disk (`web/src/index.css`, `web/index.html`, `web/src/lib/theme.ts`, `web/src/pages/Login.tsx`, `web/src/app/mobileShellSource.test.ts`).
- Commits `307c4871`, `5d9dce7d`, `ada102cf` present in `git log`, each with exactly one `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer.
- Acceptance criteria re-run at close: guard suite 22/22 green; full suite 2294 passed; `tsc --noEmit` + `vite build` exit 0; index.html lines 1-33 sha256 identical; no banned literals in Login.tsx/index.css; frozen files (router.tsx, api.ts, progress.ts, internal/**) untouched; `web/dist` not committed.

---
*Phase: 05-mobile-shell-navigation-foundation*
*Completed: 2026-09-11*
