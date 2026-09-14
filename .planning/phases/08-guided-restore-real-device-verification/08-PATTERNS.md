# Phase 8: Guided Restore & Real-Device Verification - Pattern Map

**Mapped:** 2026-09-14
**Files analyzed:** 8 (2 modified pages, 4 modified/e2e sweep files, 2 new test files) + read-only reuse surfaces
**Analogs found:** 8 / 8

Phase 8 is presentation-only with frozen surfaces (`router.tsx`, `api.ts`, `progress.ts`, `internal/**`). Every mechanism shipped in phases 5–7; the patterns below are the templates the new code copies.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `web/src/pages/Recovery.tsx` (modify — mobile flow added) | page/component | event-driven (async job fire + SSE watch) | `web/src/pages/Config.tsx` (double gate + MobileRestoreSheet) | exact |
| `web/src/pages/Recovery.mobile.dom.test.tsx` (new) | test (jsdom dom) | request-response (step state machine) | existing destination-page dom tests + `useMediaQuery.test.ts` jsdom desktop stub | role-match |
| `web/e2e/guided-restore.spec.ts` (new — tracer) | test (Playwright e2e) | request-response + staged routes | `web/e2e/destination-vms-flash.spec.ts` (staging) + `desktop-untouched.spec.ts` (leakage needles) | exact |
| `web/e2e/narrow-viewport.spec.ts` (extend — de/fr sweep gains recovery) | test (Playwright e2e) | batch | itself (`bootSeededPage` at :62-72) | self |
| `web/e2e/desktop-untouched.spec.ts` (extend — /recovery leakage) | test (Playwright e2e) | batch | itself (phase-6/7 leakage battery) | self |
| `web/src/app/mobileShellSource.test.ts` (extend — sweep list) | test (source-assert) | transform | itself (:578-780 spacing/weight sweep needles) | self |
| `web/src/lib/i18n.ts` + `locales/*` (pre-seed new `recovery.*` keys) | config (42 tables) | CRUD | phase-7 pre-seed commits (07-02 pattern) + `i18n.parity.test.ts` quartet | exact |
| Settings stacked-card touch-target fixes (VERIFY-04) | component | — | `web/src/components/Toggle.tsx:92-105` `::after` bleed | exact |
| `ActivityLog.tsx:465` chip (D-06 fix 2) | component | — | own tonal siblings (`accentSoft` pattern) | self |

## Pattern Assignments

### `web/src/pages/Recovery.tsx` mobile flow (page, event-driven)

**Analog:** `web/src/pages/Config.tsx` — the D-01 double gate + a mobile restore sheet narrating the guard chain.

**Double gate + page root shape** (Config.tsx:452-459, 498-522, 669-675):
```tsx
const isDesktop = useIsDesktop();
// ...
<div className={PAGE_SHELL}>
  <div className="max-md:hidden">
    {/* desktop JSX, byte-identical */}
  </div>
  {!isDesktop && (
    /* mobile block, mounted only below md */
  )}
</div>
```
Load-bearing (Config.tsx:452-454 comment): the desktop half is ALWAYS rendered and hidden via CSS; jsdom's matchMedia stub answers "desktop" (useMediaQuery.ts:67-74 `getSnapshot` returns true), so existing dom tests keep asserting the desktop page. Never `return isDesktop ? <Desktop/> : <Mobile/>` — one component state, two presentations.

**Guard-chain narration, read-only above the confirm (D-03)** (Config.tsx:1187-1197, MobileRestoreSheet):
```tsx
<p className="text-sm font-semibold text-carbon-text">{t("config.restoreChain.title")}</p>
<ol className="list-decimal space-y-2 ps-5 text-xs leading-relaxed text-carbon-textSub">
  <li>{t("config.restoreChain.step1")}</li>
  {/* ... step2..step5 */}
</ol>
```
DOM order = reading order; the e2e asserts the five `<li>` precede the confirm. New step-flow chain narration copies this `<ol>` shape with fresh `recovery.*` keys.

**Error/phase state machine** (Config.tsx:1138-1180 `runRestore`): async handler sets `phase`/`message`; backend error text shown verbatim except the documented APP_KEY-mismatch remap (`isKeyMismatch` → `t("recovery.appKeyRemedy")`); every failure also `push(msg, "fail")` + shake nonce (`glim-shake`, Config.tsx:1106). For the config step's `restarting`/`manual`/`reload`/`error` states copy Config.tsx:1200-1228 verbatim including the `waitForAppBack()` → `window.location.reload()` path (Pitfall 7: the reload is correct; do not preserve step position across it).

**Sequential restore-all handler (D-02 — consume, never fork)** (Recovery.tsx:1923-1961 `restoreAll`):
```tsx
if (!(await confirm(t("containers.restoreSelectedConfirm")))) return;
try {
  for (const c of containers) {
    const res = await fireAndWaitRun({
      kind: "restore",
      matchRun: (r) => r.domain === "container" && r.target === c.name,
      start: () => restore(c.name, "latest", true, undefined, true),
      t,
    });
    if (res.ok) ok++; else fail++;
  }
  // ... VMs via libvirtName ...
  setRestoreAllResult({ ok, fail });
} finally { setRestoreAllBusy(false); }
```
The mobile flow calls THIS handler (and `checkReadable`, `connectPreview`, `restoreOwnConfig`); never adds a second fire path, never a parallel loop, never a direct `putSettings(settings)` (Pitfall 6: those handlers re-fetch and merge onto the fresh server baseline, Recovery.tsx:1663-1736, 1744-1821).

**Hue counter trap** (Recovery.tsx:1973-1985): `let hueSeq = 0; const nextHue = () => hueSeq++;` — JSX-evaluation-order rainbow. The mobile block must use its own counter or call `nextHue()` strictly after all desktop calls, or desktop hues renumber. Assert the desktop-first-N sequence in a dom test.

**One `useConfirm`, two presentations (D-03)**: `const { confirm, confirmDialog } = useConfirm()` (Recovery.tsx:1499). Below md, `await confirm(msg)` already renders ConfirmSheet — zero per-call-site changes. Restore controls ride `useConfirm` and are secondary-styled; the RunDetailSheet restore entry is the styling precedent ("tonal, away from the thumb's default path", RunDetailSheet.tsx:561-574).

**Live progress + log (D-04 — read-only reuse)** (RunDetailSheet.tsx:179-238):
```tsx
function LogList({ lines }: { lines: LogLine[] }) { /* ActivityLog mono pattern, class-for-class */ }
function LiveRunSection({ run, progressKey }) {
  const progressMap = useProgress();      // frozen progress.ts singleton
  const lines = buildLogLines([run], progressMap, [], resolveName, now, now).filter((l) => !l.idle);
  return (<>
    <ProgressBar percent={prog?.percent ?? 0} active={prog?.active ?? false} inline />
    <LogList lines={lines} />
  </>);
}
```
Key contracts: `progressKeyFor` (RunDetailSheet.tsx:120-135 — SSE key is `container:<name>` / `vm:<libvirtName>` etc.), mount-is-subscription via `useVisibilityGate` (`{visible && ...}`), `inline` ProgressBar inside sheets (the default pins to a positioned card edge), and `checkDomain`/`verifyDomainFor` (RunDetailSheet.tsx:140-153) as the verify-step surface (Open Question 3 recommendation). `LogList` is the ONLY log style — a second style is the documented anti-pattern.

---

### `web/e2e/guided-restore.spec.ts` (new tracer e2e)

**Analog:** `web/e2e/destination-vms-flash.spec.ts` (route-layer staging, :55-165 `vmPayload`/`settingsBody` Go-JSON field-for-field fixtures) + `desktop-untouched.spec.ts` (leakage needles) + `destination-settings.spec.ts:202-209` (`includeHidden: true` for the mounted-hidden desktop half).

- Assert UI choreography and API-call parity (route-fixture interception), NEVER actual restore outcomes — the harness has no Docker/libvirt.
- Guard chain stays server-side; the e2e narrates nothing about outcomes (server `Confirmed` guard at `internal/backup/orchestrator.go:644-649` is frozen).
- D-10: run filtered (`npx playwright test e2e/guided-restore.spec.ts`); full suite only at the phase tail gate.
- Desktop projects must assert mobile chrome absence via leakage needles (unique class signatures / button names), per the phase-7 battery.

---

### `web/e2e/narrow-viewport.spec.ts` extension (VERIFY-03)

**Analog:** itself — reuse `bootSeededPage` verbatim (narrow-viewport.spec.ts:62-72):
```ts
await page.route("**/api/display-prefs*", (route) => route.abort());
await page.addInitScript(([key, value]) => { window.localStorage.setItem(key, value); },
  [LOCALE_STORAGE_KEY, locale] as const);
await page.setViewportSize({ width, height: 700 });
await page.goto(path);
```
Loop shape: `for locale of ["de","fr"] for width of [320, 360]`, gated `test.skip(!MOBILE_PROJECTS.has(testInfo.project.name))`. Add recovery-flow route(s) to the :541 route battery. Do not invent a new locale mechanism — the abort cut is what makes parallel workers deterministic.

---

### `web/src/app/mobileShellSource.test.ts` extension (VERIFY-04/05 backstop)

**Analog:** itself (:578-780 spacing/weight sweep: needles + mixed-file geography + anti-shrink anchors). Add wholly-phase-8 files to the sweep list (the guard rots loudly by design). D-06 fix 3 is BINDING: the sweep covers mobile regions only (`max-md:hidden` counterparts and `!isDesktop` blocks); desktop-half legacy 12px paddings (`Dashboard.tsx:3029,3037`) are NOT touched — desktop byte-identity wins.

---

### i18n pre-seed (VERIFY-03)

**Analog:** phase-7 pre-seed commits (07-02 pattern) + the parity quartet (`i18n.parity.test.ts`, `i18n.orphans`, `i18n.quality`, `i18n.preseed`).
- All new `recovery.*`/flow keys pre-seeded across all 42 tables (en + de inline + 40 locale files) in ONE commit before consumer plans land.
- Every user-visible string through `t()` (lint-enforced); em dashes banned in user text (lint-enforced); backend error text verbatim.
- De copy uses the house vocabulary (Bereich / Gesamt-Backup precedent); chain-narration tone follows `config.restoreChain.*` verbatim English at `web/src/lib/i18n.ts:149-154`.

---

### Touch-target fixes (VERIFY-04, D-06 fix 1)

**Analog:** `web/src/components/Toggle.tsx:92-105` — the invisible bleed, verbatim classes:
```tsx
className={`relative inline-flex h-5 w-9 shrink-0 ... max-md:after:absolute max-md:after:-inset-3 max-md:after:content-['']`}
```
Grow tap areas, never visual size inflation; desktop ≥48rem byte-identical via the `max-md:` prefix. Apply to the remaining Settings stacked-card 32px controls. Hover-dependent affordances: Tailwind v4 already compiles `hover:` behind `@media (hover: hover)`; `TapPopover` is the non-hover path.

### `ActivityLog.tsx:465` day-filter chip (D-06 fix 2)

**Analog:** its own tonal siblings. Current: `bg-accent text-accentContrast` solid accent chip. Implementer picks: switch to tonal `accentSoft` (accent reserved for active/primary state) OR document the reservation at the site. Either way, record the choice per the house exception-comment convention.

## Shared Patterns

### Single width authority (D-09)
**Source:** `web/src/lib/useMediaQuery.ts:42,92` — `DESKTOP_QUERY = "(min-width: 48rem)"` and `POINTER_COARSE_QUERY = "(pointer: coarse)"` are the only input-axis literals in the app; the guard test fails on duplicates. Never derive pointer mode from width. No second width literal anywhere in phase-8 code — landscape may legitimately render desktop chrome (844px ≥ 768px) and that is CORRECT.

### Destructive-action safety
**Source:** `web/src/components/mobile/ConfirmSheet.tsx:30-113`
- One promise API (`confirm(message) -> Promise<boolean>`), presentation swaps automatically below md.
- Destructive control on TOP (furthest from the thumb arc), safe cancel LAST (thumb-default), no `autoFocus` anywhere.
- Tone mapping: `tone === "fail" ? "danger" : "warn"`; the `bv-convention-exception: no-status-color-on-control` block is the sanctioned exception — copy its citation style if any new control needs an exception, and declare real exceptions in `web/eslint.config.js`, never disable comments.

### Four-status by text (VERIFY-05)
**Source:** RunDetailSheet `LogList` glyph + `aria-label={t(glyphLabelKey(l.status))}` (RunDetailSheet.tsx:189) and `statusTone` Badges — status color always pairs with a text label/glyph (WCAG 1.4.1 G14). Semantic tokens only in mobile regions; never raw hex on controls.

### PAGE_SHELL page roots
**Source:** `web/src/lib/pageShell.ts:88`, used at Config.tsx:509 and Recovery.tsx:1987. Both Recovery halves live inside the one `PAGE_SHELL` root.

### E2E spec filtering (D-10, locked)
Per-task verification runs ONLY touched specs (`npx playwright test <spec>`); the full e2e suite runs ONCE at the phase tail gate by the orchestrator. Vitest stays full-suite per plan. Never buffer Playwright output through `tail` (Windows wedge, STATE.md).

### Frozen-surface discipline (D-12)
`router.tsx`, `web/src/lib/api.ts`, `web/src/lib/progress.ts`, `internal/**` are consumed read-only. `progressKeyFor`/`verifyDomainFor`-style mapping helpers (RunDetailSheet.tsx:120-153) are copied into the consumer, not added to frozen files. Zero npm installs.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `08-UAT.md` device-session protocol (D-11, placement at discretion) | planning artifact | — | No prior UAT artifact in-repo; follows the phase-artifact naming convention (like `07-UI-REVIEW.md`), checklist inherits WR-01, WR-02, UI-review fix 1 |

## Metadata

**Analog search scope:** `web/src/pages/`, `web/src/components/mobile/`, `web/src/components/`, `web/src/lib/`, `web/e2e/`
**Files read this session:** Config.tsx, Recovery.tsx (targeted), ConfirmSheet.tsx, RunDetailSheet.tsx (targeted), Toggle.tsx, useMediaQuery.ts, ActivityLog.tsx, narrow-viewport.spec.ts
**Pattern extraction date:** 2026-09-14
