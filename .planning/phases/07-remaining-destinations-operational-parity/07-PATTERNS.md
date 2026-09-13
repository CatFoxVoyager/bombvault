# Phase 7: Remaining Destinations & Operational Parity - Pattern Map

**Mapped:** 2026-09-13
**Files analyzed:** 14 (6 page mobile blocks, 4 new lib/components, list toolbar, MobileSectionLabel promotion, 2 test/guard suites)
**Analogs found:** 14 / 14 (all in-repo; zero new mechanisms)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `web/src/pages/Vms.tsx` (mobile block) | component/page | request-response | `web/src/pages/Dashboard.tsx:2090-2374, 2983, 3075` | exact (double gate + card language) |
| `web/src/pages/Flash.tsx` (mobile block) | component/page | request-response | `Dashboard.tsx` mobile blocks + existing Flash snapshot rows | exact |
| `web/src/pages/Config.tsx` (mobile block + restore sheet) | component/page | request-response | `Dashboard.tsx` double gate + `Recovery.tsx` restoreOwnConfig (chain to narrate) | role-match |
| `web/src/pages/Receiver.tsx` (mobile block + sheet editor) | component/page | request-response | `Receiver.tsx:487-489` dialog → re-host in `BottomSheet fullHeight` | role-match |
| `web/src/pages/Fleet.tsx` (cards + detail/editor sheets) | component/page | request-response | `Fleet.tsx:365-380, 798-800` dialogs → sheet re-host | role-match |
| `web/src/pages/Settings.tsx` (chips + stacked cards) | component/page | CRUD | `Settings.tsx` existing tab state + `settings/` tab cards | exact |
| `web/src/lib/platform.ts` | utility | transform | `web/src/lib/shape.ts` (whole file) | exact |
| `web/src/components/mobile/Fab.tsx` | component | event-driven | `components/mobile/StickyActionBar.tsx` (in-flow/sticky-in-flow discipline) + Button.tsx TONE_TABLE (closed-prop discipline) | role-match |
| `web/src/lib/useLoadMore.ts` | hook | batch | (new logic) — pure window fn; model: `lib/activityLog.ts filterLogLines` extractable-pure-fn style | partial |
| List toolbar (`components/mobile/`) | component | request-response | `pages/Vms.tsx:1825-1859` (FilterPopover + search + chips) | exact (state reuse) |
| `MobileSectionLabel` promotion | component | — | `Dashboard.tsx:2106-2115` (verbatim move) | exact |
| Sheet editors (schedule/notify/offsite) | component | event-driven | `BottomSheet.tsx` (fullHeight/footer/tone) wrapping `CadenceBuilder` (inline today) | exact |
| `web/e2e/destination-pages.spec.ts` | test | — | `web/e2e/maquette-screens.spec.ts` (staging half) | role-match |
| Guard extensions (`mobileShellSource.test.ts`, `desktop-untouched.spec.ts`) | test | — | existing suites, both extended not forked | exact |

## Pattern Assignments

### Every six-page mobile block (D-01 double gate)

**Analog:** `web/src/pages/Dashboard.tsx`

**Mount-discipline comment + gate** (lines 2090-2103, 2983, 3075):
```tsx
// Mount discipline is the Containers.tsx precedent: the blocks are JSX-gated
// on `!isDesktop` (jsdom matchMedia answers desktop, so these are e2e-only
// surfaces) and the desktop grid carries `max-md:hidden` in return. At the
// 48rem boundary both switches agree, so exactly one surface ever renders.
...
<div className="grid grid-cols-1 gap-10 md:grid-cols-2 max-md:hidden">{/* desktop */}
{!isDesktop && (<>{/* mobile cards */}</>)}
```
Copy this shape verbatim into Vms/Flash/Config/Receiver/Fleet/Settings. Desktop half always rendered + `max-md:hidden`; mobile half behind `!isDesktop`. Both halves in the SAME file.

**Card anatomy** (`Dashboard.tsx:2139-2172` MobileNextRunCard):
```tsx
<section className="flex flex-col gap-2">
  <MobileSectionLabel t={t} labelKey="dashboard.summaryNextBackup" />
  <div className="flex items-center gap-3 rounded-card bg-carbon-surface p-4">
    ...
    <span className="block truncate text-sm font-semibold text-carbon-text">{name}</span>
    <span className="mt-0.5 block truncate text-xs text-carbon-textMuted">{meta}</span>
    <span className="shrink-0 rounded-pill bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accentText">{chip}</span>
```
**Row anatomy** (`Dashboard.tsx:2199-2218`): `min-h-[2.75rem]` touch rows, four-status `Badge` with `statusLabel` text, `divide-y divide-carbon-border`, `relativeTime` + `humanBytes` meta, aria-label composing status/target.

**Section label to promote** (`Dashboard.tsx:2106-2115`, move verbatim to `components/mobile/`, Dashboard imports it back):
```tsx
function MobileSectionLabel({ t, labelKey }: { t: ReturnType<typeof useT>["t"]; labelKey: TranslationKey }) {
  return (
    <h2 className="px-0.5 text-xs font-semibold uppercase tracking-[0.09em] text-carbon-textMuted">
      {t(labelKey)}
    </h2>
  );
}
```

---

### `web/src/lib/platform.ts` (utility, new)

**Analog:** `web/src/lib/shape.ts` — clone the whole file structure (closed union, coercion fn, STORAGE_KEY, apply/set/applyStored trio).

Core pattern (lines 27-69 verbatim shape):
```ts
export type Shape = "round" | "soft" | "square";
export const SHAPES: Shape[] = ["round", "soft", "square"];
const STORAGE_KEY = "bv-shape";
const DEFAULT: Shape = "round";
function isShape(v: unknown): v is Shape {
  return typeof v === "string" && (SHAPES as string[]).includes(v);
}
export function applyShape(shape: Shape | string | undefined): void {
  const s = isShape(shape) ? shape : DEFAULT;
  document.documentElement.setAttribute("data-shape", s);
}
export function applyStoredShape(): void { applyShape(getShape()); }
```
Substitute `"material" | "cupertino"`, `data-platform`, `bv-platform`. Wire `applyStoredPlatform()` in `web/src/main.tsx:17-23` alongside `applyStoredShape()` (boot, before first render) and in the storage-change listener block at `main.tsx:31-36`.

**CSS side analog** (`web/src/index.css:592-613`):
```css
:root[data-shape="soft"] {
  --radius-card:    0.5rem;
  ...
}
```
Add `:root[data-platform="cupertino"] { --mob-title-size: 2rem; --mob-title-weight: 700; --mob-check-radius: 999px; ... }` — custom properties ONLY, values + bible citation in one block. `usePlatform()` is sanctioned for the two STRUCTURAL switches only (FAB vs pinned button); everything else is attribute-CSS (Pitfall 5). No `navigator.userAgent`/`userAgentData` anywhere.

---

### Sheet editors (D-05/D-06) and dialog re-hosts (Receiver/Fleet)

**Analog:** `web/src/components/mobile/BottomSheet.tsx` — do NOT rebuild. Use `fullHeight` (editor), no flag (viewer, D-04), `footer` for pinned actions, `tone` for confirm surfaces. Header comment (lines 50-65) documents the additive-props contract; keep it.

**Editor skeleton** (composed from verified props):
```tsx
{scheduleSheetOpen && !isDesktop && (
  <BottomSheet open={scheduleSheetOpen} onClose={closeScheduleSheet} fullHeight
               title={t("vms.scheduleTitle")}>
    <CadenceBuilder value={draft.cadence} onChange={setDraftCadence}
                    label={t("vms.cadenceLabel")} hueIndex={0} />
    <StickyActionBar>{/* apply/cancel */}</StickyActionBar>
  </BottomSheet>
)}
```
CadenceBuilder/TimePicker/NotifyCard/offsite editor are hosted, never forked (TimePicker's only consumer is `CadenceBuilder.tsx:442` — hosting CadenceBuilder brings it).

**Desktop dialogs being re-hosted** (keep the fields, swap the shell):
- `Fleet.tsx:365-380`: `createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">` → panel `w-full max-h-[90vh] overflow-y-auto rounded-card bg-carbon-surface p-5 flex flex-col gap-4`. Mobile renders the same inputs inside a `fullHeight` BottomSheet instead.
- `Receiver.tsx:487-489`: identical portal pattern. Field set incl. APP_KEY via RevealInput; write-only contract preserved (blank input + "Set" badge from `hasAppKey`, blank-on-save keeps, Clear removes — `api.ts:2715-2716`, FleetPeer `hasToken` at `api.ts:2851-2852`).

---

### Settings writes (MORE-02 / FLOW-02)

**Analog:** `web/src/pages/Settings.tsx:1190-1223` (queue) + `:1703-1744` (save/sendSettingsPatch). Mobile editors MUST ride this chain:
```ts
const savedBaseline = useRef<Settings | null>(null);
const settingsWrites = useRef<Promise<unknown>>(Promise.resolve());
function queueSettingsWrite<T>(run: () => Promise<T>): Promise<T> { ... }
...
async function sendSettingsPatch(patch, ...) {
  const base = savedBaseline.current ?? settings;   // read at SEND time
  const updated: Settings = { ...base, ...patch };  // merge ONLY the patch
  const res = await putSettings(updated);
  if (res.ok) { savedBaseline.current = updated; setSettings(prev => prev ? { ...prev, ...patch } : updated); ... }
}
```
**Refuse:** a sheet capturing a whole `Settings` object at open and PUTting it later. Model for an autosave toggle: `ConfigSettingsCard`'s re-fetch → merge-only-changed-field → `queueSettingsWrite` shape.

**Settings page structure:** `TabKey` union + `TAB_ORDER` + existing `tab` state are the single state both presentations bind (desktop strip stays mounted-hidden in the `max-md:hidden` half; mobile chips strip reads the same `tab`). Root: desktop keeps `PAGE_SHELL_TABBED`; mobile block rides `PAGE_SHELL_RESPONSIVE` rhythm (`pageShell.ts:105`).

---

### List ergonomics (LISTS-01)

**Search + chips state to reuse** — `web/src/pages/Vms.tsx:1825-1859`:
```tsx
<FilterPopover label={t("filter.button")} active={filtersActive}>
  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
         placeholder={t("vms.searchPlaceholder")}
         className="w-full rounded-control bg-carbon-surface2 text-carbon-text text-sm px-3 py-1.5 glim-field-focus" />
  <ChipFilter<ScheduleFilterKey> label={t("filter.schedule")} value={scheduleFilter}
    onChange={handleScheduleFilterChange} options={[...]} />
```
One state, two presentations — mobile toolbar binds the SAME `search`/`scheduleFilter`/`backupFilter` state; never a parallel mobile filter state. Logs: reuse `lib/activityLog.ts:764` `filterLogLines(lines, filter)` verbatim. Mobile toolbar composes `TapPopover`/`FilterPopover`; sticky-in-flow only (`sticky bottom-0` style like StickyActionBar — NEVER `position:fixed`; StickyActionBar.tsx header lines 1-24 is the why-comment to echo).

**Load-more:** `useLoadMore(items, threshold)` — pure window math (initial 20, step 20, constant) + `showMore`; button renders only when more rows exist; never auto-loads (no IntersectionObserver/scroll listeners). Client-side only (`listRuns()` takes no params; api.ts frozen). Extract the pure fn for vitest; assert mobile DOM only in Playwright (jsdom matchMedia stub answers desktop — `useMediaQuery.ts:69-74`).

**Row floor:** ≥44px — MoreSheet precedent `rowBase = "flex min-h-[3.25rem] items-center gap-3 rounded-control px-3 text-body hover:bg-carbon-hover"` (`MoreSheet.tsx:61`); Flash snapshot `py-1.5` rows and Dashboard `min-h-[2.75rem]` rows are the list-row precedents.

---

### Guards and e2e (extend, never fork)

**Source-assert guard:** `web/src/app/mobileShellSource.test.ts` — node-env `readFileSync` source-text assertions; extend with the spacing sweep (`gap-3|px-3|...` absence), `font-medium` absence, DESKTOP_QUERY sole-width-literal, UA-identifier needles in the phase-7 file list.
**Desktop battery:** `web/e2e/desktop-untouched.spec.ts:44-98` — `ROUTES` already lists all ten routes incl. the six; the phase-6 `MAQUETTE_ROUTES` leakage loop (`:77-98`) is the template for extending per-route mobile-chrome-absence needles to the six pages.
**Staged fixtures:** `web/e2e/maquette-screens.spec.ts` staging half + `**/api/display-prefs*` route.abort for localized scenarios.

---

## Shared Patterns

### t() + 42-table i18n
Every user-visible string through `t()` from `useT()`; new keys land in en+de inline in `lib/i18n.ts` plus all 40 locale modules in the SAME commit (parity + orphan tests fail otherwise). Reuse existing keys verbatim (`containers.backupNow`, `flash.backupNow`, `vms.searchPlaceholder`, `filter.button`, existing section titles as sheet titles). Em dashes banned; backend error text verbatim.

### Tokens / spacing / weights
Semantic tokens only (`bg-carbon-surface`, `rounded-card`, `text-carbon-textMuted`); status colors on Badges/chips only; restore controls secondary/tonal never accent; weights 400/600 only; spacing 8/16 stops (`gap-2`/`gap-4`) in all new code — now machine-enforced by the extended guard.

### Sticky-in-flow, never fixed
**Source:** `components/mobile/StickyActionBar.tsx:1-24`. Apply to toolbar rows, FAB placement, editor footers. Sticky element must be a direct child of the page column.

### Destructive confirms
All via `useConfirm` → ConfirmSheet below the breakpoint; zero new confirm UI. Restore entries: secondary/tonal rows; Config restore sheet renders the numbered guard-chain `<ol>` (`config.restoreChain.step1..5`) BEFORE the outcome-naming confirm (chain behavior frozen in `Recovery.tsx` `restoreOwnConfig` — narrate, do not alter).

### Gate-off honesty
Every mobile block handles the settings-gate off state with the desktop gate copy as an outline card pointing at Settings; e2e covers gate-off, not only gate-on fixtures.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `web/src/lib/useLoadMore.ts` | hook | batch | No pagination exists anywhere in the codebase — new pure window math (unit-test it); everything else composes existing primitives |

## Metadata

**Analog search scope:** `web/src/pages`, `web/src/components`, `web/src/components/mobile`, `web/src/lib`, `web/src/app`, `web/e2e`
**Files read in full or targeted:** Dashboard.tsx, Settings.tsx, Fleet.tsx, Vms.tsx, shape.ts, theme.ts (via RESEARCH quote), useMediaQuery.ts, pageShell.ts, BottomSheet.tsx, StickyActionBar.tsx, MoreSheet.tsx, activityLog.ts, index.css, mobileShellSource.test.ts, desktop-untouched.spec.ts, main.tsx
**Pattern extraction date:** 2026-09-13
