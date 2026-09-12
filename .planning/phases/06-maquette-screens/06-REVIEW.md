---
phase: 06-maquette-screens
reviewed: 2026-09-12T19:34:27Z
depth: standard
files_reviewed: 81
files_reviewed_list:
  - web/dist/index.html
  - web/e2e/desktop-untouched.spec.ts
  - web/e2e/home-trigger.spec.ts
  - web/e2e/maquette-screens.spec.ts
  - web/e2e/run-detail-visibility.spec.ts
  - web/e2e/tap-popovers.spec.ts
  - web/e2e/touch-tree.spec.ts
  - web/eslint.config.js
  - web/src/app/Layout.tsx
  - web/src/app/mobileShellSource.test.ts
  - web/src/components/ActivityLog.tsx
  - web/src/components/BackupButton.tsx
  - web/src/components/ColorPickerPopover.tsx
  - web/src/components/FilterPopover.tsx
  - web/src/components/InfoBubble.tsx
  - web/src/components/SelectionTree.touch.dom.test.tsx
  - web/src/components/SelectionTree.tsx
  - web/src/components/mobile/BottomNav.tsx
  - web/src/components/mobile/BottomSheet.dom.test.tsx
  - web/src/components/mobile/BottomSheet.tsx
  - web/src/components/mobile/ConfirmSheet.dom.test.tsx
  - web/src/components/mobile/ConfirmSheet.tsx
  - web/src/components/mobile/RunDetailSheet.dom.test.tsx
  - web/src/components/mobile/RunDetailSheet.tsx
  - web/src/components/mobile/StickyActionBar.dom.test.tsx
  - web/src/components/mobile/StickyActionBar.tsx
  - web/src/components/mobile/TapPopover.dom.test.tsx
  - web/src/components/mobile/TapPopover.tsx
  - web/src/index.css
  - web/src/lib/backupWatch.ts
  - web/src/lib/i18n.ts
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
  - web/src/lib/pageShell.ts
  - web/src/lib/runDisplay.ts
  - web/src/lib/useConfirm.tsx
  - web/src/lib/useMediaQuery.test.ts
  - web/src/lib/useMediaQuery.ts
  - web/src/lib/useVisibilityGate.test.ts
  - web/src/lib/useVisibilityGate.ts
  - web/src/pages/Containers.tsx
  - web/src/pages/Dashboard.tsx
  - web/src/pages/Files.tsx
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-09-12T19:34:27Z
**Depth:** standard
**Files Reviewed:** 81
**Status:** issues_found

## Summary

Reviewed the phase-06 maquette-screens implementation at standard depth: the mobile shell chrome (BottomNav/MoreSheet/Layout), the BottomSheet/TapPopover/ConfirmSheet/StickyActionBar/RunDetailSheet primitives, the touch interaction mode of the ONE SelectionTree, the three restacked pages (Containers, Dashboard, Files) including both serialized save queues, the backupWatch/visibility-gate media hooks, the 40 locale modules (group review: key parity + structure), the e2e and dom test suites, and `web/dist/index.html`.

Constraints audit: clean. The frozen files (`web/src/app/router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**`) and `package.json` have zero diffs in the review range (`git diff --name-only 9026ae7e50b1bd735292189ea5b99605bcdad8da^..HEAD` — 105 files, none frozen). The SelectionTree was not forked (interactionMode prop only; touch toggles route through the same guarded `onToggle` pipeline). All 40 locale files carry the 10 new keys with no em dashes in added user text. PAGE_SHELL responsive exceptions are declared in `eslint.config.js` data, not disable comments. Sticky-in-flow doctrine is respected everywhere (no `position: fixed` chrome). The FoldersEditor/FileSetFoldersEditor save-queue machinery (scheduleSave/attemptSave/owedRef/pendingDescsRef, mid-flight flush branch, sticky reset descriptor, WR-02 tail reload) was traced end to end and is sound.

The one Critical defect: the RunDetailSheet's live-progress key derivation uses `run.targetId` for the `vm` and `files` domains, but the backend records runs under the 32-hex target/set id while publishing SSE progress under the human-readable NAME — so the sheet's live section never activates for VM and file-set runs. Two Warnings follow the same sheet's FLOW-03 wiring (unwitnessed CheckDraw animation; a dismissal latch that permanently silences the deep-link after the first dismissal). No security findings: no injection surface, no secrets, status colors stay on badges, every user-visible string routes through `t()`.

## Critical Issues

### CR-01: Run detail sheet's live progress never activates for VM and file-set runs — progress key built from `targetId` (32-hex id) while SSE publishes under the target NAME

**File:** `web/src/components/mobile/RunDetailSheet.tsx:110-125` (specifically lines 115 and 121)

**Issue:** `progressKeyFor` maps a run to its shared-SSE progress key:

```ts
case "vm":
  return `vm:${run.targetId}`;     // line 115
...
case "files":
  return `files:${run.targetId}`;  // line 121
```

But `run.targetId` for these domains is the stable row id, not the name:

- VM backups: `internal/api/service.go:7636` — `s.store.StartRun(tg.ID, "backup")` (the `vm_targets.id`, a 32-hex string), while the SSE progress key is `vkey := "vm:" + name` (`internal/api/service.go:7658-7663`). VM restores publish under `"vm:" + name` too (`internal/api/service.go:8379`).
- File-set backups: `internal/backup/files_orchestrator.go:60-63` documents `TargetID` as "the set's stable file_sets.id", `service.go:8711` records `StartRun(set.ID, ...)`, and the progress key is `key := "files:" + set.Name` (`internal/api/service.go:8764`). The `api.ts:352` doc comment confirms the split: `targetId` = row id, `target` = "human target name".

`LiveRunSection` therefore looks up `progressMap["vm:<32-hex>"]` / `progressMap["files:<32-hex>"]` — keys the backend never publishes — and the live section (line 215: `const prog = progressKey ? progressMap[progressKey] : undefined`) stays inactive for the entire run. The container domain works only by coincidence: a container's id IS its name. The component's own comment (lines 106-108) even states the correct shapes ("container:plex", "vm:win11") and cites the consumers that key by name (BackupButton.tsx:59, VMs.tsx:470, Files.tsx) — the implementation contradicts its documenting comment.

The dom test enshrines the coincidence instead of catching it: `RunDetailSheet.dom.test.tsx:215` renders `makeRun({ targetId: "win11", target: "win11", domain: "vm" })` — targetId set equal to the name, a state the real backend never produces for VM runs. That is why the suite passes while production is broken.

Net effect: SCRN-05's live half (progress bar, live log tick, elapsed line) is dead for 2 of the 5 domains the sheet serves, for both backups and restores.

**Fix:** Key by the resolved display name the backend publishes under, matching every other consumer:

```ts
function progressKeyFor(run: Run): string | null {
  switch (run.domain) {
    case "container":
    case "vm":
    case "files":
      return `${run.domain}:${run.target}`; // target = the NAME the SSE key uses
    case "flash":
      return "flash";
    case "config":
      return "config";
    default:
      return null;
  }
}
```

(`run.target` equals the container name for the container domain, so the working case is unchanged.) Then fix the dom fixture to a backend-shaped pair — `targetId: "a1b2…32-hex", target: "win11"` — and add a files-domain live-progress case, so the suite pins the real contract and can never re-enshrine the id==name coincidence. Note `listSnapshotFilesFileSet(run.targetId, ...)` at line 314 is correct as-is (the files-browse API takes the set id); only the progress key is wrong.

## Warnings

### WR-01: CheckDraw "fresh success" animation fires for transitions the user never witnessed — the gate watches while the sheet is closed and `freshOk` is missing from the close-reset effect

**File:** `web/src/components/mobile/RunDetailSheet.tsx:359-384`

**Issue:** All three hosts keep the sheet mounted when closed (`sheetRun` stays set) and keep refreshing `sheetRun` from poll callbacks while it is closed (Dashboard.tsx:2399-2402, Containers.tsx:1757-1760, Files.tsx:2245-2247). The `freshOk` watcher at lines 379-384 runs regardless of `open` (the `!open` early return is at line 386, after all hooks), so a running → success transition that lands while the sheet is dismissed sets `freshOk = true`. Reopening that run then plays the CheckDraw animation for a completion that happened off-screen — exactly what the component's own contract forbids (lines 371-376: "a sheet opened on an old successful run must not animate a checkmark as if the run just completed"). The close-reset effect (lines 359-369) resets browse/files/filter/selected/verify but not `freshOk`, so the stale flag also survives a close/open cycle on a run whose status changed between sessions.

**Fix:** Gate the transition on visibility and reset on close:

```ts
const openRef = useRef(open); // ref-mirror per the house exhaustive-deps workaround
openRef.current = open;

useEffect(() => {
  const was = prevStatusRef.current;
  prevStatusRef.current = run.status;
  if (run.status === "success" && (was === "running" || was === "checking") && openRef.current)
    setFreshOk(true);
  else if (run.status !== "success") setFreshOk(false);
}, [run.status]);
```

and add `setFreshOk(false);` to the close-reset effect at lines 359-369 so every open starts from a clean gate. `prevStatusRef` must keep updating unconditionally (it does) so a transition while closed is never re-detected on reopen.

### WR-02: FLOW-03 deep-link latch is never re-armed on a new trigger press — after one dismissal, every later "New backup" / "Back up now" press silently skips the run sheet

**File:** `web/src/pages/Dashboard.tsx:2370-2403` (same pattern in `web/src/pages/Containers.tsx:1720-1760` and `web/src/pages/Files.tsx:2245-2247`)

**Issue:** `sheetDismissed` exists to stop later POLLS of one watch from re-opening a sheet the user closed ("a sheet the user closed must not re-open from a later poll", Dashboard.tsx:2367-2369). But it is re-armed only by an explicit run-row tap (`openRun`, Dashboard.tsx:2373-2377). A new `fire()` — the Dashboard "New backup" trigger, the Containers detail's "Back up now" BackupButton, the Files file-set trigger — does not re-arm it. Sequence: press trigger → sheet deep-links (FLOW-03) → user dismisses it mid-run → runs to completion (toasts) → user presses the trigger AGAIN → the new run correlates, `setSheetRun(run)` updates the record, but `if (!sheetDismissed.current)` is false so the sheet never opens. The user pressed the exact thumb-zone control whose documented contract is "landing the user INSIDE the live run they just started" (Dashboard.tsx:2389-2394) and gets nothing but the terminal toast minutes later. All three hosts share the defect.

**Fix:** Re-arm when a NEW run id correlates (polls refresh the SAME run; a different id is a new fire). In each host's correlation callback:

```ts
onRun: (run) => {
  setSheetRun((prev) => {
    if (prev?.id !== run.id) sheetDismissed.current = false; // new fire re-arms the deep-link
    return run;
  });
  if (!sheetDismissed.current) setSheetOpen(true);
},
```

(or equivalently, re-arm at fire time in the Dashboard's `fireEverything` wrapper and at each trigger's `start` call). Same-id poll refreshes stay suppressed, preserving the latch's stated purpose.

## Info

### IN-01: Stale "26 locales" comments in the extracted runDisplay helpers

**File:** `web/src/lib/runDisplay.ts:132,212`

**Issue:** The header claims the status keys "existed as real, fully-translated keys in all 26 locales" and that a key is "translated into all 26 locales" — the project is now a 42-locale table and this phase's own keys landed in all 40 non-English files. Comments are load-bearing documents in this repo; a wrong count invites the next editor to under-add keys.

**Fix:** Update both counts to "all 42 locales" (or drop the number and say "every locale").

### IN-02: `flushRef.current` is assigned every render and never cleared on unmount

**File:** `web/src/pages/Containers.tsx:1432-1434` (twin at `web/src/pages/Files.tsx:1393-1395`)

**Issue:** The Save-bar flush closure is published via a dep-array-less effect and nothing nulls it when the editor unmounts (detail closed, Advanced toggled off), so the page's `saveFlushRef.current` holds an unmounted editor's closure until the next editor mounts. Practically safe today — the Save bar renders only while a detail is open, and the new editor reassigns the ref before the bar can be pressed — but the invariant lives in two heads (page + editor) with no code enforcing it.

**Fix:** One mount-scoped cleanup in each editor: `useEffect(() => () => { if (flushRef) flushRef.current = null; }, []);` (mount-once, so it cannot race the every-render assignment), making the stale-closure window structurally impossible.

---

_Positive notes (no action):_ the serialized save queues' mid-flight flush branches correctly respect the sticky reset descriptor and the owed-class discipline; `cardMountsCache`'s failed-fetch-as-null is an explicitly documented trade-off with a recovery path (detail close evicts); the tap-popover scroll/resize dismissal and backdrop-ownership split between desktop/mobile ColorPickerPopover are reasoned and commented at the site; the max-md leakage e2e battery and the poll-chain heartbeat spec pin real contracts.

_Reviewed: 2026-09-12T19:34:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
