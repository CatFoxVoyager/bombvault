// ---------------------------------------------------------------------------
// Receiver page — the READ-ONLY receiver dashboard. On the box that RECEIVES
// immutable off-site copies (an append-only rest-server / repo another BombVault
// pushes to), this registers that repo and monitors it read-only: snapshot
// inventory grouped by source, last-received time, an independent restic check
// on the receiving hardware, and dead-mans-switch + integrity status.
//
// Gated behind settings.receiverEnabled (the Receiver tab only shows when on).
// Nothing here writes to the received repo: it is opened read-only with the
// SENDING instance's APP_KEY (encrypted at rest, never shown again). Modeled on
// Files.tsx — one card per received repo with an expandable inventory panel.
// ---------------------------------------------------------------------------

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  listReceivedRepos,
  createReceivedRepo,
  updateReceivedRepo,
  deleteReceivedRepo,
  receiverInventory,
  checkReceivedRepo,
  getSettings,
} from "../lib/api";
import type {
  ReceivedRepoStatus,
  ReceivedRepoInput,
  ReceiverInventory,
} from "../lib/api";
import { useT } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import { useConfirm } from "../lib/useConfirm";
import { PAGE_SHELL } from "../lib/pageShell";
import { relativeTime } from "../lib/reltime";
import { humanBytes } from "../lib/forecast";
import { EmptyStateIcon } from "../components/EmptyStateIcon";
import { NumberField } from "../components/NumberField";
import { IconReceiver } from "../components/Sidebar";
import { Badge } from "../components/Badge";
import { InfoBubble } from "../components/InfoBubble";
import { RevealInput } from "../components/RevealInput";
import { useReveal } from "../lib/useReveal";
import { useToast } from "../lib/toast";
import { hueVars, rainbowAt } from "../lib/appearance";
import { useRainbow } from "../lib/useRainbow";
import { Button } from "../components/Button";
import { BottomSheet } from "../components/mobile/BottomSheet";
import { MobileSectionLabel } from "../components/mobile/MobileSectionLabel";
import { StickyActionBar } from "../components/mobile/StickyActionBar";

import { Toggle } from "../components/Toggle";
import { ToggleRow } from "./settings/shared";
type T = ReturnType<typeof useT>["t"];

// The sending APP_KEY shape guard mirrors the backend foreignKeyRe (64 lowercase
// hex). The server re-validates + probes; this just gives instant feedback.
const APP_KEY_RE = /^[0-9a-f]{64}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render an RFC3339 (or empty) received-time string as a localized date/time. */
function fmtReceived(iso: string, t: T): string {
  if (!iso) return t("receiver.never");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

// ---------------------------------------------------------------------------
// Inventory panel (grouped by source) — lazy-loaded on expand
// ---------------------------------------------------------------------------

function InventoryPanel({ repo, t }: { repo: ReceivedRepoStatus; t: T }) {
  const [inv, setInv] = useState<ReceiverInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    receiverInventory(repo.id)
      .then((res) => {
        if (!active) return;
        if (res.ok && res.inventory) setInv(res.inventory);
        else setError(res.error ?? t("receiver.inventoryError"));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t("receiver.inventoryError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo.id, t]);

  if (loading) {
    return <p className="py-3 text-xs text-carbon-textMuted">{t("receiver.inventoryLoading")}</p>;
  }
  if (error) {
    return <p className="py-3 text-xs text-statusFail wrap-break-word">{error}</p>;
  }
  if (!inv || inv.sources.length === 0) {
    return <p className="py-3 text-xs text-carbon-textMuted">{t("receiver.inventoryEmpty")}</p>;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-carbon-textMuted text-start">
            <th className="font-medium py-1.5 pe-3">{t("receiver.colSource")}</th>
            <th className="font-medium py-1.5 pe-3 text-end">{t("receiver.colSnapshots")}</th>
            <th className="font-medium py-1.5 pe-3">{t("receiver.colLastReceived")}</th>
            <th className="font-medium py-1.5 text-end">{t("receiver.colSize")}</th>
          </tr>
        </thead>
        <tbody>
          {inv.sources.map((s, i) => (
            <tr key={`${s.host}/${s.item}/${i}`} className="border-t border-carbon-border">
              <td className="py-1.5 pe-3 text-carbon-text">
                <span className="font-medium">{s.item || "-"}</span>
                {s.host && <span className="text-carbon-textMuted"> · {s.host}</span>}
              </td>
              <td className="py-1.5 pe-3 text-end text-carbon-textSub font-mono">{s.snapshotCount}</td>
              <td className="py-1.5 pe-3 text-carbon-textSub">{fmtReceived(s.lastReceived, t)}</td>
              <td className="py-1.5 text-end text-carbon-textSub font-mono">{humanBytes(s.totalSize)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-carbon-border text-carbon-text">
            <td className="py-1.5 pe-3 font-medium">{t("receiver.total")}</td>
            <td className="py-1.5 pe-3 text-end font-mono">{inv.snapshotCount}</td>
            <td className="py-1.5 pe-3 text-carbon-textSub">{fmtReceived(inv.lastReceived, t)}</td>
            <td className="py-1.5 text-end font-mono">{humanBytes(inv.totalSize)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Repo card
// ---------------------------------------------------------------------------

function ReceivedRepoCard({
  repo,
  t,
  onRefresh,
  onEdit,
  index,
}: {
  repo: ReceivedRepoStatus;
  t: T;
  onRefresh: () => void;
  onEdit: () => void;
  /** Position in the rendered list — the rainbow palette position (GlimStone
   *  colour engine), matching Containers.tsx's ContainerRow / VMs.tsx's VMRow /
   *  Files.tsx's FileSetRow (and now Fleet.tsx's FleetPeerCard): a list of
   *  received repos is exactly the case the mode exists for, a variable,
   *  user-configured set someone tracks several of at once. Assigned by LIST
   *  INDEX, never a hash of `repo.name` — see the caller below. */
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const [deepCheck, setDeepCheck] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { push } = useToast();
  // Reversible action: removing a monitoring entry never touches the repo on
  // disk (re-addable in one step), so per the design-language's "reversible
  // actions don't ask" rule this gets the LIGHTER two-click inline-confirm —
  // click "Remove" → button becomes "Confirm remove" — matching
  // OffsiteTargetsSection's `confirmRemove` pattern exactly, not a full
  // window.confirm()/ConfirmDialog (form-engine Task 7).
  const [confirmRemove, setConfirmRemove] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): shake
  // the Check/Remove buttons alongside their existing toasts on failure.
  const [shakeCheck, setShakeCheck] = useState(0);
  const [shakeRemove, setShakeRemove] = useState(0);

  // GlimStone follow-up pass (v8.0.0): the ok/fail checkMsg result below moved
  // to a toast — found alongside this card's handleRemove migration (same
  // component). Same ok/uninit/fail shape as the already-migrated
  // TestConnectionButton/TargetTestButton: onRefresh() reloads the repo,
  // whose persistent checkTone/checkLabel Badge + "last checked" line already
  // carry this exact outcome, so the ephemeral checkMsg was pure duplicate
  // (and, since it never auto-cleared, a stale one could linger next to the
  // button until the NEXT check).
  async function handleCheck() {
    setChecking(true);
    try {
      const res = await checkReceivedRepo(repo.id, deepCheck);
      if (res.ok && res.result) {
        if (res.result.ok) push(t("receiver.checkOk"), "success");
        else {
          push(res.result.error || t("receiver.checkFailed"), "fail");
          setShakeCheck((n) => n + 1);
        }
      } else {
        push(res.error ?? t("receiver.checkFailed"), "fail");
        setShakeCheck((n) => n + 1);
      }
      onRefresh();
    } catch (err) {
      push(err instanceof Error ? err.message : t("receiver.checkFailed"), "fail");
      setShakeCheck((n) => n + 1);
    } finally {
      setChecking(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await deleteReceivedRepo(repo.id);
      if (res.ok) {
        onRefresh();
        setConfirmRemove(false);
      } else {
        // Keep the two-click confirm UP on failure (don't reset to "Remove")
        // — see FleetPeerCard's identical handleRemove for the fuller reason.
        push(res.error ?? t("receiver.saveError"), "fail");
        setShakeRemove((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : t("receiver.saveError"), "fail");
      setShakeRemove((n) => n + 1);
    } finally {
      setRemoving(false);
    }
  }

  // Check-result badge tone: never checked / passed / failed.
  const checkTone = repo.lastCheckOk === null ? "neutral" : repo.lastCheckOk ? "ok" : "fail";
  const checkLabel =
    repo.lastCheckOk === null
      ? t("receiver.checkNever")
      : repo.lastCheckOk
      ? t("receiver.checkOk")
      : t("receiver.checkFailed");

  return (
    <div
      style={{ ...hueVars(rainbowAt(index)), "--row-i": String(index) } as CSSProperties}
      // glim-hue owns the position; glim-tint washes the WHOLE card with it
      // (trap #2, design-language.md's "Rainbow" section) — same
      // relative/overflow-hidden/glim-hue/glim-tint shell as
      // ContainerRow/VMRow/FileSetRow/FleetPeerCard, so a rainbow-mode
      // Receiver list colours each monitored repo instead of leaving every
      // row the flat accent. No glim-active here: unlike those first three,
      // a received-repo card has no progressMap-tracked backup/restore job of
      // its own to key it off — Check is a quick request/response action,
      // not a tracked job.
      // glim-stagger-row (GlimStone motion-engine animation 3) — see
      // ContainerRow's identical comment.
      className="relative overflow-hidden bg-carbon-surface rounded-card p-4 flex flex-col gap-3 glim-hue glim-stagger-row"
    >
      {/* Header: name + badges */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-carbon-text text-sm truncate">{repo.name}</span>
            {!repo.enabled && <Badge tone="neutral">{t("receiver.monitoringOff")}</Badge>}
            {repo.enabled &&
              (repo.reachable ? (
                <Badge tone="ok">{t("receiver.reachable")}</Badge>
              ) : (
                <Badge tone="fail">{t("receiver.unreachable")}</Badge>
              ))}
            <Badge tone={checkTone}>{checkLabel}</Badge>
          </div>
          <p dir="ltr" className="mt-1 text-xs font-mono text-carbon-textMuted truncate text-start">{repo.repo}</p>
        </div>

        {/* Last received + snapshot count */}
        <div className="text-end shrink-0">
          <p className="text-xs text-carbon-textMuted">{t("receiver.lastReceived")}</p>
          <p className="text-xs text-carbon-textSub">{fmtReceived(repo.lastReceived, t)}</p>
          <p className="text-xs text-carbon-textMuted mt-0.5">
            {t("receiver.snapshotsCount").replace("{n}", String(repo.snapshotCount))}
          </p>
        </div>
      </div>

      {/* Last check line */}
      {repo.lastCheckAt > 0 && (
        <p className="text-xs text-carbon-textMuted">
          {t("receiver.lastChecked").replace("{time}", relativeTime(t, repo.lastCheckAt))}
          {repo.lastCheckOk === false && repo.lastCheckError && (
            <span className="text-statusFail"> · {repo.lastCheckError}</span>
          )}
        </p>
      )}

      {/* What to do about a failed check.
          ------------------------------------------------------------------
          Reported from the support forum: a received repo came back "restic
          check failed: repository contains errors", and the page said nothing
          beyond the restic message. The reporter went to the receiving box,
          opened a shell in the container and could not get past restic's
          password prompt, because the password for a RECEIVED repo is derived
          from the SENDING instance's APP_KEY, not from this one's. Nothing on
          this page said so, and that is the whole reason the detour happened.
          Shown only on a failure, so a healthy list stays quiet. */}
      {repo.lastCheckOk === false && (
        <p className="text-xs text-carbon-textSub wrap-break-word">{t("receiver.checkFailedHelp")}</p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          key={shakeCheck}
          label={t("receiver.checkNow")}
          labelKey="receiver.checkNow"
          tone="accent"
          onClick={() => void handleCheck()}
          disabled={checking}
          busy={checking}
          title={checking ? t("dashboard.checking") : undefined}
          className={shakeCheck ? "glim-shake" : ""}
        />
        <Toggle
          checked={deepCheck}
          onChange={setDeepCheck}
          disabled={checking}
          label={t("receiver.deepCheck")}
        />

        <div className="ms-auto flex items-center gap-2">
          <Button
            label={t("receiver.details")}
            labelKey="receiver.details"
            tone="neutral"
            onClick={() => setOpen((v) => !v)}
          />
          <Button
            label={t("receiver.edit")}
          labelKey="receiver.edit"
            tone="neutral"
            onClick={onEdit}
          />
          {/* NO bespoke red on either state (whole-app sweep) — the exact
              twin of Fleet.tsx's peer-row remove pair, converted in the same
              pass; see that call site for the full writeup, including why
              this DELIBERATELY stays a text button rather than becoming a
              square icon badge (the two-click inline confirm documented at
              i18n.ts's receiver.confirmRemove needs a label to flip, which an
              icon-only badge does not have). */}
          {confirmRemove ? (
            <Button
              key={shakeRemove}
              label={t("receiver.confirmRemove")}
              labelKey="receiver.confirmRemove"
              tone="neutral"
              onClick={() => void handleRemove()}
              disabled={removing}
              busy={removing}
              title={removing ? t("receiver.removing") : undefined}
              className={shakeRemove ? "glim-shake" : ""}
            />
          ) : (
            <Button
              label={t("receiver.remove")}
              labelKey="receiver.remove"
              tone="neutral"
              onClick={() => setConfirmRemove(true)}
            />
          )}
        </div>
      </div>

      {/* Inventory disclosure */}
      {open && (
        <div className="rounded-card bg-carbon-background px-3 py-2">
          <p className="text-xs font-medium text-carbon-textSub">{t("receiver.inventoryTitle")}</p>
          <InventoryPanel repo={repo} t={t} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / edit dialog
// ---------------------------------------------------------------------------

function ReceiverDialog({
  initial,
  t,
  onClose,
  onSaved,
}: {
  /** null = create; a status row = edit that repo. */
  initial: ReceivedRepoStatus | null;
  t: T;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [repo, setRepo] = useState(initial?.repo ?? "");
  const [appKey, setAppKey] = useState("");
  const revealAppKey = useReveal();
  const [deadManHours, setDeadManHours] = useState(initial?.deadManHours ?? 26);
  const [checkCadence, setCheckCadence] = useState(initial?.checkCadence ?? "");
  const [readDataPercent, setReadDataPercent] = useState(initial?.readDataPercent ?? 0);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): shake
  // the Save button alongside the toast on a failed save.
  const [shake, setShake] = useState(0);

  const editing = initial !== null;
  // On edit an empty key keeps the stored one; on create a key is required.
  const keyOk = appKey === "" ? editing : APP_KEY_RE.test(appKey);
  const canSave = name.trim() !== "" && repo.trim() !== "" && keyOk && !saving;

  // GlimStone follow-up pass (v8.0.0): the "error" flash below is now a
  // toast — same shape as Files.tsx's FileSetDialog.handleSave (a dialog
  // editor that closes on success via onSaved(), so a toast is the only
  // outcome notice left, success or failure). The three client-side checks
  // are effectively unreachable through the UI (canSave already disables
  // Save for the same conditions), but get the same push() treatment as the
  // API failure below for consistency. The separate appKey-format hint
  // further down (`appKey !== "" && !APP_KEY_RE.test(appKey)`) is untouched —
  // that's a live field-validation hint recomputed every render, not a
  // submit-triggered one-shot notice.
  async function handleSave() {
    if (name.trim() === "") {
      push(t("receiver.nameRequired"), "fail");
      setShake((n) => n + 1);
      return;
    }
    if (repo.trim() === "") {
      push(t("receiver.repoRequired"), "fail");
      setShake((n) => n + 1);
      return;
    }
    if (!keyOk) {
      push(t("receiver.appKeyInvalid"), "fail");
      setShake((n) => n + 1);
      return;
    }
    setSaving(true);
    const input: ReceivedRepoInput = {
      name: name.trim(),
      repo: repo.trim(),
      appKey: appKey.trim(),
      deadManHours: Number.isFinite(deadManHours) ? deadManHours : 26,
      checkCadence: checkCadence.trim(),
      readDataPercent: Math.max(0, Math.min(100, Number.isFinite(readDataPercent) ? readDataPercent : 0)),
      enabled,
      sortOrder: initial?.sortOrder ?? 0,
    };
    try {
      const res = editing
        ? await updateReceivedRepo(initial.id, input)
        : await createReceivedRepo(input);
      if (res.ok) {
        push(t("settings.saved"), "success");
        onSaved();
      } else {
        push(res.error ?? t("receiver.saveError"), "fail");
        setShake((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : t("receiver.saveError"), "fail");
      setShake((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "rounded-control bg-carbon-surface2 text-carbon-text text-sm px-3 py-1.5 glim-field-focus";

  // `items-center` — the third and last of the three sites Files.tsx's own
  // FileSetDialog comment recorded as "same fix still owed" when that round
  // scoped itself to the Ordner tab (Fleet.tsx's two dialogs are the other
  // two, fixed in the same pass as this). Top-anchored, the heading Badge
  // poked to within a few px of the browser-viewport edge instead of
  // straddling the card with any breathing room. Safe for the identical
  // reason it is safe in every other dialog in this app: the box below is
  // capped at `max-h-[90vh]`, strictly under the 100vh flex container, so a
  // centred item's top offset is always positive, and this backdrop's own
  // `overflow-y-auto` still covers content that grows toward the cap.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      {/* GlimStone follow-up pass ("half-overlap card notch"): the dialog box
          itself scrolls (`max-h-[90vh] overflow-y-auto`), which would clip
          the heading Badge's own -11px poke above it — a scrollable box
          can't reveal content positioned above its own top edge at
          scrollTop 0. So this wraps in a non-scrolling, non-clipping
          `relative` shell that hosts the badge, with the ORIGINAL
          scrollable box moved one level in as its only child. `w-full
          max-w-lg` moves to this outer shell (it's now the actual flex item
          inside the centring backdrop below) and the inner box gets a plain
          `w-full` instead, so the rendered width/centring is pixel-identical
          to before this split. */}
      <div className="relative w-full max-w-lg">
        {/* `px-5` matches the box's `p-5` so the heading notch lands where a Card's does ([542]) — see FolderBrowser.tsx for why the notch has no offset of its own. */}
        <h2 className="flex items-center px-5">
          <Badge tone="heading" size="heading" wrap>{editing ? t("receiver.editTitle") : t("receiver.addTitle")}</Badge>
        </h2>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? t("receiver.editTitle") : t("receiver.addTitle")}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-h-[90vh] overflow-y-auto rounded-card bg-carbon-surface p-5 flex flex-col gap-4 shadow-2xl"
        >
          {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="tower off-site"
            className={inputCls}
          />
        </div>

        {/* Repository location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.repoLocation")}</label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="rest:http://192.168.x.x:8000/tower-containers"
            dir="ltr"
            className={`${inputCls} font-mono text-start`}
          />
          <p className="text-caption text-carbon-textMuted">{t("receiver.repoLocationHint")}</p>
        </div>

        {/* Sending APP_KEY */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.appKey")}</label>
          <RevealInput
            {...revealAppKey}
            value={appKey}
            onChange={(e) => setAppKey(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={editing ? t("receiver.appKeyKeep") : "0123456789abcdef…"}
            wrapperClassName="w-full"
            className={`${inputCls} font-mono`}
          />
          <p className="text-caption text-carbon-textMuted">{t("receiver.appKeyHint")}</p>
          {appKey !== "" && !APP_KEY_RE.test(appKey) && (
            <p className="text-caption text-statusFail">{t("receiver.appKeyInvalid")}</p>
          )}
        </div>

        {/* Dead-mans-switch + check cadence + deep-check percent */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-carbon-textSub">{t("receiver.deadManHours")}</label>
            <NumberField
              min={1}
              value={deadManHours}
              onChange={(e) => setDeadManHours(parseInt(e.target.value, 10))}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-carbon-textSub">{t("receiver.readDataPercent")}</label>
            <NumberField
              min={0}
              max={100}
              value={readDataPercent}
              onChange={(e) => setReadDataPercent(parseInt(e.target.value, 10))}
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-caption text-carbon-textMuted -mt-2">{t("receiver.deadManHoursHint")}</p>

        {/* Check cadence */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.checkCadence")}</label>
          <input
            type="text"
            value={checkCadence}
            onChange={(e) => setCheckCadence(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={t("receiver.checkCadencePlaceholder")}
            dir="ltr"
            className={`${inputCls} font-mono text-start`}
          />
          <p className="text-caption text-carbon-textMuted">{t("receiver.checkCadenceHint")}</p>
        </div>

        {/* Monitor toggle */}
        {/* ToggleRow, not a bare Toggle ([544]). A bare Toggle sets its label
            immediately beside the switch; every setting row in this app puts the
            words at the start and the switch at the end, which is what ToggleRow
            renders (`flex items-start justify-between`). jdp: "der toggle soll
            rechtsbuendig sein, der text linksbuendig". Fixed at the shared
            component rather than by hand-matching classes here, the same reason
            IncludeToggle.tsx gives for its own switch to ToggleRow. */}
<ToggleRow checked={enabled} onChange={setEnabled} label={t("receiver.enabledLabel")} />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            label={t("files.cancel")}
          labelKey="files.cancel"
            tone="neutral"
            onClick={onClose}
            disabled={saving}
          />
          <Button
            key={shake}
            label={t("settings.save")}
            labelKey="settings.save"
            tone="accent"
            onClick={() => void handleSave()}
            disabled={!canSave}
            busy={saving}
            title={saving ? t("common.saving") : undefined}
            className={shake ? "glim-shake" : ""}
          />
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Receiver page
// ---------------------------------------------------------------------------

export function Receiver() {
  const { t } = useT();
  // D-01 double gate (the Containers/VMs/Flash/Config mount-discipline
  // precedent): the desktop JSX below is always rendered and carries
  // `max-md:hidden`, so the desktop presentation stays byte-identical; the
  // mobile card block mounts only under `!isDesktop`. jsdom's matchMedia stub
  // answers "desktop", so the desktop page keeps its existing behavior and
  // the mobile block is an e2e-only surface. The block owns every mobile-only
  // fetch (the settings gate) inside itself, so the desktop makes no new
  // requests. The add/edit state (`dialog`) is SHARED — one state, two
  // presentations: the desktop portal dialog above md, the fullHeight
  // MobileRepoEditor sheet below it.
  const isDesktop = useIsDesktop();
  // Registers this page for a re-render on any rainbow-state change (on/off/
  // reactive/rotate/palette edit) — the ReceivedRepoCard list below reads
  // rainbowAt()/hueVars() directly during render; see lib/useRainbow.ts's own
  // header for why a caller doesn't need the returned value.
  useRainbow();
  const [repos, setRepos] = useState<ReceivedRepoStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = closed; "new" = create dialog; a row = edit dialog for that repo.
  const [dialog, setDialog] = useState<"new" | ReceivedRepoStatus | null>(null);

  function loadRepos() {
    return listReceivedRepos()
      .then((res) => {
        if (res.ok) {
          setRepos(res.repos ?? []);
          setError(null);
        } else {
          setError(res.error ?? t("receiver.loadError"));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("receiver.loadError")));
  }

  useEffect(() => {
    void loadRepos().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // jdp live review ("Empfänger Tab: Button rechts oben ist redundant"): the
  // empty-state Card below already carries its own prominent "Add received
  // repo" CTA, so showing the identical button a second time in the
  // top-right actions bar was pure duplication — confirmed both call the
  // exact same handler (`() => setDialog("new")`). Gate the top-right button
  // on NOT being in that empty state — mirrors Files.tsx's own
  // showEmptyState fix for the identical pattern. Once a repo exists the
  // empty-state Card stops rendering and the top-right button is the page's
  // only entry point again, so "Add" is never unreachable.
  const showEmptyState = !loading && !error && repos.length === 0;

  return (
    // PAGE_SHELL (jdp live-review, "Können wir die nicht überall gleich breit
    // machen?"): the gap here was already the correct 40px from the earlier
    // "Im Empfänger Tab ist die Card zu weit oben" round; only the width
    // changes, max-w-5xl (1024px) → the shared 1152px. This page's heading is
    // a single bare h1+p row, so the one flat shell gap still governs every
    // gap on it. See lib/pageShell.ts for the full before/after table.
    <div className={PAGE_SHELL}>
      {/* Heading + Add */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-carbon-text">{t("receiver.title")}</h1>
          <p className="mt-1 text-sm text-carbon-textSub">{t("receiver.subtitle")}</p>
        </div>
        {!showEmptyState && (
          /* The D-01 first gate hides this desktop trigger below md — on a
             WRAPPER div, deliberately, not on the Button itself: `.glim-btn`
             is unlayered author CSS (`display: inline-flex`), which beats
             Tailwind v4's layered `max-md:hidden` utility on the SAME element
             (the `.glim-picker` width lesson from 06-03, re-learned live when
             the class-on-Button form left the trigger visible at 360px). A
             plain div carries no unlayered display rule, so the utility wins. */
          <div className="shrink-0 max-md:hidden">
          <Button
            label={t("receiver.addRepo")}
            labelKey="receiver.addRepo"
            tone="accent"
            onClick={() => setDialog("new")}
          />
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-carbon-textMuted">{t("dashboard.checking")}</p>}
      {error && <p className="text-sm text-statusFail wrap-break-word">{error}</p>}

      {/* Empty state — GlimStone follow-up pass (jdp live review: "Card hat
          keinen Cardtitelbadge mit dem Infotext der in der Card steht"): this
          card had no heading at all — just the icon, the permanent pitch
          paragraph, and the Add button — the one Card-shaped box on this page
          that never got the tone="heading" notch every other Card in the app
          carries. `relative glim-notch-card` (Files.tsx's own setsTitle Card
          precedent — no separate inner overflow-hidden box needed, this card
          was never overflow-hidden to begin with). The old permanent
          `<p>{t("receiver.empty")}</p>` reads once and then costs vertical
          space forever — moved verbatim onto the new heading Badge as an
          `onAccent` InfoBubble instead, zero new i18n keys for the body, only
          the new title key. hueIndex={0}: the only tone="heading" notch on
          this page's own body (ReceiverDialog's own h2 badge deliberately
          carries no hueIndex, same as every other dialog title in the app),
          and mutually exclusive with ReceivedRepoCard's OWN rainbowAt(index)
          tint (this card only renders while the list is empty), so there is
          no position to collide with.
          insetStart={6} (GlimStone follow-up pass, jdp: "Empfaenger/Fleet-
          Tab: Cardtitelbadge falsch platziert" — the SAME `text-center
          items-center` collapsed-h2 mismatch as Files.tsx's own setsTitle
          Card and Fleet.tsx's identical empty-state Card; see Files.tsx's
          own call site for the full "why a single-merged-div Card can still
          get this wrong" mechanism and Badge.tsx's `insetStart` doc). */}
      {showEmptyState && (
        // `.glim-hue` added (rainbow-mode completeness sweep, jdp live
        // review: "Es sind nicht alle Buttons in den Regenbogen-Modus
        // eingepflegt"): `glim-notch-card` alone only wires the reactive-mode
        // hover reveal on the Badge's own notch, never --accent/--focus-ring
        // itself, so the "Add" button below stayed flat regardless of
        // rainbow. Same hueIndex={0} the Badge already uses (Fleet.tsx's own
        // identical fix for the same reasoning).
        <div
          className="relative glim-notch-card glim-hue bg-carbon-surface rounded-card p-6 text-center flex flex-col items-center gap-3 max-md:hidden"
          style={hueVars(rainbowAt(0)) as CSSProperties}
        >
          <h2 className="flex items-center">
            <Badge tone="heading" size="heading" wrap hueIndex={0} insetStart={6}>
              {t("receiver.emptyTitle")}
              <InfoBubble tip={t("receiver.empty")} onAccent />
            </Badge>
          </h2>
          <EmptyStateIcon icon={IconReceiver} />
          <Button
            label={t("receiver.addRepo")}
            labelKey="receiver.addRepo"
            tone="accent"
            onClick={() => setDialog("new")}
          />
        </div>
      )}

      {/* Repo cards */}
      {!loading && repos.length > 0 && (
        <div className="flex flex-col gap-3 glim-content-fade max-md:hidden">
          {repos.map((r, i) => (
            <ReceivedRepoCard
              key={r.id}
              repo={r}
              t={t}
              onRefresh={() => void loadRepos()}
              onEdit={() => setDialog(r)}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Add / edit dialog — the desktop portal shell. The editor STATE is
          shared with the mobile block below (one state, two presentations):
          the fullHeight MobileRepoEditor sheet mounts for the same value
          below md. */}
      {isDesktop && dialog !== null && (
        <ReceiverDialog
          initial={dialog === "new" ? null : dialog}
          t={t}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void loadRepos();
          }}
        />
      )}

      {/* D-01 second gate: the mobile card block. Mounted ONLY under !isDesktop
          (not just hidden) so the desktop makes no new requests and its DOM and
          network traffic stay identical — the block owns every mobile-only
          fetch (the settings gate) inside itself. */}
      {!isDesktop && (
        <MobileReceiverBlock
          repos={repos}
          loading={loading}
          error={error}
          onRetry={() => void loadRepos()}
          editor={dialog}
          onEditor={setDialog}
          onRefresh={() => void loadRepos()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile receiver block (07-04, MORE-01b) — the Receiver page's card
// presentation below the 48rem breakpoint (D-01's second gate; the
// mount-discipline comment on Receiver() above is the other half).
//
// WHY A SEPARATE COMPONENT: the block owns the mobile-only fetch — the
// phase-5 destinations gate (getSettings → settings.receiverEnabled) — and
// because the desktop never mounts this component, the desktop makes no new
// requests and its DOM and network traffic stay identical. The add/edit
// STATE is the page's own (`dialog`, passed in as `editor`): one state, two
// presentations — the desktop portal dialog above md, the fullHeight
// MobileRepoEditor sheet below it — so there is no parallel mobile editor
// state to drift.
//
// CARD LANGUAGE: one card per received repo (glim-hue + rainbowAt(index),
// the same list-index discipline the desktop ReceivedRepoCard documents).
// The card's tap row opens the DETAIL SHEET — a content-sized BottomSheet
// (D-04 viewer, deliberately NOT fullHeight) hosting the receiverInventory
// drill-down, the manual check rows (Check now + the deep-check readData
// toggle) and the edit/remove rows. All actions live on >=44px tonal rows;
// the card itself carries no buttons, so the whole card reads as one
// navigation target.
// ---------------------------------------------------------------------------
function MobileReceiverBlock({
  repos,
  loading,
  error,
  onRetry,
  editor,
  onEditor,
  onRefresh,
}: {
  /** The page's own repo list — one fetch, two presentations. */
  repos: ReceivedRepoStatus[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** The shared add/edit state ("new" = create; a row = edit that repo). */
  editor: "new" | ReceivedRepoStatus | null;
  onEditor: (next: "new" | ReceivedRepoStatus | null) => void;
  onRefresh: () => void;
}) {
  const { t } = useT();

  // GATE-OFF HONESTY (the VMs/Flash/Config contract): an unknown gate state
  // reads as "on" — a failed settings fetch renders the real surface (whose
  // own error paths are honest) rather than ever claiming the domain is
  // disabled when we simply don't know. The desktop page never checks
  // receiverEnabled itself (the nav owns the gate), so this fetch is
  // mobile-only code.
  const [gate, setGate] = useState<"unknown" | "on" | "off">("unknown");
  useEffect(() => {
    let alive = true;
    getSettings()
      .then((r) => {
        if (!alive) return;
        setGate(r.ok && r.settings.receiverEnabled === false ? "off" : "on");
      })
      .catch(() => {
        if (alive) setGate("on");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 glim-content-fade">
      {/* Page-level load failure: this >=44px tonal row is the mobile recovery
          affordance; the desktop error paragraph above carries the message.
          folders.retry ("Try again") is the sanctioned existing label — the
          phase's pre-seed added no retry key (07-02). */}
      {error && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[2.75rem] w-full rounded-control bg-carbon-surface2 px-3 text-sm font-medium text-carbon-text"
        >
          {t("folders.retry")}
        </button>
      )}

      {gate === "off" ? (
        // The destinations gate, mobile face (the VMs/Flash/Config contract):
        // the block says plainly that the receiver dashboard is off and links
        // to the settings row that turns it on.
        <div>
          <MobileSectionLabel t={t} labelKey="settings.receiverEnabled" />
          <div className="mt-2 flex flex-col gap-2 rounded-card border border-carbon-border bg-carbon-surface p-4">
            <p className="text-sm text-carbon-textSub">{t("settings.receiverEnabledHint")}</p>
            <Link
              to="/settings"
              className="flex min-h-[2.75rem] items-center rounded-control bg-carbon-surface2 px-3 text-sm font-medium text-carbon-text"
            >
              {t("nav.settings")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Empty honesty (the desktop empty-state card's own copy, on the
              card language): the pitch paragraph plus a >=44px add row. */}
          {!loading && !error && repos.length === 0 && (
            <div className="flex flex-col gap-2 rounded-card border border-carbon-border bg-carbon-surface p-4">
              <p className="text-sm font-semibold text-carbon-text">{t("receiver.emptyTitle")}</p>
              <p className="text-sm text-carbon-textSub">{t("receiver.empty")}</p>
            </div>
          )}

          {repos.map((r, i) => (
            <MobileReceiverCard
              key={r.id}
              repo={r}
              t={t}
              index={i}
              onRefresh={onRefresh}
              onEdit={() => onEditor(r)}
            />
          ))}

          {/* Add entry row — the page's add action on the card language.
              Rendered whenever the gate is on and the load has settled (the
              empty card above carries the pitch; this row is the
              always-reachable entry point). */}
          {!loading && !error && (
            <button
              type="button"
              onClick={() => onEditor("new")}
              className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-control bg-carbon-surface2 px-3 py-2 text-start text-sm font-medium text-carbon-text"
            >
              <span className="truncate">{t("receiver.addRepo")}</span>
              <IconReceiver />
            </button>
          )}
        </>
      )}

      {/* The add/edit sheet (D-05 fullHeight) hosting the SAME editor state
          the desktop portal dialog consumes. */}
      {editor !== null && (
        <MobileRepoEditor
          initial={editor === "new" ? null : editor}
          t={t}
          onClose={() => onEditor(null)}
          onSaved={() => {
            onEditor(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileReceiverCard — one received repo as a mobile card. Reachability is
// the DESKTOP language re-hosted as text badges in the desktop's own order
// and conditions (Monitoring off → Reachable/Unreachable → check verdict):
// text-labelled status badges only, never offsite-blue tokens (T-07-14 —
// the offsite palette does not exist on this surface, and a received repo
// is not this box's off-site target anyway; it is another instance's repo
// watched read-only). lastReceived renders RELATIVE (tabular) with
// receiver.never for the empty payload — the desktop card's absolute
// timestamp stays in the detail sheet where the inventory carries the same
// fields.
//
// "size meta" (UI-SPEC MORE-01b) renders in the DETAIL sheet, not here: the
// list payload (ReceivedRepoStatus) has no size field — sizes exist only in
// the lazily-fetched receiverInventory — and a per-card inventory fetch
// would be an N+1 request pattern the list must not pay.
// ---------------------------------------------------------------------------
function MobileReceiverCard({
  repo,
  t,
  index,
  onRefresh,
  onEdit,
}: {
  repo: ReceivedRepoStatus;
  t: T;
  /** Position in the rendered list — the rainbow palette position (same
   *  list-index discipline as the desktop card above). */
  index: number;
  onRefresh: () => void;
  onEdit: () => void;
}) {
  const { push } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [detailOpen, setDetailOpen] = useState(false);
  // Manual check rows (the desktop card's own handleCheck semantics: same
  // toasts, same shake, same onRefresh).
  const [deepCheck, setDeepCheck] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): shake
  // the Check/Remove rows alongside their existing toasts on failure.
  const [shakeCheck, setShakeCheck] = useState(0);
  const [shakeRemove, setShakeRemove] = useState(0);

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await checkReceivedRepo(repo.id, deepCheck);
      if (res.ok && res.result) {
        if (res.result.ok) push(t("receiver.checkOk"), "success");
        else {
          push(res.result.error || t("receiver.checkFailed"), "fail");
          setShakeCheck((n) => n + 1);
        }
      } else {
        push(res.error ?? t("receiver.checkFailed"), "fail");
        setShakeCheck((n) => n + 1);
      }
      onRefresh();
    } catch (err) {
      push(err instanceof Error ? err.message : t("receiver.checkFailed"), "fail");
      setShakeCheck((n) => n + 1);
    } finally {
      setChecking(false);
    }
  }

  // REMOVE VIA useConfirm (the plan's mobile contract): the DESKTOP card
  // deliberately keeps the lighter two-click inline confirm (its comment
  // cites the reversible-action rule); on the phone a mis-tap has no hover
  // to correct, so the destructive action gets the ConfirmSheet (useConfirm
  // swaps the presentation half below 48rem, D-07) — same deleteReceivedRepo
  // call, same "monitoring row only, repo untouched" truth.
  async function handleRemove() {
    // Removing a monitoring entry never touches the repo on disk
    // (re-addable in one step), so the "light" warn branch — the same
    // reversible-action reasoning the desktop card's inline confirm cites.
    const ok = await confirm(`${t("receiver.remove")}: ${repo.name}`, {
      confirmLabel: t("receiver.confirmRemove"),
      cancelLabel: t("common.cancel"),
      tone: "warn",
    });
    if (!ok) return;
    setRemoving(true);
    try {
      const res = await deleteReceivedRepo(repo.id);
      if (res.ok) {
        setDetailOpen(false);
        onRefresh();
      } else {
        push(res.error ?? t("receiver.saveError"), "fail");
        setShakeRemove((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : t("receiver.saveError"), "fail");
      setShakeRemove((n) => n + 1);
    } finally {
      setRemoving(false);
    }
  }

  // Check-result badge (the desktop card's own tone mapping, verbatim).
  const checkTone = repo.lastCheckOk === null ? "neutral" : repo.lastCheckOk ? "ok" : "fail";
  const checkLabel =
    repo.lastCheckOk === null
      ? t("receiver.checkNever")
      : repo.lastCheckOk
      ? t("receiver.checkOk")
      : t("receiver.checkFailed");

  // Relative lastReceived (the card language; "" = never received).
  const lastReceivedMs = repo.lastReceived ? new Date(repo.lastReceived).getTime() : NaN;
  const lastReceivedValid = !Number.isNaN(lastReceivedMs);

  return (
    <div
      className="glim-hue glim-content-fade relative flex flex-col gap-2 overflow-hidden rounded-card bg-carbon-surface p-4"
      style={hueVars(rainbowAt(index))}
    >
      {/* Tap row → the detail sheet. The badge set mirrors the desktop
          header's own order and conditions verbatim — text-labelled status
          badges only (T-07-14). */}
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        aria-expanded={detailOpen}
        className="flex min-h-[2.75rem] w-full items-center gap-3 rounded-control bg-carbon-surface2 px-3 py-2 text-start"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-carbon-surface text-carbon-textSub"
        >
          <IconReceiver />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-carbon-text">{repo.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {!repo.enabled && <Badge tone="neutral">{t("receiver.monitoringOff")}</Badge>}
            {repo.enabled &&
              (repo.reachable ? (
                <Badge tone="ok">{t("receiver.reachable")}</Badge>
              ) : (
                <Badge tone="fail">{t("receiver.unreachable")}</Badge>
              ))}
            <Badge tone={checkTone}>{checkLabel}</Badge>
          </span>
        </span>
      </button>

      {/* Last-received line: RELATIVE + tabular (the card language), muted
          receiver.never when the payload is empty. */}
      <p className="text-xs text-carbon-textMuted">
        {`${t("receiver.lastReceived")}: ${
          lastReceivedValid ? relativeTime(t, lastReceivedMs / 1000) : t("receiver.never")
        }`}
      </p>
      <p className="text-xs text-carbon-textMuted tabular-nums">
        {t("receiver.snapshotsCount").replace("{n}", String(repo.snapshotCount))}
      </p>

      {/* Last-check line + the failed-check help (desktop card's own lines,
          verbatim keys). */}
      {repo.lastCheckAt > 0 && (
        <p className="text-xs text-carbon-textMuted">
          {t("receiver.lastChecked").replace("{time}", relativeTime(t, repo.lastCheckAt))}
          {repo.lastCheckOk === false && repo.lastCheckError && (
            <span className="text-statusFail"> · {repo.lastCheckError}</span>
          )}
        </p>
      )}
      {repo.lastCheckOk === false && (
        <p className="text-xs text-carbon-textSub wrap-break-word">{t("receiver.checkFailedHelp")}</p>
      )}

      {/* The detail sheet — a CONTENT-SIZED BottomSheet (D-04 viewer, no
          fullHeight prop) hosting the inventory drill-down, the manual check
          rows and the edit/remove rows. */}
      {detailOpen && (
        <BottomSheet open onClose={() => setDetailOpen(false)} title={t("receiver.details")}>
          <div className="flex flex-col gap-3 pt-3">
            {/* Inventory drill-down (the desktop disclosure panel's own fetch
                and keys, stacked rows instead of the desktop table). */}
            <p className="text-xs font-medium text-carbon-textSub">{t("receiver.inventoryTitle")}</p>
            <MobileInventory repo={repo} t={t} />

            {/* Manual check rows: the deep-check readData toggle + the check
                action. The rows carry no accent — a read-only monitor has no
                backup trigger to reserve the surface's accent, and check is
                a request/response action, not a tracked job. */}
            <ToggleRow
              label={t("receiver.deepCheck")}
              checked={deepCheck}
              onChange={setDeepCheck}
              disabled={checking}
            />
            <button
              key={shakeCheck}
              type="button"
              onClick={() => void handleCheck()}
              disabled={checking}
              className={`min-h-[2.75rem] w-full rounded-control bg-carbon-surface2 px-3 text-sm font-medium text-carbon-text disabled:opacity-60 ${
                shakeCheck ? "glim-shake" : ""
              }`}
            >
              {checking ? t("dashboard.checking") : t("receiver.checkNow")}
            </button>

            {/* Edit + remove rows. */}
            <button
              type="button"
              onClick={() => {
                setDetailOpen(false);
                onEdit();
              }}
              className="min-h-[2.75rem] w-full rounded-control bg-carbon-surface2 px-3 text-sm font-medium text-carbon-text"
            >
              {t("receiver.edit")}
            </button>
            <button
              key={shakeRemove}
              type="button"
              onClick={() => void handleRemove()}
              disabled={removing}
              className={`min-h-[2.75rem] w-full rounded-control bg-carbon-surface2 px-3 text-sm font-medium text-carbon-text disabled:opacity-60 ${
                shakeRemove ? "glim-shake" : ""
              }`}
            >
              {removing ? t("receiver.removing") : t("receiver.remove")}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* useConfirm's presentation half (ConfirmSheet below md) — portal-
          rendered by the hook itself. */}
      {confirmDialog}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileInventory — the receiverInventory drill-down on the card language:
// the SAME fetch, loading/error/empty keys and repo-wide totals as the
// desktop InventoryPanel above, stacked per-source rows instead of the
// desktop table (four columns cannot read on a 390px sheet). Numbers render
// tabular (data, not chrome).
// ---------------------------------------------------------------------------
function MobileInventory({ repo, t }: { repo: ReceivedRepoStatus; t: T }) {
  const [inv, setInv] = useState<ReceiverInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    receiverInventory(repo.id)
      .then((res) => {
        if (!active) return;
        if (res.ok && res.inventory) setInv(res.inventory);
        else setError(res.error ?? t("receiver.inventoryError"));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t("receiver.inventoryError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo.id, t]);

  if (loading) {
    return <p className="text-xs text-carbon-textMuted">{t("receiver.inventoryLoading")}</p>;
  }
  if (error) {
    return <p className="text-xs text-statusFail wrap-break-word">{error}</p>;
  }
  if (!inv || inv.sources.length === 0) {
    return <p className="text-xs text-carbon-textMuted">{t("receiver.inventoryEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {inv.sources.map((s, i) => (
        <div key={`${s.host}/${s.item}/${i}`} className="rounded-control bg-carbon-surface2 px-3 py-2">
          <p className="truncate text-sm font-medium text-carbon-text">
            {s.item || "-"}
            {s.host && <span className="text-carbon-textMuted"> · {s.host}</span>}
          </p>
          <p className="mt-0.5 text-xs text-carbon-textSub tabular-nums">
            {t("receiver.snapshotsCount").replace("{n}", String(s.snapshotCount))}
            {" · "}
            {humanBytes(s.totalSize)}
          </p>
          <p className="text-xs text-carbon-textMuted tabular-nums">
            {`${t("receiver.colLastReceived")}: ${fmtReceived(s.lastReceived, t)}`}
          </p>
        </div>
      ))}
      {/* Repo-wide totals (the desktop tfoot row). */}
      <div className="rounded-control border border-carbon-border px-3 py-2">
        <p className="text-sm font-medium text-carbon-text">{t("receiver.total")}</p>
        <p className="mt-0.5 text-xs text-carbon-textSub tabular-nums">
          {t("receiver.snapshotsCount").replace("{n}", String(inv.snapshotCount))}
          {" · "}
          {humanBytes(inv.totalSize)}
        </p>
        <p className="text-xs text-carbon-textMuted tabular-nums">
          {`${t("receiver.colLastReceived")}: ${fmtReceived(inv.lastReceived, t)}`}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileRepoEditor — the ReceiverDialog field set re-hosted in a fullHeight
// BottomSheet (D-05; Pattern 6 dialog re-host). The SAME field components
// (plain inputs, NumberField, RevealInput + useReveal, ToggleRow), the SAME
// APP_KEY regex + write-only contract (T-07-11): the key is NEVER echoed —
// the input mounts blank with the desktop's own "saved (leave blank to
// keep)" placeholder when a key is stored (hasAppKey) — blank-on-save keeps
// the stored key (the PUT carries appKey: "" and the server keeps it;
// ReceivedRepoInput has no removal flag — the frozen desktop contract,
// api.ts: replacing the key is a paste over the blank, removing the entry
// removes its key), and save/cancel ride the same create/update calls with
// the same validation, toasts and shake. Failed saves toast AND shake (the
// standing rule).
// ---------------------------------------------------------------------------
function MobileRepoEditor({
  initial,
  t,
  onClose,
  onSaved,
}: {
  /** null = create; a status row = edit that repo. */
  initial: ReceivedRepoStatus | null;
  t: T;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [repo, setRepo] = useState(initial?.repo ?? "");
  const [appKey, setAppKey] = useState("");
  const revealAppKey = useReveal();
  const [deadManHours, setDeadManHours] = useState(initial?.deadManHours ?? 26);
  const [checkCadence, setCheckCadence] = useState(initial?.checkCadence ?? "");
  const [readDataPercent, setReadDataPercent] = useState(initial?.readDataPercent ?? 0);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): shake
  // the Save button alongside the toast on a failed save.
  const [shake, setShake] = useState(0);

  const editing = initial !== null;
  // On edit an empty key keeps the stored one; on create a key is required.
  const keyOk = appKey === "" ? editing : APP_KEY_RE.test(appKey);
  const canSave = name.trim() !== "" && repo.trim() !== "" && keyOk && !saving;

  async function handleSave() {
    if (name.trim() === "") {
      push(t("receiver.nameRequired"), "fail");
      setShake((n) => n + 1);
      return;
    }
    if (repo.trim() === "") {
      push(t("receiver.repoRequired"), "fail");
      setShake((n) => n + 1);
      return;
    }
    if (!keyOk) {
      push(t("receiver.appKeyInvalid"), "fail");
      setShake((n) => n + 1);
      return;
    }
    setSaving(true);
    const input: ReceivedRepoInput = {
      name: name.trim(),
      repo: repo.trim(),
      appKey: appKey.trim(),
      deadManHours: Number.isFinite(deadManHours) ? deadManHours : 26,
      checkCadence: checkCadence.trim(),
      readDataPercent: Math.max(0, Math.min(100, Number.isFinite(readDataPercent) ? readDataPercent : 0)),
      enabled,
      sortOrder: initial?.sortOrder ?? 0,
    };
    try {
      const res = editing
        ? await updateReceivedRepo(initial.id, input)
        : await createReceivedRepo(input);
      if (res.ok) {
        push(t("settings.saved"), "success");
        onSaved();
      } else {
        push(res.error ?? t("receiver.saveError"), "fail");
        setShake((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : t("receiver.saveError"), "fail");
      setShake((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "rounded-control bg-carbon-surface2 text-carbon-text text-sm px-3 py-1.5 glim-field-focus";

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? t("receiver.editTitle") : t("receiver.addTitle")}
      fullHeight
    >
      {/* The bar is the LAST child of the scroll body (its sticky bottom-0
          pins it during scroll; the min-h-full wrapper + flex-1 spacer push
          it to the panel floor when the content is shorter than the sheet) —
          the MobileVMCard schedule-sheet body shape. */}
      <div className="flex min-h-full flex-col gap-4 pt-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="tower off-site"
            className={inputCls}
          />
        </div>

        {/* Repository location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.repoLocation")}</label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="rest:http://192.168.x.x:8000/tower-containers"
            dir="ltr"
            className={`${inputCls} font-mono text-start`}
          />
          <p className="text-caption text-carbon-textMuted">{t("receiver.repoLocationHint")}</p>
        </div>

        {/* Sending APP_KEY — write-only (T-07-11): blank input, the desktop's
            own keep placeholder when a key is stored, never a prefilled
            value. */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.appKey")}</label>
          <RevealInput
            {...revealAppKey}
            value={appKey}
            onChange={(e) => setAppKey(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={editing ? t("receiver.appKeyKeep") : "0123456789abcdef…"}
            wrapperClassName="w-full"
            className={`${inputCls} font-mono`}
          />
          <p className="text-caption text-carbon-textMuted">{t("receiver.appKeyHint")}</p>
          {appKey !== "" && !APP_KEY_RE.test(appKey) && (
            <p className="text-caption text-statusFail">{t("receiver.appKeyInvalid")}</p>
          )}
        </div>

        {/* Dead-mans-switch + deep-check sample */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-carbon-textSub">{t("receiver.deadManHours")}</label>
            <NumberField
              min={1}
              value={deadManHours}
              onChange={(e) => setDeadManHours(parseInt(e.target.value, 10))}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-carbon-textSub">{t("receiver.readDataPercent")}</label>
            <NumberField
              min={0}
              max={100}
              value={readDataPercent}
              onChange={(e) => setReadDataPercent(parseInt(e.target.value, 10))}
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-caption text-carbon-textMuted -mt-2">{t("receiver.deadManHoursHint")}</p>

        {/* Check cadence */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-carbon-textSub">{t("receiver.checkCadence")}</label>
          <input
            type="text"
            value={checkCadence}
            onChange={(e) => setCheckCadence(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={t("receiver.checkCadencePlaceholder")}
            dir="ltr"
            className={`${inputCls} font-mono text-start`}
          />
          <p className="text-caption text-carbon-textMuted">{t("receiver.checkCadenceHint")}</p>
        </div>

        {/* Monitor toggle (ToggleRow, not a bare Toggle — see the desktop
            dialog's identical call site comment). */}
        <ToggleRow checked={enabled} onChange={setEnabled} label={t("receiver.enabledLabel")} />

        <div className="min-h-4 flex-1" />
        <StickyActionBar>
          <Button
            label={t("files.cancel")}
            labelKey="files.cancel"
            tone="neutral"
            onClick={onClose}
            disabled={saving}
            className="w-full"
          />
          <Button
            key={shake}
            label={t("settings.save")}
            labelKey="settings.save"
            tone="accent"
            onClick={() => void handleSave()}
            disabled={!canSave}
            busy={saving}
            title={saving ? t("common.saving") : undefined}
            className={`w-full ${shake ? "glim-shake" : ""}`}
          />
        </StickyActionBar>
      </div>
    </BottomSheet>
  );
}
