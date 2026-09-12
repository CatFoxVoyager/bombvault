---
phase: 05-mobile-shell-navigation-foundation
plan: 06
subsystem: web-spa-mobile-shell
tags: [e2e, playwright, ci, regression-gate, desktop-untouched, i18n, narrow-viewport, web-dist]
requires:
  - "05-01: playwright harness (compiled-binary webServer, 4 projects)"
  - "05-02: nav registry + useIsDesktop/DESKTOP_QUERY (desktop-sidebar/bottom-nav testids)"
  - "05-03: BottomSheet primitive + nav.more locales + IconEllipsis"
  - "05-05: Layout chrome switch, BottomNav, MoreSheet, mobile-shell.spec.ts"
provides:
  - "web/e2e/desktop-untouched.spec.ts: the parameterized 10-route x 2-desktop-project invariance loop (VERIFY-01 criterion 4, 20 combos)"
  - "Bar-exactness e2e: the mobile bar renders EXACTLY the registry slots (enabled destinations + More, nothing leaked)"
  - "web/e2e/narrow-viewport.spec.ts: de/fr x 320/360px single-line + no-overflow geometric backstop on both mobile projects"
  - "The `playwright` CI job in .github/workflows/lint.yml — VERIFY-01 armed: the full 4-project suite fails CI on any desktop-layout or mobile-shell regression"
  - "Server-look-proof e2e boot pattern (display-prefs reconciliation cut) protecting every localized-name assertion"
  - "Phase-close committed web/dist (house embed rule)"
affects:
  - "Phases 6-8: every mobile surface lands inside this CI gate; the desktop-untouched loop guards each maquette screen's desktop twin"
  - "Phase 8: the de/fr narrow-viewport sweeps reuse the narrow-viewport pattern beyond the shell"
tech-stack:
  added: []
  patterns:
    - "Parameterized per-route e2e loops with project-name branching (desktop-only/mobile-only contracts honest per project)"
    - "Geometric CSS-contract assertions: normalized line-box height bounds (two-line failure mode cannot pass the 1.5x bound) + scrollWidth<=clientWidth, never screenshot diffs"
    - "evaluateAll callbacks execute in-browser: constants must be passed as the arg, never closed over"
    - "e2e determinism against the server-side look: abort the boot-time display-prefs reconciliation (the app's documented offline path, #191) so localStorage seeds stand and parallel workers cannot clobber each other"
key-files:
  created:
    - web/e2e/desktop-untouched.spec.ts
    - web/e2e/narrow-viewport.spec.ts
  modified:
    - web/e2e/mobile-shell.spec.ts
    - .github/workflows/lint.yml
    - web/dist/index.html
decisions:
  - "Bar exactness asserted against the fresh-DB registry derivation (Dashboard, Containers, Settings + More = 4 slots) instead of the plan's literal 5: files_enabled defaults false (settings_test.go:146) and the bar must match the desktop Sidebar's gates exactly (prohibition 8) - the EXACTNESS is the substance, per the 05-05-SUMMARY coverage note (Rule 1)"
  - "The narrow-viewport spec and mobile-shell cut the boot-time display-prefs reconciliation via route.abort: the harness DB's stored bv-lang otherwise overwrites the page's locale seed at boot (#191 server-is-truth), which was observed live - de tests seeded the server pref and parallel fr pages booted German (Rule 1)"
  - "Playwright runs against a manually started webServer locally: the CLI's own webServer teardown hangs on Windows (05-05 Deviation 5 recurred; one green run hung >25 min post-summary), so the reuseExistingServer path is used for truthful exit codes; the server is killed from a separate shell call after every run (Rule 3)"
  - "lint.yml playwright job: npm run build strictly before go build (stale-embed pitfall), sibling-verbatim digest pins (T-05-SC), --with-deps chromium webkit, timeout 20"
metrics:
  duration: 39 min
  completed: 2026-09-12
  tasks: 3
  commits: 4
actuals:
  tokens: 3600 # chars/4 over the realized diff (310 insertions / 9 deletions, 5 files)
  tasks: 3
  commits: 4
requirements-completed: [SHELL-02, SHELL-03, VERIFY-01]
status: complete
coverage:
  - id: D1
    description: "Desktop-untouched parameterized loop: for every one of the 10 routed destinations on both desktop projects, Sidebar visible + bottom-nav zero matches + bv-main present (20 combos)"
    requirement: VERIFY-01
    verification:
      - kind: e2e
        ref: "web/e2e/desktop-untouched.spec.ts (npx playwright test e2e/desktop-untouched.spec.ts -> exit 0, 20 passed / 20 skipped)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mobile bar exactness: the bar renders EXACTLY the registry slots (fresh-DB: Dashboard, Containers, Settings + More; zero leaked destination links)"
    requirement: SHELL-02
    verification:
      - kind: e2e
        ref: "web/e2e/mobile-shell.spec.ts#the bar renders EXACTLY the registry slots (green on mobile-android + mobile-iphone)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Narrow-viewport backstop: de AND fr at BOTH 320px and 360px - every bar caption and More-sheet row label single-line, bar never overflows horizontally"
    requirement: VERIFY-01
    verification:
      - kind: e2e
        ref: "web/e2e/narrow-viewport.spec.ts (8 combos green: locale x width x both mobile projects)"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI gate armed: playwright job in lint.yml (build-before-go, sibling-verbatim digest pins, --with-deps chromium webkit, 4-project run, timeout 20) with the existing jobs/triggers byte-identical"
    requirement: VERIFY-01
    verification:
      - kind: other
        ref: "git diff be2bdcd1^..be2bdcd1 (28 insertions, 0 deletions) + Go yaml.v3 parse check (4 jobs, on-block present) + step-order inspection"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full local gate green (vitest 2313 + tsc + vite build + go build + all 4 specs on 4 projects) and web/dist rebuilt and committed at phase close"
    requirement: VERIFY-01
    verification:
      - kind: e2e
        ref: "npx playwright test -> exit 0, 48 passed / 36 skipped (11.6s); vitest 2313 passed; tsc/vite/go build exit 0; commit 5d8db7ea"
        status: pass
    human_judgment: false
---

# Phase 5 Plan 6: E2E Gate — Desktop-Untouched Loop, Exactness, Narrow Backstop, CI Summary

VERIFY-01 is fully armed: desktop invariance is proven per-route on both desktop projects (10-route parameterized loop, 20 combos), the mobile bar is proven exact against the ONE registry, the de/fr 320/360px long-text backstop is executable geometric evidence, and a new `playwright` job runs the whole 4-project suite in CI on every push/PR — with the phase closed on a green full local gate and a freshly committed web/dist.

## Performance

- **Duration:** 39 min
- **Started:** 2026-09-12T00:37:21Z
- **Completed:** 2026-09-12T01:16:40Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## What Shipped

- **desktop-untouched.spec.ts:** a parameterized loop over all 10 canonical routes (verbatim from the frozen router) restricted to the two desktop projects by name. Per route x project: `desktop-sidebar` visible, `bottom-nav` zero DOM matches (never rendered, not CSS-hidden), `#bv-main` present — 20 green combinations. Header cites VERIFY-01 criterion 4 and the fresh-DB chrome-only contract.
- **mobile-shell.spec.ts bar exactness:** the bar's slot row (`div.flex.h-14` children) holds EXACTLY the registry slots — fresh-DB: Dashboard, Containers, Settings links + the More button = 4, with `getByRole("link")` pinned to 3 so no gated destination can leak into the bar while its desktop gate is off.
- **narrow-viewport.spec.ts:** de AND fr at BOTH 320px and 360px on both mobile projects. Locale seeded via `addInitScript` on the persisted `bv-lang` key before load; fr liveness proven by waiting on the localized More trigger before measuring (de ships inline, fr is an async chunk). Assertions are geometric: every bar caption and More-sheet row label stays within one explicitly normalized 20px line box (two full lines need >= 2x, so the 1.5x bound cannot pass the two-line failure mode; +0.5px subpixel tolerance), and the bar's `scrollWidth <= clientWidth` (+1px). The long de/fr compounds ("Einstellungen", "Wiederherstellung", "Paramètres", "Récupération") are the stress cases.
- **lint.yml `playwright` job:** parallel to go/web/test; npm ci -> npm run build -> go build the repo-root `bombvault` (build BEFORE go build — the stale-embed pitfall) -> `npx playwright install --with-deps chromium webkit` -> `npx playwright test`; timeout-minutes 20; checkout/setup-go(1.26)/setup-node(24) digests copied verbatim from the sibling jobs (T-05-SC); header explains the VERIFY-01 arming and why the job lands after the specs exist (no-tests-found guard). Existing jobs and triggers byte-identical (28 insertions, 0 deletions); YAML parse verified with gopkg.in/yaml.v3.
- **web/dist phase close:** rebuilt through the full gate and committed (5d8db7ea) — only index.html is tracked (gitignore negation).

## Task Commits

1. **Task 1: desktop-untouched 10-route loop + bar-exactness** - `f48037fb` (test)
2. **Task 2: narrow-viewport de/fr backstop + server-look-proof e2e boots** - `35584836` (test)
3. **Task 3: lint.yml playwright CI job** - `be2bdcd1` (ci); **web/dist phase close** - `5d8db7ea` (chore)

## Verification

- `node node_modules/vitest/vitest.mjs run`: **2313 passed, exit 0**
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0; `node node_modules/vite/bin/vite.js build`: exit 0
- `go build -o bombvault.exe ./cmd/bombvault`: OK (fresh binary embeds the fresh dist)
- `npx playwright test e2e/desktop-untouched.spec.ts`: **exit 0, 20 passed / 20 skipped** (10 routes x desktop-1280 + desktop-768)
- `npx playwright test e2e/mobile-shell.spec.ts`: **exit 0, 16 passed / 8 skipped** (incl. exactness on both mobile projects)
- `npx playwright test e2e/narrow-viewport.spec.ts`: **exit 0, 8 passed** (de/fr x 320/360 x both mobile projects)
- `npx playwright test` (FULL, 4 projects incl. WebKit against the freshly built binary): **exit 0, 48 passed / 36 skipped, 11.6s**
- lint.yml: `git diff` confined to the new job (28+/0-); YAML parse OK (jobs: go, web, test, playwright; on-block intact); digest parity with siblings verified by verbatim copy
- Zero harness artifacts tracked: git status shows no test-results/, playwright-report/, .playwright-data/, or bombvault binary entries (gitignored since plan 01); webServer killed and port 3000 confirmed free after every run

## must_haves Coverage

1. DESKTOP-UNTOUCHED per-page on both desktop projects as a 10-route loop - **covered** (D1; 20 combos green)
2. Mobile exactness: exactly the enabled bar destinations + More, Sidebar zero matches - **covered with a Rule 1 count correction** (D2; fresh-DB count is 4 = 3 destinations + More because files_enabled defaults false; the parenthetical — enabled destinations + More — is asserted, including zero leaked links)
3. Narrow-viewport backstop operationalized (de/fr x 320/360, single-line, no clipping via the min-w-0+truncate contract, no bar overflow) - **covered** (D3)
4. CI gate: playwright job in lint.yml, build-first, digest-pinned siblings, 4 projects - **covered** (D4)
5. Regression gate armed from this phase on - **covered** (the job runs the full suite on every push/PR; any assertion failure fails CI)
6. web/dist rebuilt and committed at phase close - **covered** (D5; 5d8db7ea)

truths_backstop: long-text de/fr at 320/360 never wraps and never clips in bar or sheet - **covered** (D3, executable geometric evidence).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Repo fact] "Exactly 5 slots" is the files-enabled count; the fresh-DB bar renders 4.**
- **Found during:** Task 1
- **Issue:** The plan asserts the bar contains exactly 5 slot elements, but `barDestinations(settings)` gates every slot on the desktop Sidebar's settings — `files_enabled` defaults false (`internal/store/settings_test.go:146` "default files_enabled must be false"), so the fresh harness DB yields Dashboard, Containers, Settings + the always-contentful More trigger = 4 slots. The navModel doc comment states the 3+More semantics explicitly ("matching desktop Sidebar gating exactly", prohibition 8), and 05-05-SUMMARY pre-announced exactly this in its must_haves coverage ("the parenthetical is the substance").
- **Fix:** Assert the EXACTNESS with the fresh-DB identity: slot row children == 4, the three named links == 1 each, More button == 1, total destination links == 3 (zero leakage). The count literal is documented in the spec comment with the why.
- **Files modified:** web/e2e/mobile-shell.spec.ts
- **Verification:** exactness test green on both mobile projects
- **Committed in:** f48037fb (Task 1)

**2. [Rule 1 - Repo fact] The server-side display-pref look clobbers the page locale seed at boot.**
- **Found during:** Task 2 (first narrow-viewport run: all fr tests failed, pages rendered German)
- **Issue:** `displayPrefs.sync()` runs at boot and the SERVER is the truth for the look (#191): a stored `bv-lang` on the harness DB is written INTO localStorage and adopted, overriding the spec's seed. Observed live: the de tests' boot `save()` seeded `{"bv-lang":"de"}` onto the shared harness server mid-run, and the parallel fr pages then booted German; the pref then persisted in `.playwright-data` (the DATA_DIR comment says "fresh per run" but nothing deletes the dir), which would have broken mobile-shell's English-name assertions on every future run too.
- **Fix:** Both narrow-viewport and mobile-shell cut the boot-time reconciliation fetch (`page.route("**/api/display-prefs*", abort)`) — sync()'s fetch failing is the app's own documented degradation path ("offline: the cache is the look"), so the seed stands, nothing is PUT back, and parallel de/fr workers cannot clobber each other through the shared server. desktop-untouched needed no change (testid/element assertions are language-agnostic).
- **Files modified:** web/e2e/narrow-viewport.spec.ts, web/e2e/mobile-shell.spec.ts
- **Verification:** full narrow suite green (8/8 with correct locales); mobile-shell green with the polluted DB present
- **Committed in:** 35584836 (Task 2)

**3. [Rule 3 - Environment] Playwright's own webServer teardown hangs on Windows; runs re-executed against a manually started server for truthful exit codes.**
- **Found during:** Task 1 (first verify: a green run hung >25 min after the last test — the CLI could not tear down its bombvault.exe child; 05-05 Deviation 5 recurring harder)
- **Issue:** With `reuseExistingServer: !CI` true locally, Playwright spawning AND killing the webServer is the hang; a piped invocation then never returns and even kills the exit evidence.
- **Fix:** The webServer is started manually in a prior call with the EXACT harness env (throwaway 64-zero APP_KEY, gitignored DATA_DIR, HTTP_ONLY, port 3000) and health-polled; Playwright then takes the reuseExistingServer path — no spawn, no teardown, real exit codes in seconds. After EVERY run the binary is killed from a separate shell call (sequencing the kill in the same command deadlocked once in 05-05) and port 3000 confirmed free. CI is unaffected: `CI=true` makes reuseExistingServer false and the job boots its own binary, exactly as configured.
- **Files modified:** none (execution procedure only)
- **Verification:** every spec run in this plan reports a truthful PW_EXIT (0) and the port is free after each
- **Committed in:** n/a (documented procedure)

**Total deviations:** 3 auto-fixed (2 repo-fact Rule 1, 1 environment Rule 3). **Impact on plan:** all three were correctness/determinism fixes inside this plan's own file scope; no scope creep, no frozen file touched.

## Authentication Gates

None occurred.

## Known Stubs

None - no stub patterns introduced; every deliverable is final and gate-armed.

## Issues Encountered

- Playwright `evaluateAll` callbacks execute in the browser: the line-box constant was initially closed over from module scope (`Can't find variable: LINE_BOX`) — fixed by passing it as evaluateAll's arg. In-task fix, part of Task 2's commit.
- `bombvault.stale.exe` (untracked, pre-existing from a prior session) was left untracked — out of scope for this plan.

## Next Phase Readiness

- Phase 5 is complete: the shell, chrome surfaces, viewport contract, and the VERIFY-01 gate are all landed and armed; phases 6-8 build every mobile surface inside this CI gate.
- The stale `{"bv-lang":"de"}` display pref in `.playwright-data/` is now harmless (every localized-name spec cuts the reconciliation), but the phase 8 real-device/i18n sweeps may still want a cleaned scratch DATA_DIR as a starting point.

---
*Phase: 05-mobile-shell-navigation-foundation*
*Completed: 2026-09-12*
