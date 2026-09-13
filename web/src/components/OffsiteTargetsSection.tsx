import { useEffect, useState } from "react";
import type { OffsiteTarget } from "../lib/api";
import {
  listOffsiteTargets,
  createOffsiteTarget,
  updateOffsiteTarget,
  deleteOffsiteTarget,
  testOffsiteTarget,
} from "../lib/api";
import { useCloudCredSets } from "../lib/useCloudCredSets";
import { offsiteTargetsChanged, subscribeOffsiteTargets, type OffsiteDomain } from "../lib/useOffsiteTargets";
import { useT } from "../lib/i18n";
import { Toggle } from "./Toggle";
import { NumberField } from "./NumberField";
import { Badge, type BadgeSize } from "./Badge";
import { Button } from "./Button";
import { IconAdd } from "./Sidebar";
import { withLtrFragments, REPO_LOCAL_HINT_LTR_FRAGMENTS } from "../lib/ltrFragments";
import { useToast } from "../lib/toast";
import { useIsDesktop } from "../lib/useMediaQuery";
import { useConfirm } from "../lib/useConfirm";
import { BottomSheet } from "./mobile/BottomSheet";
import { StickyActionBar } from "./mobile/StickyActionBar";

// The storage-class/immutable badges AND the Test/Edit/Remove buttons in a
// target row render through Badge at this ONE shared stage, so their heights
// stay pixel-identical regardless of the <span> vs <button> element
// underneath — the same mechanism (and the same audit finding class) as
// ErrorDetailPanel's count-badge + "Resolve"-button pair. "medium" (20px),
// not "small" (18px, the badges' pre-fix stage) or "large" (24px, the
// buttons' pre-fix stage): it's the dominant weight everywhere else in the
// app (see Badge.tsx's file header), so fixing the parity here lands both
// elements on the app's normal chip size instead of introducing a
// one-off-large row in an otherwise compact settings panel.
const ROW_BADGE_SIZE: BadgeSize = "medium";

// ---------------------------------------------------------------------------
// OffsiteTargetsSection — per-domain "Additional off-site targets" editor
// (multi-off-site). The PRIMARY off-site target (sortOrder 0, synced from the
// Settings off-site config) is still edited by the single off-site editor above;
// this section lists and manages the EXTRA targets (sortOrder > 0) through the
// off-site-targets CRUD API. It owns no Settings state: every mutation goes
// straight to the CRUD endpoints, and the section re-fetches its own list.
//
// No per-target schedule control is exposed: every target of a domain replicates
// on that domain's off-site schedule (a short help line says so).
//
// GENUINE EXCEPTION to Settings.tsx's full-page Speichern-Button sweep (jdp,
// live review, emphatic: "Die Speicher-Buttons sollen in allen Tabs weg...
// Nur dort sollen Speicher-Buttons bleiben, wo es unbedingt sein muss."):
// saveDraft's own Save button, inside the `draft` editor below, stays — the
// exact same "multi-step DRAFT not meant to take effect until deliberately
// applied" shape as Settings.tsx's own CloudCredSetsCard (see that
// component's header comment for the fuller reasoning). openNew() mints a
// scratch draft (id "") that exists in no list anywhere yet; closeEditor()
// is an explicit, currently-functioning "discard my edits" affordance
// auto-saving on every keystroke would silently break, and — worse than
// CloudCredSetsCard's own case — a NEW target here calls createOffsiteTarget
// (a real API side effect, a fresh row with its own id) rather than a
// harmless local-state PATCH, so a half-typed name would create a real,
// visible, half-configured off-site destination the instant it's typed.
// ---------------------------------------------------------------------------

// The canonical list, imported rather than re-declared: this file had its own
// copy that omitted "config", which is half of why self-backup never got a
// targets section (#176).
type Domain = OffsiteDomain;
type T = ReturnType<typeof useT>["t"];
// "error" was removed from this type — the toast migration below (GlimStone
// follow-up pass, v8.0.0) replaced that inline-flash outcome with a real
// toast (push(), further down), so setSaveState now only ever sets
// "idle"/"saving".
type SaveState = "idle" | "saving";

// The restore-readable storage-class whitelist (mirrors CloudCard); "" renders as
// the provider-default option.
const STORAGE_CLASSES = [
  "STANDARD",
  "STANDARD_IA",
  "ONEZONE_IA",
  "INTELLIGENT_TIERING",
  "GLACIER_IR",
] as const;

// A blank draft for a new additional target. sortOrder is assigned at save time so
// it never shadows the primary (sortOrder 0).
function emptyDraft(domain: Domain): OffsiteTarget {
  return {
    id: "",
    domain,
    name: "",
    repo: "",
    credsRef: "",
    storageClass: "",
    immutable: false,
    schedule: "",
    retentionKeepLast: 0,
    retentionKeepDaily: 0,
    retentionKeepWeekly: 0,
    retentionKeepMonthly: 0,
    limitUpload: 0,
    limitDownload: 0,
    growthBudgetGb: 0,
    enabled: true,
    createdAt: 0,
    sortOrder: 0,
  };
}

// TargetTestButton probes ONE additional target. The primary editor's "Test
// connection" only ever probes the PRIMARY target, so without this an extra
// destination could sit broken behind that button's green verdict (issue #138).
//
// GlimStone follow-up pass (v8.0.0): the ok/uninit/fail verdict below moved to
// toasts — this button is the exact near-duplicate of Settings.tsx's
// TestConnectionButton (same ok/uninit/fail shape, just probing an additional
// target instead of the primary), which already made this move; this button
// was apparently just missed in that pass.
function TargetTestButton({ id, t }: { id: string; t: T }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide: "Wenn
  // etwas fehlschlägt soll der Toggle/Button kurz zittern"): a bumped nonce,
  // keyed onto this button exactly like every other failing-toast action in
  // this file (saveDraft's Save button, remove()'s confirm badge below) and
  // the rest of this session's sweep (Settings.tsx's own TestConnectionButton
  // twin was left alone — out of THIS file's scope — but the shape is
  // identical). Only the real "fail" branch shakes, not "warn" — an
  // uninitialized-but-reachable repo isn't a failure of the test action
  // itself, the exact same "warn never shakes, fail always does" split
  // Containers.tsx's backupSelected() already established for its own
  // 409-vs-real-error branches.
  const [shake, setShake] = useState(0);

  async function go() {
    setBusy(true);
    try {
      const r = await testOffsiteTarget(id);
      if (r.ok && r.reachable && r.initialized) {
        push(t("offsite.testOk"), "success");
      } else if (r.ok && r.reachable) {
        push(t("offsite.testUninitialized"), "warn");
      } else {
        push(r.error ?? t("offsite.testFailed"), "fail");
        setShake((n) => n + 1);
      }
    } catch (e) {
      push(e instanceof Error ? e.message : t("offsite.testFailed"), "fail");
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Badge
      key={shake}
      as="button"
      tone="neutral"
      size={ROW_BADGE_SIZE}
      onClick={() => void go()}
      disabled={busy}
      title={t("offsite.test")}
      className={shake ? "glim-shake" : undefined}
    >
      {busy ? t("offsite.testing") : t("offsite.targets.test")}
    </Badge>
  );
}

export function OffsiteTargetsSection({
  domain,
  t,
  hueIndex,
}: {
  domain: Domain;
  t: T;
  /** Offsite-tab card-split follow-up (Settings.tsx, jdp: "Die Buttons
   *  Verbindung testen, Jetzt replizieren, Einrichten, Ziel hinzufügen in
   *  die Farbengine aufnehmen"): this section's own enclosing per-domain
   *  offsite Card's hue position, threaded straight through to the "Ziel
   *  hinzufügen" add-target button below — the SAME value that Card's own
   *  heading notch already got, not a second independent one. Only that ONE
   *  button qualifies: Edit/Remove/Test above operate on an EXISTING
   *  target row and correctly keep their pre-existing neutral/fail tones
   *  (rule 4 state-adjacent semantics — Remove is destructive, Test's
   *  verdict is a toast, not the button's own colour), same as
   *  TestConnectionButton/ReplicateNowButton stay `tone="active"` rather
   *  than gaining a NEW status meaning. */
  hueIndex?: number;
}) {
  const { push } = useToast();
  const [targets, setTargets] = useState<OffsiteTarget[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  // The target being edited: null = editor closed; id "" = a new target.
  const [draft, setDraft] = useState<OffsiteTarget | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // GlimStone standing rule (system-wide, live review): saveDraft/remove
  // below already push a "fail" toast on a real failure but, unlike every
  // other action this session already swept (VMs.tsx, Containers.tsx,
  // Files.tsx, Fleet.tsx, Receiver.tsx, Config.tsx, RestorePanel.tsx,
  // IntegrityCard, the rest of Settings.tsx), never bumped the triggering
  // button's own `.glim-shake`. Only one editor/one confirm-remove row can be
  // open at a time in this section (`draft`/`confirmRemove` are each a
  // single value, not per-row maps), so a single nonce per action — same
  // shape as VMSSHCard's/IntegrityCard's own single `shake` state — covers
  // whichever row is actually showing that button right now.
  const [saveShake, setSaveShake] = useState(0);
  const [removeShake, setRemoveShake] = useState(0);
  // Additional named credential sets (#141 stage 2) this target's CredsRef can
  // pick from. Read through the shared hook, NOT a fetched-once local copy:
  // the card that creates these sets sits on this very page (Settings' own
  // Off-site tab renders one of these sections per domain AND
  // CloudCredSetsCard), so a private copy went stale the moment a set was
  // added and the new set stayed unselectable until a reload — issue #173.
  const credSets = useCloudCredSets();

  // 07-07 FLOW-02 double gate (the ActivityLog/NotifyCard pattern): the desktop
  // section above stays the desktop presentation (rendered under max-md:hidden,
  // so jsdom — which answers desktop — still sees it and every existing dom
  // suite passes unchanged); the phone gets entry rows that open fullHeight
  // editor sheets re-hosting the SAME target form, never a fork.
  const isDesktop = useIsDesktop();
  // Mobile delete rides useConfirm: the hook's own presentation split renders
  // ConfirmSheet below the breakpoint with the existing offsite.targets.*
  // outcome-naming copy — no new confirm UI (UI-SPEC destructive-actions
  // contract). The desktop two-click inline confirm is untouched.
  const { confirm, confirmDialog } = useConfirm();

  function refresh() {
    listOffsiteTargets(domain)
      .then((r) => {
        if (r.ok) {
          // Additional targets only: the primary (sortOrder 0, synced from the
          // Settings off-site config) is owned by the single editor above.
          setTargets((r.targets ?? []).filter((x) => x.sortOrder > 0));
          setLoaded(true);
          setLoadErr(null);
        } else {
          setLoadErr(r.error ?? t("offsite.targets.loadError"));
        }
      })
      .catch(() => setLoadErr(t("offsite.targets.loadError")));
  }
  // domain is fixed for a mounted instance (one per off-site domain block).
  // Also re-read on the shared broadcast, so a write from ANY section (or from
  // accepting a fleet mesh offer, which mints a target for its domain) lands
  // here without a reload — the write paths below announce instead of
  // refreshing only themselves.
  useEffect(() => {
    refresh();
    return subscribeOffsiteTargets(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  function openNew() {
    setDraft(emptyDraft(domain));
    setSaveState("idle");
  }

  function openEdit(tgt: OffsiteTarget) {
    setDraft({ ...tgt });
    setSaveState("idle");
  }

  function closeEditor() {
    setDraft(null);
    setSaveState("idle");
  }

  // GlimStone follow-up pass (v8.0.0): the "error" flash below is now a
  // toast — same shape as Files.tsx's FileSetDialog.handleSave (a dialog
  // editor that closes on success via closeEditor(), so a toast is the only
  // outcome notice left, success or failure). The client-side repoRequired
  // check is reachable through the UI (unlike Fleet.tsx/Receiver.tsx's own
  // dialogs, the Save button here isn't disabled while repo is blank), so it
  // gets the same push() treatment as the API failure below it.
  async function saveDraft() {
    if (!draft) return;
    if (draft.repo.trim() === "") {
      push(t("offsite.targets.repoRequired"), "fail");
      setSaveShake((n) => n + 1);
      return;
    }
    setSaveState("saving");
    try {
      if (draft.id === "") {
        // New target: give it a sortOrder strictly greater than 0 (and above any
        // existing additional target) so a later Settings save can never mistake
        // it for the primary and overwrite it.
        const maxSort = targets.reduce((m, x) => Math.max(m, x.sortOrder), 0);
        const r = await createOffsiteTarget({
          domain: draft.domain,
          name: draft.name.trim(),
          repo: draft.repo.trim(),
          credsRef: draft.credsRef,
          storageClass: draft.storageClass,
          immutable: draft.immutable,
          schedule: draft.schedule,
          retentionKeepLast: draft.retentionKeepLast,
          retentionKeepDaily: draft.retentionKeepDaily,
          retentionKeepWeekly: draft.retentionKeepWeekly,
          retentionKeepMonthly: draft.retentionKeepMonthly,
          limitUpload: draft.limitUpload,
          limitDownload: draft.limitDownload,
          growthBudgetGb: draft.growthBudgetGb,
          enabled: draft.enabled,
          sortOrder: maxSort + 1,
        });
        if (!r.ok) throw new Error(r.error ?? t("settings.error"));
      } else {
        const r = await updateOffsiteTarget(draft.id, {
          ...draft,
          name: draft.name.trim(),
          repo: draft.repo.trim(),
        });
        if (!r.ok) throw new Error(r.error ?? t("settings.error"));
      }
      push(t("settings.saved"), "success");
      closeEditor();
      offsiteTargetsChanged();
    } catch (e) {
      setSaveState("idle");
      push(e instanceof Error ? e.message : t("settings.error"), "fail");
      setSaveShake((n) => n + 1);
    }
  }

  // BUG FIX (found alongside the saveDraft migration above, GlimStone
  // follow-up pass v8.0.0): deleteOffsiteTarget resolves {ok:false, error}
  // rather than throwing on a server-reported failure (e.g. an append-only/
  // immutable target the backend refuses to remove) — this never checked
  // `res.ok`, so a refused delete was silently treated as a success:
  // confirmRemove closed and the list reloaded, with nothing telling the user
  // why the target reappeared in it. Now checked and surfaced.
  async function remove(id: string) {
    setRemovingId(id);
    try {
      const r = await deleteOffsiteTarget(id);
      if (!r.ok) {
        push(r.error ?? t("settings.error"), "fail");
        setRemoveShake((n) => n + 1);
        return;
      }
      setConfirmRemove(null);
      // Mobile sheet flow: the Remove control lives INSIDE the editor sheet,
      // so the removed target closes its own editor. A no-op on the desktop
      // flows, where remove fires from a row while the editor either holds
      // nothing or a DIFFERENT target's draft.
      setDraft((d) => (d && d.id === id ? null : d));
      offsiteTargetsChanged();
    } catch (e) {
      push(e instanceof Error ? e.message : t("settings.error"), "fail");
      setRemoveShake((n) => n + 1);
    } finally {
      setRemovingId(null);
    }
  }

  // Mobile-only entry point (the sheet's Remove badge): routes the same
  // remove() through useConfirm, which below the breakpoint presents the
  // ConfirmSheet — message + confirm label are the EXISTING desktop confirm
  // copy (the two-click badge's own label flip), so nothing new was authored.
  // The desktop keeps its inline two-click badge; only the presentation of
  // the confirmation differs, exactly the useConfirm contract.
  async function requestRemove(id: string) {
    if (
      !(await confirm(t("offsite.targets.confirmRemove"), {
        confirmLabel: t("offsite.targets.remove"),
        cancelLabel: t("offsite.targets.cancel"),
      }))
    )
      return;
    await remove(id);
  }

  const inputCls =
    "rounded-control bg-carbon-surface3 text-carbon-text text-sm font-mono px-3 py-1.5 glim-field-focus-well";
  const numCls =
    "rounded-control bg-carbon-surface3 text-carbon-text text-sm px-3 py-1.5 w-full glim-field-focus-well";

  // The target draft's fields, extracted verbatim so BOTH presentations render
  // the ONE form (07-07's one-form-two-presentations rule, NotifyCard Task 1's
  // renderCards shape): the desktop editor block below keeps its own
  // Save/Cancel row, the mobile fullHeight sheet re-hosts these same fields
  // with a StickyActionBar apply/cancel. No fork: every field, label, hint and
  // handler here is the desktop form's own, riding the same draft state and
  // the same createOffsiteTarget/updateOffsiteTarget saveDraft chain.
  function renderForm() {
    if (!draft) return null;
    return (
      <>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-carbon-textSub">{t("offsite.targets.name")}</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
            spellCheck={false}
            placeholder={t("offsite.targets.namePlaceholder")}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-carbon-textSub">{t("offsite.wizard.repoUrl")}</span>
          <input
            value={draft.repo}
            onChange={(e) => setDraft((d) => (d ? { ...d, repo: e.target.value } : d))}
            spellCheck={false}
            placeholder={t("offsite.wizard.repoUrlPlaceholder")}
            dir="ltr"
            className={`${inputCls} text-start`}
          />
          <span className="text-xs text-carbon-textMuted">
            {withLtrFragments(t("offsite.repoLocalHint"), REPO_LOCAL_HINT_LTR_FRAGMENTS)}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-carbon-textSub">{t("offsite.targets.credsLabel")}</span>
          <select
            value={draft.credsRef}
            onChange={(e) => setDraft((d) => (d ? { ...d, credsRef: e.target.value } : d))}
            className={inputCls}
          >
            <option value="">{t("offsite.targets.credsDefault")}</option>
            {credSets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-carbon-textSub">{t("cloud.storageClass.label")}</span>
          <select
            value={draft.storageClass}
            onChange={(e) => setDraft((d) => (d ? { ...d, storageClass: e.target.value } : d))}
            className={inputCls}
          >
            <option value="">{t("cloud.storageClass.default")}</option>
            {STORAGE_CLASSES.map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
        </label>

        {/* Append-only (immutable) toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-carbon-text">{t("offsite.immutable")}</span>
            <span className="text-xs text-carbon-textMuted">{t("offsite.immutableHint")}</span>
          </div>
          <Toggle
            hideLabel
            label={t("offsite.immutable")}
            checked={draft.immutable}
            onChange={(v) => setDraft((d) => (d ? { ...d, immutable: v } : d))}
            className="mt-0.5"
          />
        </div>

        {/* Retention */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-carbon-textSub">{t("offsite.targets.retentionTitle")}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["retentionKeepLast", "settings.retentionLast"],
              ["retentionKeepDaily", "settings.retentionDaily"],
              ["retentionKeepWeekly", "settings.retentionWeekly"],
              ["retentionKeepMonthly", "settings.retentionMonthly"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-carbon-textSub">{t(label)}</span>
                <NumberField
                  min={0}
                  value={draft[key]}
                  onChange={(e) => {
                    const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setDraft((d) => (d ? { ...d, [key]: n } : d));
                  }}
                  className={numCls}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Growth budget */}
        <label className="flex flex-col gap-1 max-w-56">
          <span className="text-xs text-carbon-textSub">{t("offsite.retention.budget")}</span>
          <NumberField
            min={0}
            value={draft.growthBudgetGb}
            onChange={(e) => {
              const n = Math.max(0, parseInt(e.target.value, 10) || 0);
              setDraft((d) => (d ? { ...d, growthBudgetGb: n } : d));
            }}
            className={numCls}
          />
        </label>
      </>
    );
  }

  return (
    <>
    <div className="mt-2 flex flex-col gap-3 rounded-card bg-carbon-surface2 p-3 max-md:hidden">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-carbon-textSub uppercase tracking-widest">
          {t("offsite.targets.title")}
        </span>
        <p className="text-xs text-carbon-textMuted">{t("offsite.targets.hint")}</p>
        <p className="text-xs text-carbon-textMuted">{t("offsite.targets.scheduleNote")}</p>
      </div>

      {loadErr && <span className="text-xs text-statusFail wrap-break-word">{loadErr}</span>}

      {loaded && targets.length === 0 && !draft && (
        <span className="text-xs text-carbon-textMuted">{t("offsite.targets.none")}</span>
      )}

      {/* Existing additional targets */}
      {targets.map((tgt) => (
        <div
          key={tgt.id}
          className="flex items-start justify-between gap-3 rounded-card bg-carbon-surface p-3"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-carbon-text truncate">{tgt.name || tgt.repo}</span>
            <span dir="ltr" className="text-xs text-carbon-textMuted font-mono break-all text-start">{tgt.repo}</span>
            {/* `wrap` on BOTH chips, for the same reason the Dashboard
                protection badges carry it: they sit in a min-w-0 column that a
                long `repo` string (rendered break-all above) lets collapse to a
                fraction of the chip's natural width, so as flex items they get
                squeezed and their multi-word labels ("Immutable (append-only)",
                "(provider default)", longer still in most locales) wrap to two
                or three lines. Without `wrap` the stage's fixed h-* keeps the
                tinted background one line tall and the extra lines paint
                outside it. */}
            <span className="flex flex-wrap gap-2">
              <Badge tone="neutral" size={ROW_BADGE_SIZE} wrap>
                {tgt.storageClass || t("cloud.storageClass.default")}
              </Badge>
              {tgt.immutable && (
                <Badge tone="ok" size={ROW_BADGE_SIZE} wrap>
                  {t("offsite.immutable")}
                </Badge>
              )}
            </span>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <TargetTestButton id={tgt.id} t={t} />
            <Badge as="button" tone="neutral" size={ROW_BADGE_SIZE} onClick={() => openEdit(tgt)}>
              {t("offsite.targets.edit")}
            </Badge>
            {/* NO bespoke red on either state (both were `tone="fail"`).
                jdp's wording for this exact control: "Keine Sonderfarbe für
                den Entfernen-Badge." Commit d336e532 applied that to eight
                controls but found them by grepping for `statusFail` CLASSES,
                so this pair — carrying the same red through Badge's own
                `tone` prop — was invisible to it and stayed red while the
                Fleet / Receiver / Settings remove buttons beside it all went
                neutral.
                  `tone="neutral"` is what the Edit badge one line up already
                uses, so the row is now one chip family. The two-click inline
                confirm is untouched and is what actually protects the
                action: the LABEL flips Entfernen -> Entfernen bestätigen ->
                Wird entfernt, which is the affordance, not the colour.
                `glim-shake` on a failed remove survives — behaviour. */}
            {confirmRemove === tgt.id ? (
              <Badge
                key={removeShake}
                as="button"
                tone="neutral"
                size={ROW_BADGE_SIZE}
                onClick={() => void remove(tgt.id)}
                disabled={removingId === tgt.id}
                className={removeShake ? "glim-shake" : undefined}
              >
                {removingId === tgt.id ? t("offsite.targets.removing") : t("offsite.targets.confirmRemove")}
              </Badge>
            ) : (
              <Badge
                as="button"
                tone="neutral"
                size={ROW_BADGE_SIZE}
                onClick={() => setConfirmRemove(tgt.id)}
              >
                {t("offsite.targets.remove")}
              </Badge>
            )}
          </div>
        </div>
      ))}

      {/* Editor form (new or edit) — the fields come from renderForm() above,
          the one form both presentations share; only this block's Save/Cancel
          row is desktop-presentational. */}
      {draft && (
        <div className="flex flex-col gap-3 rounded-card bg-carbon-surface p-3">
          {renderForm()}

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              key={saveShake}
              label={t("offsite.targets.save")}
              labelKey="offsite.targets.save"
              tone="accent"
              onClick={() => void saveDraft()}
              disabled={saveState === "saving"}
              busy={saveState === "saving"}
              title={saveState === "saving" ? t("common.saving") : undefined}
              className={saveShake ? "glim-shake" : ""}
            />
            <Button
              label={t("offsite.targets.cancel")}
          labelKey="offsite.targets.cancel"
              tone="neutral"
              onClick={closeEditor}
            />
          </div>
        </div>
      )}

      {/* Add button (hidden while the editor is open). `tone="active"` +
          `hueIndex` (offsite-tab card-split follow-up, see this component's
          own hueIndex doc above): this used to be a plain raw <button>
          (`bg-carbon-surface`, no hue), the one control jdp's ask named that
          hadn't even been converted to the shared Badge yet — matches
          TestConnectionButton/ReplicateNowButton/the Einrichten toggle's own
          identical conversion in Settings.tsx.
          GlimStone follow-up round (jdp, live review of the just-hued text
          badges: "Können wir die Buttons in quadratische Badges mit Glyphen
          umwandeln?") — a square icon-only badge reusing IconAdd
          (Sidebar.tsx) verbatim, the exact glyph the task named this button
          could reuse ("Ziel hinzufügen"/"Add target" is the same add-a-new-
          row action IconAdd already draws for the Registries card's own
          add button). `size="icon"` — the app's one square-icon-badge size
          (32px), not this section's own `ROW_BADGE_SIZE` ("medium", 20px, the
          text-chip/Edit/Remove/Test row weight, which is a TEXT chip stage,
          not an icon-badge one). Was `size="field"` (36px), pinned to the
          off-site repo-url `<input>`'s own measured height; that per-neighbour
          pinning is exactly the role-based split jdp rejected — see Badge.tsx's
          "ONE SIZE FOR SQUARE ICON BADGES" block. The visible "Ziel
          hinzufügen" text survives unchanged as the `tip` tooltip content. */}
      {!draft && (
        <Button
          label={t("offsite.targets.add")}
          labelKey="offsite.targets.add"
          glyph={<IconAdd />}
          tone="accent"
          onClick={openNew}
          hueIndex={hueIndex}
          className={"self-start"}
        />
      )}
    </div>

    {!isDesktop && (
      <>
        {/* MOBILE PRESENTATION — entry rows (>=44px) + fullHeight editor sheet.
            The section header carries the same three lines (title, hint,
            schedule note), each target becomes a row (name + repo summary +
            append-only language) opening the SAME form in the sheet, and the
            add row calls the SAME openNew() the desktop button does — one add
            flow, two presentations ("Ziel hinzufügen" stays reachable on
            mobile through the sheet path). */}
        <div className="mt-2 flex flex-col gap-2 rounded-card bg-carbon-surface2 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-carbon-textSub uppercase tracking-widest">
              {t("offsite.targets.title")}
            </span>
            <p className="text-xs text-carbon-textMuted">{t("offsite.targets.hint")}</p>
            <p className="text-xs text-carbon-textMuted">{t("offsite.targets.scheduleNote")}</p>
          </div>

          {loadErr && <span className="text-xs text-statusFail wrap-break-word">{loadErr}</span>}

          {loaded && targets.length === 0 && !draft && (
            <span className="text-xs text-carbon-textMuted">{t("offsite.targets.none")}</span>
          )}

          {targets.map((tgt) => (
            <button
              key={tgt.id}
              type="button"
              onClick={() => openEdit(tgt)}
              className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-control bg-carbon-surface px-4 py-2 text-start text-sm text-carbon-text"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate">{tgt.name || tgt.repo}</span>
                <span dir="ltr" className="truncate text-xs font-normal text-carbon-textMuted">
                  {tgt.repo}
                </span>
              </span>
              {tgt.immutable && (
                <span className="shrink-0 text-xs font-normal text-carbon-textMuted">
                  {t("offsite.immutable")}
                </span>
              )}
            </button>
          ))}

          {!draft && (
            <button
              type="button"
              onClick={openNew}
              className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-control bg-carbon-surface px-4 py-2 text-start text-sm text-carbon-text"
            >
              <IconAdd />
              {t("offsite.targets.add")}
            </button>
          )}
        </div>

        {/* The editor sheet: open exactly when a draft exists (the same state
            the desktop editor block reads), so openNew/openEdit/closeEditor
            and saveDraft's success-close carry over unchanged. fullHeight per
            D-05; the draft form rides in the scroll body, apply/cancel pin in
            the Vms schedule sheet's min-h-full + spacer + StickyActionBar
            shape. Test and Remove ride the EXISTING surfaces for an existing
            target (a new draft has no id to test or remove yet). */}
        <BottomSheet
          open={draft !== null}
          onClose={closeEditor}
          title={t("offsite.targets.title")}
          fullHeight
        >
          <div className="flex min-h-full flex-col">
            <div className="flex flex-col gap-4 pt-4">
              {renderForm()}
              {draft !== null && draft.id !== "" && (
                <div className="flex items-center gap-2 flex-wrap border-t border-carbon-border pt-4">
                  <TargetTestButton id={draft.id} t={t} />
                  <Badge
                    as="button"
                    tone="neutral"
                    size={ROW_BADGE_SIZE}
                    onClick={() => void requestRemove(draft.id)}
                  >
                    {t("offsite.targets.remove")}
                  </Badge>
                </div>
              )}
            </div>
            <div className="min-h-4 flex-1" />
            <StickyActionBar>
              <Button
                label={t("offsite.targets.cancel")}
                labelKey="offsite.targets.cancel"
                tone="neutral"
                onClick={closeEditor}
                className="w-full"
              />
              <Button
                key={saveShake}
                label={t("offsite.targets.save")}
                labelKey="offsite.targets.save"
                tone="accent"
                onClick={() => void saveDraft()}
                disabled={saveState === "saving"}
                busy={saveState === "saving"}
                title={saveState === "saving" ? t("common.saving") : undefined}
                className={`w-full ${saveShake ? "glim-shake" : ""}`}
              />
            </StickyActionBar>
          </div>
        </BottomSheet>
      </>
    )}
    {confirmDialog}
    </>
  );
}
