---
phase: 07-remaining-destinations-operational-parity
reviewed: 2026-09-13T12:00:00Z
depth: standard
files_reviewed: 86
files_reviewed_list:
  - web/dist/index.html
  - web/e2e/desktop-untouched.spec.ts
  - web/e2e/destination-config-receiver-fleet.spec.ts
  - web/e2e/destination-settings.spec.ts
  - web/e2e/destination-vms-flash.spec.ts
  - web/e2e/list-ergonomics.spec.ts
  - web/e2e/maquette-screens.spec.ts
  - web/e2e/narrow-viewport.spec.ts
  - web/e2e/platform-chrome.spec.ts
  - web/e2e/settings-editors.spec.ts
  - web/e2e/tap-popovers.spec.ts
  - web/e2e/touch-tree.spec.ts
  - web/src/app/mobileShellSource.test.ts
  - web/src/components/ActivityLog.tsx
  - web/src/components/OffsiteTargetsSection.tsx
  - web/src/components/SelectionTree.touch.dom.test.tsx
  - web/src/components/SelectionTree.tsx
  - web/src/components/Toggle.tsx
  - web/src/components/mobile/Fab.dom.test.tsx
  - web/src/components/mobile/Fab.tsx
  - web/src/components/mobile/ListToolbar.tsx
  - web/src/components/mobile/MobileSectionLabel.tsx
  - web/src/components/mobile/RunDetailSheet.dom.test.tsx
  - web/src/components/mobile/RunDetailSheet.tsx
  - web/src/index.css
  - web/src/lib/i18n.preseed.test.ts
  - web/src/lib/i18n.ts
  - web/src/lib/pageShell.ts
  - web/src/lib/platform.test.ts
  - web/src/lib/platform.ts
  - web/src/lib/useLoadMore.test.ts
  - web/src/lib/useLoadMore.ts
  - web/src/main.tsx
  - web/src/pages/Config.tsx
  - web/src/pages/Containers.tsx
  - web/src/pages/Dashboard.tsx
  - web/src/pages/Files.tsx
  - web/src/pages/Flash.desktop.dom.test.tsx
  - web/src/pages/Flash.tsx
  - web/src/pages/Fleet.peerCard.dom.test.tsx
  - web/src/pages/Fleet.tsx
  - web/src/pages/Receiver.tsx
  - web/src/pages/Settings.tsx
  - web/src/pages/VMs.test.tsx
  - web/src/pages/VMs.tsx
  - web/src/pages/settings/NotifyCard.tsx
  - web/src/lib/locales/ar.ts
  - web/src/lib/locales/bg.ts
  - web/src/lib/locales/ca.ts
  - web/src/lib/locales/cs.ts
  - web/src/lib/locales/da.ts
  - web/src/lib/locales/el.ts
  - web/src/lib/locales/es.ts
  - web/src/lib/locales/et.ts
  - web/src/lib/locales/eu.ts
  - web/src/lib/locales/fa.ts
  - web/src/lib/locales/fi.ts
  - web/src/lib/locales/fr.ts
  - web/src/lib/locales/gl.ts
  - web/src/lib/locales/he.ts
  - web/src/lib/locales/hi.ts
  - web/src/lib/locales/hr.ts
  - web/src/lib/locales/hu.ts
  - web/src/lib/locales/id.ts
  - web/src/lib/locales/is.ts
  - web/src/lib/locales/it.ts
  - web/src/lib/locales/ja.ts
  - web/src/lib/locales/ko.ts
  - web/src/lib/locales/lt.ts
  - web/src/lib/locales/lv.ts
  - web/src/lib/locales/ms.ts
  - web/src/lib/locales/nl.ts
  - web/src/lib/locales/no.ts
  - web/src/lib/locales/pl.ts
  - web/src/lib/locales/pt.ts
  - web/src/lib/locales/ro.ts
  - web/src/lib/locales/ru.ts
  - web/src/lib/locales/sk.ts
  - web/src/lib/locales/sl.ts
  - web/src/lib/locales/sr.ts
  - web/src/lib/locales/sv.ts
  - web/src/lib/locales/th.ts
  - web/src/lib/locales/tr.ts
  - web/src/lib/locales/uk.ts
  - web/src/lib/locales/vi.ts
  - web/src/lib/locales/zh.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-13T12:00:00Z
**Depth:** standard
**Files Reviewed:** 86
**Status:** issues_found

## Summary

Reviewed all 46 component/page/e2e/lib files at standard depth (full reads for the new mobile components, hooks, and lib tests; full diff reads with surrounding context for the six large destination pages, Settings.tsx, NotifyCard.tsx, and index.css) plus a structural spot-check of the 40 locale diffs.

The phase's core mechanisms held up under adversarial reading: the D-01 double gates keep the desktop DOM and network byte-identical (and the jsdom suites prove the desktop half); the T-07-07/T-07-13 settings write chains re-fetch the baseline at send time and merge only the owned field; useLoadMore's identity/preserveKey contract is correctly consumed everywhere (memoized filter chains, honest hasMore gating, no scroll observers); the write-only secrets contract holds in the Fleet, Receiver, and Notify editors; RestoreAction's `requireConfirm={false}` + `confirmMessage` usage is the documented modal-confirm pattern, not an unguarded restore; and EXACT_CADENCE_MODES correctly restricts per-item VM overrides. The locale pass is clean: all 40 locale diffs carry exactly the 9 pre-seeded phase-7 keys plus the `home.newBackupConfirm` rewrite, with zero em/en dashes and zero template-literal interpolation, and `i18n.parity`/`i18n.preseed` tests pin the rest at CI.

Three warnings: one data-correctness bug where the VMs mobile next-fire chip can display another VM's (or the domain job's) fire time on every override-bearing card because per-item schedule entries are indistinguishable from the domain entry in `/api/schedule/next`; one state-lifetime bug where the Files mobile Save bar outlives its editor under search and its flush ref can commit edits of an unmounted row; and one honesty gap where the Flash mobile hero claims "never backed up" while the snapshot list is still loading. No critical findings.

## Warnings

### WR-01: VMs mobile next-fire chip can show the wrong VM's (or the domain job's) next fire

**File:** `web/src/pages/VMs.tsx:2161` (chip render at `web/src/pages/VMs.tsx:2516-2519`)

**Issue:** `MobileVMsBlock` derives ONE shared next-fire record with `getScheduleNext().then((rows) => { ... setScheduleNext(rows.find((r) => r.domain === "vms") ?? null); })` and renders it on every card whose VM has an active override (`scheduleActive && scheduleNext ? ... formatTs(new Date(scheduleNext.next).getTime() / 1000) ...`). But per-item VM schedule overrides (#121) register their own cron entries via `addPerItemEntry(spec, "vms", ...)` with `scheduledEntry{id, job: "backup", domain: domain}` (`internal/schedule/schedule.go:1989`), and the domain job itself resolves to the identical label via `jobDomainFromName("vms")` → `("backup", "vms")` (`internal/schedule/schedule.go:973`, entry append at `:1870`). `NextRuns()` sorts soonest-first (`:1015`). Every vms-domain row in the payload is therefore indistinguishable, so `find()` returns whichever fires soonest — with vm-a on `daily 01:00` and vm-b on `daily 02:00`, BOTH cards display 01:00; and when the domain job fires sooner than every override, every override card displays a fire that does not back that VM up at all (an overridden VM rides its own entry, not the domain run). FLOW-01's contract ("the chip text is the SERVER's next fire") is broken for any fleet with more than one vms entry. The identical `find()` in `Config.tsx:820` (`domain === "config"`) is safe only because no config per-item entries exist.

**Fix:**
```go
// internal/schedule/schedule.go — give per-item rows an identity the SPA can
// match on (additive, wire-compatible):
s.entries = append(s.entries, scheduledEntry{id: id, job: "backup", domain: domain, item: name})
// ...and thread it through NextRun{Job, Domain, Next, Item}.
```
```tsx
// web/src/pages/VMs.tsx — then match the card's own VM, falling back to the
// domain entry only for non-override cards:
setScheduleNext(rows.find((r) => r.domain === "vms" && r.item === vm.libvirtName) ?? null);
// Interim frontend-only honesty (no backend change): render the chip only
// when exactly one vms-domain row exists in the payload — ambiguous never.
```

### WR-02: Files mobile Save bar outlives its editor under search; stale flush ref commits hidden edits

**File:** `web/src/pages/Files.tsx:1930,2357` (flush ref lifecycle at `web/src/pages/Files.tsx:1395-1397`)

**Issue:** The mobile save bar gates on `expandedSet !== null && expandedSet.path !== ""`, but `expandedSet` is resolved from the FULL list (`sets.find((s) => s.id === expandedSetId)`, line 1930) while the editor it belongs to renders inline inside the SEARCH-FILTERED window (`visibleSets.map(...)` over `matchedSets`, lines 2281-2329). Typing in the new `setsSearch` toolbar so the expanded set no longer matches unmounts the editor (discarding its local draft state) yet keeps the Save bar on screen — including over the zero-match "No items match" card — with the stale `saveState.ticked` count. Worse, `FileSetRow` assigns `flushRef.current = flushSaveQueue` every render (lines 1395-1397) with NO unmount cleanup, so `saveFlushRef.current` still holds the unmounted row's closure; pressing Save then invokes it against the surviving mirror refs and commits the discarded queue via `scheduleSave` — edits the operator can no longer see being saved.

**Fix:**
```tsx
// Files.tsx — gate the bar on the VISIBLE list, so a hidden editor hides its bar:
const expandedVisible = expandedSetId !== null && matchedSets.some((s) => s.id === expandedSetId);
{!isDesktop && expandedVisible && expandedSet !== null && expandedSet.path !== "" && ( ... )}
// Files.tsx FileSetRow — clear the flush on unmount so a stale press no-ops:
useEffect(() => {
  if (flushRef) flushRef.current = flushSaveQueue;
  return () => { if (flushRef) flushRef.current = null; };
});
```

### WR-03: Flash mobile hero claims "never backed up" while the snapshot list is still loading

**File:** `web/src/pages/Flash.tsx:697`

**Issue:** The mobile hero renders `` `${t("containers.lastBackup")}: ${newest ? formatTs(newestUnix) : t("containers.never")}` `` with no loading branch, so on every cold load (and any refresh) the phone states a factually wrong "Never backed up" until the snapshots fetch resolves. The sibling block engineered this away: `MobileConfigBlock` derives its hero line as `loading ? t("dashboard.checking") : ...` (`Config.tsx:847-856`, its comment noting the desktop card shows "checking" for exactly this reason), and Flash's own DESKTOP hero renders a separate `{loading && checking}` paragraph (`Flash.tsx:506`). The mobile presentation is the only last-backup surface left making the false claim.

**Fix:**
```tsx
{`${t("containers.lastBackup")}: ${
  loading ? t("dashboard.checking") : newest ? formatTs(newestUnix) : t("containers.never")
}`}
```

## Info

### IN-01: Sibling mobile blocks gate the Fab differently on a failed settings fetch

**File:** `web/src/pages/Flash.tsx:788` (vs `web/src/pages/Config.tsx:978`)

**Issue:** Config mounts its mobile Fab under `{!error && gate !== "off" && (...)}`, hiding the primary action when the settings fetch failed; Flash mounts under `{gate !== "off" && (...)}` only, so with `error` set (gate stuck "unknown", which reads as on) the backup-now Fab stays mounted on a surface whose gate state is unverified. Deliberate "unknown renders as on" honesty covers the pre-fetch window, but the error case is where the two sibling implementations of the same pattern diverge.

**Fix:** Align on the stricter sibling: `{!error && gate !== "off" && (<Fab ... />)}` in `MobileFlashBlock`, or document at the Flash site why a failed gate read must still offer the action.

### IN-02: MobileZipSheet one-shot `loaded` gate swallows a failed settings fetch with no retry

**File:** `web/src/pages/Flash.tsx:847-853`

**Issue:** The zip sheet's settings load runs once (`if (!open || loaded) return; setLoaded(true); getSettings()...catch(() => undefined)`): a transient failure of the FIRST open leaves the zip-export toggle at its default (off) for the rest of the session, which may silently misrepresent the stored setting, with no error hint and no refetch on reopen. Writes remain safe because the apply path re-fetches the latest settings at send time (T-07-07 chain), so only the displayed state is affected.

**Fix:** Only set `loaded` on success (`.then(...)  .finally(() => setLoaded(true))`-style, or reset on failure) so a reopen retries, and/or surface the failure where the sheet's other error paths render.

### IN-03: Schedule fixtures in e2e are not wire-accurate and mask WR-01's ambiguity class

**File:** `web/e2e/destination-vms-flash.spec.ts:233,404`, `web/e2e/destination-config-receiver-fleet.spec.ts:192,217,363,369`

**Issue:** The staged `/api/schedule/next` rows carry `job: "vms"` / `job: "config"`, but the real backend labels backup-domain entries `job: "backup"` (`jobDomainFromName`, schedule.go:973) — and stages exactly ONE row per domain. The specs pass only because the SPA filters on `domain` alone, and the single-row fixtures can never exercise the multi-entry ambiguity behind WR-01; wire-accurate fixtures with a second per-item row would have caught it.

**Fix:** When WR-01 lands, update the fixtures to `job: "backup"` and add a scenario staging two vms-domain rows (domain + per-item) asserting each override card shows ITS OWN next fire.

---

_Reviewed: 2026-09-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
