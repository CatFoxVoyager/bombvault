---
phase: 07
plan: "01"
subsystem: web-platform-chrome
tags: [plat-01, platform-adaptive, data-platform, css-custom-properties, mobile-chrome, material, cupertino]
requires:
  - phase 5 mobile shell (main#bv-main page column, no-fixed contract)
  - phase 6 mobile components (ToggleRow, StickyActionBar precedents)
  - web/src/lib/shape.ts (the cloned validate-or-fall-back attribute model)
provides:
  - web/src/lib/platform.ts (Platform union, bv-platform persistence, applyPlatform choke point, usePlatform reader)
  - "[data-platform] --mob-* custom-property axis in index.css (fab/title/check/chip, both values defined)"
  - Fab component (material primary action; renders null under cupertino)
  - bv:platform-changed window event (applyPlatform announcement)
affects:
  - plan 07-03 (VMs mobile block consumes the mobile-visible surface the e2e stages)
  - plan 07-05 (Settings chip strip consumes rounded-(--mob-chip-radius); Fab consumption on new surfaces)
  - plan 07-08 (phase gate refreshes web/dist)
  - phase 8 (real-device pass revisits the material default via DEFAULT_PLATFORM)
tech-stack:
  added: []
  patterns:
    - attribute-axis custom-property blocks (data-shape precedent, values + bible citation in one block)
    - single setAttribute choke point with validate-or-fall-back coercion (T-07-01)
    - announcement event for structural consumers (useLabelMode precedent)
key-files:
  created:
    - web/src/lib/platform.ts
    - web/src/lib/platform.test.ts
    - web/src/components/mobile/Fab.tsx
    - web/src/components/mobile/Fab.dom.test.tsx
    - web/e2e/platform-chrome.spec.ts
  modified:
    - web/src/index.css
    - web/src/main.tsx
    - web/src/app/mobileShellSource.test.ts
decisions:
  - "usePlatform() reads the APPLIED ATTRIBUTE, not localStorage — the attribute is what renders; cross-tab storage events route through applyStoredPlatform() so one coercion + one writer hold"
  - "Check-consumer e2e verifies scoped-rule presence + resolved --mob-check-radius at a live checkbox: Chromium normalizes author border-radius on appearance:auto checkboxes (measured: computed 0px, pixel-identical paint)"
  - "Check-consumer surface is /vms with a staged list: /settings renders no native checkboxes (all rows are ToggleRow) — the plan's /settings premise was stale"
  - "Fab radius keeps rounded-(--mob-fab-radius) under a bv-convention-exception marker: the radius is the platform-axis token by design, not a shape-engine value"
metrics:
  duration: ~2h (2026-09-13T09:09Z start)
  completed: 2026-09-13
  tasks: 2
  commits: 2
status: complete
actuals:
  tokens: 92000
  tasks: 2
  commits: 2
---

# Phase 7 Plan 01: Platform-Adaptive Chrome Layer Summary

**One-liner:** data-platform (material|cupertino) attribute layer — coerced bv-platform persistence through one applyPlatform choke point, --mob-* custom properties consumed below md, and a null-under-cupertino Fab — with UA-sniffing guard needles and desktop-untouched e2e proof.

## What Was Built

- **web/src/lib/platform.ts** — the shape.ts discipline cloned: closed `Platform` union ("material" | "cupertino"), `PLATFORM_STORAGE_KEY = "bv-platform"`, `DEFAULT_PLATFORM = "material"`, `isPlatform` validate-or-fall-back coercion, `applyPlatform()` as the ONLY `setAttribute("data-platform", ...)` site (guarded in mobileShellSource.test.ts), `applyStoredPlatform()` for boot/adoption, and `usePlatform()` reading the applied attribute with live updates on the `bv:platform-changed` announcement plus cross-tab "storage" routed through the choke point. Header carries the recorded no-OS-detection decision (UA sniffing banned; Phase 8's real-device pass is the revisit venue).
- **web/src/index.css** — `:root[data-platform="material"|"cupertino"]` blocks defining all five `--mob-*` vars for BOTH values with design-bible citations (android.html .fab; ios.html .navbar h1 32px/700 -0.5px, the ONE sanctioned 700); below-md consumer rules inside `@media not all and (width>=48rem)` (mirrored verbatim from the repo's compiled max-md output): the cupertino page-title rule scoped to `main#bv-main h1.text-2xl` and the both-values `input[type="checkbox"]` radius rule. Deliberate no-material-title-twin why-comment; consumption-contract comment (chip token's consumer is 07-05).
- **web/src/main.tsx** — `applyStoredPlatform()` after `applyStoredLabelModes()` in BOTH the boot block and the ADOPTED_EVENT listener (#191 call-order discipline).
- **web/src/app/mobileShellSource.test.ts** — extended (not forked) with: a recursive src walk UA-needle ban (`navigator.userAgent` / `userAgentData` in NO file, D-12), a self-guard, and a single-writer guard pinning `setAttribute("data-platform"` to exactly `["lib/platform.ts"]`.
- **web/src/components/mobile/Fab.tsx** — the material primary action: props-closed (label/icon/onClick/ariaLabel), renders null under cupertino (the sanctioned structural switch), h-13 (52px, clears the 44px touch floor), `rounded-(--mob-fab-radius)`, `bg-accent text-accentContrast`, in-flow placement with the recorded D-12 deviation comment (maquette artboard coordinates are not app spec; no shadow, no fixed/absolute).
- **web/e2e/platform-chrome.spec.ts** — fresh-profile resolves material; cupertino flip re-skins real consumers (h1 computes 32px/700 on /dashboard; check consumer resolves 999px); material inertness (h1 keeps 20px/600; check resolves 0px); desktop-1280 shell unchanged with the attribute present (T-07-02).

## Tasks Completed

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | data-platform end-to-end (tracer) | c65034f3 |
| 2 | Fab — material primary action | 7377f0d3 |

## Verification Results

- vitest trio (platform.test.ts + Fab.dom.test.tsx + mobileShellSource.test.ts): 50/50 green
- playwright e2e (mobile-android + desktop-1280): 4 passed / 0 failed
- eslint (platform.ts + Fab.tsx): clean
- npm run build (tsc --noEmit + vite build): green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] /settings checkbox premise stale — check consumer relocated to /vms**
- **Found during:** Task 1 (e2e `element(s) not found`)
- **Issue:** The plan asserted a native checkbox on `/settings#notifications` ("NotifyCard rows"), but every settings row has been converted to ToggleRow — no `input[type=checkbox]` exists anywhere on /settings.
- **Fix:** The consumer assertions target `/vms` (its desktop list still renders below md; the VMs mobile block is 07-03's work), with a staged `/api/vms` fixture via `page.route` (maquette-screens' route.fulfill shape) and a `toBeVisible` wait.
- **Files modified:** web/e2e/platform-chrome.spec.ts
- **Commit:** c65034f3

**2. [Rule 1 - Bug] Chromium normalizes border-radius on native checkboxes — consumer proven at the observable level**
- **Found during:** Task 1 (cupertino consumer computed 0px with the rule present and the var resolving 999px)
- **Issue:** Measured in the harness: Chromium drops author `border-radius` on `appearance: auto` checkboxes — computed style reports 0px for ANY author value (a div with the same declaration reports 999px; an `appearance: none` checkbox reports 999px) and screenshots of 0px vs 999px native checkboxes are pixel-identical. `toHaveCSS("border-radius", "999px")` can never pass on a native checkbox in the engine the suite runs.
- **Fix:** The e2e proves what Chromium CAN observe: the checkbox rule's presence INSIDE the max-md media block (rule walk over document.styleSheets) and `--mob-check-radius` resolving AT a live checkbox to the attribute-correct value (999px / 0px). The CSS ships exactly as planned (effective where the engine honors the radius; covers future custom-painted checks); the engine limit is documented at the rule site in index.css and in the spec header. Design itself unchanged — an appearance:none + custom paint redesign would be Rule 4 scope and is deferred to the phase 8 real-device pass.
- **Files modified:** web/e2e/platform-chrome.spec.ts, web/src/index.css (comment only)
- **Commit:** c65034f3

### Deliberate (plan-sanctioned) notes

- `usePlatform()` reads the applied attribute rather than storage (the plan's own useSyncExternalStore fallback shape) — discovered when a storage-reading hook missed applyPlatform announcements; keeps one coercion + one writer.
- Fab's `rounded-(--mob-fab-radius)` fires the house `control-reads-engine-tokens` lint rule; handled with the rule's own sanctioned `bv-convention-exception` marker (never a disable comment, per CLAUDE.md), reason: the radius is the platform-axis token by design.

## Known Stubs

None. All five --mob-* vars have defined values and real or contracted consumers; the chip token's consumer is 07-05's strip markup by plan contract (documented in index.css, not a stub).

## Auth Gates

None encountered.

## Threat Model Outcomes

- T-07-01 (attribute injection): mitigated as planned — applyPlatform coerces every value (valid, invalid, undefined, non-string covered in platform.test.ts); the single-writer source guard pins the choke point.
- T-07-02 (desktop regression): mitigated as planned — --mob-* consumers exist only below md; the desktop e2e asserts the shell is unchanged with the attribute present.

## Self-Check: PASSED

- All 5 created files exist on disk (platform.ts, platform.test.ts, Fab.tsx, Fab.dom.test.tsx, platform-chrome.spec.ts).
- Both task commits present in git log: c65034f3 (Task 1), 7377f0d3 (Task 2).
