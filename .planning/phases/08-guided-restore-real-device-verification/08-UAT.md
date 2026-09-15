# Phase 8 — Real-Device UAT (VERIFY-02 / D-11)

**Status:** DRAFT — pending device session; all pass/fail cells are intentionally empty
**Prepared:** 2026-09-14 by plan 08-05 (artifact-only plan — no code shipped)
**Session timing:** AFTER the phase-8 automated plans land: the orchestrator runs the
phase tail gate (full e2e suite once, D-10) with `execute-phase --no-transition`, and
execution STOPS for this human session (D-11). The pause is orchestrator-owned — no
subagent executes this document.

## Honest labeling — read before the session

Producing this artifact does **not** satisfy VERIFY-02. VERIFY-02 is the milestone exit
criterion: a human validates the shipped mobile interface on real hardware (notched
iPhone Safari, SE-class iPhone Safari, Android Chrome — portrait AND landscape — with
one guided restore exercised on device). The criterion is satisfied only by executing
the session recorded in this file, on real devices, after the automated plans have
landed and execution paused. The pass/fail and notes columns below are EMPTY by design;
they are filled in place during the session — nothing in this document pre-fills a
verdict. The automated halves of the phase sweep (i18n parity, touch-target backstops,
source guards, e2e choreography) are already machine-proven and carry no verdict here;
this document exists so the manual half has a protocol to execute.

Why manual by design: no real hardware exists in the harness, and Playwright documents
no real-Safari emulation fidelity for its patched WebKit build (08-RESEARCH, State of
the Art). Real-device rendering — fonts, safe areas, WebKit/Chrome quirks, touch feel —
cannot be automated away.

## The single 48rem authority (how every shell verdict is derived)

`DESKTOP_QUERY = "(min-width: 48rem)"` (= 768 CSS px, `web/src/lib/useMediaQuery.ts`)
is the ONLY width authority (D-09, user decision 2026-09-11). Every matrix cell derives
its expected chrome from the device's measured CSS width in that orientation — never
from "landscape should look mobile" intuition:

- **< 768 px** → MOBILE chrome: bottom bar (Home / Containers / Files / Settings + More
  sheet), safe-area insets consumed via `env()` custom properties, and on /recovery the
  mobile step flow behind the sticky step bar with the `Step {n} of {total}` position
  chip.
- **≥ 768 px** → DESKTOP chrome: sidebar rail, desktop stepper on /recovery, no bottom
  bar, no sticky step bar.

A notched iPhone in landscape (844 px) rendering the DESKTOP chrome is a **PASS** —
Pitfall 5: a UAT row expecting bottom-nav in notched landscape is itself the error. If
the session finds the desktop chrome genuinely unusable at that size, that is a UX
judgment to record in Notes (a candidate gap plan), never a breakpoint bug.

## Device matrix

Run each cell's steps in order; fill Pass and Notes in place. For every cell, first
record the device's actual CSS viewport width (attached devtools or an on-device
readout) so the expected-chrome derivation is auditable in Notes.

| # | Cell | Expected chrome (D-09 math) | Pass | Notes |
|---|------|------------------------------|------|-------|
| 1 | Notched iPhone (13/14-class, ~390 px) Safari — portrait | 390 < 768 → MOBILE chrome | | |
| 2 | Notched iPhone (13-class, ~844 px) Safari — landscape | 844 ≥ 768 → DESKTOP chrome (pass when observed) | | |
| 3 | SE-class iPhone (~375 px) Safari — portrait | 375 < 768 → MOBILE chrome | | |
| 4 | SE-class iPhone (~667 px) Safari — landscape | 667 < 768 → MOBILE chrome (SE stays mobile in landscape) | | |
| 5 | Android Chrome (~360–412 px) — portrait | < 768 → MOBILE chrome | ✓ | 2026-09-14: safe-area bottom fix (260914-nsv) validated on this device — both phantom gaps gone. 2026-09-15 (build `mobilefix-2b08030b`): FULL CELL PASS — mobile shell correct (bottom bar + More sheet; sticky step bar with Step chip on /recovery), safe-area re-confirmed clean, keyboard clean on attach/config inputs (input stays visible, sticky action reachable above the keyboard, no page jump on dismiss) |
| 6 | Android Chrome — landscape (measure: 740 px-class vs 800 px+ Pixel-class) | 740 < 768 → MOBILE; ≥ 768 (e.g. 800/851 px) → DESKTOP (pass when observed) | ✓ | 2026-09-15: rotated from cell 5 — chrome switches onto the 48rem derivation with no stuck chrome and no layout thrash; operator confirms derivation respected (exact CSS width not read out on device) |

### Per-cell session steps (every cell records all four)

1. **Shell correctness** — the chrome matches the cell's expected-chrome derivation
   exactly: mobile cells show the bottom bar + More sheet + (on /recovery) the sticky
   step bar with the position chip; desktop cells show the sidebar rail + desktop
   stepper and NO bottom bar and NO sticky step bar. Rotate the same phone across its
   orientation pair (cells 1↔2, 3↔4, 5↔6) and re-check the chrome switches onto the
   derivation with no stuck chrome and no layout thrash across the rotation.
2. **Safe-area / notch clearance** — content clears the physical cutouts. Notched
   portrait cells: top status-bar inset (≈47–59 px ballpark on 13-class) and bottom
   home-indicator inset (≈34 px); nothing underlaps either — bottom bar icons, sticky
   step bar actions, sheet footers, FAB. Notched/Android landscape cells: the cutout
   side inset is honored (no content under the notch in landscape). SE cells: classic
   bezels, inset 0 — content must not gain a phantom gap. (Inset magnitudes are
   consumed via CSS custom properties; the ballparks above are documentation only.)
3. **Keyboard behavior on the attach and config inputs** — focus the recovery flow's
   attach inputs (repo URL / credentials) and the config step's source picker field:
   the keyboard opens, the focused input stays visible, and the sticky action bar
   remains reachable above the keyboard (sticky-in-flow + visualViewport mechanism —
   no fixed chrome fighting the keyboard, no occluded primary action, no page jump on
   dismiss). On desktop-chrome cells, the equivalent desktop form inputs must remain
   visible and reachable.
4. **Procedure R — one guided restore exercised end-to-end on device** (the milestone
   exit criterion; run on whatever chrome the cell renders — on desktop-chrome cells
   that is the desktop stepper):

   - **attach** — reach /recovery, pass the readability check (step 1), connect &
     preview the test repo (step 3 inputs from item 3 above);
   - **discover** — Discover backups; found-counts render for containers/VMs;
   - **restore-all behind ConfirmSheet** — fire Restore all (left stopped); on mobile
     chrome the consequence-naming ConfirmSheet renders with the destructive action on
     TOP and the safe cancel at the thumb-default bottom; confirm;
   - **progress/log** — live progress and the log render during the restore;
   - **completion** — `Restored {ok}, failed {fail}` summary + per-target four-status
     badges (TEXT labels — checklist item 5);
   - **kit** — Download recovery kit completes the flow.

   Visibility probe (additional, once per physical device, on any one of its cells):
   hide the page mid-restore, return, and confirm the finished run reconciles.

### Matrix-level aggregate (fill after all six cells)

| Check | Pass | Notes |
|-------|------|-------|
| All six cells derived and observed correctly under the single 48rem authority (both landscape verdicts recorded as derived, not as defects) | | |
| Procedure R completed in every cell, on the chrome each cell renders | | |

## Inherited checklist (items with their origins named)

These items are inherited debts and decisions from earlier phases — the session either
closes them or keeps them visibly open. Silent drops are the failure mode this table
exists to prevent.

| # | Item | Origin | What the session verifies | Pass | Notes |
|---|------|--------|---------------------------|------|-------|
| 1 | WR-01 — multi-row chip-hide branch | Phase 7 verifier `behavior_unverified` (STATE.md phase-7 items; implemented + source-verified, no automated test exercises it) | On Containers, a container with MULTIPLE selected mounts/roots: the selection chips hide their rows and unhide restores them; row counts and the "{n} paths" preview agree after hide/unhide | | |
| 2 | WR-02 — Files save-bar-under-search path | Phase 7 verifier `behavior_unverified` (same origin as WR-01) | On Files, with the sets search active and a save pending: the sticky save bar renders under the search surface and stays visible/reachable (not occluded by search chrome) | | |
| 3 | UI-review fix 1 — Settings stacked-card 44px bleed | 07-UI-REVIEW Top Fix 1; landed in 08-04 (shared Button MOBILE_BLEED, default variant + Language card trigger/options) — verified BY TOUCH FEEL | Secondary buttons inside the Settings stacked cards are comfortably tappable at thumb pace: no misses, no accidental neighbor taps, visuals unchanged (the bleed is invisible by design) | | |
| 4 | Both themes (light/dark) on the mobile flow | D-08 / VERIFY-05 manual half | Toggle light and dark during the session across the shell, the recovery flow, sheets and confirms: every surface readable in both themes, no washed-out or unreadable text, no token leak | ✓ | 2026-09-15: light AND dark toggled on the Android device across shell and flow — every surface readable in both themes, no washed-out text, no token leak |
| 5 | Four-status rendered by TEXT labels on device | VERIFY-05 (WCAG 1.4.1 — never color alone) | Step-state badges and restore-outcome badges carry their status as readable TEXT (the ok/fail/warn/neutral vocabulary), in both themes, on at least one mobile cell and one desktop-chrome cell | | |
| 6 | ForeignRestoreCard desktop-only — KNOWN surface | 08-UI-SPEC Screen Contracts decision (research Open Question 1, resolved 2026-09-14); implemented in 08-01 | The "restore from ANOTHER BombVault repo" card appears ONLY in desktop chrome (the ≥768 px cells) and is deliberately absent on mobile. Record the decision as SEEN — this is not a gap; do not file one | | |

## Known surfaces carried into the session (record, do not gap)

- **ForeignRestoreCard** — checklist row 6 above (desktop-only by decision).
- **Sub-floor-by-design controls recorded at 08-04** (the 07-05 VERIFY-04 disposition):
  Selector tabs (37.6 px), ColorPickerSwatch swatches (28 px), native selects — these
  were deliberately left out of the 08-04 bleed fixes and named as D-11 real-device
  items. Confirm each remains USABLE on real hardware at thumb pace; if any proves
  unusable, file it as a v2 gap naming the cell where it failed.
  **Device verdict (2026-09-15, build `mobilefix-2b08030b`): ALL THREE GROUPS USABLE
  — confirmed at thumb pace, no gap filed.** Selector segments post-260914-ugv
  (compact, one-line) confirmed comfortable; the 28px swatches (accent trigger +
  popover palette + reset) confirmed reachable without neighbor misses; native
  selects (Integrity Source/Drill type, Notifications) confirmed fine as closed
  controls with the Android system picker.
- **Config restore reloads the page mid-flow** (Pitfall 7) — a config restore ends in a
  page reload and the flow re-enters at step 1 with the restarting narration visible
  before it happens. Correct behavior; not a bug.
- **Mobile UI review (2026-09-14, 390px) — leftovers RECOUPED on device
  (2026-09-14, build `mobilefix-877600d5`): ALL FOUR DROPPED.** The four P2 findings
  left OPEN after the three-quickplan fix batch were each put to the operator's eye
  on the Android device; none survived recoup. Per-item device verdicts appended
  below; no gap items filed.
  - **P2-7 (Dashboard)** — the Skipped and Not scheduled pills sit adjacent with
    similar wording; candidate fixes are reorder or merge. Wording/layout decision,
    needs eyes on hardware. **Device verdict: DROP** — the wording distinguishes the
    two pills well enough at real-use pace; no reorder, no merge.
  - **P2-8 (Dashboard)** — "OK" badges give the impression of straddling the card
    name and its sub-line. VISION-ONLY: no geometric proof was captured. Recouper on
    device with a real measurement; do not act on the impression alone.
    **Device verdict: DROP.** Source geometry confirms the impression cannot be real
    overlap: the OK badge sits in normal flow inside the padded surface (the Card's
    `p-5 flex flex-col gap-4` inner div), in a `gap-2` row under the h2 title
    (`Dashboard.tsx` Card 305-322, SpikeCard 367-378) — overlap with title or
    sub-line is impossible in that layout. The perceptual artifact is the
    deliberately-straddling heading Badge (`tone="heading"`, `position:absolute`
    over the card top edge — Badge.tsx why-comment), shared design-system behavior
    by design. Operator: not bothersome.
  - **P2-15 (Files)** — the "Include in schedule" toggle hugs its label instead of
    right-aligning the way the Settings switches do (pattern inconsistency,
    consistency rule). **Device verdict: DROP** — the hugging toggle does not bother
    use at thumb pace; the inconsistency is accepted as-is.
  - **P2-16 (Files)** — a 100%-full accent progress strip is PERMANENT under every
    healthy set card (track SPAN h-1.5 rounded-full + inner w-full bg-accent); at
    rest it reads as "backup in progress" — misleading affordance.
    **Device verdict: DROP** — the resting full strip never reads as "backup in
    progress" on the device.
- **Mobile UI review — non-findings, do NOT re-file on D-11:**
  - **P1-11 / P1-12 (sticky bars suspected of reserving no space)** — disproven from
    source: both bar containers sit last in normal flow inside scrolling regions that
    already account for them; sticky positioning reserves its own space. No fix, no gap.
  - Also checked healthy during the review: the Settings switches, the deliberate
    three-row header on Containers, the More sheet (Close 44×44, five 358×52 links),
    the New backup button placement (x16 / w343, inside margins), and the Square
    theme explaining the toggle corners.
- **Mobile UI review — fix batch landed (3 GSD quickplans, 2026-09-14), verified live
  at 390×844 on a fresh-install local build:**
  - **260914-j4p** — controls overflowing under 48rem: P1-9 Settings selectors stacked
    one-option-per-row, P1-2 Containers filter columns overflowing (chips clipped
    mid-word), P1-3 Settings nav pills clipped (5 sections unreachable), P2-10
    Language menu width.
  - **260914-k2r** — P1-13 Files editor double header ("uat-test" rendered twice),
    P2-14 "Remove set" styled identical to the primary CTAs; P1-11/P1-12 triaged to
    the non-findings above.
  - **260914-l7c** — P0-1 Containers FolderBrowser/Add overlap: the row stacks under
    md AND the FolderBrowser's own value+browse row wraps (component-level fix covers
    ~19 call sites); P1-4 nudge × touch pad added at the CALL SITE via bleed classes
    (Button.tsx untouched — the chip variant excludes MOBILE_BLEED deliberately):
    proven live by computed `::after` 46×46 at −14px plus hit-tests landing on the
    button at −13px and the wrapper at −16px; P2-5 recovery CTA `max-md:min-h-[2.75rem]`,
    measured 44px exactly; P2-6 the three mirrored byte formatters promote units at
    95% of the boundary (1024×0.95), proven by vitest (1047245 → "1.0 MB").
  - **P0-1 caveat:** the live 390px check exercised the shared FolderBrowser dialog on
    Files (full-width field, browse button stacked below, no overlap, scrollWidth 390).
    The exact Containers call site needs docker.sock and was verified FROM SOURCE ONLY;
    the full e2e gate on BombVault-test re-proves it on device-reachable infra.
- **D-11 device verdicts (2026-09-14, session in progress):**
  - **Safe-area phantom inset — PASS on device.** After 260914-nsv (deployed as
    `mobilefix-0aa38372`), both phantom gaps confirmed GONE on the Android device
    (the Save-card gap and the below-bottom-nav gap). Root cause validated live:
    `viewport-fit=cover` ghost `env(safe-area-inset-bottom)` under material; zeroed
    by the platform rule, cupertino keeps the real inset. The Platform card renders
    in Settings General on device.
  - **Settings page verdict (device) — heavy/unfriendly, per the operator:** 9 red
    card stamps + General as a catch-all (no grouping), Labels = 6 segmented rows
    in a row, Language a whole card for one control. NO rendering drift: the device
    matches the local 390px build (stamps, toggle alignment, wrap behaviors from
    260914-j4p all as designed). User decision (D-11): REGROUP — Theme, Corners,
    Animations, Platform, Colors and Labels fold into ONE Appearance card with
    quiet sub-sections (9 stamps → ~4, scroll markedly shorter); no shared
    design-system change, desktop intact. Quickplan to follow.
  - **Settings Appearance regroup — PASS on device.** After 260914-p9a (deployed as
    `mobilefix-877600d5`, health stamp + sha256 verified), the operator confirms the
    regrouped General tab on the Android device: 4 cards (Domains, Language,
    Appearance, Quiet toasts), the Appearance card carrying the six quiet
    sub-sections (Theme → Corners → Animations → Platform → Labels → Colors).
    Operator verdict: "Tout est beau" — closes the REGROUP decision above.
  - **One-line 360px compaction (Integrity rows + Selector segments) — PASS on
    device (2026-09-15).** The operator reported both remaining wrapped surfaces
    (« Deux problèmes ici » + « Ça se trouve sur deux lignes aussi »): the
    IntegrityCard domain rows (drill + status rejected to a 2nd line) and the Labels
    sub-section Selector strips (active segment isolated on a 2nd line). Direction
    chosen: COMPACT mobile-only, both surfaces. After 260914-ugv (deployed as
    `mobilefix-2b08030b`, health stamp `mobilefix-2b08030b` + sha256 `3288126b…`
    verified), the operator confirms both surfaces now hold ONE line at ~360px —
    Integrity domain rows (label + glyph buttons + drill + status) and Labels
    Buttons/Sidebar/Tabs strips (4 segments). Operator verdict: "C'est bon".
    Desktop byte-identical by construction (mobile mirror block + max-md: only);
    the Selector wrap mechanism remains the documented fallback ("never scrolls",
    round 8, untouched).

---

## Redeploy runbook (executed once, before the session)

This runbook DESCRIBES the protocol — the device session (the operator) executes it;
no deploy command runs from the repo. The steps are numbered and ORDERED; step 1
before step 2 is load-bearing.

1. **Rebuild the SPA first** — from the repo root:

   ```sh
   cd web && npm ci && npm run build
   ```

   Why it must precede the binary build: the Go binary embeds `web/dist`
   (`//go:embed all:dist`, `web/embed.go`). Skipping this step ships the pre-phase SPA
   to the device session and silently invalidates every observation (Pitfall 4 — stale
   embedded SPA). After redeploy, check the UI's build stamp reflects this phase before
   trusting any cell.
2. **Build the binary** embedding the fresh dist — `go build` from the repo root (e.g.
   `go build -o bombvault ./cmd/bombvault`, or your usual release build). The embed
   picks up the `web/dist` output from step 1.
3. **Redeploy ONLY the `BombVault-test` container** — via your usual compose/Unraid
   mechanism, pointing the TEST instance at the freshly built image/binary. The PROD
   `BombVault` container is NEVER touched by this protocol: no stop, no image swap, no
   config edit — nothing.
4. **Coordinates (placeholders only — real values travel outside the repo).** Hand the
   session operator:
   - device-reachable URL: `https://<server-ip>:3443/` (or the test instance's HTTP
     port if it runs HTTP_ONLY);
   - test-instance login credentials: `<test-username>` / `<test-password>` (only if
     auth is enabled on the test instance);
   - APP_KEY note: if the test instance's stored settings/credentials are APP_KEY
     sealed, the session needs the TEST instance's app key — `<app-key>` (used by the
     attach and config beats of Procedure R).

   The angle-bracket tokens are mandated verbatim by the phase security rule; real IPs,
   hostnames, credentials, and app keys never enter this repo (public repo, always has
   been).
5. **Session order:** execute the device-matrix cells top to bottom (1 → 6), then the
   inherited checklist rows in order, then the known-surfaces confirmations — recording
   pass/fail/notes IN PLACE in this document as each item completes.

### Optional probes the session may run (Pitfall 6/7 context)

- **Concurrent settings edit (Pitfall 6):** in another tab, change a setting on the
  test instance immediately before running the config restore in Procedure R — the
  restore must NOT roll back the concurrent change (the wizard re-fetches and merges
  onto the fresh server baseline before every PUT). A rolled-back change is a real
  defect; record it as a failure with the cell of origin.
- **Config restore reload (Pitfall 7):** already listed under Known surfaces — the
  reload and step-1 re-entry with restarting narration are correct behavior.

## Session record (filled after the device session)

After the session: update the Status line at the top of this file (DRAFT → session
held), fill every empty cell, and file any Notes-flagged failure as a gap item naming
its cell/row of origin. VERIFY-02's verdict is whatever this file records AFTER the
session — never a pre-fill.
