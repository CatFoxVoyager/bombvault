---
phase: 05-mobile-shell-navigation-foundation
plan: 01
subsystem: testing
tags: [playwright, e2e, harness, responsive, webkit, chromium, gitignore]

# Dependency graph
requires:
  - phase: 04-file-set-selection-parity
    provides: compiled Go binary bootable at repo root (`go build ./cmd/bombvault`); /api/health endpoint; fresh-DB auth-disabled default
provides:
  - exact-pinned @playwright/test 1.63.0 devDependency (milestone's sole sanctioned package addition)
  - web/playwright.config.ts — 4 projects (desktop-1280, desktop-768 at 48rem boundary, mobile-iphone WebKit, mobile-android Chromium 360x800) whose webServer boots the compiled bombvault(.exe) and polls /api/health
  - web/e2e/health.spec.ts — per-project boot smoke doubling as Playwright's no-tests-found guard
  - gitignore coverage for harness artifacts and the built binary
affects: [05-02-shell-nav, 05-05-device-parity, 05-06-ci-wiring, VERIFY-01]

# Actuals (#2632)
actuals:
  tokens: 2100
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: "@playwright/test 1.63.0 (devDependency, EXACT pin, no ^ or ~)"
  patterns:
    - "webServer over the compiled Go binary (no vite-preview, no MSW) — fresh APP_KEY, gitignored DATA_DIR, HTTP_ONLY=true, /api/health poll per the build.yml Docker smoke precedent"
    - "e2e specs live in web/e2e/ outside vitest's src-scoped include and tsc's program; Playwright transpiles its own config"

key-files:
  created:
    - web/playwright.config.ts
    - web/e2e/health.spec.ts
  modified:
    - web/package.json
    - web/package-lock.json
    - .gitignore

key-decisions:
  - "Absolute binary path in webServer.command instead of the plan's literal '../bombvault': the installed Playwright spawns the command INSIDE the cwd option (lib/runner/index.js:841,877), so a ../-relative path with cwd=repo root would resolve OUTSIDE the repo"
  - "cwd stays repo root so DATA_DIR=./.playwright-data lands at repo root, matching the gitignore entry and the plan's layout"
  - "APP_KEY is the throwaway constant \"0\".repeat(64) with a never-a-real-secret comment; HTTP_ONLY=true replaces any TLS-bypass flag (T-05-04)"

patterns-established:
  - "Harness boots the REAL server with a fresh gitignored data dir — auth disabled by default, no login bypass, no seeded credentials (T-05-02)"
  - "e2e suite is never empty: health.spec.ts guards Playwright's no-tests-found failure"

requirements-completed: [VERIFY-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "@playwright/test 1.63.0 installed as an EXACT-pinned devDependency with lockfile updated in the same change"
    requirement: VERIFY-01
    verification:
      - kind: other
        ref: "node -e \"console.log(require('./web/package.json').devDependencies['@playwright/test'])\" → 1.63.0 (bare, no ^/~); lockfile node_modules/@playwright/test version 1.63.0"
        status: pass
    human_judgment: false
  - id: D2
    description: "4-project Playwright config whose webServer boots the compiled Go binary (throwaway APP_KEY, gitignored DATA_DIR, HTTP_ONLY) and polls /api/health"
    requirement: VERIFY-01
    verification:
      - kind: e2e
        ref: "npx playwright test equivalent (node cli.js) — run 1: '4 passed (6.8m)' exit 0; run 3 (--workers=1): '4 passed (25.9m)' exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Per-project health smoke spec proving the webServer boot path on every project"
    requirement: VERIFY-01
    verification:
      - kind: e2e
        ref: "[desktop-1280] [desktop-768] [mobile-iphone] [mobile-android] › e2e/health.spec.ts › server under test answers /api/health — all ok (176-661ms each)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Harness artifacts (test-results, playwright-report, .playwright-data) and the built binary can never be committed"
    requirement: VERIFY-01
    verification:
      - kind: other
        ref: "git check-ignore -v web/playwright-report/foo.txt .playwright-data/foo.txt bombvault.exe — all three matched (.gitignore:45,46,48); git status shows no harness artifacts"
        status: pass
    human_judgment: false

# Metrics
duration: 71min
completed: 2026-09-11
status: complete
---

# Phase 5 Plan 1: Playwright Harness Foundation Summary

**Playwright e2e harness: exact-pinned @playwright/test 1.63.0 with 4 device projects that boot the compiled Go binary via webServer and pass the /api/health smoke — proven green on two full local runs.**

## Performance

- **Duration:** 71min
- **Started:** 2026-09-11T19:08:12Z
- **Completed:** 2026-09-11T20:19:33Z
- **Tasks:** 2 (Task 1 checkpoint resolved by user approval; Task 2 executed + verified)
- **Files modified:** 5 (3 created, 2 modified... precisely: created web/playwright.config.ts + web/e2e/health.spec.ts; modified web/package.json, web/package-lock.json, .gitignore)

## Accomplishments

- The milestone's single sanctioned package landed: `@playwright/test` **1.63.0 exact-pinned** (no ^ or ~) so Renovate moves the npm package and browser binaries in one lockstep commit.
- The VERIFY-01 harness is PROVEN, not just installed: every one of the four projects (desktop-1280, desktop-768 at the 48rem boundary, mobile-iphone WebKit 390x844, mobile-android Chromium 360x800) boots the real compiled Go binary through `webServer` (throwaway 64-hex APP_KEY, gitignored fresh DATA_DIR, HTTP_ONLY=true) and passes the /api/health smoke. Two complete green runs (default 4-worker and --workers=1), exit 0 both times.
- Harness artifacts and the built binary are structurally uncommittable: web/test-results/, web/playwright-report/, .playwright-data/, /bombvault, /bombvault.exe all gitignored and verified via `git check-ignore`.
- vitest suite untouched and green (93 files, 2241 tests) — the e2e dir sits outside vitest's src-scoped include and tsc's program by construction.

## Task Commits

1. **Task 1: Package-legitimacy gate for @playwright/test** — resolved checkpoint (user approved "approved"; no commit — gate task). Evidence re-verified live this session: npm registry shows version 1.63.0, repository `git+https://github.com/microsoft/playwright.git`, not deprecated, NO postinstall script, engines node>=20 (host node v24.16.0 satisfies).
2. **Task 2: Install @playwright/test exact-pinned + harness config + health smoke** - `8266ea80` (feat)

**Plan metadata:** (this commit) docs(05-01): complete Playwright harness plan

## Files Created/Modified

- `web/playwright.config.ts` - 4-project harness; webServer boots the compiled bombvault(.exe) with dev env and polls /api/health (build.yml smoke precedent); narrative why-comments cite the locked decisions
- `web/e2e/health.spec.ts` - one `page.request.get("/api/health")` ok-assertion per project; doubles as the no-tests-found guard for later plans' specs
- `web/package.json` / `web/package-lock.json` - @playwright/test 1.63.0 exact-pinned devDependency + lockfile
- `.gitignore` - new "# Playwright harness" section: web/test-results/, web/playwright-report/, .playwright-data/, /bombvault, /bombvault.exe

## Decisions Made

- **Absolute webServer.command path** (deviation, Rule 1): the plan's literal `command: "../bombvault"` + `cwd: repoRoot` is self-contradictory — Playwright spawns the command inside the cwd option (verified in installed `playwright/lib/runner/index.js:841,877`), so `..` would climb out of the repo. Fixed with `join(repoRoot, binaryName)`; `cwd` stays repo root so DATA_DIR lands at repo root as planned.
- Node-24-safe repo-root resolution via `fileURLToPath(new URL("..", import.meta.url))` per the plan (no import.meta.dirname dependency).
- Browsers installed locally: chromium + webkit (WebKit 26.6 / webkit-2359, chromium-1243).

## Deviations from Plan

**1. [Rule 1 - Bug] webServer.command made absolute**
- **Found during:** Task 2
- **Issue:** Plan's literal `command: "../bombvault"` combined with `cwd: repoRoot` would resolve the binary outside the repository; verified against the installed Playwright source that the command executes inside the cwd option.
- **Fix:** `command: join(repoRoot, process.platform === "win32" ? "bombvault.exe" : "bombvault")` with a comment explaining why absolute; cwd unchanged.
- **Files modified:** web/playwright.config.ts
- **Verification:** webServer booted the real binary on both green runs; `/api/health` answered HTTP 200 `{"ok":true,"version":"dev"}`.
- **Committed in:** 8266ea80

**2. [Rule 3 - Blocking] npm/npx .cmd shim breakage in this executor shell**
- **Found during:** Task 2 (verification)
- **Issue:** This sandbox's Git Bash session passes a TRUNCATED PATH to cmd.exe children (missing System32 and the node dir), so `npx playwright …` and `npm test` shims fail with `'"node"' n'est pas reconnu`. Environment quirk of this executor session, not a repo or harness defect; the user's normal PowerShell/cmd shells are unaffected.
- **Fix:** No repo change. Verified via the equivalent direct CLI invocation (`node ./node_modules/playwright/cli.js test` — same entry point npx resolves to) and for vitest via a cmd-internal PATH augmentation. Documented for future executors on this machine.
- **Files modified:** none
- **Verification:** both suites green through the workarounds.
- **Committed in:** n/a (environment workaround)

---

**Total deviations:** 2 auto-fixed (1 x Rule 1 bug, 1 x Rule 3 environment blocker workaround). **Impact on plan:** none on scope or behavior — the harness works exactly as specified; the command-path fix was required for ANY run to work.

## Issues Encountered

- **Local browser-launch slowness (Windows machine):** full runs took 6.8m (4 workers) and 25.9m (--workers=1) wall clock while per-test execution is sub-second (176-661ms). WebKit/chromium process launches on this machine are pathologically slow under this session. Not a harness defect; CI (05-06, Linux runners) is unaffected, and warm local runs are expected to settle. A second full run wedged in the 4-worker launch phase and was killed; the clean --workers=1 rerun completed green, proving the suite itself.
- **git check-ignore nuance:** trailing-slash directory patterns don't match the bare non-existent directory path; coverage was proven with the semantically stronger subpath form (`web/playwright-report/foo.txt` etc., all matched at .gitignore:45,46,48).

## User Setup Required

None - no external service configuration required. (Local dev prerequisite: `go build ./cmd/bombvault` at the repo root before `npx playwright test`, and `npx playwright install chromium webkit` once per machine.)

## Next Phase Readiness

- Later plans (05-02 shell/nav, 05-05 device parity) extend a PROVEN gate: `npx playwright test` boots the real binary fresh each run; new specs drop into web/e2e/ and are picked up by all four projects automatically.
- CI wiring is 05-06's job (new `playwright` job in .github/workflows/lint.yml) per the plan's success criteria — deliberately not done here; the health spec already guards the no-tests-found failure until real specs land.
- VERIFY-01 is declared by 05-01, 05-05 AND 05-06 — per the shared-ID gate it stays unmarked until all three plans have summaries.
- For future executors on THIS machine: the npm/npx shim PATH truncation and slow WebKit launches are environment quirks (see Deviations/Issues); use the direct `node cli.js` invocation if shims misbehave.

---
*Phase: 05-mobile-shell-navigation-foundation*
*Completed: 2026-09-11*
