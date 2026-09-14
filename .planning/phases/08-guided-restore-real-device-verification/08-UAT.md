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
| 5 | Android Chrome (~360–412 px) — portrait | < 768 → MOBILE chrome | | |
| 6 | Android Chrome — landscape (measure: 740 px-class vs 800 px+ Pixel-class) | 740 < 768 → MOBILE; ≥ 768 (e.g. 800/851 px) → DESKTOP (pass when observed) | | |

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
| 4 | Both themes (light/dark) on the mobile flow | D-08 / VERIFY-05 manual half | Toggle light and dark during the session across the shell, the recovery flow, sheets and confirms: every surface readable in both themes, no washed-out or unreadable text, no token leak | | |
| 5 | Four-status rendered by TEXT labels on device | VERIFY-05 (WCAG 1.4.1 — never color alone) | Step-state badges and restore-outcome badges carry their status as readable TEXT (the ok/fail/warn/neutral vocabulary), in both themes, on at least one mobile cell and one desktop-chrome cell | | |
| 6 | ForeignRestoreCard desktop-only — KNOWN surface | 08-UI-SPEC Screen Contracts decision (research Open Question 1, resolved 2026-09-14); implemented in 08-01 | The "restore from ANOTHER BombVault repo" card appears ONLY in desktop chrome (the ≥768 px cells) and is deliberately absent on mobile. Record the decision as SEEN — this is not a gap; do not file one | | |

## Known surfaces carried into the session (record, do not gap)

- **ForeignRestoreCard** — checklist row 6 above (desktop-only by decision).
- **Sub-floor-by-design controls recorded at 08-04** (the 07-05 VERIFY-04 disposition):
  Selector tabs (37.6 px), ColorPickerSwatch swatches (28 px), native selects — these
  were deliberately left out of the 08-04 bleed fixes and named as D-11 real-device
  items. Confirm each remains USABLE on real hardware at thumb pace; if any proves
  unusable, file it as a v2 gap naming the cell where it failed.
- **Config restore reloads the page mid-flow** (Pitfall 7) — a config restore ends in a
  page reload and the flow re-enters at step 1 with the restarting narration visible
  before it happens. Correct behavior; not a bug.

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
