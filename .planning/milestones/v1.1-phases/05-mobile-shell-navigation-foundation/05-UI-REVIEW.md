# Phase 5 — UI Review

**Audited:** 2026-09-12
**Baseline:** 05-UI-SPEC.md (approved design contract) + 05-CONTEXT.md locked decisions
**Screenshots:** not captured (code-only audit per orchestrator instruction; browser-based verification runs separately via the Playwright harness — 48 passed / 36 skipped green per 05-06)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every string through `t()`; zero new strings beyond contracted `nav.more`; emptiness rule means no empty-state copy needed |
| 2. Visuals | 3/4 | Strong hierarchy and a11y naming; `<nav>` lacks an accessible name; sheet scrim/portrait safe-area details slightly under contract |
| 3. Color | 4/4 | Zero hardcoded hex in shell; accent confined to the contracted 4-element reserve; token-only surfaces match spec exactly |
| 4. Typography | 4/4 | Only the 4 contracted type tokens + exactly 2 weights (400/600); SHELL-07 16px login exception implemented as specified |
| 5. Spacing | 3/4 | All structural dimensions on contract (h-14, 3.25rem, 85dvh, safe-area vars); a few 12px (`gap-3`/`px-3`) values sit between declared scale stops; sheet side padding is fixed 16px, not inset-clamped |
| 6. Experience Design | 4/4 | Loading/error/empty resolved by design (pure synchronous registry); tap-on-active, focus trap, 3 close paths, keyboard mechanism all present and tested |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **BottomSheet panel side padding is not safe-area-clamped** — `BottomSheet.tsx:199,231` use fixed `px-4`/`px-4` only; the UI-SPEC contract says "the More sheet pads all sides" via the inset custom properties. In landscape (Android gesture bars, iPhone notch edges reach ~47px), sheet content and the sign-out row can sit under the display cutout. Concrete fix: on the panel or body, `padding-inline: max(1rem, var(--safe-area-right)) max(1rem, var(--safe-area-left))` (or `pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))]` on the body div), keeping `pb-[var(--safe-area-bottom)]` as is.
2. **BottomNav `<nav>` and MoreSheet rows lack an accessible name / heading context** — `BottomNav.tsx:92` renders a bare `<nav data-testid="bottom-nav">` with no `aria-label`; desktop Sidebar's nav is the only other one, and exactly one mounts at a time, so it is not a collision today — but screen-reader users get an unnamed landmark. Concrete fix: `aria-label={t("nav.more")}` is wrong semantically; add a `nav.mobile` label or reuse an existing generic key via a one-line i18n addition; while there, consider `aria-label` on the More trigger button ("open navigation sheet") beyond its visible "More" text.
3. **Login card does not pad the top inset** — `Login.tsx:75` applies `pl/pr/pb-[var(--safe-area-*)]` but no `pt-[var(--safe-area-top)]`; SHELL-07's contract is "safe-area padding on the card container" and the centered card in landscape with a Dynamic Island/notch can clip its heading under the top inset. Concrete fix: add `pt-[var(--safe-area-top)]` to the same container div.

## Minor recommendations

4. `MoreSheet.tsx:61` rowBase uses `gap-3 px-3` (12px) — multiples of 4, so inside the scale's letter, but between the declared sm(8)/lg(16) stops; either is fine, pick one for Phase 6 sheets to reuse.
5. `MoreSheet.tsx:61` carries `hover:bg-carbon-hover` in mobile chrome. UI-SPEC says "no hover-dependent affordance may be introduced" — Tailwind v4's `(hover: hover)` gating makes this a no-op on touch and useful on hybrid trackpad devices, so acceptable; document the rationale inline in Phase 6 if the pattern spreads.
6. `BottomSheet.tsx:222` close button sits at header top edge with `p-2`; its 16px hit box plus padding reaches ~40px — under the 44px floor. Phase 6 reuses this primitive for every touch sheet; consider `p-2.5` or a min-h/min-w bump on the button.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- All user-visible strings route through `t()`: `t("nav.more")` (trigger + sheet title, one key as contracted), `t("common.close")` (`BottomSheet.tsx:220`), `t("auth.logout")` (`MoreSheet.tsx:129`), destination labels from the typed `labelKey: TranslationKey` registry (`navModel.ts:71`) — a bad key is a compile error.
- Destination labels reused verbatim from the shared registry, never re-authored (verified: no `nav.*` string literals in BottomNav/MoreSheet).
- No new error/empty copy — matches contract (chrome performs zero fetches; emptiness rule in `BottomNav.tsx:72` prevents an empty sheet).
- No generic Submit/Cancel/OK patterns; no em dashes in strings.
- 42-locale parity for `nav.more` gated by the existing i18n pipeline (verified in 05-03 verification: 40/40 modules).

### Pillar 2: Visuals (3/4)
- Clear structural hierarchy: h-14 bar with 24px glyph over 11px caption; sheet title Badge (heading token) + 20px glyph + 14px body rows at 52px min — matches the Component Inventory line for line.
- Icon-only close control carries `aria-label={t("common.close")}` (`BottomSheet.tsx:220-225`) per lint rule.
- Active language implemented exactly: `accentText` label + `accentSoft` glyph backdrop in bar (`BottomNav.tsx:149-152`), `accentSoft`+`accentText` rows in sheet (`MoreSheet.tsx:103`) — including the "route lands on a More destination" highlight via NavLink isActive.
- Deductions: unnamed `<nav>` landmark (fix 2); sheet side safe-area gap (fix 1) is a visual-correctness defect on notched landscape devices.

### Pillar 3: Color (4/4)
- Hardcoded-color grep over all phase files: zero component-level hex (only comments and navGlyphs' documented generator note).
- Surfaces match contract exactly: bar = `bg-carbon-sidebar` (`BottomNav.tsx:100`, same token as desktop rail), sheet = `bg-carbon-surface`, hairlines = `border-carbon-border`, root = `bg-carbon-background`.
- Accent usage confined to the reserved list: active bar slot, active sheet row. No status color on any control; `--accentText` used for accent ink (never raw accent), matching the light-theme contrast law.
- theme-color meta mirror (#161616/#f4f4f4) implemented in theme.ts paint() per contract.

### Pillar 4: Typography (4/4)
- Distinct sizes in new code: `text-caption` (bar), `text-body` (rows) — both existing tokens; sheet title via Badge heading token. No new sizes introduced.
- Weights: exactly 2 — 400 rest, `font-semibold` (600) on active bar label (`BottomNav.tsx:157`). No new 500s.
- SHELL-07 exception implemented as contracted: `max-md:text-base` on both login inputs (`Login.tsx:103,125`), desktop rendering unchanged.

### Pillar 5: Spacing (3/4)
- All contracted structural dimensions present and correct: `h-14` bar row (56px, svh-stable by construction), `min-h-[3.25rem]` sheet rows (52px), `max-h-[85dvh]` + `overscroll-contain` sheet, `pb-[var(--safe-area-bottom)]` on bar and sheet body, safe-area `:root` properties in `max(env(), 0px)` form (`index.css:228-231`), `viewport-fit=cover` paired.
- Bar: `gap-1` icon-to-label, `p-6` main padding untouched, `px-4 py-4` sheet header — all on the declared scale.
- Deductions: `gap-3`/`px-3` 12px values in MoreSheet rows (off the declared stop list though multiple-of-4); sheet side padding fixed at 16px rather than inset-clamped (fix 1). No unjustified arbitrary values beyond the two contracted exceptions.

### Pillar 6: Experience Design (4/4)
- Loading: no loading state exists by design — the registry is a pure synchronous function of already-loaded Settings (`navModel.ts` header contract); chrome renders the moment Layout does.
- Error: zero fetches in chrome; non-fatal settings degradation inherited from Layout's catch (`Layout.tsx:176-180`).
- Empty: More trigger hidden when the sheet would be empty (`BottomNav.tsx:72`); Recovery is never gated so the sheet list is never empty (`navModel.ts:138-139`).
- Interactions: tap-on-active with preventDefault (no duplicate history entries — `BottomNav.tsx:84-89`), sheet tap-on-active parity (`MoreSheet.tsx:97-101`), focus trap + capture/restore + three close paths (proven by 8 BottomSheet dom tests), Escape/scrim/close, sign-out with desktop parity (no confirm — locked decision, do not flag), ONE Layout-level visualViewport keyboard mechanism with presence guard and teardown (`Layout.tsx:93-145`).
- Destructive confirmation: none for sign-out — matches the locked contract explicitly.
- Registry safety: shadcn not initialized (`components.json` absent), no third-party registries declared in UI-SPEC — audit skipped per contract ("not applicable").

---

## Locked decisions honored (not flagged)
- Width-only `DESKTOP_QUERY = "(min-width: 48rem)"` in `useMediaQuery.ts:29` — landscape phones ≥768px intentionally get desktop chrome (user decision 2026-09-11). The UI-SPEC line 161 landscape sentence is amended accordingly.
- Presentation-only milestone: zero new runtime deps; sole package is devDependency `@playwright/test` 1.63.0 exact-pinned.
- Fresh-DB bar shows 4 slots (Dashboard, Containers, Settings + More) because `files_enabled` defaults false — gate parity with desktop Sidebar, asserted by e2e exactness test.

## Files Audited
- `web/src/app/Layout.tsx`
- `web/src/components/mobile/BottomNav.tsx`
- `web/src/components/mobile/MoreSheet.tsx`
- `web/src/components/mobile/BottomSheet.tsx`
- `web/src/lib/navModel.ts`
- `web/src/lib/useMediaQuery.ts`
- `web/src/pages/Login.tsx` (mobile contract portion)
- `web/src/index.css` (safe-area block)
- `web/e2e/` (health, mobile-shell, desktop-untouched, narrow-viewport specs — inventory check)
- `.planning/phases/05-*/` summaries, plans, UI-SPEC, CONTEXT
