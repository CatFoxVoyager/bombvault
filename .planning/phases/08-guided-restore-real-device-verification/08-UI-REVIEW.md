# Phase 8 — UI Review

**Audited:** 2026-09-15
**Baseline:** 08-UI-SPEC.md (approved 2026-09-14; extends 07-UI-SPEC contract)
**Screenshots:** not captured — code-only audit per orchestrator constraint (dev server WAS detected at localhost:3000/200, but this review was scoped to source analysis). Real-device visual evidence exists separately: 08-UAT.md records the D-11 Android session (cells 5+6 PASS, Procedure R PASS, both themes clean, VERIFY-02 dispositioned 2026-09-15).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Warn step state renders the `spike.info` "Info" label — a warning presented as neutral info |
| 2. Visuals | 3/4 | Page-reload control rendered as a `Badge as="button"` — off-pattern, sub-44px tap target |
| 3. Color | 3/4 | `bg-black/20` hardcoded scrim in the mobile log surface (copied precedent, still non-token) |
| 4. Typography | 3/4 | Mobile step title at `text-sm` — the declared 20px heading role is never used in the flow |
| 5. Spacing | 4/4 | 4/8/16 stops throughout; 44px floors via `min-h-[2.75rem]` + Button bleed |
| 6. Experience Design | 4/4 | Exemplary state coverage: gating, ConfirmSheet, visibility gate, neutral cancel, stay-on-step errors |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **`Badge as="button"` reload control (Recovery.tsx:3447)** — the config-restart "Reload" control renders a `size="small"` Badge as an interactive button. It sits below the 44px mobile floor (no `min-h-[2.75rem]`, no bleed classes — the MOBILE_BLEED fix only reaches `glim-btn` and the two LanguageCard sites) and is the only interactive control in the flow that is not a Button. Replace with `<Button tone="neutral" className="min-h-[2.75rem]" />` exactly like its sibling at :3460 (the `configPhase === "reload"` branch already does this correctly).
2. **Warn step state labeled "Info" (Recovery.tsx:2772-2777)** — `MOBILE_STEP_BADGE.warn` maps to `spike.info`; a user whose repo check lands on `warn` (the honest first-run "not attached yet" state, per the gate comment at :3097-3099) sees a warn-hued badge reading "Info". The four-status rule requires the label to be honest, not just present. Add one key (`spike.warn`-equivalent, or reuse an existing "Needs attention"-class string if the census allows) in the next i18n sweep commit; if the two-key census is treated as binding, record the mapping as a documented exception at the map site.
3. **Mobile step title typography (Recovery.tsx:3295)** — the step title renders `text-sm font-semibold` (14px), while the type table declares a 20px/600 heading role for "stat values / step-state values". Either promote to `text-base`/`--text-heading` in a mobile-only way, or record the step-title role (14px/600, desktop StepCard title parity) as an explicit exception in the UI-SPEC typography table so the next auditor does not re-file it.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- All mobile-block strings route through `t()` (Recovery.tsx:3275, :3296, :3313-3341, :3355-3479, :3556-3795, bar block :3802-3917). No raw literals, no em dashes in user text (the preseed test enforces the two new keys' copy).
- The two-key i18n census verified: `recovery.mobile.stepOf` and `common.continue` present in `web/src/lib/i18n.ts` en (:1261, :1646) + de (:2968, :3298); `grep -L "recovery.mobile.stepOf" src/lib/locales/*.ts` returns **0 files** — all 40 locale tables carry the keys.
- Desktop `recovery.*` keys reused verbatim (titles map :2783-2790, action keys in the bar). No mobile fork of step copy. `recovery.filesFound`/`configSkipped`/`readFrom`/`filesRestoreHint` all pre-existing keys (i18n.ts:1579-1780) — census holds.
- Backend error text verbatim everywhere (`lastError` :3326, `configError` :3474, `discoverError` :3572, verify results :3776, kitError :3795), with the honest English-by-design comments preserved.
- **Finding (the dedent):** the warn badge label. See Top Fix 2. One string-level honesty gap in an otherwise exacting contract.

### Pillar 2: Visuals (3/4)
- Clear structure per the Screen Contract ASCII: h1 → chip+Back header (:3273-3288) → titled card body → StickyActionBar. Position chip matches reservation 12 (`bg-accentSoft px-2 py-1 text-xs font-semibold tabular-nums text-accentText`, :3274). One log style only (MobileLogList :2887, the RunDetailSheet LogList copy).
- Four-status rule honored structurally: `MOBILE_STEP_BADGE` (:2772) renders Badge + TEXT label, never the desktop bare dot; per-target badges use shared `statusTone`/`statusLabel` (:3650-3652); cancelled renders the neutral bucket.
- **Finding:** the `Badge as="button"` reload control (:3447). See Top Fix 1. Visually it also reads as a status chip, not a control — a double affordance defect (appearance + tap target).
- StickyActionBar is a direct child of the PAGE_SHELL column via the fragment root (:3266-3268, documented why-comment) — sticky-in-flow discipline intact.

### Pillar 3: Color (3/4)
- Semantic tokens only across the mobile block: `carbon-*`, `statusOk/Warn/Fail*`, `accentSoft`/`accentText`. Zero raw hex in Recovery.tsx (grep clean). The 08-04 D-06 fix 2 landed tonal: ActivityLog.tsx:474 mobile chip is `bg-accentSoft text-accentText ps-2 pe-1 py-1` (padding normalized to 4/8 stops as contracted); the desktop :418 twin stays solid, verified byte-identical.
- D-03 anatomy verified in code: restore-all (:3625), config restore (:3415), verify row (:3756) are all `tone="neutral"` — never accent, mid-screen, never in the thumb-zone bar. The sticky-bar safe actions are `tone="accent"` solid — solid accent primary in a sticky bar is the established house language (Files.tsx:2418+ save bar, Config), so this is sanctioned by precedent even though the UI-SPEC reservation list does not name it explicitly (documentation nit, not a defect).
- **Finding:** `bg-black/20` log scrim at Recovery.tsx:2891 (mirrored from RunDetailSheet.tsx:186's identical class — the "copy class-for-class" precedent). Not a design-bible hex and theme-tested on device (UAT checklist 4 PASS), but it is a non-token surface color in a mobile region; promote to a token or record the shared LogList scrim exception in the guard's needle list comment.

### Pillar 4: Typography (3/4)
- Exactly two weights in new code: 400 / 600 (`font-semibold` on chip and step title only; the desktop twin's `font-medium` at ActivityLog:418 is outside the mobile-regions guard scope by the D-06 fix-3 contract). Verified by grep — no `font-medium`/`font-bold` inside the MobileRecoveryFlow block.
- Sizes: `text-xs` (12px dense) for meta/hints/log, `text-sm` (14px body) for step titles and status lines — consistent with the label/body roles; `font-mono` + `tabular-nums` on log timestamps (:2894) and the position chip (:3274) per the monospace register contract.
- **Finding:** the 20px/600 heading role is unused in the entire flow; step titles sit at 14px semibold. See Top Fix 3.

### Pillar 5: Spacing (4/4)
- Class census across the mobile block: `gap-4` (card rhythm), `gap-2`/`gap-1` (in-card), `p-4` (card padding), `px-2 py-1` (chip), `px-4 py-2` (narration states, copied class-for-class from Config.tsx:1200-1228). All on the declared 4/8/16/24 scale.
- Structural dimensions correctly exempt and used as contracted: `min-h-[2.75rem]` 44px floors on every body action row and every bar button (:3424, :3632, :3763, and all five StickyActionBar blocks); `max-md:after:-inset-3` bleed on the shared Button default variant (Button.tsx:127, chip variant deliberately excluded with why-comment) and both LanguageCard raw sites (:106, :131).
- The one off-scale value, `ps-5` on the chain-narration `<ol>` (:3408), is a list indent copied from the Config precedent — structural, not a spacing token. No arbitrary `[Npx]` spacing anywhere.
- Guard enforcement is machine-proven: `mobileShellSource.test.ts` carries the D-06 fix-3 mobile-regions scope comment, `WHOLLY_PHASE8_FILES` and the Recovery.tsx MIXED_FILES anti-shrink floor calibrated by the last writer (08-04 mutation test: planted `gap-3` failed exactly the guard).

### Pillar 6: Experience Design (4/4)
- **Gating:** `gateTo()` (:3095-3114) mirrors desktop disclosure order; step 5's Continue bar renders only when the kit gate holds (:3886) — an unmet gate cannot even render its bypass. Zero-target users reach the kit (:3111).
- **Loading:** per-step busy (`checking` :3810, `attachState` :3845, `discovering` :3868, `configPhase` :3422, `verifyBusy` :3761, `restoreAllBusy` :3630) with disabled+busy+tip-bubble treatments (the e2e proves the dead-control bubble path).
- **Error:** every failed action stays on-step with the error visible in the body; chrome (chip/Back/bar) never navigates away. Backend text verbatim, pre-scrubbed.
- **Empty/partial:** `recovery.foundNone` (:3569), `recovery.noneDiscovered` (:3597), `recovery.configSkipped` (:3361), SSH-note degradation instead of silent skip (:3659).
- **Destructive safety:** all three restore paths behind the shared `useConfirm` → ConfirmSheet (destructive top, cancel thumb-default); narration `<ol>` renders read-only above the config restore (:3407-3414, DOM order asserted in e2e).
- **Visibility:** the runs poll and live section are `useVisibilityGate`-gated (:3127-3147, :3739-3745); hidden pauses the chain, return reconciles from the server record — proven by the staged-SSE e2e (poll counter flat across a hidden window) AND by the on-device visibility probe (08-UAT).
- **One fire path:** every mobile control closes over Recovery()'s own handlers (props only, :2975-3079); the only in-component fetch is the read-only `listRuns` poll. The e2e recorded-call multiset makes a fork loud.

---

## Registry Safety

Skipped: no `components.json` (shadcn not initialized by standing constraint); UI-SPEC declares zero registries. `test -f components.json` → absent. No third-party blocks to vet.

---

## Files Audited
- `web/src/pages/Recovery.tsx` (mobile block :2648-3921, mount site, gate chain, all six step bodies, bars)
- `web/src/components/Button.tsx` (MOBILE_BLEED :105-127, TONE_CLASS, template :371)
- `web/src/components/ActivityLog.tsx` (mobile chip :474, desktop twin :418)
- `web/src/pages/settings/LanguageCard.tsx` (bleed sites :106, :131)
- `web/src/components/mobile/RunDetailSheet.tsx` (stale-pointer updates :66-67, :567-568; LogList scrim :186)
- `web/src/lib/i18n.ts` (key census; locale table sweep across all 40 modules)
- `web/src/app/mobileShellSource.test.ts` (guard scope, WHOLLY_PHASE8_FILES, MIXED_FILES floor)
- `web/e2e/guided-restore.spec.ts`, `web/e2e/desktop-untouched.spec.ts`, `web/e2e/narrow-viewport.spec.ts` (recovery integrations)
- `.planning/phases/08-*/08-UI-SPEC.md`, `08-CONTEXT.md`, `08-0{1..5}-PLAN.md`, `08-0{1..5}-SUMMARY.md`, `08-UAT.md`
