// ---------------------------------------------------------------------------
// RUN DISPLAY — the shared run-presentation helpers (phase 06 plan 04, Task 1).
//
// Six helpers moved VERBATIM out of src/pages/Dashboard.tsx: the run
// kind/target label pair (runDomainLabel, runKindLabel, isDomainOpRunKind,
// runTargetText) and the status chip pair (statusTone, statusLabel). Zero
// behavior change, zero copy change — the bodies, their load-bearing comments
// and their exact i18n keys are the same bytes that used to live one layer
// up; only the home moved.
//
// Why a lib at all: 06-04's RunDetailSheet (SCRN-05) renders the same
// kind/target title and the same status Badge the dashboard's RunsCard
// renders. A second copy of these helpers inside a component would be a
// forked vocabulary — the exact drift the two-half doctrine exists to
// prevent — so the extraction is the plan-mandated alternative, and the
// dashboard keeps compiling against the same functions from their new home.
//
// Layering note — the one import from components/ is TYPE-ONLY:
//
//   import type { BadgeTone } from "../components/Badge";
//
// statusTone's return type IS the shared Badge's tone union; re-spelling it
// as a local string union would create a second definition that can drift
// from the Badge's. Type-only imports are erased at compile time, so no
// RUNTIME edge from lib upward to components exists — which is the substance
// of the "lib imports nothing from pages or components" law. Precedent:
// lib/navModel.ts imports icon components from components/navGlyphs, the
// documented load-bearing exception; this is that exception in its weakest
// possible form (a type position only, gone in the emitted JS).
// ---------------------------------------------------------------------------
import type { Run } from "./api";
import type { useT } from "./i18n";
// Type-only import — see the layering note in the header comment.
import type { BadgeTone } from "../components/Badge";

// ---------------------------------------------------------------------------
// Run kind/target label helpers — shared by every surface that renders a
// Run's kind and target (dashboard RunsCard, SummaryTier's "Last result"
// cell, 06-04's RunDetailSheet). A prune/verify run's targetId IS the domain
// literal it ran against ("containers"/"vms"/"files", or
// store.FlashTargetID/ConfigTargetID — "flash"/"config" — see
// internal/api/service.go domainRunTargetID), never a resolvable item id, so
// it needs its own kind label + domain-name resolution instead of falling
// through to the generic backup/restore/update display (which would
// otherwise show it mislabeled as "Restore" with a blank/truncated target —
// #run-activity-log finding 1).
// ---------------------------------------------------------------------------

export function runDomainLabel(t: ReturnType<typeof useT>["t"], domain: string): string {
  switch (domain) {
    case "containers":
      return t("activityLog.domainContainers");
    case "vms":
      return t("activityLog.domainVMs");
    case "flash":
      return t("activityLog.domainFlash");
    case "config":
      return t("activityLog.domainConfig");
    case "files":
      return t("activityLog.domainFiles");
    default:
      return domain;
  }
}

export function runKindLabel(t: ReturnType<typeof useT>["t"], kind: string): string {
  switch (kind) {
    case "backup":
      return t("run.kindBackup");
    case "restore":
      return t("run.kindRestore");
    case "update":
      return t("run.kindUpdate");
    case "prune":
      return t("activityLog.typePrune");
    case "verify":
      return t("activityLog.typeVerify");
    case "offsite":
      return t("activityLog.typeOffsite");
    case "drill":
      return t("activityLog.jobDrill");
    case "drdrill":
      return t("run.kindDRDrill");
    case "tamper":
      return t("activityLog.jobTamper");
    case "export":
      return t("run.kindExport");
    default:
      // An unknown future kind shows its raw literal rather than a wrong label.
      return kind;
  }
}

// isDomainOpRunKind mirrors the backend's domainRunTargetID users: these kinds
// carry the DOMAIN literal (or the flash/config singleton id) in targetId, never
// a resolvable item id.
export function isDomainOpRunKind(kind: string): boolean {
  return kind === "prune" || kind === "verify" || kind === "offsite" || kind === "drill" || kind === "drdrill" || kind === "tamper" || kind === "export";
}

// runTargetText resolves what to show in a run's "target" column. Domain-op
// runs (prune/verify/offsite/drill/tamper/export) carry the domain literal in
// targetId (see above) — reuse the same domain-name keys the activity log uses
// instead of the generic target/targetId fallback, which would show the raw
// literal (e.g. "containers…") since it is never in the backend's
// target-name map.
export function runTargetText(t: ReturnType<typeof useT>["t"], run: Run): string {
  if (isDomainOpRunKind(run.kind)) {
    return runDomainLabel(t, run.targetId);
  }
  return run.target || `${run.targetId.slice(0, 12)}…`;
}

// ---------------------------------------------------------------------------
// Status chip — statusTone maps a raw status string to the shared Badge's
// tone; statusLabel (defined right after it) maps that same string to
// translated, badge-length text. Every call site renders both together —
// `<Badge tone={statusTone(s)}>{statusLabel(s, t)}</Badge>` — instead of the
// tone alone.
//
// Task 9 fix: until this task, every one of these Badges rendered the raw
// English status word verbatim (`{overallStatus}` / `{chipFor(c)}` /
// `{chipForRpo(...)}` / `{protectionChip(...)}` / `{run.status}` /
// `{newestRun.status}`) — the exact untranslated-badge-text bug class Phase 1
// Task 5 already fixed for SpikePanel.tsx's OK/FAIL/INFO chips, sitting the
// whole time right next to an already-translated sibling label
// (overallLabel/rpoLabel/protLabel/healthLabel) that made the raw word's
// presence obvious on close reading. A prior version of this exact comment
// claimed the opposite — that showing the raw word was deliberate because
// "these are backend-sourced run-status words, not prose to translate" — but
// that rationale doesn't hold: `run.statusRunning`/`Success`/`Failed` already
// existed as real, fully-translated keys in all 26 locales (added for this
// exact fix, then never wired up), and `chipFor`/`chipForRpo`/`protectionChip`
// below don't return backend text at all — they're this file's own derived
// vocabulary. Task 7 (fifth hue) only ever touched statusTone's tone mapping,
// never what the Badge's children rendered, so the bug (and the incorrect
// comment defending it) survived that task untouched.
//
// KNOWN LIMITATION, documented on purpose (spec-compliance review of Task 7,
// not fixed in that task — see index.css's matching comment on
// --status-warn-text's dark value for the full writeup): tone="warn" and
// tone="active" render as near-identical amber in BOTH themes — dark with
// the DEFAULT accent (#f1c21b vs #FCC419, RGB-distance ~11, 1.05:1 between
// them), light on EVERY accent (#8e6a00 vs a static #7a5c00, hue 44.8° vs
// 45.2°, 1.25:1, with chip backgrounds only ~10 apart).
// SummaryTier below is a real, live site where both can appear in the same
// row at once — the "Overall health" cell showing tone="warn" (an RPO
// lapsing) next to "Last result" showing tone="active" (a run literally
// running). Not a bare SC 1.4.1 violation (each badge's own text still
// differs), but a real glance-level regression.
// Only DARK theme has a mitigation: 4 of Settings.tsx's 5 ACCENT_PRESETS
// aren't gold/yellow and don't collide, and dark's --accent-text follows
// whichever the user picked. Light's --accent-text is a static #7a5c00 that
// does NOT follow the accent, so light-theme users see this on every preset.
// Left unresolved rather than force a disproportionate fix (recolouring warn off Carbon's
// actual yellow token, changing the app's default accent, or adding a new
// icon system to Badge all reach well past a contrast-arithmetic bugfix) —
// flagged for a future task. Task 8 (focus system) was checked against this,
// since it also works the hue-vs-accent boundary via [data-rainbow]
// .glim-hue's --item-hue-ring — no shared fix: that mechanism only ever
// touches outline colour on :focus-visible, never badge fill/text colour,
// so it doesn't reach statusTone's tone="warn"/tone="active" at all. Still
// open for whichever task picks it up next.
// ---------------------------------------------------------------------------

export function statusTone(status: string): BadgeTone {
  switch (status.toLowerCase()) {
    case "success":
    case "ok":
      return "ok";
    case "failed":
    case "degraded":
      return "fail";
    // Genuine activity (Task 7: resolve the fifth hue) — a run that is
    // literally in progress right now. "active" is the accent-soft Badge
    // tone, not a solid fill: this list can show several running rows at
    // once (independent domains backing up concurrently), and rule 3's
    // "at most one solid accent" cap doesn't apply to a soft/tinted chip
    // reading at the same weight as its ok/fail/warn siblings.
    case "running":
    case "checking":
      return "active";
    // The literal backend/derived string "info" (chipForRpo's "warn" SLA
    // lapse, protectionChip's "amber" aggregate, chipFor's best-effort
    // check failure) always meant a real caution, never activity — routes
    // to warn, matching SpikePanel.tsx's own hard-coded tone="warn" for the
    // identical best-effort-fail case. Unaffected by the "active" rename
    // above; this is a separate switch arm.
    case "info":
      return "warn";
    // A skip is neither success nor failure: a muted, neutral chip so a removed
    // container's scheduled target reads as "intentionally not run", distinct
    // from green success and red failure (#57).
    case "skipped":
      return "neutral";
    default:
      return "neutral";
  }
}

// statusLabel is statusTone's translation-side twin (Task 9). It keys off
// the SAME tone bucket statusTone already computes — not the raw string a
// second time — so every raw word any helper below can produce (chipFor:
// ok/info/failed — chipForRpo: success/info/failed/neutral — protectionChip:
// ok/info/failed/neutral — run.status/newestRun.status: success/failed/
// running/skipped) resolves to translated, badge-length text without a
// second switch to keep in sync. Reuses spike.ok/spike.fail/spike.info —
// SpikePanel.tsx's own OK/FAIL/INFO wording (Phase 1 Task 5) — for the
// ok/fail/warn buckets, and run.statusRunning for active (added alongside
// statusSuccess/statusFailed back when this bug was first anticipated, then
// never wired up until now). neutral/default gets the one genuinely new key
// this task adds, run.statusSkipped, translated into all 26 locales.
export function statusLabel(status: string, t: ReturnType<typeof useT>["t"]): string {
  // Checked BEFORE the tone lookup, because "cancelled" and "skipped" share the
  // neutral tone and the tone is all the switch below can see. A restore the
  // user cancelled therefore read "Skipped" in Last Result and in the run
  // history — a different claim about a different event, and the one the user
  // themselves had just caused.
  if (status === "cancelled") return t("run.statusCancelled");
  switch (statusTone(status)) {
    case "ok":
      return t("spike.ok");
    case "fail":
      return t("spike.fail");
    case "warn":
      return t("spike.info");
    case "active":
      return t("run.statusRunning");
    default:
      return t("run.statusSkipped");
  }
}
