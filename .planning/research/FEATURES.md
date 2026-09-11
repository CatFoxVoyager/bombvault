# Feature Research

**Domain:** Mobile (phone) admin/monitoring interface for a self-hosted backup & DR product — responsive SPA milestone v1.1 on the existing BombVault desktop web app
**Researched:** 2026-09-11
**Confidence:** HIGH for product decisions (grounded in the locked design bible `design/mobile/README.md` @0b64c7df + the live codebase inventory — local primary artifacts); LOW-to-MEDIUM for ecosystem/platform-convention claims (primary spec pages — W3C WCAG, W3C ARIA APG, MDN, NN/g, Material archive — fetched directly this session, but the provider seam tags webfetch-tier findings LOW; Apple HIG / m3.material.io pages are JS-shelled and would not fetch — specifics from those marked inline)

## Feature Landscape

### How comparable products do mobile (the gap this milestone fills)

| Product category | Mobile model | Verified? |
|------------------|--------------|-----------|
| **restic ecosystem UIs (Backrest, Vorta-class)** | Web UI only, desktop-oriented ("Access locally or remotely — perfect for NAS deployments"); zero mention of phones/mobile anywhere in docs or README. Phone access is implicit browser rendering of a desktop layout | HIGH (Backrest README fetched) |
| **Self-hosted monitoring (Uptime Kuma)** | Web-first; README describes UI/status pages/notifications but never mobile; no native client. Works on phones only as an unadapted web page | HIGH (README fetched) |
| **NAS admin (Unraid, TrueNAS, Proxmox)** | Desktop-first web UIs, no first-party phone experience; admins on phones get pinch-zoomed desktop tables (community clients exist but are unofficial) | MEDIUM (category consensus; vendor pages not fetched this session) |
| **Container admin (Portainer)** | Desktop-first SPA; no mobile-adapted operational flows | MEDIUM |
| **Synology (DSM mobile + Active Backup for Business app)** | The canonical *companion app* model: native app = monitor status + limited actions; **configuration stays on desktop web** | MEDIUM (KB/app-store pages not fetchable this session; the monitor-only companion model is the widely documented pattern — treat as directional) |
| **Home Assistant** | The counter-example to copy: one responsive web codebase, mobile gets drawer/hybrid navigation and *full* operational parity — proof that parity-on-phone is achievable without a second app | MEDIUM |

**The finding:** every restic-adjacent tool stops at "desktop page rendered on glass." Nobody in this niche ships a designed mobile experience, and the industry default elsewhere is a *view-only* companion. The design bible's bet — one responsive SPA with **full operational parity** below the breakpoint — is therefore both the table-stakes baseline (a responsive shell) and the differentiator (operate, don't just watch).

### Expected behavior per screen (the five maquette surfaces + the More destinations)

What users of mobile admin apps expect on each surface. The first five are locked by the maquettes (`design/mobile/android.html` / `ios.html` @0b64c7df); the remainder extend the same language.

| Screen | Expected content & behavior | Complexity | Desktop dependency |
|--------|----------------------------|------------|--------------------|
| **Home** | Instance identity header (name · reachable · repo size); **Next run** card (cadence, time, scope); **Recent runs** list with four-status badges (done / offsite / failed / paused); repository health card (size, dedup, snapshots, offsite-copy age in offsite blue); one primary action ("New backup") in the thumb zone; glanceable in one screenful without deep scrolling | MEDIUM | `RecentRunsList`, `OffsiteIndicator`, dashboard data via `lib/api.ts`, `lib/reltime.ts`, `lib/runReason.ts` all reusable; layout is a new mobile stack (`dashboardLayout.tsx` is desktop) |
| **Containers** | Summary line ("5 running · 4 protected · 1 attention"); one card per container: name, mount count, selection summary ("3 of 5 folders"), four-status badge (safe / attention / offsite); tap card → container detail; tap into selection tree from there | MEDIUM | Container domain data + `badge`/glyph system reusable; per-container page re-chromed as stacked cards |
| **Selection tree (touch)** | Mount path header; lazy tri-state tree with **full-row tap targets**; EXCLUDED rows muted; per-root `CACHEDIR.TAG` toggle with one-line plain-language explanation; **pinned live count** ("12,480 files · 3.2 GB handed to restic · 5 of 7 ticked") fixed above the action; Save pinned in a bottom action bar; empty-deselect rule surfaced in copy | HIGH (the flagship screen; interaction layer is new, logic is 100% desktop) | `SelectionTree.tsx` logic (`lib/selectionTree.ts`, serialized save queue, `/api/browse` lazy children) reused; the component needs a touch variant — taller rows, chevron separate from check hit-area |
| **File sets** | One card per set: coverage ("6 of 6 folders ticked"), status (safe / complete / offsite-synced / paused / attention), last run line; **empty-selection rule in copy** ("Use Delete set to remove it entirely"); same touch tree inside | MEDIUM | Same `SelectionTree` touch variant; set cards re-chromed from Files page |
| **Run detail / Recovery** | Stack bar with back; "Backup complete" + timestamp + duration + monospace snapshot id; stats triad (new / changed / unchanged, tabular numerals); Restore point; restore entry **secondary-styled, labelled with overwrite semantics, dry-run paired**; activity log with mono timestamps naming exclusion reasons ("excluded tmp (unticked)", "skipped cache/ (CACHEDIR.TAG)"); Browse files; Verify integrity | MEDIUM | `ErrorDetailPanel`, activity log lib, restore guard chain (API-side) reused; the guided restore flow itself needs a mobile wizard (see flows) |
| **VMs / Flash** (More) | Block-level item cards with status + last run + offsite state; no folder granularity (zvol = block storage, per PROJECT.md out-of-scope); trigger + schedule entry points | LOW-MEDIUM | VMs/Flash pages re-chromed; domain APIs unchanged |
| **Config** (More) | Self-config backup status + restore entry; the guard chain (confirmation, snapshot-id validation, conflict pre-flight) already lives server-side — surface it readably on a phone | MEDIUM | Guards are backend; new mobile confirmation chrome |
| **Receiver** (More) | Off-site copy target status at a glance | LOW-MEDIUM | Receiver page re-chromed |
| **Fleet** (More) | Peer instance cards: reachable, last contact, protection summary — monitoring is the phone's natural job here | LOW-MEDIUM | `Fleet.tsx` peer card data reused; stacked layout |
| **Settings** (More) | Stacked setting cards; editors open **full-screen sheets**, not popovers; dark mode / language / accent work as today | MEDIUM | Settings.tsx card structure reusable; dense editors need sheet variants |

### Expected behavior per flow (operational parity on a phone)

| Flow | Expected mobile behavior | Complexity | Desktop dependency |
|------|--------------------------|------------|--------------------|
| **Trigger backup** | Primary action reachable from Home thumb zone → confirmation only when consequences exist (containers stop/restart) → busy state → deep-link into the live run; coming back from phone sleep shows the *current* run state, not a stale one | MEDIUM | `BackupButton`, run APIs, SSE all exist; new visibility-aware refetch (see live-progress flow) |
| **Tree selection editing** | Every toggle = one PATCH through the existing serialized save queue; rapid toggles collapse to one request; the pinned count updates live; Save always visible; a refused action (zero-include guard) explains itself in copy, never a bare failure | HIGH | The save queue + guards are desktop-built and reused verbatim; only the touch chrome is new |
| **Guided restore** | Full-screen step flow, never a modal stack: preflight summary (guards already exist server-side) → confirmation **naming consequences in copy** ("Overwrites current files", "dry-run first" — maquette language) → optional verify/dry-run → progress with live log → completion; destructive controls visually recessive (secondary style), away from the thumb's default path | HIGH | `RestorePanel`, `RestoreCancelButton`, restore wizard logic, guard chain reused; mobile step-flow chrome is new |
| **Schedule editing** | Cadence/time pickers open full-screen sheets with large targets; the human-readable effective-schedule preview line stays visible on the invoking card | MEDIUM | `TimePicker`, `CadenceBuilder`, `ItemScheduleOverride`, `EffectiveScheduleLine`, `lib/cron.ts` logic reused; sheet variants new |
| **Long lists (runs, containers, sets, logs)** | Sticky search + filter chips above the list; **load-more pagination** (predictable scroll position, refresh-friendly) rather than infinite scroll; list rows ≥ 44 px tall; pull-to-refresh or an explicit refresh affordance at top | MEDIUM | `FilterPopover` concepts + list data reused; mobile filtering chrome new |
| **Live run progress** | SSE when the page is visible; **pause on `visibilitychange` → hidden, refetch/reconnect on visible** — browsers throttle background timers and the phone OS will sleep the tab; a run completing while backgrounded is picked up on return, never shown stale silently | MEDIUM | Desktop SSE plumbing reused; the visibility controller is new (MDN-verified behavior: background tabs get `setTimeout` throttled ~10 s, SSE tabs are *exempt* from throttling so the app must explicitly stop work) |
| **Destructive confirmations** | Bottom sheet (thumb-reachable), fail-tone styling, consequence-naming copy, buttons that name outcomes ("Restore" / "Keep files"), no default-focus destructive button; the rare catastrophic path (typed confirmation) stays desktop-tier or absent | MEDIUM | `useConfirm`/`ConfirmDialog` semantics reused; mobile bottom-sheet presentation new |
| **Login** | Two-step login works untouched; inputs need ≥ 16 px effective font (iOS zooms smaller inputs on focus); safe-area aware | LOW | `Login.tsx` two-step flow exists |
| **Status at a glance (everywhere)** | The four-status rule is the whole language: ok / fail / warn / neutral chips, offsite blue as the offsite domain identity; **color is never the only signal** — badge carries label text (WCAG 1.4.1); tabular numerals for counts | LOW | `Badge`, `glyphs`, carbon tokens reused as-is — this is the design bible's locked contract |

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = the mobile experience feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bottom bar with 4 destinations + "More" sheet | The universal mobile-admin IA. Verified convention: bottom navigation carries **3–5 top-level destinations**; beyond five, tap targets crowd and overflow must route to an alternative location (drawer/sheet). BombVault's 4 tabs + More sheet (remaining destinations) sits exactly inside the convention | MEDIUM | Hand-rolled per constraints (no UI kit). Bar must not scroll; active item tinted accent; tapping active tab returns to top of view |
| Safe-area correctness | Phones have notches, rounded corners, and a home indicator. `viewport-fit=cover` opts into full-bleed; `env(safe-area-inset-*)` then reports non-zero insets that must pad the bottom bar, action bars, and headers — desktop reports 0, so desktop is unaffected | LOW | MDN-verified pattern: `padding: 1em calc(1em + env(safe-area-inset-bottom))` on sticky bottom chrome |
| Viewport-height correctness (`100dvh`/`svh`, not `100vh`) | Mobile URL bars show/hide; `100vh` equals the *large* viewport, so app-shell content hides under the URL bar. `svh` for must-be-visible shells, `dvh` for dynamic fill | LOW | MDN-verified; current `index.css` has zero mobile handling — this is greenfield |
| Touch targets ≥ 44 px | WCAG 2.5.8 floor is **24×24 CSS px** (AA); the enhanced criterion and platform conventions are **44×44** (iOS pt / Android dp≈48). Checkbox, chevron, nav item, chip, row — all must clear it | MEDIUM | Cheap per-control but must be swept across every reused control at the breakpoint |
| Glanceable Home (next run, recent runs, repo health, primary action) | The entire value of opening a backup app on the phone is "is everything fine?" in one look; monitor-only companion apps prove the pattern | MEDIUM | Data all exists; layout is the work |
| Four-status visual language with text labels | Locked design-bible rule (four hues, never a fifth; offsite blue is a domain identity, not a status) and WCAG 1.4.1 alignment: never color alone | LOW | Tokens already exist in `index.css` |
| Per-domain card lists (not desktop tables) | Desktop grids/table rows don't survive 390 px; every mobile admin tool uses stacked cards with meta lines + status chips | MEDIUM | One card-per-domain pattern, applied 10× |
| Touch tri-state selection tree | The desktop tree is the product's signature; a mobile user expects the same semantics (tick folder = subtree included, mixed parents, remembered partials, CACHEDIR toggle) with full-row hit targets. ARIA APG contract carries over: `aria-checked="mixed"`, activation cascades, Space routes through the same pipeline | HIGH | Logic reuse is near-total; the touch interaction layer is the milestone's hardest UI work |
| Guided restore with named consequences + dry-run | Restore is the one flow where a mistake destroys data; the maquette's rule ("Restore is deliberate — secondary-styled, overwrite semantics labelled, dry-run paired") matches NN/g: consequence-naming, no reflexive yes/no, undo unavailable so prevention is everything | HIGH | Guard chain server-side already exists; mobile wizard chrome new |
| Trigger backup from the phone | The most common mobile admin action for a backup tool ("kick it off now") | MEDIUM | `BackupButton` semantics + APIs reused |
| Run detail with stats + activity log | Post-trigger "did it work?" answer: new/changed/unchanged, snapshot id (mono), log lines explaining exclusions (unticked / CACHEDIR.TAG) | MEDIUM | Data + libs reused; stacked mobile layout new |
| Background/refresh hygiene | Phones sleep. Expected: no silent stale dashboards — pause live updates when hidden, refetch on visible, visible refresh affordance | MEDIUM | New `visibilitychange` controller (MDN-verified API shape) |
| Desktop untouched above the breakpoint | The milestone contract: responsive, one codebase, one URL — no m-dot host, no second bundle | MEDIUM | Media-query-scoped CSS + shell swap only below the breakpoint |
| i18n + dark mode parity | Existing product conventions; mobile strings go through the same i18n pipeline with parity tests | LOW | Infrastructure exists; discipline is the only cost |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Full operational parity on a phone** | Every comparable tool is desktop-first or a view-only companion. "Fix a selection, trigger a restore, edit a schedule from the driveway" is unmatched in the restic/NAS space | HIGH (spread across surfaces; each is chrome translation) | The milestone's stated goal; sequence after the shell is proven |
| **Touch selection tree with pinned live "handed to restic" count** | No restic-ecosystem UI has folder trees at all (v1.0 research finding), let alone touch ones. The pinned count makes the abstract contract visible — a trust feature, not decoration | HIGH (interaction layer) | Reuses the one tree implementation; count plumbing exists |
| **Guided disaster-recovery from the phone** | Dead-server recovery is exactly when you have a phone, not a desk. Guided restore + verify + browse, with the existing guard chain, makes the phone a first-class DR console | HIGH | Highest-value parity flow |
| Platform-native expression from one codebase | M3 navpills/FAB on Android, HIG large-title/circles on iOS — same IA, translated chrome (design bible platform mapping). Users read it as "a real app" without a second codebase | MEDIUM | Token + structural variants only; hand-rolled CSS keeps this tractable |
| Four-status glanceable language across all surfaces | One rule set (four hues + offsite identity, text never color-alone, tabular numerals) makes a fleet of heterogeneous domains readable at a glance — most admin tools mix per-page color schemes | LOW | Already locked; differentiating in execution consistency |
| Fleet + offsite coverage on the phone | Multi-instance and offsite-copy state is monitoring-shaped — the thing phones are best at. Offsite age/staleness visible from Home | LOW-MEDIUM | `Fleet` peer data + `OffsiteIndicator` reused |
| Visibility-aware live progress | SSE that pauses when hidden and reconciles on visible — correct on mobile browsers where naive SSE/timers silently misbehave | MEDIUM | Small, reusable controller; most tools get this wrong |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hamburger drawer as primary navigation | Familiar on desktop web ports | Hides all destinations one tap deep; contradicts the locked design bible (bottom bar + More sheet); violates the bottom-nav convention this milestone adopts | 4-tab bottom bar + More sheet |
| Native app / App Store wrapper (Capacitor/React Native) | "It feels like an app" | Second codebase against the constraints (no state library, no UI kit); store review, signing, and release overhead for a self-hosted tool behind self-signed TLS; push requires native plumbing | Responsive SPA now; PWA installability as a later evaluation |
| Native push notifications | "Tell me when a backup fails" | Server-side notifications already cover alerting (webhook/Matrix/Healthchecks/Unraid/email) to wherever the user actually is; web push on iOS requires installed-PWA machinery and server changes | Keep server notification channels; web-push is a v2+ evaluation |
| Hover-dependent affordances ported as-is (InfoBubble tooltips, FilterPopover, ColorPickerPopover) | They exist on desktop | No hover on touch; tap-then-vanish popovers are the classic mobile brokenness | Tap-anchored bubble / bottom-sheet variants below the breakpoint; desktop behavior untouched |
| Drag-to-reorder on touch (`useDragReorder` surfaces) | Desktop parity checkbox | Drag semantics conflict with scroll on touch; accidental reorders; focus/hostile to a11y | Explicit up/down controls or defer reorder on mobile; desktop keeps drag |
| Infinite scroll everywhere | Feels modern | Unpredictable scroll position on return, refresh ambiguity, footer unreachable — wrong for monitoring lists | Load-more pagination + sticky filters |
| Keeping SSE/polling alive in background tabs | "Always-live progress" | Battery drain; browsers throttle background timers anyway (~10 s Chrome) while *exempting* SSE tabs — the worst combination unless the app explicitly pauses | `visibilitychange` pause + refetch on visible |
| Stacked/stacked-modal destructive flows (confirm-in-confirm) | "Extra safety" | Reflex-tapping through modal chains is the documented automation-bias failure; small screens make stacked sheets unreadable | One bottom sheet, consequence-naming copy, recessive destructive button; heavy typed-confirm reserved for truly catastrophic paths |
| A fifth status hue or new mobile palette | "Mobile needs its own style" | Breaks the locked four-status rule and carbon token contract; a mobile skin that stops looking like BombVault loses cross-surface trust | Extend the status table only with strong cause (bible's own rule) |
| Desktop tables with horizontal scroll on phone | Cheapest responsive port | Pinch-zoom panning for data is the anti-pattern this milestone exists to kill | Card stacks |
| Tree rows smaller than 44 px to "fit more folders" | Appdata trees are huge | violates target-size floor; mis-ticks in a selection UI are scope errors (backup holes or bloat) | Full-row targets, lazy expansion keeps depth manageable |
| Per-subfolder retention/schedules from the tree | Real desire (databases nightly, media weekly) | Already ruled out (fragments per-item tag retention identity, #91/#24 discipline) | Item-level schedules remain the only schedule surface |
| Junk-folder auto-detection/suggestions on mobile | "Finish selection faster" | Out of scope per PROJECT.md; suggestions are a confirmed follow-up, and mobile is the wrong place to debut an unproven heuristic | Explicit manual untick; suggestion chips later, confirm-first on desktop first |

## Feature Dependencies

```
[Mobile shell: breakpoint + bottom bar + More sheet + safe-area + dvh]
    └──requires──> [TouchPopover + bottom-sheet primitives (hand-rolled)]
    └──enables──> [All mobile screens]

[Home] ──requires──> [Shell] + [visibility-aware refresh] + [RecentRunsList mobile variant]
[Containers] ──requires──> [Shell] + [card list pattern]
[Selection tree screen] ──requires──> [Shell] + [SelectionTree touch variant]
    └──requires──> [desktop save queue + /api/browse + selectionTree lib]  (exist — no new backend)
[File sets screen] ──requires──> [same touch variant] (shared implementation — by construction)
[Run detail] ──requires──> [Shell]
[Guided restore flow] ──requires──> [Run detail] + [bottom-sheet confirm] + [restore wizard logic] (exists)
[Trigger backup] ──requires──> [Shell] + [bottom-sheet confirm]  ──enhances──> [Home]
[VMs/Flash/Config/Receiver/Fleet/Settings] ──requires──> [More sheet] + [card list pattern] + [sheet editors]
[Schedule editing parity] ──requires──> [sheet editors over TimePicker/CadenceBuilder logic]
[i18n keys] ──required-by──> [every screen]  (parity tests gate merge)
[Desktop layout] ──conflicts-with→ [mobile shell]  (strictly breakpoint-scoped: one must not leak into the other)
```

### Dependency Notes

- **The shell gates everything.** Bottom bar, More sheet, safe-area padding, dvh sizing, and the sheet/popover primitives are prerequisites for all ten destinations; nothing else can be meaningfully reviewed before the shell exists.
- **One tree implementation stays one.** The touch variant must be an interaction-layer variant of `SelectionTree`, not a fork — the desktop panel and both mobile tree screens must keep identical semantics (APG contract, save queue, pinned count). A fork here recreates the "two selection truths" class of bug the v1.0 architecture deliberately eliminated.
- **Restore flow depends on run detail + confirm primitives, and nothing new server-side.** The guard chain, snapshot validation, and longest-prefix mapping are shipped; the work is sequencing them into a thumb-reachable step flow.
- **Bottom sheet + tap popover are shared primitives.** Confirmations, dropdowns, filter popovers, and schedule pickers all land on them; build once, apply ten times. Hand-rolled per constraints — scroll-lock via `overscroll-behavior` (MDN-verified: `contain` on a non-scrolling container stops chaining) and focus management.
- **Desktop/mobile isolation is a two-way dependency.** Every mobile style must be scoped below the breakpoint (desktop untouched) and every reused control must be verified not to regress at it. The existing css is desktop-only today, so the breakpoint is introduced, not modified.
- **Parity surfaces are sequenced by the More sheet.** VMs → Flash → Config → Receiver → Fleet → Settings can land independently once the sheet + card patterns exist; schedule/notification/replication editing rides on the sheet-editor pattern.

## Desktop Reuse Map (reuse vs re-build per surface)

The quality-gate question: which desktop components ship as-is, which get mobile variants, which stay desktop-only, and what is genuinely new.

### Reuse as-is (no mobile work)

| Component | Why it ports unchanged |
|-----------|------------------------|
| `lib/api.ts` (all endpoints/types) | Transport layer is input-agnostic |
| `lib/selectionTree.ts` | Pure state derivation — the tree's brain |
| Serialized save queue / PATCH pipeline | Client-side discipline, UI-agnostic |
| `lib/cron.ts`, `lib/reltime.ts`, `lib/runReason.ts`, `lib/forecast.ts`, `lib/activityLog.ts`, `lib/errors.ts`, `lib/progress.ts` | Pure logic |
| `lib/i18n.ts` + parity tests, `lib/theme.ts`, `lib/accent.ts`, `displayPrefs` | Infra |
| `CheckDraw`, `Badge`, `glyphs`/`navGlyphs`, carbon tokens in `index.css` | The visual contract itself (design bible sources of truth) |
| `Toggle`, `ProgressBar`, `OffsiteIndicator`, `ScheduleBadge`, `EmptyStateIcon`, `Toast` engine | Small, token-driven; verify only at the breakpoint sweep |
| Hooks: `useConfirm` (semantics), `useOffsiteTargets`, `useCloudCredSets`, `useLabelMode` | Logic-layer |

### Reuse logic, build mobile variant (the actual milestone work)

| Component | Mobile variant needed |
|-----------|----------------------|
| `SelectionTree.tsx` | Touch rows: ≥ 44 px full-row targets, chevron vs check hit-area separation, pinned live count + Save in bottom action bar. Semantics byte-identical |
| `ConfirmDialog` / `useConfirm` presentation | Bottom sheet, fail tone, consequence-naming copy, recessive destructive button |
| `RestorePanel` + restore wizard | Full-screen guided step flow (preflight → confirm → dry-run/verify → progress), SSE live log |
| `RecentRunsList` | Card list on Home |
| Dashboard cards / `dashboardLayout.tsx` | New stacked Home layout over the same data |
| `TimePicker`, `CadenceBuilder`, `ItemScheduleOverride`, `EffectiveScheduleLine` | Full-screen sheet editors; preview line stays on the card |
| `DropdownListbox` | Bottom-sheet picker with large rows |
| `FilterPopover` | Tap-triggered filter chips + sheet |
| `InfoBubble` / `useTipBubble` / `bubblePosition.ts` | Tap-anchored bubble below the breakpoint |
| `ExcludesEditor` | Full-screen editor; review disclosures stay shared |
| `SnapshotFileTree` / `FolderBrowser` | Touch rows for restore browsing |
| Pages: Containers, Files, VMs, Flash, Config, Receiver, Fleet, Settings | Card-stack re-chrome over existing data plumbing |
| `ErrorDetailPanel`, `ActivityLog` | Stacked presentation; mono log lines preserved |
| `Login` | Safe-area + ≥ 16 px inputs (avoid iOS focus-zoom) |

### Desktop-only (do not port below the breakpoint)

| Component | Reason |
|-----------|--------|
| `Sidebar.tsx` | Replaced by bottom bar + More sheet below the breakpoint; untouched above it |
| `useDragReorder` surfaces | Drag-on-touch conflicts with scroll (see Anti-Features) |
| Multi-column grids / wide tables | Card stacks instead |
| `WhatsNewDialog`, desktop-only conveniences | Evaluate at breakpoint sweep; suppress if hostile to small screens |

### Genuinely new (no desktop counterpart)

| Piece | Notes |
|-------|-------|
| App shell: breakpoint, bottom bar, More sheet | The milestone's foundation; hand-rolled, safe-area + dvh correct |
| Bottom-sheet primitive | Shared by confirm/pickers/editors; scroll-lock + focus trap |
| Tap-popover primitive | For tooltips/filters on touch |
| Visibility-aware refresh controller | `visibilitychange` pause/resume + refetch-on-visible |
| Platform-adaptive chrome mapping | M3 (navpill, FAB, tonal chips) vs HIG (large title, circle checks) per the bible's table |
| Thumb-zone pinned action bars | Save selection / New backup / restore step controls |

## MVP Definition

### Launch With (v1 — shell + the five maquette screens, MOBILE-01 + MOBILE-02)

- [ ] Mobile shell: breakpoint-scoped bottom bar (Home, Containers, Files, Settings) + More sheet stub, safe-area insets, dvh sizing, desktop untouched above — gates everything
- [ ] Bottom-sheet + tap-popover primitives — shared by every later surface
- [ ] Home: next run, recent runs (four-status), repository health, trigger backup with confirm + deep-link to run
- [ ] Containers: summary line + status cards → per-container view
- [ ] Selection tree screen: touch `SelectionTree` variant with pinned restic count + Save; wired to the existing save queue
- [ ] File sets: coverage cards + same tree + empty-selection rule in copy
- [ ] Run detail: stats, activity log, verify/browse, restore entry point
- [ ] Guided restore mobile flow: preflight → consequence-naming confirm → dry-run/verify → live progress
- [ ] Visibility-aware refresh on Home + Run detail

### Add After Validation (v1.x — remaining destinations + full parity, MOBILE-03 + MOBILE-04)

- [ ] VMs, Flash, Config, Receiver, Fleet in the card language — trigger: shell + card patterns proven
- [ ] Settings on mobile with full-screen sheet editors — trigger: sheet primitive stable
- [ ] Schedule editing parity (TimePicker/CadenceBuilder sheets) — trigger: sheet editors proven
- [ ] Notification + off-site replication configuration parity — trigger: same
- [ ] Sticky search/filter + load-more on run/list surfaces — trigger: list length pain reported
- [ ] Platform-adaptive chrome completion (HIG large-title collapse, M3 FAB behaviors) — trigger: screens stable on both platforms

### Future Consideration (v2+)

- [ ] PWA installability (manifest, offline shell) — defer: evaluation after the responsive milestone proves usage patterns
- [ ] Web push for failure alerts — defer: server notification channels cover it today; iOS push machinery is a platform-scale change
- [ ] Junk-folder suggestion chips (confirm-first) on the tree — deferred from v1.0 PROJECT.md scope; mobile inherits desktop's decision
- [ ] Tree fanout into ExcludesEditor ("exclude this subfolder instead") — already a recorded follow-up, not this milestone
- [ ] Biometric unlock / native share-sheet integrations — requires the native wrapper decision; keep out

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Mobile shell + More sheet + safe-area/dvh | HIGH | MEDIUM | P1 |
| Sheet/popover primitives | HIGH (gate 6+ surfaces) | MEDIUM | P1 |
| Home (glanceable) + trigger backup | HIGH | MEDIUM | P1 |
| Containers + status cards | HIGH | MEDIUM | P1 |
| Touch selection tree (both domains) | HIGH (signature feature) | HIGH | P1 |
| Run detail + live progress (visibility-aware) | HIGH | MEDIUM | P1 |
| Guided restore mobile flow | HIGH (DR from phone) | HIGH | P1 |
| File sets screen | MEDIUM-HIGH | LOW (after containers — shared tree) | P1 |
| VMs / Flash / Config / Receiver / Fleet | MEDIUM-HIGH | MEDIUM (each mostly chrome) | P2 |
| Settings + schedule/notification/replication parity | HIGH (parity contract) | MEDIUM | P2 |
| Search/filter/load-more lists | MEDIUM | MEDIUM | P2 |
| Platform-adaptive chrome completion | MEDIUM | MEDIUM | P2/P3 |
| PWA / web push / native wrappers | MEDIUM | HIGH | P3 |

**Priority key:** P1 = must have for the milestone's core promise; P2 = complete the parity contract; P3 = future consideration.

## Competitor Feature Analysis

| Surface | Synology companion apps | NAS/container admin web (Unraid/TrueNAS/Proxmox/Portainer) | restic-ecosystem UIs (Backrest et al.) | Home Assistant | BombVault v1.1 approach |
|---------|------------------------|------------------------------------------------------------|----------------------------------------|----------------|--------------------------|
| Mobile strategy | Native monitor-only companion; config stays desktop | Desktop-first web, phones get unadapted pages | Web UI only; mobile never mentioned in docs | One responsive codebase, full parity | One responsive SPA, full parity below breakpoint |
| Monitoring at a glance | Task/device status in app | Dense tables | Plan/run lists | Dashboard | Home: next run, recent runs, repo health, four-status language |
| Trigger backup from phone | Limited/no (companion model) | Via unadapted web | Via unadapted web | Automations | One-tap with consequence-aware confirm |
| Restore from phone | No / file-download only | Unadapted | Unadapted | n/a | Guided flow: guard chain, dry-run, live log |
| Selection/scope editing on touch | Desktop only | No subfolder selection at all (except desktop trees) | Text paths only | n/a | Touch tri-state tree, pinned restic count |
| Status language | App task icons | Inconsistent per page | Basic | Chips | Locked four hues + text labels (never color alone), offsite as domain identity |
| Confidence | MEDIUM (docs unfetchable; model is well-attested) | MEDIUM (category consensus) | HIGH (READMEs fetched) | MEDIUM (docs not fetched this session) | — |

## Sources

- `design/mobile/README.md` @ commit 0b64c7df (local, primary) — HIGH: locked carbon tokens, four-status rule, bottom nav + More sheet decision, platform mapping, product rules in the UI (pinned restic count, last-tick rule, CACHEDIR visibility, deliberate restore)
- Maquettes `design/mobile/android.html` / `ios.html` @0b64c7df (local, primary) — HIGH: per-screen content for Home, Containers, selection tree, file sets, run detail
- Codebase inventory `web/src/components` + `web/src/pages` + `web/src/lib` + `.planning/codebase/` (local, primary) — HIGH: reuse-map substrate; confirms zero existing mobile CSS handling
- Material Design archive, bottom navigation guidelines (m1.material.io, fetched) — spec text: 3–5 destinations, >5 tap-target crowding, overflow via alternative location, 56 dp bar, icon-only inactive at 4–5 actions, active tint, tap-active-returns-to-top — primary spec, provider tier LOW
- W3C WCAG 2.2 Understanding Target Size Minimum 2.5.8 (fetched) — 24×24 CSS px AA floor, five exceptions; Enhanced 2.5.5 = 44×44 AAA — primary spec, provider tier LOW
- W3C ARIA APG checkbox pattern (fetched) — `aria-checked="mixed"` tri-state, group mirroring, Space activation, remember-partial option — primary spec, provider tier LOW
- W3C WCAG 2.2 Understanding Use of Color 1.4.1 (fetched) — color never the sole signal; 3:1 luminance distinction counts — primary spec, provider tier LOW
- Nielsen Norman Group, "Confirmation Dialog" (Nielsen, 2018; fetched) — confirm only serious/irreversible; name consequences; outcome-naming buttons; no reflexive defaults; typed confirm for rare catastrophic; undo beats confirmation — primary source, provider tier LOW
- MDN `env()` (fetched) — `safe-area-inset-*` semantics, `viewport-fit=cover` opt-in, desktop = 0 — primary spec, provider tier LOW
- MDN Viewport concepts (fetched) — layout vs visual viewport; `svh`/`lvh`/`dvh` resolution; 100vh = large viewport — primary spec, provider tier LOW
- MDN Page Visibility API (fetched) — `visibilitychange`, dashboard-polling pause/resume use case, background throttling of timers, SSE/WebSocket exemption — primary spec, provider tier LOW
- MDN `overscroll-behavior` (fetched) — `contain`/`none` disable pull-to-refresh and scroll chaining; nested-scroller lock for sheets — primary spec, provider tier LOW
- Backrest README (fetched) — web-first restic UI, no mobile client; "NAS deployments" remote-access framing — the gap evidence — provider tier LOW
- Uptime Kuma README (fetched) — no mobile mention; status pages/notifications model — provider tier LOW
- Apple HIG Tab bars (JS-shelled; via fetch recap only) — avoid >5 tabs, system "More" is a fallback not a goal, badges = dynamic status — **LOW, verify wording before citing in user-facing docs**
- m3.material.io navigation bar (JS-shelled; M2 archive carries the numbers) — M3-specific anatomy unverified this session — **LOW**
- Synology ABFB mobile app / DSM mobile specifics — **LOW** (KB + app-store pages not fetchable this session); monitor-only companion model stated as category convention
- iOS focus-zoom on <16 px inputs, 44 pt/48 dp platform conventions — platform folklore, consistent with fetched WCAG numbers — **LOW-MEDIUM**

---
*Feature research for: BombVault v1.1 Mobile Interface — mobile UX conventions, per-screen/per-flow expectations, desktop reuse*
*Researched: 2026-09-11*
