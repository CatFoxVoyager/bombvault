# Deferred Items — Phase 07 (recorded during 07-06 execution)

## Pre-existing e2e failures discovered during full-suite verification (07-06)

**Found during:** 07-06 final verification (full playwright suite after Task 3)

**What:** `web/e2e/platform-chrome.spec.ts` — "mobile cupertino: attribute flips, token resolves, consumers re-skin" (:135) and "mobile material: the same consumers keep today's expressions" (:166) both fail on mobile-android with `expect(locator).toBeVisible() failed` for `input[type='checkbox']` on /vms (:159/:182 — the spec reads a checkbox consumer token at a live VM multi-select checkbox).

**Attribution (decisive, not assumed):** a baseline run of the three failing specs at commit **713bc6b3** (last pre-07-06 commit) reproduces exactly these 2 failures (2 failed / 19 passed / 31 skipped) while tap-popovers and maquette-screens pass there. The failures therefore pre-date 07-06 entirely — the VMs mobile retrofit (07-03, 828c9f20) moved the multi-select checkbox out of the always-visible mobile surface (VM card checkbox is gated on `onToggleSelect`, a prop the mobile card block does not pass), so the spec's checkbox consumer probe no longer has a live target below md.

**Why not fixed here:** outside 07-06's files list and outside its scope boundary (SCOPE BOUNDARY: only auto-fix issues directly caused by the current task's changes). Fixing means either a product change to VMs.tsx (resurfacing a desktop-only affordance on mobile — a design decision belonging to the 07-03 owner or 07-08's battery sweep) or retargeting the spec's consumer probe to another mobile-visible checkbox — a contract decision on a phase-07-01 spec, not a 07-06 bug.

**Suggested owner:** the 07-08 operational-parity sweep (which already extends the route battery) or a follow-up fix pass.

**Repro:** `cd web && node node_modules/@playwright/test/cli.js test e2e/platform-chrome.spec.ts --project=mobile-android` (2 failed; unaffected by any 07-06 commit — identical at 713bc6b3).
