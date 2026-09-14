# Phase 7 — UI Review

**Audited:** 2026-09-14
**Baseline:** 07-UI-SPEC.md (approved 2026-09-13) + design-bible citations embedded therein (`design/mobile/README.md` is absent from the working tree; the spec's inline bible citations — android.html `.fab`, ios.html `.navbar h1` 32px/700 — were used as the bible source of truth)
**Screenshots:** Not captured — no dev server detected on ports 3000/3443/5173/8080. Code-only audit (source-assert verification + targeted region scans).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All nine contract keys landed verbatim and consumed; restore chain renders the exact contracted 5-step copy |
| 2. Visuals | 4/4 | Card language with monogram/badge/meta hierarchy, Fab, MobileSectionLabel; icon-only controls all labeled |
| 3. Color | 4/4 | Zero accent/offsite tokens in Receiver/Fleet mobile regions (verified by scan); accent confined to the reserved list |
| 4. Typography | 4/4 | 400/600-only machine-enforced AND independently re-verified over every mobile region; mono/tabular registers honored |
| 5. Spacing | 4/4 | 8/16-scale holds in all mobile regions (independent re-scan clean); guard scope narrowed to mobile regions with documented why |
| 6. Experience Design | 4/4 | Loading/error/empty/retry/confirm/secret contracts all consumed; touch floors met on every phase-built control |

**Overall: 24/24**

---

## Top 3 Priority Fixes

1. **Shared desktop-era controls inside the Settings stacked cards sit below the 44px touch floor** — the stacked cards ARE the desktop panels (07-05's shared-panels decision), so 32px `Button`s and other desktop-scale controls render on phones; only `Toggle` got the `max-md ::after` bleed (Toggle.tsx). Impact: taps on secondary actions in stacked cards are sub-floor. Fix: extend the Toggle's documented bleed pattern to the shared Button below md, or track each control in the already-recorded phase-8 VERIFY-04 disposition (07-05 summary, decisions) — it is written down, but it is real debt on shipped mobile surfaces.
2. **ActivityLog mobile day-filter chip is a solid accent pill** (`components/ActivityLog.tsx:465` — `bg-accent text-accentContrast`) — the spec's anti-list puts "search inputs and filter chrome" outside accent; the defensible reading is "active selection state" (accent item 4, matching the desktop heatmap toggle's language, and the mobile twin correctly uses `ps-2 pe-1 font-semibold` where the desktop twin keeps `ps-2.5 font-medium`). Fix: either add one contract line naming the active-filter chip under accent reservation 4, or move it to `accentSoft`/`accentText` tonal language like the Settings chips.
3. **Guard-scope narrowing vs the UI-SPEC letter** — the spec's spacing sweep says "in every file this phase's plans touch"; `mobileShellSource.test.ts` sweeps mobile regions only, so Phase-6 desktop halves keep legacy 12px (e.g. `Dashboard.tsx:3029` `gap-3`, `:3037` `px-2.5` in `max-md:hidden` blocks). The guard header documents the why, so this is compliant-in-spirit — fix is to normalize those last desktop-half values so the guard's file-wide form can eventually match the spec's letter.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- The five D-03 guard-chain keys render as a real numbered `<ol>` with the contracted copy at `Config.tsx:1187-1196`, before the confirm, in DOM order.
- `common.loadMore` consumed (VMs.tsx:2338, 2660; Flash.tsx:780; Containers.tsx:4318; Files.tsx:2357); `common.search` via `ListToolbar placeholder="common.search"` (Files.tsx:2301); `settings.tabsNavigation` as the chip-strip aria-label (Settings.tsx:2657).
- No em dashes in user text; the `"—"` null-timestamp fallback (VMs.tsx:56, Containers.tsx:54 precedent) is the long-standing house placeholder, lint-green.
- Keys were single-writer pre-seeded across all 42 tables (07-02) with parity/orphan/quality gates green; `i18n.preseed.test.ts` fences exact en copy.
- Editor sheet titles reuse existing section keys (07-07: sheets share the desktop form JSX, so no new copy surface exists).

### Pillar 2: Visuals (4/4)
- Card anatomy follows the spec: monogram avatars on `bg-carbon-surface2`, 14/600 names, four-status badges with text labels, meta lines at 12px, offsite line where the desktop speaks it (Config mobile correctly omits OffsiteIndicator — desktop Config never speaks offsite since #176).
- Fab is 52px (`h-13`), reads `--mob-fab-radius` from the platform axis, `bg-accent text-accentContrast`, aria-labeled, renders null under cupertino (Fab.tsx:60-78).
- D-01 double gate verified per page (`function Mobile*` tails + `{!isDesktop && (` mounts, counts pinned by the guard's anti-shrink anchors); desktop dual-direction e2e batteries cover all six routes.
- Icon-only/inherited controls carry aria-labels (Fab, Receiver/Fleet add-edit buttons at Receiver.tsx:518, Fleet.tsx:822).

### Pillar 3: Color (4/4)
- Independent token scan over every mobile region (tails + mounts): Receiver and Fleet mobile carry **zero** `bg-accent`/`accentText`/offsite tokens — the four-status reachability rule holds; restore/download entries carry no accent classes anywhere in the mobile regions.
- Accent in mobile regions resolves to exactly the reserved list: Settings active chip (`accentSoft`+`accentText`), VMs/Config schedule-preview chips, the Fab/trigger accent inside shared components, and the ActivityLog day chip (see Top Fix 2 for the borderline case).
- No hardcoded hex/rgb in any mobile region; index.css defines both `data-platform` values for all five `--mob-*` tokens in one block with bible citations.

### Pillar 4: Typography (4/4)
- Weight discipline independently re-verified: comment-stripped scans of all ten mixed-file mobile regions plus the wholly-phase-7 files return zero `font-medium`; the only 500-weight hits in phase files are the desktop `max-md:hidden` halves (e.g. ActivityLog.tsx:418's day-chip twin — its mobile twin at :465 correctly uses `font-semibold` and `ps-2`).
- Size register: `text-xs`/`text-sm`/`text-heading` dominate; the cupertino 32px/700 exists only in the index.css custom-property block — no page JSX writes a 32px or a 700 (grep-verified).
- Mono/tabular registers: Receiver.tsx (5×`tabular-nums`), Fleet mobile last-polled line tabular (Fleet.tsx:1451), pollNever for 0 (Fleet.tsx:1408).

### Pillar 5: Spacing (4/4)
- My own corrected re-scan (the naive function-level paren scan truncates at the signature — the guard's tail-slice approach is the sound one) of tails + mount regions found **zero** `-3`, `-1.5`/`-2.5`, or `font-medium` values in any mobile region across all ten mixed files.
- Raw grep hits over the six pages are desktop-half legacy, explicitly out of the phase-7 scale per the guard's documented scoping (see Top Fix 3).
- Structural exceptions match the spec exactly: `min-h-11` chips, `min-h-[2.75rem]` load-more (VMs.tsx:2335), Fab `h-13`, sheet side padding via safe-area custom properties.

### Pillar 6: Experience Design (4/4)
- State coverage: mobile blocks consume loading/error props (07-04 deviation 3 fixed the eslint-caught ignored `loading`); retry rows, gate-off honesty cards, `filter.noMatch` zero-match cards, empty copy all present.
- Destructive actions route through `useConfirm` → ConfirmSheet below md (Receiver.tsx:1030/1065, Fleet.tsx:1342/1369); the guard-chain `<ol>` precedes the Config restore confirm.
- Write-only secrets proven structurally: zero password inputs across reopen cycles; empty value attribute + blank-keeps PUT bodies machine-asserted in e2e.
- List ergonomics: `useLoadMore` 20/20 constant window, hasMore-gated button only, reset-on-identity plus the `preserveKey` live-feed extension; no IntersectionObserver/scroll listeners (grep-verified).
- Platform chrome: `data-platform` single-writer with coercion, UA needles guarded, `usePlatform()` confined to structural switches.

---

## Registry Safety

Not applicable — `components.json` does not exist (no shadcn, standing no-UI-kit constraint; UI-SPEC Registry table: none declared, none initialized). Zero third-party blocks.

---

## Notes

- Known tracked debt, excluded from scoring per audit brief: the 2 pre-existing `platform-chrome.spec.ts` mobile-android checkbox probes (07-03's deliberate VM multi-select relocation, documented in deferred-items.md); the Chromium engine's border-radius normalization on native checkboxes (engine limit documented at the rule site).
- `design/mobile/README.md` (and the `design/` directory) is absent from the working tree on this branch — the audit used the UI-SPEC's inline bible citations. Worth restoring or re-linking before phase 8's real-device pass leans on the bible directly.

## Files Audited

- `web/src/pages/VMs.tsx`, `Flash.tsx`, `Config.tsx`, `Receiver.tsx`, `Fleet.tsx`, `Settings.tsx`, `Containers.tsx`, `Files.tsx`, `Dashboard.tsx`
- `web/src/components/ActivityLog.tsx`, `OffsiteTargetsSection.tsx`, `Toggle.tsx`
- `web/src/components/mobile/Fab.tsx`, `ListToolbar.tsx`, `MobileSectionLabel.tsx`
- `web/src/pages/settings/NotifyCard.tsx`
- `web/src/app/mobileShellSource.test.ts` (guard geometry, needles, anti-shrink anchors)
- `web/src/lib/i18n.ts` (key census), `web/src/lib/useLoadMore.ts` (by summary + tests)
- Phase planning: 07-UI-SPEC.md, 07-CONTEXT.md (via spec), 07-01..07-08-SUMMARY.md
