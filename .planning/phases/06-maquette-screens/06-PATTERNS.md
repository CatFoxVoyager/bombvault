# Phase 6: Maquette Screens - Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 14 (5 new, 9 modified)
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `web/src/components/mobile/TapPopover.tsx` (NEW) | component (overlay primitive) | event-driven (tap toggle) | `web/src/lib/useTipBubble.tsx` + `web/src/components/ColorPickerPopover.tsx` | exact (mechanism split) |
| `web/src/components/mobile/ConfirmSheet.tsx` (NEW) | component (overlay body) | event-driven | `web/src/components/mobile/BottomSheet.tsx` + `ConfirmDialog.tsx` | exact |
| `web/src/lib/useVisibilityGate.ts` (NEW) | hook | event-driven (visibilitychange) | `web/src/lib/useMediaQuery.ts` (subscribe/snapshot shape) + `web/src/lib/backupWatch.ts` (ref-gated polling) | role-match |
| `web/src/lib/useIsCoarsePointer` (add to `useMediaQuery.ts`) | hook | request-response (media query) | `useIsDesktop` in same file | exact (additive twin) |
| `web/e2e/maquette-screens.spec.ts` (NEW) | test | batch | `web/e2e/mobile-shell.spec.ts` (Phase 5, MOBILE_PROJECTS pattern) | role-match |
| `web/src/components/SelectionTree.tsx` (MOD) | component (interactive tree) | event-driven | itself — the seam is internal (rows 434-533) | exact |
| `web/src/components/mobile/BottomSheet.tsx` (MOD) | component | event-driven | itself — additive fullHeight/footer props | exact |
| `web/src/lib/useConfirm.tsx` (MOD) | hook (portal owner) | event-driven | itself — presentation swap at the portal (lines 155-170) | exact |
| `web/src/pages/Dashboard.tsx` (MOD) | page | CRUD / polling | itself — run label helpers + RunsCard (D-05 extraction source) | exact |
| `web/src/pages/Containers.tsx` (MOD) | page | CRUD + save queue | itself — FoldersEditor + queueRef (D-04 stacked view) | exact |
| `web/src/pages/Files.tsx` (MOD) | page | CRUD + save queue | Containers.tsx (identical queue pattern) | exact |
| `web/src/components/InfoBubble.tsx` (MOD) | component | event-driven (hover→tap) | `useTipBubble` manual `show()/hide()` | exact |
| `web/src/components/FilterPopover.tsx` (MOD) | component (overlay) | event-driven | ColorPickerPopover trigger pair (aria-haspopup/aria-expanded) | exact |
| `web/src/components/ColorPickerPopover.tsx` (MOD) | component (overlay) | event-driven | itself + TapPopover | exact |

## Pattern Assignments

### 1. `SelectionTree.tsx` — touch interaction mode (D-01/D-02/D-11)

**Analog:** `web/src/components/SelectionTree.tsx` itself (the seam is internal). All line numbers verified by direct read this session.

**What must NOT change (APG state model):**
- Roving tabindex, line 477: `tabIndex={tabTarget === spec.path ? 0 : -1}`
- `focusNode`, lines 356-361 — reuse for tap-to-move-roving:
```tsx
function focusNode(hostPath: string): void {
  setFocusPath(hostPath);
  const row = rowRefs.current.get(hostPath);
  row?.scrollIntoView({ block: "nearest" });
  row?.focus();
}
```
- Space-through-onToggle with the disabled guard, lines 423-430: `if (!spec.unreachable && !busyPaths?.has(spec.path)) onToggle(spec.path);` — the touch row onClick must reuse THIS EXACT guard.
- `aria-checked` tri-state, line 461: `const ariaChecked = state === "checked" ? "true" : state === "mixed" ? "mixed" : "false";`
- Tone classes (muted excluded rows — already touch-ready), lines 455-460.

**The desktop seam to branch (render/handler layer only):**
- Row onClick (line 485) — desktop expands; touch toggles: `onClick={spec.expandable ? () => toggleExpansion(spec.path) : undefined}`
- Checkbox (lines 511-521) — desktop is alive-but-aria-hidden; touch must be purely presentational:
```tsx
<input
  ref={boxRef} type="checkbox" aria-hidden="true" tabIndex={-1}
  checked={state === "checked" || state === "mixed"}
  disabled={spec.unreachable || !!busyPaths?.has(spec.path)}
  onClick={(e) => e.stopPropagation()}        // ← dead zone / double-fire hazard on touch
  onChange={() => onToggle(spec.path)}        // ← native toggle hazard on touch
  className="mt-0.5 shrink-0 accent-(--accent)"
/>
```
- Chevron (lines 487-501) is a presentational `<span aria-hidden>` svg today; touch mode replaces it with a real `<button aria-label>` ≥44×44 right-aligned with `stopPropagation`.
- Row classes line 482: `flex items-start gap-2 text-xs min-w-0 ${depth===0 ? "min-h-8" : "min-h-7"}` — touch branch adds `min-h-[44px] touch-manipulation select-none`.
- Tree viewport, line 702: `h-[clamp(12rem,55vh,32rem)] overflow-y-auto` — the stacked container detail (D-04) will drive a different height for the tree mount; keep the default for desktop.

**Prop wiring (D-11):** `interactionMode?: "pointer" | "touch"`, default `"pointer"`. Callers derive it from the new `useIsCoarsePointer` — NEVER from `useIsDesktop` (landscape phones ≥48rem are desktop-chrome but coarse-pointer).

---

### 2. `useMediaQuery.ts` — add `useIsCoarsePointer` (D-11)

**Analog:** `useIsDesktop` in the same file, lines 24-67 — copy the shape verbatim:

```tsx
export const DESKTOP_QUERY = "(min-width: 48rem)";   // line 29 — UNTOUCHED, width authority
let desktopMql: MediaQueryList | null = null;
function currentMql(): MediaQueryList | null { /* lazy matchMedia, windowless-safe */ }
function subscribe(onChange: () => void): () => void { /* addEventListener + Safari<14 fallback */ }
function getSnapshot(): boolean { return mql ? mql.matches : true; }
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
```

**Copy:** a parallel `pointerCoarseMql` module-level lazy list, `POINTER_COARSE_QUERY = "(pointer: coarse)"`, and `useIsCoarsePointer()` using the SAME `useSyncExternalStore` subscribe/snapshot. Note the snapshot default differs: jsdom has no coarse-pointer matchMedia, so the windowless/test default should be `false` (pointer mode) to keep every existing dom test on the pointer tree — mirror the header-comment discipline and the source-assert guard test style (`useMediaQuery.test.ts`) if you pin the literal.

---

### 3. Sticky-in-flow action bars — Home trigger (D-06) + Save bar (D-03)

**Analog (chrome styling):** `web/src/components/mobile/BottomNav.tsx:100`:
```tsx
className="shrink-0 border-t border-carbon-border bg-carbon-sidebar pb-[var(--safe-area-bottom)]"
```
**Analog (scroller):** `web/src/app/Layout.tsx` — `<main id="bv-main">` is the `overflow-y-auto` scroller (flex column; the `flex flex-col` at line ~296 is the sticky-footer page-shell fix).
**Analog (safe-area tokens):** `web/src/index.css:228-231` — `--safe-area-bottom: max(env(safe-area-inset-bottom), 0px);` (+left/right/top siblings). **Analog (page root):** `web/src/lib/pageShell.ts:88` — `export const PAGE_SHELL = "flex flex-col gap-10 max-w-6xl";`

**Pattern to copy:** bar = LAST direct child of the page column:
```
sticky bottom-0  +  bg-carbon-sidebar border-t border-carbon-border
                 +  pb-[max(0.75rem,var(--safe-area-bottom))]
```
Rules: never `position:fixed`; no `overflow-hidden` ancestor between bar and `main#bv-main`; bar must NOT be nested inside a Card (sticky sticks within the parent's box); `PAGE_SHELL` is full-width on a phone so no negative-margin trick is needed. Note the researcher's example uses `-mx-6 px-6` for full-bleed — prefer the plain in-column form (BottomNav precedent, no negative margin) unless the maquette demands edge-to-edge.

---

### 4. Locally stacked container detail (D-04)

**Analog:** `web/src/pages/Containers.tsx` itself — `Containers()` holds the list; `FoldersEditor` is the detail surface (queue at lines 836-1129, zero-include guard at 1183-1188). Pattern: component-local `useState<Container | null>` in `Containers()`; list stays mounted (hidden, not unmounted) when detail opens so scroll survives Back; back affordance row atop the detail. Invariants: `fileSetEditorKey`-style remount contracts in Files.tsx:1125 must not be disturbed; the zero-include guard (`if (next.includes.size === 0) { setBlockedPath(hostPath); setRowShake(...); return; }`, Containers.tsx:1183-1188) routes refusals to `blockedPath`, which the D-03 sheet copy surfaces.

---

### 5. Run-detail full-screen BottomSheet (D-05)

**Analog (primitive):** `web/src/components/mobile/BottomSheet.tsx` — add an additive `fullHeight`-style prop switching the panel class `max-h-[85dvh]` (line 194) to `h-dvh`; default unchanged for MoreSheet. While in the file, absorb 05-UI-REVIEW findings: side padding `px-4` fixed at lines 199/231 → inset-clamped `max(1rem, var(--safe-area-right/left))`; close button `p-2` (~40px, line 222) → ≥44px hit box.

**Analog (content source):** `web/src/pages/Dashboard.tsx` — the run presentation helpers and RunsCard own this content today:
- Imports already hold the formatters (lines 14, 24): `relativeTime, formatTs, formatDuration` from `../lib/reltime`; `humanBytes` from `../lib/forecast`.
- `runKindLabel` (66-92), `runDomainLabel` (49-64), `isDomainOpRunKind` (97-99), `runTargetText` (107-112) — module-level, `t`-based, already shared by RunsCard + SummaryTier.
- Extract the run-detail BODY into a shared component consumed by both the desktop surface and the sheet (planner pins the exact boundary — OQ-1). Frozen `Run` fields (`api.ts:341-358`): no per-file counts, no exclusion lines — tiles use `humanBytes(run.bytes)`, `formatDuration(finishedAt − startedAt)`, mono `snapshotId.slice(0, 8)`; activity log reuses the existing desktop log builder (recorded deviation vs SCRN-05 verbatim).
- Deep-link: local state set after `useNavigate`; no new route.

---

### 6. TapPopover primitive (D-09)

**Analog A (trigger aria pair + portal + positioning):** `web/src/components/ColorPickerPopover.tsx:386-409`:
```tsx
<button ref={triggerRef} type="button" aria-label={label}
  aria-haspopup="dialog" aria-expanded={open}
  onClick={handleOpen} ... />
{open && createPortal(
  <div ref={panelRef} role="dialog" aria-label={label}
    className="glim-picker-popover glim-fade"
    style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
```
**Analog B (positioning math):** `web/src/lib/bubblePosition.ts` — `computeBubblePosition(trigger, bubble, viewport, margin = BUBBLE_VIEWPORT_MARGIN /* 8 */)` (lines 55, 73-110), clamp-then-flip, pure/DOM-free. **Analog C (measure-then-place):** `web/src/lib/useTipBubble.tsx:120-137` — `useLayoutEffect` measuring `getBoundingClientRect` + `offsetWidth/offsetHeight` after mount; Escape + scroll dismissal effect at 142-154; manual `show()/hide()` at 95-101 ("open/close by hand" — the documented tap-migration entry point for InfoBubble).

**Pattern:** trigger carries `aria-expanded` + `aria-haspopup="dialog"`; panel `role="dialog"` with accessible name, positioned via `computeBubblePosition`; transparent full-viewport tap-consuming backdrop (BottomSheet's `target === currentTarget` scrim guard is the close-path precedent — but visually transparent, NOT `bg-black/60`); document-level Escape (useConfirm.tsx:118-149 pattern); focus moves in and restores to the trigger on dismiss (BottomSheet open-effect capture pattern, BottomSheet.tsx:100-112) — NO focus trap. Desktop hover behavior untouched (`useTipBubble` handlers stay; tap adds `show()`).

---

### 7. Confirm presentation swap (D-07)

**Analog:** `web/src/lib/useConfirm.tsx` — the swap point is the portal itself, lines 155-170:
```tsx
const confirmDialog = pending
  ? createPortal(
      <ConfirmDialog ref={dialogRef} title={t("confirmDialog.title")}
        message={pending.message}
        confirmLabel={pending.confirmLabel ?? t("common.confirm")}
        cancelLabel={pending.cancelLabel ?? t("common.cancel")}
        closeLabel={t("common.close")}
        tone={pending.tone ?? "fail"}      // ← tone already defaults to fail
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)} />,
      document.body)
  : null;
```
**Pattern:** inside the portal, branch on `useIsDesktop()`: desktop → `<ConfirmDialog>` unchanged; below breakpoint → new `<ConfirmSheet>` (fail-tone BottomSheet body). Promise API (`confirm`/`settle`, lines 94-113), Escape/Tab-trap effect (118-149), and trigger capture/restore stay untouched — all call sites (BackupButton, restore guards) inherit with zero changes. Focus rule: BottomSheet already focuses the close button on open (BottomSheet.tsx:104, `closeRef.current?.focus()`) — close = the safe outcome; never autoFocus the destructive control. ConfirmSheet resolves cancel-safe on every dismissal path (Escape, scrim, close).

---

### 8. `useVisibilityGate` (D-10)

**Analog A (hook shape):** `web/src/lib/useMediaQuery.ts` — `useSyncExternalStore` over a browser API with a windowless-safe snapshot default; the gate may use plain useEffect+useState (researcher's snippet) but keep the windowless guard convention.
**Analog B (why ref-count drop works):** `web/src/lib/progress.ts` (FROZEN — read-only reference): one module-level EventSource, `refCount` incremented on subscribe (`openSource()` at refCount===1, lines 317-330), `closeSource()` on last unsubscribe (lines 249-253) — a conditionally-unmounted consumer drops the source at zero and the reconnect replays the server snapshot.
**Analog C (reconciliation):** `web/src/lib/backupWatch.ts:218-289` — `fire()` seeds `baselineIds.current = new Set(before.runs.filter(...).map(r => r.id))` from a `listRuns()` snapshot BEFORE firing (lines 226-236), then polls `resolveFromRuns()` on a `POLL_INTERVAL_MS` setTimeout chain (line 285). The gate stops those timers while hidden and the visible-refetch reconcile happens through the SAME baseline-id match — never client clock.

**Consumer shape:** `{visible && <LiveProgressSurface/>}`; `useBackupWatch` poll loop gated on the same boolean. On visible: refetch `listRuns` FIRST, then remount resubscribes.

---

## Shared Patterns

### Media-query hook discipline
**Source:** `web/src/lib/useMediaQuery.ts` (whole file). **Apply to:** `useIsCoarsePointer`. Lazy module-level MediaQueryList, `useSyncExternalStore`, Safari<14 fallback, windowless-safe snapshot, load-bearing header comment; `DESKTOP_QUERY` line 29 stays the only WIDTH literal.

### Portal + dismissal mechanics
**Source:** `web/src/lib/useConfirm.tsx:78-149` → already lifted once into `BottomSheet.tsx:65-149`. **Apply to:** TapPopover (light version — no Tab trap) and ConfirmSheet (full trap via BottomSheet). Document-level Escape, `FOCUSABLE_SELECTOR` Tab trap, capture-then-restore trigger focus, `target === currentTarget` backdrop close.

### Sticky-in-flow + safe-area chrome
**Source:** `BottomNav.tsx:100`, `index.css:228-231`, `Layout.tsx` scroller. **Apply to:** Home trigger bar, container-detail Save bar, BottomSheet/ConfirmSheet insets. Never `position:fixed`; never raw `env()` without the custom property.

### Async-job semantics (untouched)
**Source:** `web/src/lib/backupWatch.ts:218-289`, `BackupButton.tsx`. **Apply to:** all triggers. `{ok:true,started:true}`; baseline ids seeded before firing; outcomes only via correlation.

### House rules (lint-enforced, apply everywhere)
Every user-visible string through `t()`; em dashes banned in user text; PAGE_SHELL on page roots; status colors on badges only; tokens from `web/src/index.css` (never hex); load-bearing "why" header comments on every nontrivial new file; new i18n keys in ALL locale modules in the same commit; exceptions declared in `web/eslint.config.js`, never disable comments.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `web/e2e/maquette-screens.spec.ts` | test | batch | No touch-geometry spec exists yet; nearest precedent is Phase 5's `web/e2e/mobile-shell.spec.ts` (MOBILE_PROJECTS pattern, `hasTouch` projects) — use it as the structural template, add `locator.tap()` + `boundingBox()` ≥44 assertions per the researcher's snippet. |

## Metadata

**Analog search scope:** `web/src/components/`, `web/src/components/mobile/`, `web/src/lib/`, `web/src/pages/`
**Files read this session:** useMediaQuery.ts, BottomSheet.tsx, bubblePosition.ts, useTipBubble.tsx, useConfirm.tsx, SelectionTree.tsx (340-540), backupWatch.ts (180-299), Dashboard.tsx (1-130), progress.ts (targeted), Containers.tsx (targeted), ColorPickerPopover.tsx (targeted), pageShell.ts (80-110), plus greps for sticky/safe-area usage
**Pattern extraction date:** 2026-09-12
