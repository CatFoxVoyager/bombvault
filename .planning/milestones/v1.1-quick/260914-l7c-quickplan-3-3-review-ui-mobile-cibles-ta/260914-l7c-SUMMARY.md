---
phase: quick
plan: 260914-l7c
subsystem: web-spa-mobile-layout
tags: [mobile, touch-targets, folderbrowser, fresh-install-nudge, humanbytes, max-md, ui-review-lot3]
requires:
  - web/src/pages/Containers.tsx (cibles/Add row)
  - web/src/components/FolderBrowser.tsx (shared value+trigger row, ~19 call sites)
  - web/src/pages/Dashboard.tsx (FreshInstallNudge CTA + chip close)
  - web/src/components/Button.tsx (MOBILE_BLEED / chip exclusion — cited, NOT modified)
  - web/src/lib/forecast.ts + forecast.test.ts (shared humanBytes)
  - web/src/lib/activityLog.ts (formatBytesShort mirror)
  - web/src/components/RestorePanel.tsx (humanBytes mirror)
provides:
  - P0-1 — container targets panel at 390px: field full-width, Browse wrapped below, Add on its own line — zero overlap; every FolderBrowser call site gains the same mobile fix through the shared component
  - P1-4 — FreshInstallNudge close chip gets a >=44px mobile touch pad at the call site (46px), Button.tsx untouched
  - P2-5 — recovery CTA reaches 44px below md via the house link-as-control height (Config/Flash precedent)
  - P2-6 — all three mirrored byte formatters promote at 95% of every unit boundary ("1022.7 KB" reads "1.0 MB")
affects:
  - Containers > targets panel at 390px (no more field/Add overlap)
  - ALL FolderBrowser call sites on mobile (same latent overflow fixed everywhere — RestorePanel, Files add-folder-set dialog, Settings, Recovery); desktop >=48rem identical by construction
  - Dashboard > FreshInstallNudge at 390px (close chip and CTA at the D-06 floor)
  - Every byte display near a unit boundary (Dashboard, activity log, RestorePanel) — values ~971-1023 B now read "1.0 KB" (wanted delta)
tech-stack:
  added: []
  patterns:
    - max-md:-scoped-only class additions (desktop render identical by construction)
    - call-site re-pass of the D-06 bleed classes (recalculated inset for the chip's 18px engine box)
    - house link-as-control height precedent (Config/Flash destinations-gate) scoped max-md
    - 95%-of-boundary promotion rule kept in lockstep across three mirrored formatters
key-files:
  created: []
  modified:
    - web/src/pages/Containers.tsx
    - web/src/components/FolderBrowser.tsx
    - web/src/pages/Dashboard.tsx
    - web/src/lib/forecast.ts
    - web/src/lib/forecast.test.ts
    - web/src/lib/activityLog.ts
    - web/src/components/RestorePanel.tsx
    - web/dist/index.html (rebuilt in each code commit)
decisions:
  - "P0-1 fixed in TWO files as the plan prescribed: the outer row wraps below 48rem AND FolderBrowser's internal value+trigger row wraps — without the internal wrap the input's ~192px intrinsic min-content plus the trigger would still overflow any narrow mobile column even at full wrapper width. min-width:100% (max-md:min-w-full) forces a flex-1 item to wrap without relying on cascade order."
  - "P1-4 bleed re-passed at the call site with a 14px inset instead of the shared 12px: the chip's engine box is 18px, so 18 + 2x12 = 42 stays under the 44px floor while 14px per side reaches 46. Button.tsx untouched — the chip variant's deliberate bleed exclusion (Button.tsx 'Scoped to the DEFAULT variant only' block) was cited, not changed."
  - "P2-5 stays a Link (Button renders a <button>, which cannot navigate; no LinkButton engine component exists). The documented filled-accent treatment is kept; only the mobile height floor is added."
  - "P2-6 loop condition changed identically in all three mirrors; all pre-existing test expectations re-verified compatible by calculation before editing (512 B, 1536, 2xGIB, sizeBytes 1024, 1 MB, 2 MB, 2 KB fixtures all render identically under the new rule)."
metrics:
  estimated_duration: 30-40min
  duration: 9min
  completed: 2026-09-14
status: complete
actuals:
  tokens: 2881
  tasks: 2
  commits: 2
---

# Quick Task 260914-l7c: Review UI mobile lot 3/3 — cibles tactiles + polish (P0-1, P1-4, P2-5, P2-6) Summary

Closed the final lot of the 390px mobile review: the only P0 (FolderBrowser field/Add overlap in the container targets panel) fixed by wrapping both the outer row and the shared component's internal row below 48rem; the nudge's chip close control given a real touch pad at the call site (Button.tsx untouched); the recovery CTA given the house link-as-control height on mobile; and all three mirrored byte formatters promoted at 95% of each unit boundary.

## Tasks Delivered

| Task | Findings | Commit | Files |
| ---- | -------- | ------ | ----- |
| 1 | P0-1 — targets panel stacked below 48rem; FolderBrowser wraps internally | 1ec0739e | web/src/pages/Containers.tsx, web/src/components/FolderBrowser.tsx, web/dist/index.html |
| 2 | P1-4 + P2-5 + P2-6 — chip touch pad, CTA height, 95%-boundary byte promotion in 3 mirrors | f9a38d5b | web/src/pages/Dashboard.tsx, web/src/lib/forecast.ts, web/src/lib/forecast.test.ts, web/src/lib/activityLog.ts, web/src/components/RestorePanel.tsx, web/dist/index.html |

## What Changed

- **Containers.tsx (P0-1)** — the add-path row gains a wrap behavior below 48rem (flex-wrap) and the FolderBrowser wrapper claims the full line (min-w-full scoped under md); the Add action wraps onto its own line. New why-comment above the row (paraphrased, no grep-gate literal); the Add control's long comment extended with the width-conditional geometry clause — its Badge-to-Button history kept verbatim, the items-end alignment now documented as the desktop presentation.
- **FolderBrowser.tsx (P0-1, root cause)** — the shared value+trigger row wraps below 48rem and the path input claims the full line; the trigger wraps below it. Fixes the same latent overflow at every one of the ~19 call sites (RestorePanel, Files add-folder-set dialog, Settings, Recovery). Why-comment added above the row citing the measured 390px failure and the shared call sites; all pre-existing commentary blocks of the component left intact.
- **Dashboard.tsx (P1-4)** — the FreshInstallNudge chip close re-passes the D-06 bleed classes via className with a 14px-per-side inset (46px total against the 44px floor); why-comment cites Button.tsx's chip-exclusion block and explains the recomputed inset and why a padded wrapper could not work. Button.tsx byte-identical.
- **Dashboard.tsx (P2-5)** — the recovery CTA Link gains the link-as-control height floor below 48rem (the Config/Flash destinations-gate value); the existing filled-accent comment extended with the mobile-height clause and the why-not-a-Button reason. Desktop keeps the 32px engine control height.
- **forecast.ts / activityLog.ts / RestorePanel.tsx (P2-6)** — identical one-line loop-condition change in all three mirrored formatters plus extended doc comments: promotion at 95% of each unit boundary so a value rounding to the next unit's "1.0" never renders in the lower unit; the mirrors' lockstep obligation documented in each file so the "reads the same everywhere" claims stay enforceable.
- **forecast.test.ts** — new boundary-promotion it: 1047245 -> "1.0 MB" (the review's exact case), 994304 -> "971.0 KB" (just under the zone), 1048576 -> "1.0 MB" (exact boundary). No existing expectation touched.

## Verification

- Task 1: tsc --noEmit green; eslint clean on both files; vite build green; vitest 4 files / 75 tests passed (Containers.tree, Containers.excludesAssistant, Button.dom, i18n.preseed); grep gates max-md:flex-wrap / max-md:min-w-full = 1 in each file.
- Task 2: tsc --noEmit green; eslint clean on all five files; vite build green; vitest 6 files / 93 tests passed (forecast, activityLog, Dashboard.protectionCard, Dashboard.ransomwareCard, Containers.excludesAssistant, i18n.preseed); grep gates max-md:after:-inset-3.5 / max-md:min-h-[2.75rem] = 1, the new threshold expression = 1 in each of the three formatters.
- i18n.preseed.test.ts green at both tasks = zero new locale keys (common.close and recovery.freshNudge* already in all 42 tables).
- All tool invocations via direct node entry points from web/ (npm/npx shims lose node on this machine — lot-1 lesson, observation 0013).
- web/dist/index.html rebuilt and committed inside each code commit (quick-task convention; only index.html is tracked under web/dist).
- Desktop identity: every added class is max-md:-scoped, base class lists intact — >=48rem render identical by construction; jsdom limitation assumed (no test asserts max-md CSS geometry); desktop-untouched.spec.ts out of quick scope per plan, re-proven at the next full e2e gate.
- Working tree after both commits: no tracked web/ modification left; no pre-existing untracked artifact staged; exactly one Co-Authored-By trailer per commit; zero file deletions in either commit.

## Deviations from Plan

**1. [Rule 1 - Bug, fixed in-flight] Task 2 commit initially staged only 3 of 6 files**
- **Found during:** Task 2 commit
- **Issue:** the first `git add` in the Task 2 commit command carried a wrong relative pathspec (`src/lib/activityLog.ts` instead of `web/src/lib/activityLog.ts`), which fails the whole multi-path add; the error was silenced by a trailing `2>/dev/null`, so the commit landed with only RestorePanel.tsx, activityLog.ts and dist — caught immediately by the commit's stat line (3 files vs the intended 6) during the post-commit check.
- **Fix:** staged the three missing files and `git commit --amend --no-edit`; the amended commit f9a38d5b contains all 6 intended files, one trailer, zero deletions. The interim hash 791e4794 never left the machine.
- **Files modified:** none beyond the plan's list (amend, not extra commit)
- **Commit:** f9a38d5b

**2. [Process] No docs/SUMMARY commit, no STATE.md update**
- Per the orchestrator constraint for this run: SUMMARY.md written but uncommitted; STATE.md and the docs commit belong to the orchestrator. Code commits are exactly the 2 atomic code+dist commits the plan required.

No plan-content deviations: every content anchor existed where the plan said (re-verified by reading the source before editing); both tasks landed exactly as prescribed; no edit ever needed a new locale key, so the STOP-and-preseed branch never triggered.

## Constraints Audit

- DESKTOP_QUERY the only breakpoint authority; all class additions exclusively max-md:-scoped; base class lists untouched; desktop >=48rem identical by construction.
- Button.tsx untouched (verified: zero diff across the task range).
- Zero new npm deps; zero backend changes; zero user-visible text changes (so no em-dash exposure).
- All why-comments paraphrase the grep-gate literals (all gate counts = 1); no comment contradicts the code it documents; contradicted comment passages (the Add row geometry, the CTA treatment) extended in place with their still-true history preserved.
- Files touched: exactly the 7 planned source/test files + web/dist/index.html. Nothing else staged.
- D-06 44px floor: chip now 46px, CTA >=44px below md; no control shrinks anywhere.

## Known Stubs

None.

## Self-Check: PASSED

- All 7 modified source files FOUND in the working tree and in the commit range e9b7b597..HEAD.
- Commits 1ec0739e (Task 1) and f9a38d5b (Task 2, amended) FOUND on docker-folders, both on top of e9b7b597 (the plan commit).
- web/dist/index.html present in both commits; total range = 8 files, 77 insertions, 16 deletions, 0 deletions-of-file.
- No locale-key addition anywhere in the range (preseed suite green at both verify steps).
