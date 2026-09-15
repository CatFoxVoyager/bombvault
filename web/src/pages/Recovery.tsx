import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useT, type TranslationKey } from "../lib/i18n";
import { PAGE_SHELL } from "../lib/pageShell";
import { SelectField } from "../components/SelectField";
import { hueVars, rainbowAt } from "../lib/appearance";
import { useIsDesktop } from "../lib/useMediaQuery";
import { RevealInput } from "../components/RevealInput";
import { useReveal } from "../lib/useReveal";
import { withLtrIsolates, FOREIGN_APPDATA_DEST_HINT_LTR_FRAGMENTS } from "../lib/ltrFragments";
import { StepCard, type StepState } from "../components/recovery/StepCard";
import { Badge, type BadgeTone } from "../components/Badge";
import { StickyActionBar } from "../components/mobile/StickyActionBar";
import { Button } from "../components/Button";
import { IconRestore } from "../components/Sidebar";
import { InfoBubble } from "../components/InfoBubble";
import { FolderBrowser } from "../components/FolderBrowser";
import { SourceToggle, type RepoSource } from "../components/SourceToggle";
import { CloudCard } from "./settings/CloudCard";
import { RcloneCard } from "./settings/RcloneCard";
import { ToggleRow } from "./settings/shared";
import { Selector } from "../components/Selector";
import { RestoreAction } from "../components/restore/RestoreAction";
import { RestoreCancelButton } from "../components/RestoreCancelButton";
import { fireAndWaitRun } from "../lib/backupWatch";
import { useProgress, anyActive, busyPhraseKey } from "../lib/progress";
import { statusLabel, statusTone } from "../lib/runDisplay";
import { buildLogLines, formatLogDate } from "../lib/activityLog";
import type { LogLine, ResolveName } from "../lib/activityLog";
import { formatClockTime } from "../lib/reltime";
import { useVisibilityGate } from "../lib/useVisibilityGate";
import { colorFor, glyphFor, glyphLabelKey } from "../components/ActivityLog";
import { ProgressBar } from "../components/ProgressBar";
import { CheckDraw } from "../components/CheckDraw";
import {
  discover,
  discoverVMs,
  discoverFiles,
  discoverAll,
  getSettings,
  putSettings,
  listContainers,
  listVMs,
  listFileSets,
  fileSetSnapshots,
  checkDomain,
  listRuns,
  restore,
  restoreVM,
  restoreFileSet,
  restoreConfig,
  waitForAppBack,
  getVMSSH,
  downloadRecoveryKit,
  foreignOpen,
  foreignClose,
  foreignRestore,
  listForeignFiles,
  foreignContainerWarnings,
  detectEncryption,
  type EncryptionDetection,
  type EncryptionVerdict,
  type RepoEncryption,
  type ForeignBindWarning,
  type Settings,
  type Container,
  type Run,
  type VM,
  type FileSetView,
  type FileEntry,
  type ForeignInventory,
  type ForeignItem,
} from "../lib/api";
import { SnapshotFileTree } from "../components/SnapshotFileTree";
import { useConfirm } from "../lib/useConfirm";
import { useToast } from "../lib/toast";

import { Toggle } from "../components/Toggle";
// classifyReadable's probe: discover() + discoverVMs() OPEN the encrypted repo
// (they read the mirrored, restic-encrypted definitions), so they are the
// cleanest "can BombVault read your backups?" check with no backend change:
//   - a wrong APP_KEY  -> the mapped "APP_KEY differs" error in {ok:false,error}
//   - a missing/empty repo -> {ok:true, discovered:0}
//   - a readable repo   -> {ok:true, discovered:>0}
// See the report notes for why the snapshot-list probe can't be used pre-discover
// (it needs a container name we don't have on a fresh install).
type DiscoverResult = Awaited<ReturnType<typeof discover>>;

function isKeyMismatch(err: string | undefined): boolean {
  return !!err && /APP_KEY/i.test(err);
}

// Shared mono text-input styling (off-site URLs, foreign location/key fields).
const offsiteInput =
  "rounded-control bg-carbon-surface2 px-3 py-2 text-sm text-carbon-text font-mono glim-field-focus";

// RestoreRow — a single discovered target (container or VM) with its latest
// snapshot and a per-item Restore button. The restore mechanics are the shared
// <RestoreAction> (the same control the Containers/VMs tabs use), so a recovery
// restore behaves identically to one launched from those tabs. The restore is
// IN PLACE and LEFT STOPPED (forceLeaveStopped): the recovery flow restores
// everything first, then you start them from the Containers/VMs tabs.
function RestoreRow({
  domain,
  name,
  displayName,
  lastBackup,
  t,
  otherActive,
  hueIndex,
}: {
  domain: "container" | "vm";
  /** Raw identifier — the ONLY value the restore action below may send to the
   *  backend. For VMs this MUST be VM.libvirtName, never VM.name (which is
   *  display-only on TrueNAS). Containers have no such split. */
  name: string;
  /** Display name shown in the row + the cancel-confirm text; falls back to
   *  name. */
  displayName?: string;
  lastBackup: number | null;
  t: ReturnType<typeof useT>["t"];
  otherActive: boolean;
  /** Rainbow position for this row — same `.glim-hue`-on-the-row-wrapper
   *  mechanism as ContainerRow/VMRow (see StepCard.tsx's own comment for the
   *  cascade reasoning): the shared RestoreAction's plain bg-accent button
   *  needs no changes of its own, it just inherits --accent/--focus-ring
   *  from this row once the wrapper below carries the class. Assigned from
   *  Recovery()'s page-flat `nextHue()` counter at the call site, one call
   *  per row, in render order. */
  hueIndex: number;
}) {
  // Latest-backup label — DISPLAY ONLY, read straight from the target list's own
  // lastBackup field (unix seconds). No per-row snapshot fetch: a discovered list
  // of N containers + M VMs would otherwise spawn N+M concurrent restic processes
  // just for this label. The restore itself resolves "latest" on the server.
  const snapLabel = lastBackup ? new Date(lastBackup * 1000).toLocaleString() : "";

  return (
    <div
      className="flex flex-col gap-1 py-2 border-b border-carbon-border last:border-0 glim-hue"
      style={hueVars(rainbowAt(hueIndex)) as CSSProperties}
    >
      {/* In-place restore, LEFT STOPPED (forceLeaveStopped): the recovery flow
          restores everything first, then you start them from the Containers/VMs
          tabs. source omitted => the backend-default repo.
            `requireConfirm={false}` + `confirmMessage`: the confirm CHECKBOX
          does not fit a one-line row action, so the guard is a modal instead —
          the same one "Restore all" in this card already uses. This row used to
          pass requireConfirm={false} alone, on the strength of a prop doc
          claiming the stepper gated the flow. It does not: a single click on
          the glyph badge overwrote live appdata or VM disks with no question
          asked, and it was the only requireConfirm={false} in the tree.
            jdp live-review: "Card 5: die ganzen Wiederherstellen-Buttons sollen
          quadratische Badges mit Glyphen sein und ganz rechts platziert sein."
          `iconBadge` does the conversion (see RestoreAction's own doc for the
          32px/tone/tooltip recipe and why the hue comes from THIS row's
          wrapper rather than from a hueIndex prop). `leading` is what makes it
          "in its row": this row's name and timestamp move INTO the trigger's
          own flex line, so the badge's `ms-auto` pushes it to the far edge of
          the same line they sit on — the row's own separate header <div> is
          gone, not left behind above it. `label` still names the action; in
          badge mode it becomes the hover tooltip and the accessible name. */}
      <RestoreAction
        domain={domain}
        name={name}
        displayName={displayName}
        snapshotId="latest"
        otherActive={{ active: otherActive }}
        successMessage={t("common.done")}
        requireConfirm={false}
        confirmMessage={t("recovery.restoreRowConfirm").replace("{name}", displayName ?? name)}
        showLeaveStopped={false}
        forceLeaveStopped
        showBusyHint={false}
        showStartedHint={false}
        label={t("snapshots.restore")}
        iconBadge
        leading={
          <>
            <span className="text-sm text-carbon-text font-medium flex-1 min-w-0 truncate">
              {displayName ?? name}
            </span>
            <span className="text-carbon-textMuted text-xs shrink-0">
              {snapLabel || t("containers.never")}
            </span>
          </>
        }
        t={t}
      />
    </div>
  );
}

// FileSetRecoveryRow — a discovered file set with a target-folder picker and a
// per-item Restore button. File sets rebuilt from `fileset:` snapshot tags carry
// NO source path (tags alone don't store it), so an in-place restore is
// impossible here — the restore always extracts into a folder the user picks
// (non-destructive, FolderBrowser convention). The newest snapshot is resolved
// AT CLICK TIME (the files restore endpoint takes a concrete hex id, no
// "latest" alias) so rendering N rows never spawns N restic processes.
function FileSetRecoveryRow({
  set,
  hostMountRoot,
  t,
  otherActive,
  hueIndex,
}: {
  set: FileSetView;
  hostMountRoot: string;
  t: ReturnType<typeof useT>["t"];
  otherActive: boolean;
  /** Same `.glim-hue`-on-the-row-wrapper mechanism as RestoreRow above (see
   *  its own comment) — this row's inline bg-accent Restore button inherits
   *  --accent/--focus-ring from the wrapper with no button-level change. */
  hueIndex: number;
}) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a failed
  // action toasts AND shakes its button — a bumped nonce keyed onto the Restore
  // button replays `.glim-shake` once per failure, same mechanism as
  // VMExportButton/ExportButton's shakeNonce in the Containers/VMs tabs.
  const [shake, setShake] = useState(0);

  const snapLabel = set.lastBackup ? new Date(set.lastBackup * 1000).toLocaleString() : "";

  // GlimStone follow-up pass (v8.0.0): the "done"/"fail" result below is a
  // genuinely one-shot completion notice — unlike VMBackupButton/BackupButton's
  // shared useBackupWatch hook (deliberately left elsewhere in this pass), this
  // row drives fireAndWaitRun directly with its own local state, the same
  // shape as Settings.tsx's already-migrated ReplicateNowButton/
  // TestConnectionButton, so it gets the same treatment.
  async function handleRestore() {
    if (target.trim() === "" || busy) return;
    setBusy(true);
    try {
      // Resolve the newest snapshot of this set now (tag-filtered server-side).
      const snaps = await fileSetSnapshots(set.id);
      const list = snaps.ok ? snaps.snapshots ?? [] : [];
      if (list.length === 0) {
        push(snaps.error ?? t("snapshots.none"), "fail");
        setShake((n) => n + 1);
        return;
      }
      const latest = list.reduce((a, b) => (new Date(a.time) > new Date(b.time) ? a : b));
      const res = await fireAndWaitRun({
        kind: "restore",
        matchRun: (r) => r.domain === "files" && r.target === set.name,
        start: () => restoreFileSet(set.id, latest.id, true, target.trim()),
        t,
      });
      if (res.ok) {
        push(t("common.done"), "success");
      } else {
        push(res.error ?? t("settings.error"), "fail");
        setShake((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : String(err), "fail");
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-2 py-2 border-b border-carbon-border last:border-0 glim-hue"
      style={hueVars(rainbowAt(hueIndex)) as CSSProperties}
    >
      {/* Same conversion as RestoreRow above (jdp: square glyph badges, flush
          right), done inline here because this row drives fireAndWaitRun
          directly rather than through RestoreAction. The badge moves UP into
          this row's own name/timestamp line — that line is the row, and
          `ms-auto` puts the badge at its far edge, on the same right edge as
          every other restore badge and as the card's "Restore all" button.
            It stays disabled until a target folder is picked, exactly as the
          text button did; the folder picker it depends on is the very next
          thing below it, and the tooltip carries the label the glyph replaced.
          `shake`-keyed for the one-shot failure shake, unchanged. */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-carbon-text font-medium flex-1 min-w-0 truncate">{set.name}</span>
        <span className="text-carbon-textMuted text-xs shrink-0">
          {snapLabel || t("containers.never")}
        </span>
        <Button
          key={shake}
          label={t("snapshots.restore")}
          labelKey="snapshots.restore"
          glyph={<IconRestore />}
          tone="accent"
          onClick={() => void handleRestore()}
          disabled={busy || otherActive || target.trim() === ""}
          busy={busy}
          className={`ms-auto shrink-0${shake ? " glim-shake" : ""}`}
        />
      </div>
      <FolderBrowser
        label={t("restore.targetPath")}
        value={target}
        hostMountRoot={hostMountRoot}
        onChange={setTarget}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Foreign-repo restore (#61) — "Restore from another BombVault repo".
//
// A clearly separated section: connect READ-ONLY to a DIFFERENT BombVault
// instance's repository (its own APP_KEY), browse the inventory, restore
// single items. Two hard rules distinguish it from the attach steps above:
//   1. NOTHING persists. The session lives server-side in memory (30-min TTL);
//      this card must NEVER call putSettings (the neighbouring connectPreview
//      deliberately does — that is the anti-pattern here).
//   2. foreignClose runs on unmount/leave and on disconnect, so the foreign
//      key does not linger server-side for the full TTL.
// ---------------------------------------------------------------------------

/** True when a foreign-restore error means the 30-min session lapsed — the
 *  remedy is always the same: reconnect (the card offers exactly that). */
function isForeignSessionGone(err: string | undefined): boolean {
  return !!err && /session/i.test(err) && /(expired|unknown)/i.test(err);
}

// One restorable foreign item: snapshot picker (default latest), a destination
// folder, and a Restore button driven by fireAndWaitRun on the recorded run —
// runs land with domain "container" | "vm" | "files" exactly like local ones.
//
// The destination folder is REQUIRED for two domains, for different reasons:
//   - files: a foreign file set has no trusted local source path, so it always
//     extracts into a folder the user picks.
//   - vms (#122): a cross-instance VM must NEVER reuse the source server's disk
//     paths (that wrote multi-GB images onto the destination host's RAM rootfs
//     and bricked it). The user chooses where the disks land; they are written
//     to <destination>/<vm-name>/ and the backend rewrites the libvirt XML to
//     match. Defaults to the local VM domains path; a foreign VM is restored
//     LEFT STOPPED so the operator can check it before starting it.
function ForeignItemRow({
  domain,
  item,
  session,
  hostMountRoot,
  existsLocally,
  collisionKnown,
  t,
  blocked,
  onBusyChange,
  onSessionGone,
  hueIndex,
}: {
  domain: "containers" | "vms" | "files";
  item: ForeignItem;
  session: string;
  hostMountRoot: string;
  /** Show the overwrite confirm before restoring (a real or unverifiable collision). */
  existsLocally: boolean;
  /** True only when a same-named local item is KNOWN to exist; false when the local
   *  inventory could not be read, so the confirm should say "could not verify". */
  collisionKnown: boolean;
  t: ReturnType<typeof useT>["t"];
  blocked: boolean;
  onBusyChange: (busy: boolean) => void;
  onSessionGone: () => void;
  /** Same `.glim-hue`-on-the-row-wrapper mechanism as RestoreRow/
   *  FileSetRecoveryRow above — this row's own inline bg-accent Restore
   *  button inherits --accent/--focus-ring from the wrapper. Assigned from
   *  ForeignRestoreCard's own `nextHue()` (the SAME counter passed down from
   *  Recovery(), continuing that one page-flat sequence). */
  hueIndex: number;
}) {
  const [snapshot, setSnapshot] = useState("latest");
  // VMs default the destination to the local VM domains path (subpath under the
  // host mount); this exact subpath resolves to the same folder the backend
  // would fall back to, so leaving it untouched matches the safe default. File
  // sets start blank (the user must pick a folder).
  const [target, setTarget] = useState(domain === "vms" ? "user/domains" : "");
  const needsTarget = domain === "files" || domain === "vms";
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a failed
  // action toasts AND shakes its button — a bumped nonce keyed onto the
  // Restore button replays `.glim-shake` once per failure, same mechanism as
  // VMExportButton/ExportButton's shakeNonce in the Containers/VMs tabs.
  const [shake, setShake] = useState(0);

  // Files domain only: restore the WHOLE set (default) or PICK a subfolder/file
  // subset of it (#123 — pull one stack out of a whole-appdata set). The subset
  // selection + its file tree are lazy: nothing is listed until the user switches
  // to "pick a subfolder".
  const [filesMode, setFilesMode] = useState<"whole" | "subset">("whole");
  const [foreignFiles, setForeignFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [filesFilter, setFilesFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const subsetActive = domain === "files" && filesMode === "subset";

  // Containers domain only (#125): a cross-instance container restore remaps appdata
  // onto a destination on THIS host. `overwrite` confirms writing into a non-empty
  // destination that may belong to a different container; `warnings` lists the
  // container's NON-appdata binds whose source pool this host lacks (appdata is
  // remapped automatically — these the operator fixes in the template).
  const [overwrite, setOverwrite] = useState(false);
  const [warnings, setWarnings] = useState<ForeignBindWarning[]>([]);

  // onSessionGone is an inline arrow at the call site, so its identity changes on
  // every parent re-render — and the parent re-renders on every /api/progress SSE
  // tick. Hold it in a ref so the file-listing effect below can call the latest
  // handler WITHOUT listing it as a dependency (else each SSE tick would wipe the
  // ticked selection and re-fetch the tree mid-pick).
  const onSessionGoneRef = useRef(onSessionGone);
  onSessionGoneRef.current = onSessionGone;

  // The recorded run's domain strings (see handleRuns): singular for
  // containers/VMs, "files" for file sets.
  const runDomain = domain === "containers" ? "container" : domain === "vms" ? "vm" : "files";
  // Newest-first for the picker; restic lists snapshots oldest-first.
  const snaps = [...item.snapshots].reverse();

  // Containers: fetch the cross-pool bind warnings once (best-effort; the restore
  // still guards the destination regardless). Read-only, session-scoped.
  useEffect(() => {
    if (domain !== "containers") return;
    let cancelled = false;
    foreignContainerWarnings(session, item.name)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setWarnings(res.warnings ?? []);
        else if (isForeignSessionGone(res.error)) onSessionGoneRef.current();
      })
      .catch(() => {
        /* non-fatal: the appdata remap + destination guard still protect the restore */
      });
    return () => {
      cancelled = true;
    };
  }, [domain, session, item.name]);

  // Lazily list the chosen snapshot's file tree for the subset picker; re-list
  // when the snapshot changes and clear any prior selection (it belonged to the
  // previous snapshot). Read-only session-scoped call (listForeignFiles).
  useEffect(() => {
    if (!subsetActive) return;
    let cancelled = false;
    setFilesLoading(true);
    setFilesError(null);
    setSelected(new Set());
    listForeignFiles(session, item.name, snapshot)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setForeignFiles(res.files ?? []);
        else setForeignFiles([]);
        if (!res.ok) {
          setFilesError(res.error ?? t("files.loadFailed"));
          if (isForeignSessionGone(res.error)) onSessionGoneRef.current();
        }
      })
      .catch((err) => {
        if (!cancelled) setFilesError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subsetActive, session, item.name, snapshot, t]);

  function toggleSelected(p: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  // GlimStone follow-up pass (v8.0.0): same reasoning as FileSetRecoveryRow
  // above — this row drives fireAndWaitRun directly with its OWN local state
  // (not the shared, deliberately-sticky useBackupWatch hook), so the "ok"/
  // "fail" result is a genuinely one-shot completion notice, now a toast.
  async function handleRestore() {
    if (busy || blocked) return;
    if (needsTarget && target.trim() === "") return;
    // A subset restore needs at least one ticked path (the whole-set restore
    // sends none).
    if (subsetActive && selected.size === 0) return;
    // Overwrite confirm BEFORE anything fires. A KNOWN same-named local item warns
    // that it will be overwritten; an unreadable local inventory instead says it
    // could not verify (it is not claiming the item exists).
    if (existsLocally) {
      const key = collisionKnown ? "recovery.foreignExistsConfirm" : "recovery.foreignUnverifiedConfirm";
      if (!(await confirm(t(key).replace("{name}", item.name)))) return;
    }
    setBusy(true);
    onBusyChange(true);
    try {
      const res = await fireAndWaitRun({
        kind: "restore",
        matchRun: (r) => r.domain === runDomain && r.target === item.name,
        start: () =>
          foreignRestore({
            session,
            domain,
            item: item.name,
            snapshot,
            confirm: true,
            // Send whatever destination the field holds; empty lets the backend use
            // its default (files require one, vms default to user/domains, containers
            // default to the restore folder / user/appdata).
            target: target.trim() || undefined,
            // Only the subset mode selects paths; the whole-set restore omits them.
            paths: subsetActive ? [...selected] : undefined,
            // Containers only: confirm overwriting a non-empty destination (#125).
            overwrite: domain === "containers" ? overwrite : undefined,
          }),
        t,
      });
      if (res.ok) {
        push(t("common.done"), "success");
      } else {
        push(res.error ?? t("settings.error"), "fail");
        setShake((n) => n + 1);
        if (isForeignSessionGone(res.error)) onSessionGone();
      }
    } catch (err) {
      push(err instanceof Error ? err.message : String(err), "fail");
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-2 py-2 border-b border-carbon-border last:border-0 glim-hue"
      style={hueVars(rainbowAt(hueIndex)) as CSSProperties}
    >
      {/* Standing rule "fix the pattern, not the page jdp named": this is the
          THIRD per-item restore button on this page and the same pattern as
          Card 5's two, so it takes the same square-badge conversion in the same
          pass even though jdp only named Card 5. (The other restore buttons in
          the app are NOT this pattern — RestorePanel's, VMs' and Files' are the
          submit control of a restore FORM, sitting under a destination picker
          inside a panel that is itself already opened by an icon badge — so
          they stay text buttons.)
            Badge last in the row + `ms-auto` = flush right, same as the two in
          Card 5. */}
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <span className="text-carbon-text font-medium flex-1 min-w-0 truncate">{item.name}</span>
        <SelectField
          value={snapshot}
          onChange={setSnapshot}
          label={t("recovery.foreignLatest")}
          disabled={busy}
          options={[
            { value: "latest", label: t("recovery.foreignLatest") },
            ...snaps.map((s) => ({
              value: s.id,
              label: `${new Date(s.time).toLocaleString()}, ${s.id.slice(0, 8)}`,
            })),
          ]}
          className="rounded-control bg-carbon-surface2 px-2 py-1.5 text-xs text-carbon-text glim-field-focus"
        />
        <Button
          key={shake}
          label={t("recovery.foreignRestore")}
          labelKey="recovery.foreignRestore"
          glyph={<IconRestore />}
          tone="accent"
          onClick={() => void handleRestore()}
          disabled={busy ||
            blocked ||
            (needsTarget && target.trim() === "") ||
            (subsetActive && selected.size === 0)}
          busy={busy}
          className={`ms-auto shrink-0${shake ? " glim-shake" : ""}`}
        />
      </div>
      {domain === "files" && (
        <div className="flex flex-col gap-2">
          {/* Whole set vs. a subfolder/file subset of it (#123). */}
          <div className="flex items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`filesmode-${item.name}`}
                checked={filesMode === "whole"}
                onChange={() => setFilesMode("whole")}
                disabled={busy}
                className="accent-accent"
              />
              <span className="text-carbon-text">{t("recovery.foreignWholeSet")}</span>
            </label>
            {/* jdp live-review ("Info-Texte in i Infobubbles"): the
                foreignSubfolderHint <p> that appeared under this pair once
                "pick a subfolder" was selected explained what the subset mode
                DOES — permanent prose about this exact control, so it belongs
                on this control's own label. On the label rather than the mode
                block below because it is then readable BEFORE choosing the
                mode, which is when the explanation is actually useful. */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`filesmode-${item.name}`}
                checked={filesMode === "subset"}
                onChange={() => setFilesMode("subset")}
                disabled={busy}
                className="accent-accent"
              />
              <span className="text-carbon-text">{t("recovery.foreignPickSubfolder")}</span>
              <InfoBubble tip={t("recovery.foreignSubfolderHint")} />
            </label>
          </div>
          {subsetActive && (
            <>
              <SnapshotFileTree
                files={foreignFiles}
                loading={filesLoading}
                error={filesError}
                filter={filesFilter}
                onFilterChange={setFilesFilter}
                selected={selected}
                onToggle={toggleSelected}
                t={t}
              />
            </>
          )}
          <FolderBrowser
            label={t("recovery.foreignTargetFolder")}
            value={target}
            hostMountRoot={hostMountRoot}
            onChange={setTarget}
          />
        </div>
      )}
      {domain === "vms" && (
        <div className="flex flex-col gap-1.5">
          {/* jdp live-review ("Info-Texte in i Infobubbles"): the destination
              hint under this picker moves onto the picker's own label bubble,
              same as the connect step's location field above. */}
          <FolderBrowser
            label={t("recovery.foreignVMDest")}
            value={target}
            hostMountRoot={hostMountRoot}
            onChange={setTarget}
            placeholder="user/domains"
            hint={t("recovery.foreignVMDestHint")}
          />
        </div>
      )}
      {domain === "containers" && (
        <div className="flex flex-col gap-1.5">
          {/* Same move as the VM destination above, with one extra step: this
              hint names a literal `/mnt/zfs` pool path INSIDE the translated
              sentence, which needs bidi isolation or its leading `/` migrates
              to the wrong end of the path under RTL (see ltrFragments.tsx).
              An InfoBubble tip is a plain string that is ALSO the trigger's
              aria-label, so the `<span dir="ltr">` form withLtrFragments emits
              has nowhere to live here — `withLtrIsolates` applies the identical
              isolation with the U+2066/U+2069 characters instead, off the SAME
              fragment list, so the locale-parity guard still covers it. */}
          <FolderBrowser
            label={t("recovery.foreignAppdataDest")}
            value={target}
            hostMountRoot={hostMountRoot}
            onChange={setTarget}
            placeholder="user/appdata"
            hint={withLtrIsolates(
              t("recovery.foreignAppdataDestHint"),
              FOREIGN_APPDATA_DEST_HINT_LTR_FRAGMENTS
            )}
          />
          <Toggle
            checked={overwrite}
            onChange={setOverwrite}
            disabled={busy}
            label={t("recovery.foreignOverwrite")}
          />
          {warnings.length > 0 && (
            <div className="rounded-card bg-carbon-surface2 px-3 py-2 text-xs text-carbon-textMuted max-w-2xl">
              <p className="text-statusWarn">{t("recovery.foreignBindWarning")}</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {/* The key joins two free-form strings with a separator neither can
                    contain, so "a" + "b|c" and "a|b" + "c" can't collide. It MUST stay
                    the "\u0000" ESCAPE and never be re-typed as a literal NUL byte: a
                    raw 0x00 anywhere in this file makes ripgrep/grep/git classify the
                    WHOLE file as binary and return zero content lines for it, so every
                    repo-wide sweep silently skips Recovery.tsx. That already happened
                    once — the GlimStone form-engine confirm-dialog migration had to
                    hand-find this file's two "grep-invisible" call sites after the
                    sweep missed them. */}
                {warnings.map((wn) => (
                  <li key={wn.host + "\u0000" + wn.container} className="font-mono wrap-break-word text-start" dir="ltr">
                    {wn.host} → {wn.container}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

// The whole foreign section: heading + two StepCards (connect, browse &
// restore). All session state is COMPONENT state — never Settings.
function ForeignRestoreCard({
  hostMountRoot,
  t,
  otherActive,
  nextHue,
}: {
  hostMountRoot: string;
  t: ReturnType<typeof useT>["t"];
  otherActive: boolean;
  /** The PARENT Recovery()'s own `nextHue()` counter, passed down as the
   *  function itself (not a single computed value): this card renders THREE
   *  of its own heading notches (the section h2 below + its two StepCards),
   *  so each needs its own call to keep continuing the same page-flat
   *  sequence in JSX order, exactly as if these three headings were inline
   *  in Recovery()'s own return. */
  nextHue: () => number;
}) {
  // Connect input. The backend only opens a LOCALLY MOUNTED repository, so the
  // location is always a folder under the host mount (e.g. a mounted share
  // holding the other server's backups) — no remote-URL / off-site option here.
  const [localPath, setLocalPath] = useState("");
  const [key, setKey] = useState("");
  // The FOREIGN repository's own backend credentials, for a remote location
  // (#185). Kept in component state only: the server uses them for that one
  // session and never persists them, and neither do we. This instance's stored
  // cloud credentials are deliberately NOT offered as a default — lending them
  // to a user-supplied URL is exactly the confused-deputy disclosure that #61
  // closed, and typing the foreign repo's own credentials is what keeps a remote
  // foreign restore free of borrowed authority.
  const [foreignS3KeyId, setForeignS3KeyId] = useState("");
  const [foreignS3Secret, setForeignS3Secret] = useState("");
  const [foreignS3Region, setForeignS3Region] = useState("");
  const [foreignRestUser, setForeignRestUser] = useState("");
  const [foreignRestPassword, setForeignRestPassword] = useState("");
  const revealKey = useReveal();
  const revealForeignS3Secret = useReveal();
  const revealForeignRestPassword = useReveal();

  const [phase, setPhase] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [inventory, setInventory] = useState<ForeignInventory | null>(null);
  // The 30-min server-side TTL lapsed mid-browse (a restore reported it):
  // surface it and offer a one-click reconnect with the kept inputs.
  const [sessionGone, setSessionGone] = useState(false);
  // Local container/VM names ("container:x" / "vm:y"), fetched at connect time
  // so each row knows whether a restore would overwrite something local.
  const [localNames, setLocalNames] = useState<Set<string>>(new Set());
  // Was the local container/VM inventory successfully read at connect time? When
  // FALSE (the fetch failed), the collision state is UNKNOWN — every foreign
  // container/VM then still prompts the overwrite confirm rather than silently
  // skipping it (fail safe: confirm when unknown, never overwrite silently).
  const [localKnown, setLocalKnown] = useState(true);
  const [busyRows, setBusyRows] = useState(0);
  const { push } = useToast();
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a failed
  // action toasts AND shakes its button, layered ON TOP of this card's own
  // pre-existing sticky inline connectError box (kept — the scrubbed backend
  // message is worth reading, not just a toast ping). A bumped nonce keyed onto
  // the Connect button replays `.glim-shake` once per failure, same mechanism
  // as VMExportButton/ExportButton's shakeNonce.
  const [shake, setShake] = useState(0);

  // Ref-mirror of the session id so the unmount cleanup closes the CURRENT
  // session (an effect capturing `session` directly would close stale ids on
  // every change instead).
  const sessionRef = useRef<string | null>(null);
  sessionRef.current = session;
  useEffect(
    () => () => {
      // Leave/unmount: drop the session server-side (harmless if expired).
      // NOTE: nothing is persisted here — this card never calls putSettings.
      if (sessionRef.current) {
        foreignClose(sessionRef.current).catch(() => undefined);
      }
    },
    []
  );

  const location = localPath.trim();
  // A remote location is anything restic would treat as a backend rather than a
  // path: a known scheme prefix, or the unprefixed rclone remote name ("name:bucket")
  // that is the common typo. Mirrors restic.IsRemoteRepo / LooksLikeUnprefixedRemote
  // server-side — this only decides which fields to SHOW; the server re-checks and
  // is the authority.
  const isRemoteLocation = /^(rest|s3|sftp|rclone|b2|gs|azure|swift):/i.test(location) ||
    /^[A-Za-z0-9_-]+:[^/\\]/.test(location);
  // A remote repo needs at least one usable credential, otherwise the server
  // refuses it. Which kind depends on the backend, so any one of them unlocks
  // Connect and the server reports precisely what is missing.
  const hasForeignCreds =
    foreignS3KeyId.trim() !== "" ||
    foreignS3Secret.trim() !== "" ||
    foreignRestUser.trim() !== "" ||
    foreignRestPassword.trim() !== "";
  const canConnect =
    location !== "" &&
    key.trim() !== "" &&
    phase !== "connecting" &&
    (!isRemoteLocation || hasForeignCreds);

  const connect = useCallback(async () => {
    if (location === "" || key.trim() === "") return;
    setPhase("connecting");
    setConnectError(null);
    setSessionGone(false);
    // Replacing an open session: close the old one first (no dangling TTLs).
    if (sessionRef.current) {
      foreignClose(sessionRef.current).catch(() => undefined);
      setSession(null);
      setInventory(null);
    }
    try {
      // Credentials ride along only for a remote location; a mounted path needs
      // none, and sending them anyway would put secrets on the wire for nothing.
      const res = await foreignOpen(
        location,
        key.trim(),
        isRemoteLocation
          ? {
              s3KeyId: foreignS3KeyId.trim(),
              s3Secret: foreignS3Secret,
              s3Region: foreignS3Region.trim(),
              restUser: foreignRestUser.trim(),
              restPassword: foreignRestPassword,
              s3StorageClass: "",
            }
          : undefined,
      );
      if (!res.ok || !res.session) {
        const message = res.error ?? t("settings.error");
        setConnectError(message);
        setPhase("error");
        push(message, "fail");
        setShake((n) => n + 1);
        return;
      }
      // Read the LOCAL inventory BEFORE enabling the restore rows: which foreign
      // names already exist locally decides whether a restore shows the overwrite
      // confirm. Awaiting it here (rather than after phase "connected") means the
      // rows never render enabled with a stale/empty collision set. If the fetch
      // FAILS the collision state is UNKNOWN (localKnown=false) — every foreign
      // container/VM then still prompts the confirm (fail safe).
      const names = new Set<string>();
      let known = true;
      try {
        const [cs, vs] = await Promise.all([listContainers(), listVMs()]);
        // These endpoints answer HTTP 200 {ok:false} when docker/libvirt is
        // briefly unavailable (fetchJSON does not throw on that), so the ok flag
        // — not just a thrown error — decides whether the collision set is
        // trustworthy. An untrusted set forces the overwrite confirm (fail safe).
        if (!cs.ok || !vs.ok) {
          known = false;
        } else {
          for (const c of cs.containers ?? []) names.add(`container:${c.name}`);
          // ForeignItem.Name (below, item.name) is always the raw libvirt name
          // — it comes from parsing the foreign repo's restic tags
          // ("vm:"+rawName at backup time), never a friendly display name. The
          // local side of this collision check must match on the same raw
          // identifier (VM.libvirtName), not the display VM.name, or a
          // TrueNAS VM's real collision would go undetected.
          for (const v of vs.vms ?? []) names.add(`vm:${v.libvirtName}`);
        }
      } catch {
        known = false;
      }
      setLocalNames(names);
      setLocalKnown(known);
      setSession(res.session);
      setInventory(res.inventory ?? { containers: [], vms: [], fileSets: [] });
      setPhase("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setConnectError(message);
      setPhase("error");
      push(message, "fail");
      setShake((n) => n + 1);
    }
  }, [
    location,
    key,
    isRemoteLocation,
    foreignS3KeyId,
    foreignS3Secret,
    foreignS3Region,
    foreignRestUser,
    foreignRestPassword,
    t,
    push,
  ]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      foreignClose(sessionRef.current).catch(() => undefined);
    }
    setSession(null);
    setInventory(null);
    setPhase("idle");
    setSessionGone(false);
  }, []);

  const onBusyChange = useCallback((busy: boolean) => {
    setBusyRows((n) => (busy ? n + 1 : Math.max(0, n - 1)));
  }, []);
  const rowBlocked = otherActive || busyRows > 0;

  const connectState: StepState =
    phase === "connected" ? "ok" : phase === "error" ? "bad" : "idle";
  const total = inventory
    ? inventory.containers.length + inventory.vms.length + inventory.fileSets.length
    : 0;
  const browseState: StepState = !session ? "idle" : sessionGone ? "warn" : total > 0 ? "ok" : "warn";

  const groups: { domain: "containers" | "vms" | "files"; label: string; items: ForeignItem[] }[] =
    inventory
      ? [
          { domain: "containers" as const, label: t("nav.containers"), items: inventory.containers },
          { domain: "vms" as const, label: t("nav.vms"), items: inventory.vms },
          { domain: "files" as const, label: t("nav.files"), items: inventory.fileSets },
        ].filter((g) => g.items.length > 0)
      : [];

  return (
    // gap-10 + pt-10, matching the page rhythm the parent wrapper now uses
    // (jdp: "Bitte machen wie sonst überall") — this section's two StepCards
    // are cards on the same page and can't sit at half the gap the six above
    // them use. `mt-2` is gone with it: the parent's own gap-10 already sets
    // the distance to the divider, and pt-10 sets the same 40px below it, so
    // the rule sits centred in one consistent break instead of 40px above /
    // 28px below.
    <div className="flex flex-col gap-10 border-t border-carbon-border pt-10">
      <div>
        {/* Task 5 (rule 11): page-level group heading, same Badge-in-<h2>
            treatment as Containers.tsx's StacksPanel `stack.title` heading.
            GlimStone follow-up pass ("half-overlap card notch"): `relative`
            added directly on this <h2> — no padding wraps it, so the h2
            itself is the right anchor; see Badge.tsx's badgeClassName
            comment.
            jdp live-review ("Info-Texte in i Infobubbles"): foreignIntro —
            this section's whole pitch, a permanent paragraph under the
            heading — is now the badge's own `onAccent` (i), the same fix
            Flash.tsx's and Config.tsx's card headings already carry. */}
        <h2 className="relative flex items-center">
          <Badge tone="heading" size="heading" wrap hueIndex={nextHue()}>
            {t("recovery.foreignTitle")}
            <InfoBubble tip={t("recovery.foreignIntro")} onAccent />
          </Badge>
        </h2>
      </div>

      {/* Foreign step 1 — connect (read-only; nothing is saved). */}
      <StepCard n={1} title={t("recovery.foreignStepConnect")} state={connectState} hueIndex={nextHue()}>
        {/* Local mounted path only — the backend never opens a remote/off-site
            repo here, so the other server's backup share must be mounted on this
            host and pointed at below. */}
        {/* jdp live-review ("Info-Texte in i Infobubbles"): the standing hint
            under this picker is now the picker's OWN label bubble —
            FolderBrowser has carried a `hint` prop for exactly this since the
            same convention landed on Settings/Config, so this is a move, not
            new machinery. */}
        <FolderBrowser
          label={t("recovery.foreignLocation")}
          value={localPath}
          hostMountRoot={hostMountRoot}
          onChange={setLocalPath}
          hint={t("recovery.foreignLocationHint")}
        />

        <div className="flex flex-col gap-1">
          {/* Same fix one level down: the key field's own permanent hint <p>
              becomes the (i) on its label, matching how every labelled field
              in Settings.tsx/Config.tsx already carries its explanation. */}
          <label className="flex items-center gap-1 text-xs text-carbon-textSub">
            {t("recovery.foreignKey")}
            <InfoBubble tip={t("recovery.foreignKeyHint")} />
          </label>
          <RevealInput
            {...revealKey}
            value={key}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
            wrapperClassName="w-full"
            className={offsiteInput}
          />
        </div>

        {/* Remote location -> the OTHER repository's own backend credentials
            (#185). Only rendered for a remote location: a mounted path needs
            none. These are never pre-filled from this instance's own off-site
            credentials and never persisted — see the state declaration. */}
        {isRemoteLocation && (
          <div className="flex flex-col gap-3 rounded-control border border-carbon-border/60 p-3">
            <p className="text-xs text-carbon-textSub">{t("recovery.foreignCredsIntro")}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-xs text-carbon-textSub">
                  {t("recovery.foreignS3KeyId")}
                </label>
                <input
                  value={foreignS3KeyId}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setForeignS3KeyId(e.target.value)}
                  className={offsiteInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-xs text-carbon-textSub">
                  {t("recovery.foreignS3Region")}
                </label>
                <input
                  value={foreignS3Region}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setForeignS3Region(e.target.value)}
                  className={offsiteInput}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs text-carbon-textSub">
                {t("recovery.foreignS3Secret")}
              </label>
              <RevealInput
                {...revealForeignS3Secret}
                value={foreignS3Secret}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setForeignS3Secret(e.target.value)}
                wrapperClassName="w-full"
                className={offsiteInput}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-xs text-carbon-textSub">
                  {t("recovery.foreignRestUser")}
                  <InfoBubble tip={t("recovery.foreignRestHint")} />
                </label>
                <input
                  value={foreignRestUser}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setForeignRestUser(e.target.value)}
                  className={offsiteInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-xs text-carbon-textSub">
                  {t("recovery.foreignRestPassword")}
                </label>
                <RevealInput
                  {...revealForeignRestPassword}
                  value={foreignRestPassword}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setForeignRestPassword(e.target.value)}
                  wrapperClassName="w-full"
                  className={offsiteInput}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          {phase === "connected" && (
            <>
              <span className="text-sm text-statusOk">{t("recovery.foreignConnected")}</span>
              <Button
                label={t("recovery.foreignClose")}
          labelKey="recovery.foreignClose"
                tone="neutral"
                onClick={disconnect}
              />
            </>
          )}
          <Button
            key={shake}
            label={t("recovery.foreignConnect")}
            labelKey="recovery.foreignConnect"
            tone="accent"
            onClick={() => void connect()}
            disabled={!canConnect}
            busy={phase === "connecting"}
            title={phase === "connecting" ? t("recovery.foreignConnecting") : undefined}
            className={shake ? "glim-shake" : ""}
          />
        </div>
        {phase === "error" && connectError && (
          <div className="rounded-card bg-statusFailBgSoft px-3 py-2.5 text-xs text-statusFail leading-relaxed wrap-break-word">
            {connectError}
          </div>
        )}
      </StepCard>

      {/* Foreign step 2 — browse the inventory & restore single items. */}
      <StepCard n={2} title={t("recovery.foreignStepBrowse")} state={browseState} hueIndex={nextHue()}>
        {!session || !inventory ? (
          <p className="text-sm text-carbon-textMuted">{t("recovery.foreignNotConnected")}</p>
        ) : (
          <>
            {/* Session lapsed mid-browse (30-min TTL) — offer the reconnect. */}
            {sessionGone && (
              <div className="rounded-card bg-statusWarnBg px-3 py-2.5 text-xs text-statusWarn leading-relaxed flex items-center gap-3 flex-wrap">
                <span className="flex-1">{t("recovery.foreignExpired")}</span>
                <Button
                  label={t("recovery.foreignReconnect")}
                  labelKey="recovery.foreignReconnect"
                  tone="neutral"
                  onClick={() => void connect()}
                />
              </div>
            )}
            {total === 0 ? (
              <p className="text-sm text-statusWarn">{t("recovery.foreignEmpty")}</p>
            ) : (
              groups.map((g) => (
                <div key={g.domain} className="flex flex-col">
                  <span className="text-xs font-medium text-carbon-textSub pt-1 pb-1">{g.label}</span>
                  {g.items.map((item) => (
                    <ForeignItemRow
                      key={`${g.domain}:${item.name}`}
                      domain={g.domain}
                      item={item}
                      session={session}
                      hostMountRoot={hostMountRoot}
                      existsLocally={
                        // File sets restore into a chosen folder — they never
                        // overwrite a same-named local item, so no confirm. For
                        // containers/VMs, an UNKNOWN local inventory (fetch
                        // failed) counts as a possible collision → confirm.
                        g.domain !== "files" &&
                        (!localKnown ||
                          localNames.has(
                            (g.domain === "containers" ? "container:" : "vm:") + item.name
                          ))
                      }
                      collisionKnown={
                        // A real, verified collision (vs an unreadable inventory) —
                        // decides whether the confirm says "exists" or "could not verify".
                        g.domain !== "files" &&
                        localKnown &&
                        localNames.has(
                          (g.domain === "containers" ? "container:" : "vm:") + item.name
                        )
                      }
                      t={t}
                      blocked={rowBlocked}
                      onBusyChange={onBusyChange}
                      onSessionGone={() => setSessionGone(true)}
                      hueIndex={nextHue()}
                    />
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </StepCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepDisclosure — ONE expander shape, used by BOTH of step 3's optional
// sections (the off-site repo URLs and the cloud/rclone credential cards).
//
// WHY A DISCLOSURE AT ALL (jdp, first round: "Der Abschnitt von
// Cloud-Zugangsdaten (S3 / restic REST) und Off-site (rclone): brauchen wir
// die immer oder sind die optional? Können wir die in einen Ein-/Aufklapp-
// Button verstecken wenn sie optional sind?" — then, this round: "Können wir
// den Offsite-Abschnitt auch in einen ausklappbaren Button machen?"). Both
// sections really are optional, confirmed against the backend rather than
// assumed:
//   - Credentials: CloudCard's fields become nothing but env vars for the
//     restic child process (internal/api/service.go's `cloudEnv`, which emits
//     only the non-empty ones — AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/
//     AWS_DEFAULT_REGION/RESTIC_REST_USERNAME/RESTIC_REST_PASSWORD), and
//     restic reads none of them for a repo that is a plain filesystem path.
//     RcloneCard's config is written to DataDir/rclone.conf and only ever
//     consulted for a repo carrying the `rclone:` prefix. That is also exactly
//     what rclone.hint already says in words ("SMB/NFS need no rclone: mount
//     the share on Unraid and set a Backup Path to it").
//   - Off-site: the four *Offsite fields are the second-repo `restic copy`
//     targets. settings.offsiteHint — which is that chip's own tip —
//     documents them "leave blank to disable", and settings.offsiteTitle,
//     which is that chip's own label, already ends in "(optional)".
// So a user whose backups live on a local path under the host mount, or on a
// share already mounted on Unraid, needs NEITHER section — and until they
// open one, neither costs them any screen.
//
// THE TRIGGER is a `Selector` in `select="many"` mode — the mechanism this app
// already uses for disclosure sections (Containers.tsx's per-container
// Ordner/Stoppen/Ausschlussmuster/Hooks/Backups chip row, whose `openSections`
// is a Set for the same "these open independently, this is not a tablist"
// reason). One chip per section rather than five in a strip, but the same
// component, the same `aria-pressed` state and the same "chip on = its pane
// below is open" reading, instead of a bespoke expander idiom.
//   SIBLINGS BY CONSTRUCTION (jdp's ask is that the two read as one mechanism,
// not two): both call sites render THIS component, so the trigger's element,
// size, shape, colour, aria wiring and open-state behaviour are one piece of
// code rather than two that have to be kept in sync by hand. The only knob a
// caller gets is `gap` — how far its own revealed content sits from the chip —
// because a notch-badged Card needs 32px of clearance for the notch and a
// plain stack of fields does not (see that prop's own doc).
//   `hue={false}`, deliberately: Selector otherwise gives each item its OWN
// rainbow position by list index, which for a lone chip means position 0 — a
// red chip sitting inside step 3's yellow card, and, now that there are two of
// them, BOTH chips red, which would also break the sibling reading. Turning
// its own hueing off does NOT take it out of the colour engine: a chip still
// paints `bg-accent`/`text-accentContrast` when active, and --accent under it
// comes from the StepCard's own `.glim-hue`, so both chips carry THIS STEP's
// hue exactly like every other button in the step body (Connect & preview,
// Discover, …) and follow rainbow/reactive mode with them. That is the
// "genuine singleton keeps its container's accent" case design-language
// carves out, not an exemption from the engine.
//
// `size="lg"` (jdp, this round: "und die Buttons grösser machen"). Measured
// live before the change: 24px tall, 12px text — Selector's `md` stage, this
// expander's previous (default) size. After: 32px tall, 14px text, Selector's
// OWN existing `lg` stage, not a value invented for this one spot. 32px is
// also the number the rest of this page is already built on: it is Badge's
// single square-icon-badge stage (see Badge.tsx's "ONE SIZE FOR SQUARE ICON
// BADGES"), the height of every FolderBrowser path field stacked directly
// above these chips in this same step, and the height of the step's own
// "Connect & preview" and "Discover" buttons. So the enlarged chips line up
// with the controls they sit among instead of introducing a fourth height.
// `lg` is already this app's choice wherever a Selector is a primary control
// rather than a dense inline one (Settings' 7-tab strip, its Shape and Motion
// pickers).
//
// ALWAYS CLOSED ON LOAD. This deliberately REVERSES the "open by default when
// credentials already exist" behaviour the immediately preceding round built
// for the credentials chip — jdp has now explicitly asked for the opposite
// ("und diese beiden Ausklappbaren standardmässig zugeklappt lassen"). Gone
// with it: the `getCloud()`/`getRclone()` probe that decided it, the tri-state
// `boolean | null` open flag that existed only so the probe's late answer
// could not overwrite a user's click, and this component's whole `useEffect`.
// `useState(false)` is the entire story now, for both chips, on every load,
// configured or not.
// ---------------------------------------------------------------------------
function StepDisclosure({
  label,
  tip,
  gap = "gap-8",
  children,
}: {
  label: string;
  tip: string;
  /** Vertical gap between the chip and the content it reveals (and between
   *  that content's own children). Defaults to the credential cards' 32px: a
   *  Card's heading notch is centred ON its card's top edge, so it eats half
   *  its own height out of whatever gap precedes it — see the call site in
   *  step 3 for the measured -1px overlap that number fixes. A section of
   *  plain fields has no notch to clear and passes the step body's own
   *  `gap-2` instead. */
  gap?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    // pt-3 on top of the step body's own gap-2, so the chip clears whatever
    // sits above it — see each call site's own comment in step 3.
    <div className={`pt-3 flex flex-col ${gap}`}>
      <Selector
        items={[{ id: DISCLOSURE_ID, label, tip }]}
        label={label}
        select="many"
        size="lg"
        /* The app's ONE `hue={false}`, and the hard-technical case Selector's
           header reserves the escape hatch for rather than a taste call: the
           rainbow encodes an item's POSITION in a list, and this Selector has
           exactly one item. Every instance would be RAINBOW[0] red, inside a
           StepCard already carrying its own step colour, and would mean nothing
           by it — there is no list here for a position to be a position in. */
        hue={false}
        active={open ? OPEN_SECTION : NO_SECTION}
        onChange={() => setOpen((o) => !o)}
      />
      {open && children}
    </div>
  );
}
// One item id for every StepDisclosure: each chip is the only member of its
// own Selector strip, so the id never has to tell it apart from a sibling —
// which is what lets the two frozen Sets below serve both chips. Frozen rather
// than a `new Set([...])` per render: Selector takes a ReadonlySet and there
// are only ever two possible values.
const DISCLOSURE_ID = "sec";
const OPEN_SECTION: ReadonlySet<string> = new Set([DISCLOSURE_ID]);
const NO_SECTION: ReadonlySet<string> = new Set<string>();

// CloudCredsDisclosure — step 3's credential cards inside a StepDisclosure. It
// stays its own component for ONE reason: keeping the two `nextHue()` calls
// unconditional at the call site (see the props below). Everything about the
// expander itself is StepDisclosure's.
function CloudCredsDisclosure({
  t,
  cloudHue,
  rcloneHue,
}: {
  t: ReturnType<typeof useT>["t"];
  /** The two rainbow positions the cards used to take inline. Passed in (and
   *  therefore evaluated by the caller's own `nextHue()` at exactly the point
   *  in the JSX where these cards used to sit) so that COLLAPSING this section
   *  does not renumber the rest of the page: `nextHue()` is a running counter
   *  consumed in JSX evaluation order, so calling it inside a `{open && …}`
   *  branch would shift every heading after step 3 by two positions the moment
   *  the section closed. Props evaluate unconditionally; the cards they colour
   *  do not. */
  cloudHue: number;
  rcloneHue: number;
}) {
  return (
    <StepDisclosure label={t("recovery.cloudCreds")} tip={t("recovery.cloudCredsHint")}>
      {/* `nested` — these are the Settings page's own Cards rendered inside
          a card, so they drop their (identical-to-the-parent) surface and
          their horizontal padding and line up on the step's own content
          edge. See Card's `nested` doc in Settings.tsx for the measured
          20px indent this removes. */}
      <CloudCard t={t} hueIndex={cloudHue} nested />
      <RcloneCard t={t} hueIndex={rcloneHue} nested />
    </StepDisclosure>
  );
}

// ---------------------------------------------------------------------------
// EncryptionStatus — step 3's encryption block.
//
// jdp, live review: "Wieso brauchen wir da ein Passwort-Toggle? Muss ich selber
// wissen ob ich verschluesselte Backups wiederherstelle...? Kann es das nicht
// automatisch erkennen?" — it can, and now does.
//
// Settings.encryptionEnabled is not a preference, it is a FACT about the
// repository: restic opens it either with the APP_KEY-derived password or with
// --insecure-no-password, fixed at init time (see internal/api's ModeFor and
// encryption_detect.go). So the backend PROBES the configured repos and the
// setting follows what it finds. This component only renders the outcome.
//
// WHY THE SWITCH SURVIVES IN SOME STATES rather than being deleted outright:
// detection can only report a fact when a repository actually exists. On a
// genuine first-time setup nothing exists yet, and the user's choice really
// does decide how the repos get created — deleting the control would leave that
// case unanswerable on the page that needs it (Settings has its own copy, but
// sending the user away mid-attach to set something this step depends on is
// worse than showing one switch here). So:
//
//   detected (encrypted/plain) -> a plain status line, NO control. The common
//                                 path — restoring an existing repo — asks the
//                                 user for nothing at all, which is the point.
//   absent / unconfigured      -> the real control: nothing to detect yet.
//   unknown / conflict         -> the control as an OVERRIDE, next to a visible
//                                 "couldn't tell"/"they disagree" line and the
//                                 per-repo detail. Never a silent wrong guess.
//
// A disabled-looking switch is deliberately NOT used for the detected states: a
// greyed switch still reads as "a thing you were supposed to set", which is
// exactly the impression this change removes.
//
// Status colours (ok/warn/fail) stay OUTSIDE the accent/rainbow engine, same as
// step 1's own readable/not-reachable line right above.
// ---------------------------------------------------------------------------

/** The tone each verdict is rendered in. `undecided` verdicts also show the
 *  override switch and the per-repo breakdown. */
const ENC_VERDICT_TONE: Record<EncryptionVerdict, string> = {
  encrypted: "text-statusOk",
  plain: "text-statusOk",
  absent: "text-carbon-textMuted",
  unconfigured: "text-carbon-textMuted",
  unknown: "text-statusWarn",
  conflict: "text-statusFail",
};

const ENC_VERDICT_MESSAGE: Record<EncryptionVerdict, TranslationKey> = {
  encrypted: "recovery.encEncrypted",
  plain: "recovery.encPlain",
  absent: "recovery.encAbsent",
  unconfigured: "recovery.encUnconfigured",
  unknown: "recovery.encUnknown",
  conflict: "recovery.encConflict",
};

/** Verdicts where the mode is NOT established, so the user still decides (or
 *  overrides). Everything else is detected and needs no control. */
const ENC_NEEDS_CONTROL: ReadonlySet<EncryptionVerdict> = new Set<EncryptionVerdict>([
  "absent",
  "unconfigured",
  "unknown",
  "conflict",
]);

/** Verdicts where naming the individual repositories actually helps: "they
 *  disagree" is useless without knowing WHICH, and "couldn't tell" is useless
 *  without knowing which one failed and why. */
const ENC_SHOWS_REPOS: ReadonlySet<EncryptionVerdict> = new Set<EncryptionVerdict>([
  "unknown",
  "conflict",
]);

const ENC_STATE_KEY: Record<RepoEncryption["state"], TranslationKey> = {
  encrypted: "recovery.encStateEncrypted",
  plain: "recovery.encStatePlain",
  absent: "recovery.encStateAbsent",
  unreachable: "recovery.encStateUnreachable",
};

const ENC_DOMAIN_KEY: Record<string, TranslationKey> = {
  containers: "nav.containers",
  vms: "nav.vms",
  flash: "nav.flash",
  files: "nav.files",
  config: "nav.config",
};

function EncryptionStatus({
  t,
  detection,
  detecting,
  encryptionEnabled,
  onOverride,
}: {
  t: (k: TranslationKey) => string;
  detection: EncryptionDetection | null;
  detecting: boolean;
  encryptionEnabled: boolean;
  onOverride: (v: boolean) => void;
}) {
  // First run: say what is happening rather than flashing a control the probe
  // is about to make unnecessary.
  if (detecting && !detection) {
    return (
      <div className="flex items-center gap-2 pb-1">
        <span
          className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
        <span className="text-sm text-carbon-textMuted">{t("recovery.encChecking")}</span>
      </div>
    );
  }

  // The probe itself failed (network/HTTP, not a repo verdict). Treat it exactly
  // like "unknown": undecided, control shown, never a guess.
  const verdict: EncryptionVerdict = detection?.ok ? detection.verdict ?? "unknown" : "unknown";
  const repos = detection?.repos ?? [];

  return (
    <div className="flex flex-col gap-2 pb-1">
      <div className="flex items-start gap-1.5">
        <p className={`text-sm leading-relaxed ${ENC_VERDICT_TONE[verdict]}`}>
          {t(ENC_VERDICT_MESSAGE[verdict])}
        </p>
        {/* The MECHANISM is the explanation and belongs in the bubble; the line
            above is a live status readout, which stays on the page. */}
        <InfoBubble tip={t("recovery.encDetectHint")} />
      </div>

      {ENC_SHOWS_REPOS.has(verdict) && repos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {repos.map((r, i) => (
            <li
              key={`${r.domain}-${r.source}-${r.name ?? ""}-${i}`}
              className="text-xs text-carbon-textMuted leading-relaxed"
            >
              <span className="text-carbon-textSub">
                {t(ENC_DOMAIN_KEY[r.domain] ?? "nav.containers")}
                {" · "}
                {t(r.source === "offsite" ? "recovery.encSourceOffsite" : "recovery.encSourceLocal")}
                {r.name ? ` (${r.name})` : ""}
              </span>
              {": "}
              {t(ENC_STATE_KEY[r.state])}
              {r.error && (
                <span dir="ltr" className="font-mono break-all">: {r.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {ENC_NEEDS_CONTROL.has(verdict) && (
        <ToggleRow
          label={t("settings.encryptionLabel")}
          hint={encryptionEnabled ? t("settings.encryptionOn") : t("settings.encryptionOff")}
          checked={encryptionEnabled}
          onChange={onOverride}
        />
      )}
    </div>
  );
}

export default function Recovery() {
  const { t } = useT();
  const { confirm, confirmDialog } = useConfirm();
  const { push } = useToast();

  // D-01 double gate (the Config/VMs/Flash mount-discipline precedent): the
  // desktop stepper below is always rendered and carries `max-md:hidden`, so
  // the desktop presentation stays byte-identical and its effects keep firing;
  // the mobile step flow mounts only under `!isDesktop`, inside the same
  // PAGE_SHELL root. jsdom's matchMedia stub answers "desktop", so every
  // existing suite keeps testing the desktop page; the mobile block is the
  // stub-the-other-way dom/e2e surface (Recovery.mobile.dom.test.tsx +
  // guided-restore.spec.ts).
  const isDesktop = useIsDesktop();

  // Step 1 — repo-readable / APP_KEY state, shared with later steps.
  const [readableState, setReadableState] = useState<StepState>("idle");
  // The repository folders the readability check actually read, shown under the
  // step so an empty answer is interpretable rather than frightening (#196).
  const [readSources, setReadSources] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  // The repositories the probe left out ON PURPOSE - a named repository switched
  // off. Its own state rather than lastError, because that one only renders in
  // the warn state and this must be said at every pill colour without turning
  // the pill amber.
  const [readNote, setReadNote] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Step 2 — attach settings. Own copy of the settings object; persisted through
  // the SAME putSettings/setCloud/setRclone the Settings page uses (CloudCard and
  // RcloneCard self-persist; paths/off-site/encryption go through the mirrored
  // merge-onto-baseline save below — no new endpoint, no duplicate storage).
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hostMountRoot, setHostMountRoot] = useState<string>("/host/user");
  const [attachState, setAttachState] = useState<"idle" | "saving">("idle");
  const [previewed, setPreviewed] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a failed
  // action toasts AND shakes its button — a bumped nonce keyed onto the
  // "Connect & preview" button replays `.glim-shake` once per failure, same
  // mechanism as VMExportButton/ExportButton's shakeNonce.
  const [connectPreviewShake, setConnectPreviewShake] = useState(0);

  // Encryption mode — DETECTED from the repositories, not asserted by the user
  // (see EncryptionStatus above for the whole rationale). `detecting` starts
  // true because the probe runs on mount: the common path must be answered
  // before the user could even reach for a control.
  const [encDetection, setEncDetection] = useState<EncryptionDetection | null>(null);
  const [encDetecting, setEncDetecting] = useState(true);

  // runEncryptionDetect probes the configured repos and folds the result back
  // into the local settings copy, so the step's own `settings.encryptionEnabled`
  // matches what the backend just applied. Without that write-back the next
  // connectPreview would PUT the stale local value straight back over the
  // detected one.
  //
  // Returns the detection so connectPreview can use the fresh result without
  // reading `encDetection` through a stale closure.
  const runEncryptionDetect = useCallback(async (): Promise<EncryptionDetection | null> => {
    setEncDetecting(true);
    try {
      const res = await detectEncryption();
      setEncDetection(res);
      if (res.ok && typeof res.encryptionEnabled === "boolean") {
        const detected = res.encryptionEnabled;
        setSettings((prev) => (prev ? { ...prev, encryptionEnabled: detected } : prev));
      }
      return res;
    } catch (err) {
      // A transport failure is NOT evidence about encryption. Surface it as the
      // undecided state (EncryptionStatus renders a failed envelope as
      // "unknown") rather than letting the page imply anything about the mode.
      const failed: EncryptionDetection = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      setEncDetection(failed);
      return failed;
    } finally {
      setEncDetecting(false);
    }
  }, []);

  // Config-restore step (runs BEFORE attach/discover): restore BombVault's OWN
  // settings first so the attach + discover steps come pre-filled. Optional and
  // skippable — a user without a settings backup just attaches manually below.
  // The location (local path / off-site URL) is stored on `settings` and saved
  // right before the restore so the backend resolves the right repo.
  const [configSource, setConfigSource] = useState<RepoSource>("local");
  type ConfigPhase = "idle" | "saving" | "restarting" | "manual" | "reload" | "error";
  const [configPhase, setConfigPhase] = useState<ConfigPhase>("idle");
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSkipped, setConfigSkipped] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a failed
  // action toasts AND shakes its button. This CTA can restart the container, so
  // it gets the exact same treatment as every other primary action in this
  // file — a bumped nonce keyed onto the "Restore my settings" button replays
  // `.glim-shake` once per failure, same mechanism as
  // VMExportButton/ExportButton's shakeNonce.
  const [configShake, setConfigShake] = useState(0);

  useEffect(() => {
    getSettings()
      .then((res) => {
        if (res.ok) {
          setSettings(res.settings);
          if (res.hostMountRoot) setHostMountRoot(res.hostMountRoot);
        }
      })
      .catch(() => undefined)
      // Detect the encryption mode as soon as the settings (and therefore the
      // repo locations) are loaded — AFTER, not in parallel, so the write-back
      // into the local settings copy can't be overwritten by the getSettings
      // response landing second. On a box that is already attached this is what
      // makes the common path decision-free: by the time the user reads step 3,
      // the mode is already established and shown.
      .finally(() => void runEncryptionDetect());
  }, [runEncryptionDetect]);

  // checkReadable runs the discover probe and classifies the outcome. Shared by
  // Step 1's "Re-check" and Step 2's "Connect & preview". It uses the READ-ONLY
  // probe (probe=true) so merely checking readability never rebuilds the target
  // list — only Step 3's explicit "Discover" does (#44). The count + error
  // classification are identical to a real discover.
  //
  // Returns the classification (not just void) so connectPreview below can
  // react to the FRESH result synchronously — reading the `readableState`
  // React state var right after `await checkReadable()` would risk a stale
  // closure value from before this render's state settled.
  const checkReadable = useCallback(async (): Promise<StepState> => {
    setChecking(true);
    setLastError(null);
    try {
      const [c, v, f] = await Promise.all([discover(true), discoverVMs(true), discoverFiles(true)]);
      const results: DiscoverResult[] = [c, v, f];
      const keyErr = results.find((r) => !r.ok && isKeyMismatch(r.error));
      if (keyErr) {
        setReadableState("bad");
        setLastError(keyErr.error ?? null);
        return "bad";
      }
      const otherErr = results.find((r) => !r.ok);
      if (otherErr) {
        setReadableState("warn");
        setLastError(otherErr.error ?? null);
        return "warn";
      }
      const total = (c.discovered ?? 0) + (v.discovered ?? 0) + (f.discovered ?? 0);
      // Name the folders this actually read (#196). The wizard asks for an
      // off-site repository one step earlier and then reads each domain's
      // PRIMARY path, which is usually somewhere else entirely — and in the
      // disaster case this wizard exists for, that primary is a local folder
      // with nothing in it. An empty answer about an unnamed folder reads as
      // "my backups are gone"; the same answer with the path in it reads as
      // "it looked in the wrong place", which is the truth and is actionable.
      setReadSources([c.repo, v.repo, f.repo].filter((r): r is string => !!r));
      // A repository the probe could NOT open keeps the pill off green, even when
      // the ones it could open had plenty in them. The probe's whole job is to
      // answer "are my backups readable from here", and a green tick over a
      // repository that was never opened answers a different, easier question.
      //
      // …but only a repository that could not be opened. A repository switched
      // off on purpose is named in the same sentence, because after a /config
      // loss the operator has every reason to know it was not searched - and it
      // is not a fault, so it must not hold this pill amber for good and swallow
      // the save-success toast that is gated on "ok". skippedNeedsAction is the
      // server's own split between the two; see repoSkip.Note.
      const skipped = [...new Set(results.flatMap((r) => r.skipped ?? []))];
      const needsAction = results.some((r) => r.skippedNeedsAction === true);
      const skippedLine = skipped.length > 0 ? t("common.discoverSkipped").replace("{list}", skipped.join(", ")) : null;
      setReadNote(needsAction ? null : skippedLine);
      if (skippedLine && needsAction) {
        setLastError(skippedLine);
        setReadableState("warn");
        return "warn";
      }
      // >0 = repo readable with content; 0 = reachable but empty / not attached yet.
      const next: StepState = total > 0 ? "ok" : "warn";
      setReadableState(next);
      return next;
    } catch (err) {
      // Network/HTTP failure (unreachable, auth, 5xx) — not a key mismatch.
      setReadableState("warn");
      setLastError(err instanceof Error ? err.message : String(err));
      return "warn";
    } finally {
      setChecking(false);
    }
    // [t], since the skip sentence is translated here. useT's t closes over the
    // active table and changes identity on a language switch, and setLanguage
    // re-renders rather than remounts - so an empty array pinned the German
    // sentence onto an English card. runDiscover below already declares it.
  }, [t]);

  // connectPreview saves the paths/off-site/encryption fields (mirroring the
  // Settings save() merge onto the server baseline), then re-runs checkReadable
  // so Step 1's pill reflects the freshly-attached location.
  //
  // GlimStone follow-up pass (v8.0.0): the "saved"/"error" 3000ms inline flash
  // is now a toast, same shape as Settings.tsx's shared save() helper — with
  // one twist: the success flash only ever showed when the FOLLOW-UP
  // readability check also came back "ok" (attaching a bad repo shouldn't look
  // like a completed success), so the toast keeps that same condition, driven
  // by checkReadable's own return value rather than the readableState React
  // var (which would still read stale here, mid-function, before this
  // render's state settles).
  const connectPreview = useCallback(async () => {
    if (!settings) return;
    setAttachState("saving");
    // Re-fetch before merging, exactly like Config.tsx's handleSave and for the
    // same reason. The PUT below sends a FULL object, and the baseline it used
    // to merge onto was a mount-time snapshot — this page does not even listen
    // to its own bv:settings-changed event. So anything changed meanwhile from
    // a second tab, another device or a settings import was silently rolled
    // back, cadences and retention included. That snapshot state is gone now
    // rather than left lying around for the next caller to reach for.
    //
    // A failed re-fetch ABORTS rather than falling back to that snapshot: the
    // backend answers {ok:false} at HTTP 200 instead of throwing, so a fallback
    // would quietly do the exact damage this guard exists to prevent.
    const latest = await getSettings();
    if (!latest.ok) {
      setAttachState("idle");
      push(latest.error ?? t("config.loadSettingsFailed"), "fail");
      return;
    }
    const base = latest.settings;
    const patch: Partial<Settings> = {
      containersPath: settings.containersPath,
      vmsPath: settings.vmsPath,
      flashPath: settings.flashPath,
      filesPath: settings.filesPath,
      containersOffsite: settings.containersOffsite,
      vmsOffsite: settings.vmsOffsite,
      flashOffsite: settings.flashOffsite,
      filesOffsite: settings.filesOffsite,
      encryptionEnabled: settings.encryptionEnabled,
    };
    const updated: Settings = { ...base, ...patch };
    try {
      const res = await putSettings(updated);
      if (res.ok) {
        setSettings((prev) => (prev ? { ...prev, ...patch } : updated));
        // Keep the sidebar/Settings in sync (same event the Settings page fires).
        window.dispatchEvent(new Event("bv:settings-changed"));
        setPreviewed(true);
        // Attaching a (possibly different) repo invalidates any previously
        // discovered targets — clear them so Step 4 can never offer to restore
        // the OLD repo's data; the user must re-Discover against the new repo.
        setContainers([]);
        setVMs([]);
        setFileSets([]);
        setDiscovered(null);
        setRestoreAllResult(null);
        // Re-detect the encryption mode BEFORE the readability check, and only
        // now that the new paths are persisted — detection probes the CONFIGURED
        // locations, so running it any earlier would answer about the old ones.
        // This is the moment the common path actually resolves: on a fresh box
        // the mount-time probe had nothing configured to look at, and this run
        // is the first that can see the repository the user just pointed at.
        //
        // The patch above deliberately still carries encryptionEnabled: for the
        // undecidable cases (a brand-new empty location) that value IS the
        // user's own choice and must be saved. When the mode is instead
        // detectable, this call overwrites it with the truth a moment later and
        // writes the result back into the local copy, so the two can't drift.
        await runEncryptionDetect();
        const state = await checkReadable();
        if (state === "ok") push(t("recovery.readable"), "success");
      } else {
        push(res.error ?? t("settings.error"), "fail");
        setConnectPreviewShake((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : t("settings.error"), "fail");
      setConnectPreviewShake((n) => n + 1);
    } finally {
      setAttachState("idle");
    }
  }, [settings, checkReadable, runEncryptionDetect, push, t]);

  // restoreOwnConfig stages a restore of BombVault's OWN settings and drives the
  // self-restart that applies it. It first persists the chosen config-repo
  // location (merged onto the server baseline, like connectPreview), then calls
  // restoreConfig("latest", source). On autoRestart it polls the health endpoint
  // until BombVault returns and reloads so the restored settings load; without an
  // auto-restart it shows the manual container-restart instruction.
  const restoreOwnConfig = useCallback(async () => {
    if (!settings) return;
    setConfigPhase("saving");
    setConfigError(null);
    // Same full-object PUT, same stale mount-time baseline, same re-fetch — see
    // connectPreview above.
    const latest = await getSettings();
    if (!latest.ok) {
      const message = latest.error ?? t("config.loadSettingsFailed");
      setConfigError(message);
      setConfigPhase("error");
      push(message, "fail");
      setConfigShake((n) => n + 1);
      return;
    }
    const base = latest.settings;
    const patch: Partial<Settings> =
      configSource === "offsite"
        ? { configOffsite: settings.configOffsite }
        : { configPath: settings.configPath };
    const updated: Settings = { ...base, ...patch };
    try {
      const saveRes = await putSettings(updated);
      if (!saveRes.ok) {
        const message = saveRes.error ?? t("settings.error");
        setConfigError(message);
        setConfigPhase("error");
        push(message, "fail");
        setConfigShake((n) => n + 1);
        return;
      }
      setSettings((prev) => (prev ? { ...prev, ...patch } : updated));
      const res = await restoreConfig("latest", configSource === "offsite" ? "offsite" : undefined);
      if (!res.ok) {
        // e.g. an APP_KEY / encryption mismatch — show the mapped remedy.
        const message = isKeyMismatch(res.error) ? t("recovery.appKeyRemedy") : res.error ?? t("settings.error");
        setConfigError(message);
        setConfigPhase("error");
        push(message, "fail");
        setConfigShake((n) => n + 1);
        return;
      }
      if (!res.staged) {
        // Contract drift guard: ok:true but the snapshot was NOT staged — don't drive
        // the restart/reload flow (nothing would be applied). Surface it as an error.
        const message = res.error ?? t("settings.error");
        setConfigError(message);
        setConfigPhase("error");
        push(message, "fail");
        setConfigShake((n) => n + 1);
        return;
      }
      if (res.autoRestart) {
        // BombVault is restarting itself to apply the staged restore. Poll the
        // health endpoint until it answers again, then reload so the restored
        // paths / off-site / creds populate this page (and the steps below).
        setConfigPhase("restarting");
        const back = await waitForAppBack();
        if (back) {
          window.location.reload();
        } else {
          // Poll window elapsed — the restore is already applied on boot, so let
          // the user reload manually once BombVault is back.
          setConfigPhase("reload");
        }
      } else {
        // Docker socket unreachable: the restore is staged + persisted, but the
        // user must restart the container themselves to apply it.
        setConfigPhase("manual");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("settings.error");
      setConfigError(message);
      setConfigPhase("error");
      push(message, "fail");
      setConfigShake((n) => n + 1);
    }
  }, [settings, configSource, t, push]);

  const configStepState: StepState =
    configPhase === "error"
      ? "bad"
      : configPhase === "manual" || configPhase === "reload"
        ? "warn"
        : "idle";

  // Step 3 — discover everything. Runs discoverAll(), then re-fetches the target
  // lists (kept for the later review/restore step).
  //
  // GlimStone follow-up pass (v8.0.0) audit note: `discovered`/`discoverError`
  // below are DELIBERATELY left as inline status, not migrated to a toast —
  // unlike Containers.tsx/VMs.tsx's own discoverMsg (which WAS migrated),
  // these counts, the error and the skip flag all feed `discoverStepState`
  // (this StepCard's own ok/warn pill) AND are read by Step 5 below to decide
  // what's about to be restored.
  // It's reference content the wizard's later steps depend on, not a one-shot
  // ping — the same "what did the last check say" reasoning as
  // IntegrityCard's persisted results.
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<{
    containers: number;
    vms: number;
    files: number;
    skipped: string[];
    skippedNeedsAction: boolean;
  } | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  // Reconstructed target lists — populated by Discover, read by the review step.
  const [containers, setContainers] = useState<Container[]>([]);
  const [vms, setVMs] = useState<VM[]>([]);
  const [fileSets, setFileSets] = useState<FileSetView[]>([]);

  const runDiscover = useCallback(async () => {
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const counts = await discoverAll();
      // A discover that returned {ok:false} (e.g. a wrong APP_KEY) surfaces its
      // real message here — show it instead of the misleading "found none" state.
      //
      // The counts and the skip list are kept EITHER WAY. A pass searches the
      // named repositories before the domain's own, so when the domain's own is
      // what failed, whatever was found is real and already written back. On the
      // screen somebody opens after losing their configuration, "could not open
      // the domain repository" and "…and nothing was recovered" are two different
      // answers, and only one of them is true.
      if (counts.error) {
        setDiscoverError(
          isKeyMismatch(counts.error) ? t("recovery.appKeyRemedy") : counts.error
        );
      }
      // Re-fetch the reconstructed target lists and store them for the restore step.
      const [cs, vs, fs] = await Promise.all([listContainers(), listVMs(), listFileSets()]);
      setContainers(cs.containers ?? []);
      setVMs(vs.vms ?? []);
      setFileSets(fs.ok ? fs.fileSets ?? [] : []);
      setDiscovered(counts);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : String(err));
      setDiscovered(null);
    } finally {
      setDiscovering(false);
    }
  }, [t]);

  // The pill answers for the WHOLE pass, not only for its count. A partial
  // discover now keeps what it found and carries the error alongside it, so
  // "four containers rebuilt" and "the domain repository could not be opened"
  // are both true at once - and the summary dot said ok while the red error box
  // and the skip line sat underneath it in the same card. checkReadable was
  // given exactly this rule 250 lines up; this is the other half of it.
  const discoverStepState: StepState = discovered
    ? discoverError || discovered.skippedNeedsAction
      ? "warn"
      : discovered.containers + discovered.vms + discovered.files > 0
        ? "ok"
        : "warn"
    : "idle";

  // Step 4 — review & restore all. anyActive() over the shared progress store is
  // the v4 "something is in flight" signal: it gates "Restore all" (and each
  // row) so a bulk run can't collide with a live per-item op, and vice-versa.
  const progressMap = useProgress();
  const running = anyActive(progressMap);
  const [restoreAllBusy, setRestoreAllBusy] = useState(false);
  // GlimStone follow-up pass (v8.0.0) audit note: DELIBERATELY left as inline
  // status, not migrated to a toast — unlike Containers.tsx/VMs.tsx's own
  // bulk-action result (which WAS migrated, see runBulk there), this count
  // ALSO drives `restoreStepState` below (this StepCard's own ok/warn pill),
  // and a disaster-recovery restore's ok/fail counts are exactly what a user
  // needs to keep reading and act on (which rows below need a retry), not a
  // 4s ping to glance at and lose. Same reasoning as IntegrityCard's results.
  const [restoreAllResult, setRestoreAllResult] = useState<{ ok: number; fail: number } | null>(null);

  // Recovery-kit download refusal (e.g. the 403 "set a login password" fail-closed
  // answer when auth is off) — surfaced next to the Step 6 download button.
  const [kitError, setKitError] = useState<string | null>(null);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a failed
  // action toasts AND shakes its button, layered ON TOP of this button's own
  // pre-existing sticky inline error above (kept — same "reference-value error
  // kept inline" pattern as VMExportButton/ExportButton, both of which layer
  // the same fail toast + button shake on top of their own sticky inline msg).
  const [kitShake, setKitShake] = useState(0);

  // Is the libvirt SSH link set up? VM restore needs it. VMSSHInfo() errors
  // (ok:false) precisely when SSH is not wired, so this is the settings check.
  // Advisory only (a note, never a hard block).
  const [vmSshConfigured, setVmSshConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    getVMSSH()
      .then((r) => setVmSshConfigured(r.ok && !!r.host))
      .catch(() => setVmSshConfigured(false));
  }, []);

  // Restore every discovered container THEN every VM, SEQUENTIALLY and LEFT
  // STOPPED — exactly the Containers.tsx restoreSelected pattern: fireAndWaitRun
  // fires one restore and waits for its NEW recorded run to reach a terminal
  // state before the next, so the shared single-flight guard never rejects the
  // follow-ups as "already running". Accumulate an ok/fail count.
  const restoreAll = useCallback(async () => {
    if (restoreAllBusy) return;
    if (containers.length === 0 && vms.length === 0) return;
    if (!(await confirm(t("containers.restoreSelectedConfirm")))) return;
    setRestoreAllBusy(true);
    setRestoreAllResult(null);
    let ok = 0;
    let fail = 0;
    // try/finally so a throw mid-loop can never strand the busy flag (which would
    // leave "Restore all" and every row permanently disabled).
    try {
      for (const c of containers) {
        const res = await fireAndWaitRun({
          kind: "restore",
          matchRun: (r) => r.domain === "container" && r.target === c.name,
          start: () => restore(c.name, "latest", true, undefined, true),
          t,
        });
        if (res.ok) ok++;
        else fail++;
      }
      for (const v of vms) {
        // libvirtName, not name: on TrueNAS `name` is the display-only
        // friendly name, and both the recorded run's target and virsh itself
        // only ever know the VM by its raw libvirt name.
        const res = await fireAndWaitRun({
          kind: "restore",
          matchRun: (r) => r.domain === "vm" && r.target === v.libvirtName,
          start: () => restoreVM(v.libvirtName, "latest", true, undefined, true),
          t,
        });
        if (res.ok) ok++;
        else fail++;
      }
      setRestoreAllResult({ ok, fail });
    } finally {
      setRestoreAllBusy(false);
    }
  }, [restoreAllBusy, containers, vms, t, confirm]);

  const anyDiscovered = containers.length > 0 || vms.length > 0 || fileSets.length > 0;
  const restoreStepState: StepState = restoreAllResult
    ? restoreAllResult.fail > 0
      ? "warn"
      : "ok"
    : "idle";
  // Rows are blocked while ANY op runs OR while the bulk loop is mid-flight
  // (between two items the SSE store can briefly show nothing active).
  const rowOtherActive = running.active || restoreAllBusy;

  // hueSeq/nextHue — same mechanism as Settings.tsx's own counter (see that
  // file's comment for the full history and jdp's standing rule, "Es soll
  // immer alles in die Farb- und Formengine integriert werden!! IMMER!!").
  // Recovery has no tabs, so this is one flat, page-wide sequence: every
  // StepCard/CloudCard/RcloneCard heading notch below takes
  // `hueIndex={nextHue()}` in exactly the order the JSX evaluates each call,
  // so a branch that isn't currently rendering (e.g. Step 3's own
  // settings-not-loaded-yet fallback) never leaves a gap in the visible
  // rainbow sequence. ForeignRestoreCard gets the counter FUNCTION itself
  // (not one computed value) so its own three headings continue this same
  // sequence rather than restarting at 0.
  let hueSeq = 0;
  const nextHue = () => hueSeq++;

  return (
    // PAGE_SHELL (jdp live-review, "Können wir die nicht überall gleich breit
    // machen?"): the gap here was already the correct 40px from the earlier
    // "Bitte machen wie sonst überall" round, which also dropped this page's
    // stray `p-1`. What that round did NOT give it is a max-width — this
    // wrapper had none at all, so its Cards were simply as wide as the window
    // let them be: 1633px at a 1920px viewport, the widest surface in the app
    // and 865px wider than Flash. That was a missing constraint rather than a
    // deliberate full-bleed choice, so it takes the shared 1152px cap like
    // every other page. Verified live: nothing on this page clips, reflows or
    // overflows at 1152px. See lib/pageShell.ts for the table.
    <div className={PAGE_SHELL}>
      <div>
        {/* The page's <h1> + subtitle pair, kept as-is: every page in this app
            renders a plain `<p>` subtitle under its own heading (Config's
            config.subtitle, Fleet's, Receiver's, Dashboard's), so this one is
            the page's own standing description, not a per-control
            explanation the "Infotexte in i Infobubbles" round is about. Folding
            it into a bubble would make Recovery the one page whose heading
            reads differently from all the others. */}
        {/* The sidebar's own word, not a second one ([325], jdp: "Überschrift
            soll statt Notfall-Wiederherstellung nur Wiederherstellung sein").
            `recovery.pageTitle` carried a "disaster" qualifier the nav entry
            never had, so the rail said one thing and the page another. Reusing
            `nav.recovery` instead of retranslating a title in 42 locales also
            means the two can never drift apart again — pageTitle is deleted, so
            there is no second string left to disagree with this one. */}
        {/* The house heading, byte-identical to every other page: text-2xl for
            the title and text-carbon-textSub for the sentence under it. This one
            sat on text-lg with the dimmer textMuted, so the tab with the most
            frightening job in the app had the quietest heading in it. max-w-2xl
            stays - it only limits the line length of a longer sentence, and
            nothing about the size. */}
        <h1 className="text-2xl font-semibold text-carbon-text">{t("recovery.pageTitle")}</h1>
        <p className="mt-1 text-sm text-carbon-textSub max-w-2xl">{t("recovery.intro")}</p>
      </div>

      {/* ---------------------------------------------------------------------------
          D-01 double gate, desktop half: this wrapper is ALWAYS rendered and only
          hidden below md by CSS, so there is still exactly ONE component instance
          and every existing effect (the mount-time getSettings + encryption
          detect, the getVMSSH probe) keeps firing identically. The page-flat
          hueSeq counter above assigns rainbow positions in JSX EVALUATION ORDER,
          so this half keeps its exact element order: nothing inside the wrapper
          was reordered, conditioned or re-rendered — the wrapper div itself is
          the only structural addition. Review byte-identity with `git diff -w`:
          the +2 re-indent inside this wrapper is whitespace-only by construction.
      --------------------------------------------------------------------------- */}
      <div className="max-md:hidden">
        {/* Step 1 — Can BombVault read your backups? (repo-readable / APP_KEY)
            jdp live-review ("Info-Texte in i Infobubbles"): the permanent
            appKeyExplain <p> is now the heading badge's own (i), same treatment
            Flash.tsx/Config.tsx/Settings.tsx's Cards already give theirs. */}
        <StepCard n={1} title={t("recovery.step1")} hint={t("recovery.appKeyExplain")} state={readableState} hueIndex={nextHue()}>
          <div className="flex items-center gap-3">
            {/* jdp live-review: "Card 1: Button 'Erneut prüfen' soll nur 'Prüfen'
                heissen." `recovery.recheck` was shortened IN PLACE (its value, in
                all 42 locales) rather than swapped for another key — it has
                exactly ONE call site in the whole app, this one, so nothing else
                could break, and the two near-matches that exist (`integrity.verify`
                = "Verify"/"Prüfen", the restic-check card's own button;
                `spike.checkNow` = "Check now") both belong to other domains and
                would couple this button's wording to theirs. Its KEY still reads
                `recheck` because that name is what the plan doc and the two
                remedy strings below ("…then re-check" / "…und prüfe erneut", which
                are prose about repeating the action, not this label) refer to;
                the button's own wording is the value, and the value is now plain.
                Do not re-lengthen it. */}
            <Button
              label={t("recovery.recheck")}
              labelKey="recovery.recheck"
              tone="accent"
              onClick={() => void checkReadable()}
              disabled={checking}
              busy={checking}
              title={checking ? t("dashboard.checking") : undefined}
            />

            {readableState === "ok" && (
              <span className="text-sm text-statusOk">{t("recovery.readable")}</span>
            )}
            {readableState === "warn" && (
              <span className="text-sm text-statusWarn">{t("recovery.notReachable")}</span>
            )}
          </div>

          {/* Which folders were read (#196). Shown whenever the check has run, not
              only on failure: on a green result it confirms the right place, and
              on an empty one it turns "my backups are gone" into "it looked
              somewhere else". Deliberately the raw paths, because the next thing
              a stuck user does is compare them with what they typed. */}
          {readSources.length > 0 && readableState !== "idle" && (
            <p className="text-xs text-carbon-textMuted leading-relaxed wrap-break-word">
              {t("recovery.readFrom")}{" "}
              <span className="font-mono">{readSources.join(", ")}</span>
            </p>
          )}

          {/* …and the repositories that were deliberately left out, at every pill
              colour. This one is not a fault, so it neither turns the pill amber
              nor rides on lastError (which only renders in the warn state): it is
              simply a true thing the person rebuilding an instance should know,
              because a repository switched off is a repository that was not
              searched. */}
          {readNote && (
            <p dir="ltr" className="text-xs text-carbon-textMuted break-words text-start">{readNote}</p>
          )}

          {/* Exact remedy when the key doesn't match the repo. */}
          {readableState === "bad" && (
            <div className="rounded-card bg-statusFailBgSoft px-3 py-2.5 text-xs text-statusFail leading-relaxed">
              {t("recovery.appKeyRemedy")}
            </div>
          )}

          {/* The raw (scrubbed) backend message for a warn/other error, as a hint. */}
          {readableState === "warn" && lastError && (
            <p dir="ltr" className="text-xs text-carbon-textMuted font-mono break-all text-start">{lastError}</p>
          )}
        </StepCard>

        {/* Step 2 — Restore BombVault's OWN settings first (optional, pre-attach).
            On a rebuilt box this pre-fills the attach + discover steps below; it
            ends with a self-restart, so it lives here rather than on the Config
            page. Skippable — a user without a settings backup attaches manually. */}
        {/* jdp live-review ("Info-Texte in i Infobubbles"): configHint and
            configAppKeyReminder were two stacked permanent <p>s — one bubble on
            the heading now carries both. They are one explanation split across
            two sentences (what this step does, and the precondition it needs),
            not two separate topics, so a second bubble on the same heading would
            just be two (i) glyphs a reader has to hover in turn.
            `recovery.configSkipped` below is NOT folded in: it is what the card
            says once the step has been skipped — a state readout, and the card's
            only content in that state. */}
        <StepCard
          n={2}
          title={t("recovery.stepConfig")}
          hint={`${t("recovery.configHint")} ${t("recovery.configAppKeyReminder")}`}
          state={configStepState}
          hueIndex={nextHue()}
        >
          {configSkipped ? (
            <p className="text-sm text-carbon-textMuted">{t("recovery.configSkipped")}</p>
          ) : (
            <>
              {settings ? (
                <>
                  {/* Where the config backup lives: a local path or an off-site URL. */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-carbon-textMuted">{t("recovery.configSourceLabel")}</span>
                    <SourceToggle
                      source={configSource}
                      onChange={setConfigSource}
                      disabled={configPhase === "saving" || configPhase === "restarting"}
                    />
                  </div>

                  {configSource === "local" ? (
                    <FolderBrowser
                      label={t("recovery.configLocalPath")}
                      value={settings.configPath}
                      hostMountRoot={hostMountRoot}
                      onChange={(v) => setSettings((prev) => (prev ? { ...prev, configPath: v } : prev))}
                    />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-carbon-textSub">{t("recovery.configOffsiteUrl")}</label>
                      <input
                        value={settings.configOffsite}
                        spellCheck={false}
                        onChange={(e) =>
                          setSettings((prev) => (prev ? { ...prev, configOffsite: e.target.value } : prev))
                        }
                        placeholder="rest:http://host:8000/repo"
                        dir="ltr"
                        className={`${offsiteInput} text-start`}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button
                      label={t("recovery.configSkip")}
                      labelKey="recovery.configSkip"
                      tone="neutral"
                      onClick={() => setConfigSkipped(true)}
                      disabled={configPhase === "saving" || configPhase === "restarting"}
                    />
                    {/* jdp live-review: "Card 2: Button 'BV Einstellungen
                        wiederherstellen' soll nur 'Wiederherstellen' heissen."
                        Safe because this card's OWN heading already names the
                        object — verified live on the deployed page before
                        shortening, not assumed: the step-2 notch reads
                        "BombVaults eigene Einstellungen wiederherstellen"
                        (`recovery.stepConfig`) and sits directly above this
                        button, so "Wiederherstellen" is never read in isolation.
                        Shortened IN PLACE like step 1's, and for the same reason:
                        `recovery.configRestore` has exactly one call site. Its new
                        value in each locale is that locale's OWN existing
                        `snapshots.restore` string, verbatim, so all 42 use the
                        wording the app already ships for this verb rather than a
                        fresh translation of it. */}
                    {/* GlimStone 1.14.0 (buttonOrder.test.ts): the control that
                        moves forward sits LAST in the source, so the pair
                        mirrors with the page under RTL. This pair arrived the
                        other way round and the guard caught it on the resync. */}
                    <Button
                      key={configShake}
                      label={t("recovery.configRestore")}
                      labelKey="recovery.configRestore"
                      tone="accent"
                      onClick={() => void restoreOwnConfig()}
                      disabled={configPhase === "saving" || configPhase === "restarting"}
                      busy={(configPhase === "saving" || configPhase === "restarting")}
                      title={(configPhase === "saving" || configPhase === "restarting") ? t("recovery.configRestoring") : undefined}
                      className={configShake ? "glim-shake" : ""}
                    />
                  </div>

                  {/* Restarting — optimistic; waitForAppBack() reloads on return. The
                      manual reload is offered right away too: if BombVault comes back
                      faster than the poll's down-detection window, the user isn't stuck
                      watching the spinner and can reload the moment the app is up. */}
                  {configPhase === "restarting" && (
                    <div className="flex flex-col gap-1">
                      {/* Task 7: was text-statusInfo (the old fifth hue) — genuine
                          activity (the app really is restarting right now), a
                          single occurrence on this page, so plain accent-derived
                          text is safe (no competing solid-accent elements at
                          once). text-accentText, not the flat text-accent: a
                          spec-compliance review measured the flat accent gold
                          at 1.61:1 in light theme here (7.79:1 as
                          text-statusInfo #0043ce before this task) — badly under the
                          4.5:1 text minimum. See index.css's --accent-text
                          comment for the fix and the measured numbers. */}
                      <p className="text-sm text-accentText">{t("recovery.configRestarting")}</p>
                      {/* Task 5 (rule 13): same shape as ItemScheduleOverride's
                          converted button — a plain underlined text link. */}
                      <Badge as="button" onClick={() => window.location.reload()} tone="neutral" size="small" className="self-start">
                        {t("recovery.configReload")}
                      </Badge>
                    </div>
                  )}
                  {/* Manual restart needed (Docker socket unreachable). */}
                  {configPhase === "manual" && (
                    <div className="rounded-card bg-statusWarnBg px-3 py-2.5 text-xs text-statusWarn leading-relaxed">
                      {t("recovery.configManualRestart")}
                    </div>
                  )}
                  {/* Auto-restart poll timed out — offer a manual reload. */}
                  {configPhase === "reload" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-statusWarn">{t("recovery.configReloadWhenBack")}</span>
                      <Button
                        label={t("recovery.configReload")}
                        labelKey="recovery.configReload"
                        tone="neutral"
                        onClick={() => window.location.reload()}
                      />
                    </div>
                  )}
                  {configPhase === "error" && configError && (
                    <div className="rounded-card bg-statusFailBgSoft px-3 py-2.5 text-xs text-statusFail leading-relaxed wrap-break-word">
                      {configError}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-carbon-textMuted">{t("dashboard.checking")}</p>
              )}
            </>
          )}
        </StepCard>

        {/* Step 3 — Attach your backups (consolidated; cloud creds un-gated here) */}
        {/* jdp live-review ("Info-Texte in i Infobubbles"): attachHint (a
            permanent <p> at the top of the card) and credsSaveHint (another one
            buried between the credential cards and the Connect button) are both
            "how this step works" prose with no live value in them, so both fold
            into the heading's own (i) — same single-bubble reasoning as Step 2
            above. */}
        <StepCard
          n={3}
          title={t("recovery.step2")}
          hint={`${t("recovery.attachHint")} ${t("recovery.credsSaveHint")}`}
          state={previewed ? readableState : "idle"}
          hueIndex={nextHue()}
        >
          {settings ? (
            <>
              {/* Encryption mode, FIRST in the card (jdp: "Card 3: kannst du den
                  Passwort-Toggle ganz nach oben in der Card verschieben?").
                    Top placement is also what the block now earns: it stopped
                  being a field the user fills in and became this step's own
                  outcome line — "here is what your backups actually are". On
                  load it reads unconfigured/absent, and the moment "Connect &
                  preview" persists the paths below it turns into the detected
                  verdict. See EncryptionStatus for why a control still appears
                  in the undecidable cases and never in the detected ones. */}
              <EncryptionStatus
                t={t}
                detection={encDetection}
                detecting={encDetecting}
                encryptionEnabled={settings.encryptionEnabled}
                onOverride={(v) =>
                  setSettings((prev) => (prev ? { ...prev, encryptionEnabled: v } : prev))
                }
              />

              {/* Local backup paths (relative to the host mount). */}
              <FolderBrowser
                label={t("settings.containersPath")}
                value={settings.containersPath}
                hostMountRoot={hostMountRoot}
                onChange={(v) => setSettings((prev) => (prev ? { ...prev, containersPath: v } : prev))}
              />
              <FolderBrowser
                label={t("settings.vmsPath")}
                value={settings.vmsPath}
                hostMountRoot={hostMountRoot}
                onChange={(v) => setSettings((prev) => (prev ? { ...prev, vmsPath: v } : prev))}
              />
              <FolderBrowser
                label={t("settings.flashPath")}
                value={settings.flashPath}
                hostMountRoot={hostMountRoot}
                onChange={(v) => setSettings((prev) => (prev ? { ...prev, flashPath: v } : prev))}
              />
              <FolderBrowser
                label={t("settings.filesPath")}
                value={settings.filesPath}
                hostMountRoot={hostMountRoot}
                onChange={(v) => setSettings((prev) => (prev ? { ...prev, filesPath: v } : prev))}
              />

              {/* Off-site repo URLs (rest / S3 / B2 / sftp / rclone) — the
                  SECOND disclosure (jdp: "Card 3: können wir den Offsite-
                  Abschnitt auch in einen ausklappbaren Button machen?"). Same
                  StepDisclosure component as the credentials one below, so the
                  two are siblings by construction rather than by resemblance —
                  see that component for the trigger's size, its colour-engine
                  wiring, and why BOTH now start closed.
                    The chip REPLACES the bare `settings.offsiteTitle` eyebrow
                  span this section used to carry: that string is now the chip's
                  own label, so the section is still named exactly as before and
                  the name isn't printed twice. Its tip is settings.offsiteHint,
                  the paragraph the Settings page already shows under the same
                  fields — no new i18n key for either.
                    `gap-2` rather than the default `gap-8`: this section reveals
                  plain labelled inputs, not notch-badged Cards, so there is no
                  notch poking up out of the first child that needs clearing. It
                  matches the step body's own gap-2 above and below, which is
                  what makes the revealed fields read as part of the step rather
                  than as a floating panel. */}
              <StepDisclosure
                label={t("settings.offsiteTitle")}
                tip={t("settings.offsiteHint")}
                gap="gap-2"
              >
                {([
                  ["containersOffsite", "nav.containers"],
                  ["vmsOffsite", "nav.vms"],
                  ["flashOffsite", "nav.flash"],
                  ["filesOffsite", "nav.files"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs text-carbon-textSub">{t(label)}</label>
                    <input
                      value={settings[key]}
                      spellCheck={false}
                      onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
                      placeholder="rest:http://host:8000/repo"
                      dir="ltr"
                      className={`${offsiteInput} text-start`}
                    />
                  </div>
                ))}
              </StepDisclosure>

              {/* The encryption ToggleRow used to sit HERE, between the off-site
                  disclosure and the credential cards. It moved to the TOP of this
                  card and became EncryptionStatus (jdp: "kannst du den
                  Passwort-Toggle ganz nach oben in der Card verschieben? Wieso
                  brauchen wir da ein Passwort-Toggle? ... Kann es das nicht
                  automatisch erkennen?"). It can: the mode is now probed off the
                  repositories themselves, so on the common path there is no
                  control here at all. See EncryptionStatus above.
                    The old spacing fix this position needed (jdp: "Der darunter
                  folgende Badge ist zu nah am Passworttoggle-Text") is gone with
                  it — nothing sits between the disclosure and the credential
                  cards anymore, so the notch-badge gap described below is now
                  measured against the off-site disclosure's own bottom edge. */}

              {/* Cloud + rclone credential cards — the exact Settings components,
                  self-persisting via setCloud/setRclone (no duplicate persistence)
                  — behind the SECOND of this step's two identical expanders,
                  because they are optional for most installs. See StepDisclosure
                  above for the whole "why a disclosure / why this trigger / why
                  both start closed" writeup, and CloudCredsDisclosure just below
                  it for why the two `nextHue()` calls stay HERE, at this exact
                  point in the JSX, instead of moving inside the collapsed branch
                  (a conditional nextHue() would renumber every heading below
                  step 3 whenever the section is closed).
                    SPACING (jdp: "Der darunter folgende Badge ist zu nah am
                  Passworttoggle-Text"): measured live before this change, the
                  CloudCard heading notch's top edge sat at y=1189 while the
                  toggle label's bottom sat at y=1190 — a NEGATIVE 1px gap, the
                  badge literally overlapping the text. The DOM gap looked fine
                  (8px, the step body's own gap-2) and that is exactly the trap:
                  a notch badge is centred ON its card's top edge, so it eats
                  half its own height (11px) out of whatever gap precedes it.
                  8 - 11 = -3. The disclosure wrapper adds `pt-3` on top of the
                  body gap, and its own `gap-8` sits between the chip and the
                  first card's edge, so both badge gaps land ~20px clear — see
                  that component. */}
              <CloudCredsDisclosure t={t} cloudHue={nextHue()} rcloneHue={nextHue()} />

              {/* Connect & preview — save paths/off-site/encryption, then re-check.
                  (The "credentials save via each card's own Save button" note that
                  used to sit here is now part of this step's heading bubble — see
                  the StepCard's own `hint` above.) */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  key={connectPreviewShake}
                  label={t("recovery.connectPreview")}
                  labelKey="recovery.connectPreview"
                  tone="accent"
                  onClick={() => void connectPreview()}
                  disabled={attachState === "saving"}
                  busy={attachState === "saving"}
                  className={connectPreviewShake ? "glim-shake" : ""}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-carbon-textMuted">{t("dashboard.checking")}</p>
          )}
        </StepCard>

        {/* Step 4 — Discover everything (rebuild targets from the backup defs) */}
        <StepCard n={4} title={t("recovery.step3")} state={discoverStepState} hueIndex={nextHue()}>
          <div className="flex items-center gap-3">
            <Button
              label={t("recovery.discover")}
              labelKey="recovery.discover"
              tone="accent"
              onClick={() => void runDiscover()}
              disabled={discovering}
              busy={discovering}
              title={discovering ? t("containers.discovering") : undefined}
            />

            {discovered && discovered.containers + discovered.vms + discovered.files > 0 && (
              <span className="text-sm text-statusOk">
                {t("recovery.foundCounts")
                  .replace("{c}", String(discovered.containers))
                  .replace("{v}", String(discovered.vms))}
                {discovered.files > 0 && (
                  <> {t("recovery.filesFound").replace("{f}", String(discovered.files))}</>
                )}
              </span>
            )}
          </div>

          {/* 0/0/0 — nothing found: point back to Step 1/2. */}
          {discovered && discovered.containers + discovered.vms + discovered.files === 0 && (
            <p className="text-sm text-statusWarn">{t("recovery.foundNone")}</p>
          )}
          {/* A repository the pass could not open. This is the screen somebody
              reaches after losing their /config, so "found none" has to be able to
              say "…and here is what was never looked at", otherwise an unmounted
              share reads exactly like an empty archive. */}
          {discovered && discovered.skipped.length > 0 && (
            <p className="text-sm text-statusWarn">
              {t("common.discoverSkipped").replace("{list}", discovered.skipped.join(", "))}
            </p>
          )}
          {discoverError && (
            <div className="rounded-card bg-statusFailBgSoft px-3 py-2.5 text-xs text-statusFail leading-relaxed wrap-break-word">
              {discoverError}
            </div>
          )}
        </StepCard>

        {/* Step 5 — Review & restore everything (in place, left stopped) */}
        <StepCard n={5} title={t("recovery.step4")} state={restoreStepState} hueIndex={nextHue()}>
          {!anyDiscovered ? (
            <p className="text-sm text-carbon-textMuted">{t("recovery.noneDiscovered")}</p>
          ) : (
            <>
              {/* Restore all — every container then VM, sequential + left stopped.
                  Shown ONLY when there are containers/VMs to bulk-restore: file
                  sets carry no original path, so they're restored per-row (below)
                  into a chosen folder and restoreAll() deliberately skips them. */}
              {(containers.length > 0 || vms.length > 0) && (
              /* jdp live-review: "Card 5: Der Wiederherstellen-Button der ganzen
                 Container soll ganz nach rechts." The button used to LEAD this
                 row, with the busy phrase and the ok/fail result trailing it.
                 Both readouts now come first and the button is pushed to the
                 row's far edge with `ms-auto` — this app's established
                 flush-right idiom for a control that shares its row with a
                 leading sibling (Containers.tsx's BackupButton/ExportButton
                 row; Flash.tsx's own comment spells out the same pair of
                 options and why `justify-end` is the one to use only when there
                 is nothing to push away from). `ms-auto`, not `ml-auto`: under
                 dir="rtl" the row's far edge is its left one, and the button
                 has to follow it.
                   It still lands flush right when NEITHER readout is present —
                 a lone flex child with `margin-inline-start: auto` absorbs all
                 the free space on its start side. Verified live in both states. */
              <div className="flex flex-wrap items-center gap-3">
                {running.active && !restoreAllBusy && (
                  <span className="text-xs text-carbon-textMuted">{t(busyPhraseKey(running.phase))}</span>
                )}
                {restoreAllResult && (
                  <span
                    className={`text-sm ${restoreAllResult.fail > 0 ? "text-statusWarn" : "text-statusOk"}`}
                  >
                    {t("recovery.restoreAllResult")
                      .replace("{ok}", String(restoreAllResult.ok))
                      .replace("{fail}", String(restoreAllResult.fail))}
                  </span>
                )}
                <Button
                  label={t("recovery.restoreAll")}
                  labelKey="recovery.restoreAll"
                  tone="accent"
                  onClick={() => void restoreAll()}
                  disabled={restoreAllBusy || running.active}
                  busy={restoreAllBusy}
                  className="ms-auto"
                />
              </div>
              )}

              {/* VM restore needs the libvirt SSH link — advisory note, not a block. */}
              {vms.length > 0 && vmSshConfigured === false && (
                <div className="rounded-card bg-statusWarnBg px-3 py-2.5 text-xs text-statusWarn leading-relaxed">
                  {t("recovery.vmSshNote")}
                </div>
              )}

              {/* Containers first, then VMs. */}
              {containers.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-carbon-textSub pt-1 pb-1">
                    {t("nav.containers")}
                  </span>
                  {containers.map((c) => (
                    <RestoreRow
                      key={`container:${c.name}`}
                      domain="container"
                      name={c.name}
                      lastBackup={c.lastBackup}
                      t={t}
                      otherActive={rowOtherActive}
                      hueIndex={nextHue()}
                    />
                  ))}
                </div>
              )}
              {vms.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-carbon-textSub pt-2 pb-1">
                    {t("nav.vms")}
                  </span>
                  {vms.map((v) => (
                    <RestoreRow
                      key={`vm:${v.libvirtName}`}
                      domain="vm"
                      name={v.libvirtName}
                      displayName={v.name}
                      lastBackup={v.lastBackup}
                      t={t}
                      otherActive={rowOtherActive}
                      hueIndex={nextHue()}
                    />
                  ))}
                </div>
              )}
              {/* File sets — restore into a chosen folder ("Restore all" covers
                  containers + VMs only; a rediscovered set has no original path,
                  so each row needs its own target folder). */}
              {fileSets.length > 0 && (
                <div className="flex flex-col">
                  {/* jdp live-review ("Info-Texte in i Infobubbles"): the
                      filesRestoreHint <p> under this group label explained why
                      each set needs its own target folder — permanent prose about
                      a group of controls, so it moves onto the group's own label
                      as the plain (neutral) InfoBubble, not the `onAccent` one:
                      this is a bare eyebrow label on the card surface, not a
                      solid-accent heading badge. */}
                  <span className="inline-flex items-center gap-1 self-start text-xs font-medium text-carbon-textSub pt-2 pb-1">
                    {t("nav.files")}
                    <InfoBubble tip={t("recovery.filesRestoreHint")} />
                  </span>
                  {fileSets.map((s) => (
                    <FileSetRecoveryRow
                      key={`files:${s.id}`}
                      set={s}
                      hostMountRoot={hostMountRoot}
                      t={t}
                      otherActive={rowOtherActive}
                      hueIndex={nextHue()}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </StepCard>

        {/* Step 6 — Your recovery kit (safety net for next time)
            jdp live-review ("Info-Texte in i Infobubbles"): kitHint was the
            card's whole body apart from the download button — now the heading's
            own (i). The `kitError` span below stays: it is the backend's own
            refusal text, shown only when a download is actually refused. */}
        <StepCard n={6} title={t("recovery.step5")} hint={t("recovery.kitHint")} state="idle" hueIndex={nextHue()}>
          <Button
            key={kitShake}
            label={t("recovery.kitDownload")}
            labelKey="recovery.kitDownload"
            // Accent ([326]). The kit is the one artefact this page exists to
            // hand over, and its card holds nothing else to do.
            tone="neutral"
            onClick={() => {
              setKitError(null);
              void downloadRecoveryKit().then((err) => {
                setKitError(err);
                if (err) {
                  push(err, "fail");
                  setKitShake((n) => n + 1);
                }
              });
            }}
            // Only the layout stays here ([326]). Surface, hover, radius,
            // padding, text size and colour all come from `tone` and `.glim-btn`
            // already, and restating them was not merely redundant: Tailwind
            // resolves two competing background utilities by their order in the
            // compiled stylesheet, not by the order they appear in the
            // attribute, so `` quietly beat the `bg-accent`
            // the tone had added. Measured on the deployed build: both classes
            // sat on the element and the wrong one was painting.
            className={`self-start${kitShake ? " glim-shake" : ""}`}
          />
          {kitError && (
            // Backend-provided error text shown verbatim BY DESIGN (e.g. the
            // fail-closed "set a login password" refusal when auth is off) —
            // the API answers English and is not translated client-side.
            <span className="text-xs text-statusFail wrap-break-word">✗ {kitError}</span>
          )}
        </StepCard>

        {/* Restore from ANOTHER BombVault repo (#61) — visually separate from the
            attach steps above; read-only session, nothing persisted. */}
        {/* DESKTOP-ONLY BY DECISION (08-01, research Open Question 1's recorded
            default): this card stays inside the max-md:hidden wrapper and is
            deliberately absent from the mobile step flow — it is a separate
            read-only-session card OUTSIDE the numbered wizard path, D-02 scopes
            the mobile flow to the stepper's own six steps, and SCRN-06/VERIFY
            never name it. Recorded as a known desktop-only surface in 08-UAT.md
            so the device session sees the decision, not a gap. */}
        <ForeignRestoreCard hostMountRoot={hostMountRoot} t={t} otherActive={rowOtherActive} nextHue={nextHue} />
      </div>

      {/* D-01 second gate — the mobile step flow, mounted ONLY under !isDesktop
          (not merely hidden) inside the same PAGE_SHELL root: one component
          instance, one set of shared state and handlers. Every step below fires
          the identical guarded handler the desktop StepCard fires
          (checkReadable / connectPreview / runDiscover / the kit download), so
          there is no second fire path (D-02) and no new API surface (D-12).

          HUE-COUNTER DISCIPLINE (contract, not advice): the page-flat `hueSeq`
          counter above assigns rainbow positions in desktop JSX EVALUATION
          ORDER — it is DESKTOP-ONLY by construction. This block calls NO
          nextHue() anywhere. Every accent here is a fixed semantic token (the
          position chip's accentSoft/accentText per 08-UI-SPEC reservation 12,
          status hues via Badge tones) and the one re-hosted hue-consuming
          component (CloudCredsDisclosure) takes fixed literal indices — the
          same 3/4 the desktop's evaluation order hands it. A stray nextHue()
          at this mount site would shift every desktop heading after it by one
          position whenever the viewport crossed 48rem — a desktop identity
          regression even though no desktop pixel moved.
          Recovery.mobile.dom.test.tsx asserts the desktop-first-8 sequence
          (card1=0, card2=1, card3=2, cloud=3, rclone=4, card4=5, card5=6,
          card6=7 on a fresh mount) still holds with this block present. */}
      {!isDesktop && (
        <MobileRecoveryFlow
          readableState={readableState}
          readSources={readSources}
          lastError={lastError}
          checking={checking}
          settings={settings}
          hostMountRoot={hostMountRoot}
          attachState={attachState}
          previewed={previewed}
          connectPreviewShake={connectPreviewShake}
          encDetection={encDetection}
          encDetecting={encDetecting}
          setSettings={setSettings}
          configStepState={configStepState}
          configSkipped={configSkipped}
          onConfigSkip={() => setConfigSkipped(true)}
          configSource={configSource}
          setConfigSource={setConfigSource}
          configPhase={configPhase}
          configError={configError}
          configShake={configShake}
          restoreOwnConfig={restoreOwnConfig}
          confirm={confirm}
          checkReadable={checkReadable}
          connectPreview={connectPreview}
          discovering={discovering}
          discovered={discovered}
          discoverError={discoverError}
          runDiscover={runDiscover}
          discoverStepState={discoverStepState}
          containers={containers}
          vms={vms}
          fileSets={fileSets}
          restoreAllResult={restoreAllResult}
          restoreStepState={restoreStepState}
          restoreAll={restoreAll}
          restoreAllBusy={restoreAllBusy}
          runningActivity={running}
          rowOtherActive={rowOtherActive}
          vmSshConfigured={vmSshConfigured}
          kitError={kitError}
          kitShake={kitShake}
          setKitError={setKitError}
          setKitShake={setKitShake}
        />
      )}
      {confirmDialog}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileRecoveryFlow — SCRN-06's mobile face of the guided restore (08-01
// tracer). Rendered ONLY under `!isDesktop` from Recovery's PAGE_SHELL root
// (the D-01 second gate; see the mount comment there). It owns NOTHING the
// desktop also owns: no shared state, no fetches, no api.ts calls of its own —
// every value and every handler below arrives as a prop from the one
// Recovery() instance, so a mobile tap fires the exact same guarded handler a
// desktop click does (D-02). The step position is the block's only local
// state, and it is pure presentation: Back/Continue move it while the shared
// state decides what may render (the gates below mirror the desktop
// disclosure order — 1 readable, 2 config (optional), 3 attached,
// 4 discovered, 5 restored, 6 kit; a Continue past an unmet gate cannot even
// render).
//
// WHY A FRAGMENT ROOT: StickyActionBar must be the LAST DIRECT child of the
// PAGE_SHELL column for its sticky-in-flow discipline (StickyActionBar.tsx's
// own doc) — a fragment keeps the bar a direct DOM child of that column while
// the step chrome above groups into one content div.
//
// WHY NO nextHue() HERE (see also the mount comment in Recovery's return): the
// page-flat counter is desktop-only by evaluation order. The one re-hosted
// hue-consuming component (CloudCredsDisclosure) takes FIXED literals —
// deliberately the same 3/4 the desktop's evaluation order hands it — so the
// mobile presentation colours identically without consuming from the counter.
// Recovery.mobile.dom.test.tsx asserts the desktop-first-8 hue sequence
// survives this component's existence.
//
// SCOPE: steps 1/3/4/6 are real (the 08-01 tracer); step 2 carries the FULL
// config-restore body as of Plan 02 — source picker, the D-03 chain narration,
// the confirm-gated restore row, the skip resolution and the configPhase
// narration states, all re-hosted from the desktop card (same state, same
// handler). Step 5 carries the FULL populated restore body as of Plan 03:
// the shared restoreAll handler behind its ConfirmSheet gate, the desktop
// row components re-hosted, per-target four-status Badges from the read-only
// runs feed, the optional checkDomain verify row, and the visibility-gated
// live progress + log section. The component's only fetches are READS (the
// runs poll and checkDomain) — every WRITE and every restore fire path stays
// in the handlers Recovery() owns (D-02).
// ---------------------------------------------------------------------------

// The flow's step count — the chip's {total}. Six steps, desktop order.
const MOBILE_STEP_TOTAL = 6;

// D-08/VERIFY-05 four-status rule: the mobile step header renders the
// desktop StepCard's StepState as a Badge with a TEXT label — never the bare
// color dot, never color alone. The labels reuse existing 42-table vocabulary
// (the phase's two-key i18n census allows no new status strings):
// spike.ok/spike.info/spike.fail are runDisplay.ts statusLabel's own buckets,
// and "idle" maps to fleet.mesh.status.pending because statusLabel's default
// bucket would render the run-level "Skipped" — dishonest for a step that has
// not run yet.
const MOBILE_STEP_BADGE: Record<StepState, { tone: BadgeTone; labelKey: TranslationKey }> = {
  idle: { tone: "neutral", labelKey: "fleet.mesh.status.pending" },
  ok: { tone: "ok", labelKey: "spike.ok" },
  warn: { tone: "warn", labelKey: "spike.info" },
  bad: { tone: "fail", labelKey: "spike.fail" },
};

// The desktop StepCard titles, verbatim (08-UI-SPEC Screen Contract). The
// desktop's own key numbering skips the config card (it was inserted into the
// wizard later), so the keys are NOT positional — this map is the mobile
// position -> existing key bridge, exactly the pairing the desktop cards use.
const MOBILE_STEP_TITLES: Record<number, TranslationKey> = {
  1: "recovery.step1",
  2: "recovery.stepConfig",
  3: "recovery.step2",
  4: "recovery.step3",
  5: "recovery.step4",
  6: "recovery.step5",
};

// ---------------------------------------------------------------------------
// Step 5's populated body (Plan 03) — the shared machinery below is COPIED,
// never imported from a frozen or half-frozen source, per the D-12 rule that
// mapping helpers live in the CONSUMER (the RunDetailSheet twins are the
// recorded origin of each copy and are named at every site).
// ---------------------------------------------------------------------------

/** Locally-copied mapping #1: a run's domain -> the shared-SSE progress key
 *  the backend publishes that run under ("container:<name>" / "vm:<name>" /
 *  "files:<name>"; flash and config are singletons). Byte-equivalent copy of
 *  RunDetailSheet's progressKeyFor (RunDetailSheet.tsx:120-135) — progress.ts
 *  and its consumers' helpers are frozen surfaces, so the copy lives HERE
 *  (D-12; why-copy recorded at the plan's key_links). */
function restoreProgressKeyFor(run: Run): string | null {
  switch (run.domain) {
    case "container":
    case "vm":
    case "files":
      // target = the name the SSE key publishes under; targetId is the row id
      // and matches no published key (the twin's own hard-won comment).
      return `${run.domain}:${run.target}`;
    case "flash":
      return "flash";
    case "config":
      return "config";
    default:
      return null;
  }
}

/** Locally-copied mapping #2: a run's domain -> the checkDomain() union, or
 *  null when the domain has no verify endpoint. Copy of RunDetailSheet's
 *  verifyDomainFor (RunDetailSheet.tsx:140-153); same D-12 why-copy. */
function restoreVerifyDomainFor(domain: string): "containers" | "vms" | "flash" | "files" | null {
  switch (domain) {
    case "container":
      return "containers";
    case "vm":
      return "vms";
    case "flash":
      return "flash";
    case "files":
      return "files";
    default:
      return null;
  }
}

/** The checkDomain union -> the nav label that names it in the verify
 *  results (existing 42-table vocabulary only; flash is carried for
 *  completeness even though this step never discovers a flash target). */
const VERIFY_DOMAIN_LABEL: Record<string, TranslationKey> = {
  containers: "nav.containers",
  vms: "nav.vms",
  flash: "nav.flash",
  files: "nav.files",
};

/** The newest restore-kind run per (domain, target) key, OLDEST-first — the
 *  per-target four-status Badge feed. Pure: same runs in, same list out. */
function latestRestoreByTarget(runs: Run[]): [string, Run][] {
  const by = new Map<string, Run>();
  for (const r of runs) {
    const k = `${r.domain}:${r.target}`;
    const prev = by.get(k);
    if (!prev || r.startedAt > prev.startedAt) by.set(k, r);
  }
  return [...by.entries()].sort((a, b) => a[1].startedAt - b[1].startedAt);
}

// The mobile log's live-tick cadence — RunDetailSheet's LIVE_TICK_MS value
// (its own comment pins the why: the ActivityLog live tail's visible rate).
const MOBILE_LOG_TICK_MS = 1000;
// The step's read-only runs poll cadence — useBackupWatch's POLL_INTERVAL_MS
// value, so the step's outcome lookup paces exactly like the watcher the
// desktop rows ride.
const MOBILE_RUNS_POLL_MS = 2000;

/** Resolves a translation key (+ optional {placeholder} params) — the only
 *  i18n dependency buildLogLines takes. Copy of RunDetailSheet's makeResolver
 *  (RunDetailSheet.tsx:165-173, itself ActivityLog.tsx's closure): keeping the
 *  merge/dedupe/order logic pure and identical between surfaces. */
function mobileLogResolver(t: ReturnType<typeof useT>["t"]): ResolveName {
  return (key, params) => {
    let s = t(key as TranslationKey);
    if (params) {
      for (const [name, value] of Object.entries(params)) s = s.split(`{${name}}`).join(value);
    }
    return s;
  };
}

/** The ActivityLog.tsx:385-390 mono line rendering, copied CLASS-FOR-CLASS
 *  from RunDetailSheet's LogList (RunDetailSheet.tsx:179-197) — LogList is
 *  the ONLY log style; a second style is the documented anti-pattern. */
function MobileLogList({ lines }: { lines: LogLine[] }) {
  const { t } = useT();
  if (lines.length === 0) return null;
  return (
    <div className="rounded-card bg-black/20 font-mono text-xs leading-relaxed px-4 py-2 flex flex-col gap-0.5">
      {lines.map((l) => (
        <div key={l.id} className="flex items-start gap-2">
          <span className="text-carbon-textMuted shrink-0 tabular-nums">
            {formatLogDate(l.atMs)} {formatClockTime(l.atMs / 1000, true)}
          </span>
          <span className={`shrink-0 w-4 text-center ${colorFor(l.status)}`} aria-label={t(glyphLabelKey(l.status))}>
            {glyphFor(l.status)}
          </span>
          <span className={`flex-1 min-w-0 wrap-break-word ${colorFor(l.status)}`}>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/** The IN-FLIGHT half of step 5's progress + log section — the ONLY place
 *  this flow subscribes to the shared progress singleton. Mounting is the
 *  subscription: MobileRecoveryFlow renders this conditionally on
 *  useVisibilityGate() (`{visible && ...}`, the RunDetailSheet LiveRunSection
 *  contract, RunDetailSheet.tsx:205-238), so hiding the page unmounts it and
 *  the frozen singleton's ref-count drops the shared EventSource. Adapts the
 *  twin's ONE-run shape to the step's TARGETS-shaped input: the active entry
 *  is whichever of OUR in-flight runs' keys the copied progress mapping
 *  resolves against a live, active progress entry. */
function MobileRestoreLiveSection({ runs }: { runs: Run[] }) {
  const { t } = useT();
  const progressMap = useProgress();
  // buildLogLines reads `now` for the live line's elapsed-duration text; tick
  // at the ActivityLog live cadence while mounted.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MOBILE_LOG_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const resolveName = mobileLogResolver(t);
  const lines = buildLogLines(runs, progressMap, [], resolveName, now, now).filter((l) => !l.idle);

  // Which in-flight run is actually moving (there is at most one — restoreAll
  // is sequential and the rows single-flight): first of ours whose copied
  // progress key has a live active entry. Drives the bar and the cancel row.
  const activeRun = runs.find(
    (r) => r.status === "running" && (() => {
      const k = restoreProgressKeyFor(r);
      return k !== null && (progressMap[k]?.active ?? false);
    })(),
  );
  const activeKey = activeRun ? restoreProgressKeyFor(activeRun) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Inline (in-flow) variant, the twin's reasoning verbatim: the default
          ProgressBar pins to a positioned card's bottom edge; indeterminate
          until the first SSE frame carries a percent. */}
      {activeKey && (
        <ProgressBar
          percent={progressMap[activeKey]?.percent ?? 0}
          active={progressMap[activeKey]?.active ?? false}
          inline
        />
      )}
      {/* Cancel rides RestoreCancelButton against the EXACT progress key the
          backend registered the in-flight restore under; inPlace = the hard
          warning (these restores write original locations). A cancel records a
          "cancelled" run — the NEUTRAL terminal the Badge below renders. */}
      {activeKey && activeRun && (
        <RestoreCancelButton cancelKey={activeKey} inPlace name={activeRun.target} t={t} />
      )}
      <MobileLogList lines={lines} />
    </div>
  );
}

/** The TERMINAL half: finished (failed/cancelled) restore runs render their
 *  history lines from the same builder with an empty progress map — the
 *  RunDetailSheet HistoryLogSection shape (RunDetailSheet.tsx:243-250). */
function MobileRestoreHistoryLog({ runs }: { runs: Run[] }) {
  const { t } = useT();
  const resolveName = mobileLogResolver(t);
  const lines = buildLogLines(runs, {}, [], resolveName, Date.now()).filter((l) => !l.idle);
  return <MobileLogList lines={lines} />;
}

function MobileRecoveryFlow({
  readableState,
  readSources,
  lastError,
  checking,
  settings,
  hostMountRoot,
  attachState,
  previewed,
  connectPreviewShake,
  encDetection,
  encDetecting,
  setSettings,
  configStepState,
  configSkipped,
  onConfigSkip,
  configSource,
  setConfigSource,
  configPhase,
  configError,
  configShake,
  restoreOwnConfig,
  confirm,
  checkReadable,
  connectPreview,
  discovering,
  discovered,
  discoverError,
  runDiscover,
  discoverStepState,
  containers,
  vms,
  fileSets,
  restoreAllResult,
  restoreStepState,
  restoreAll,
  restoreAllBusy,
  runningActivity,
  rowOtherActive,
  vmSshConfigured,
  kitError,
  kitShake,
  setKitError,
  setKitShake,
}: {
  readableState: StepState;
  readSources: string[];
  lastError: string | null;
  checking: boolean;
  settings: Settings | null;
  hostMountRoot: string;
  attachState: "idle" | "saving";
  previewed: boolean;
  connectPreviewShake: number;
  encDetection: EncryptionDetection | null;
  encDetecting: boolean;
  setSettings: Dispatch<SetStateAction<Settings | null>>;
  configStepState: StepState;
  configSkipped: boolean;
  onConfigSkip: () => void;
  // Plan 02 (the config step body): the shared config-restore state, the ONE
  // settings-write handler (D-02 — no second fire path, Pitfall 6 — no direct
  // PUT), and the shared confirm() promise (below md it presents ConfirmSheet:
  // destructive control on top, safe cancel at the thumb-default bottom, D-03).
  // ConfigPhase is Recovery()'s function-local union, inlined here because
  // that type is not module-scope.
  configSource: RepoSource;
  setConfigSource: Dispatch<SetStateAction<RepoSource>>;
  configPhase: "idle" | "saving" | "restarting" | "manual" | "reload" | "error";
  configError: string | null;
  configShake: number;
  restoreOwnConfig: () => Promise<void>;
  confirm: (message: string) => Promise<boolean>;
  checkReadable: () => Promise<StepState>;
  connectPreview: () => Promise<void>;
  discovering: boolean;
  discovered: { containers: number; vms: number; files: number } | null;
  discoverError: string | null;
  runDiscover: () => Promise<void>;
  discoverStepState: StepState;
  containers: Container[];
  vms: VM[];
  fileSets: FileSetView[];
  restoreAllResult: { ok: number; fail: number } | null;
  restoreStepState: StepState;
  // Plan 03 (the populated restore body): the ONE restore-all fire path —
  // Recovery()'s own restoreAll useCallback, consumed VERBATIM. Its first
  // line awaits the shared confirm() promise (below md: ConfirmSheet,
  // destructive top / cancel thumb-default, D-03), then the sequential
  // fireAndWaitRun loop. The busy flag, the page-level "something is
  // running" derivation (anyActive over the shared progress store) and the
  // per-row block flag arrive pre-computed so this component never touches
  // the progress singleton outside the visibility-gated section below.
  restoreAll: () => Promise<void>;
  restoreAllBusy: boolean;
  runningActivity: { active: boolean; phase?: string };
  rowOtherActive: boolean;
  // The libvirt SSH probe's answer (null = unknown); only the advisory
  // VM note consumes it, never a gate.
  vmSshConfigured: boolean | null;
  kitError: string | null;
  kitShake: number;
  setKitError: Dispatch<SetStateAction<string | null>>;
  setKitShake: Dispatch<SetStateAction<number>>;
}) {
  const { t } = useT();
  const { push } = useToast();
  const navigate = useNavigate();
  // The step position is the flow's navigation state. Pure presentation —
  // every gate below reads the SHARED Recovery state, so Back never loses
  // completed step state and a gate that stops holding closes its own
  // Continue. (Step 5 adds its own PRESENTATION-ONLY local state: the
  // read-only runs feed, the verify row's busy/result state and the local
  // hue counter — none of it can fire a restore; the handlers remain the
  // desktop-owned ones.)
  const [step, setStep] = useState(1);

  // The gate chain, desktop disclosure order. gateTo(n) answers "may the flow
  // sit on step n" — a step's Continue renders only when it holds for
  // step n + 1.
  const gateTo = (n: number): boolean => {
    if (n <= 1) return true;
    // 1 readable: the check has produced AN answer (ok/warn/bad). warn is the
    // honest first-run "not attached yet" answer, so requiring "ok" would
    // strand every fresh install — the desktop never blocks on it either.
    if (n === 2) return readableState !== "idle";
    // 2 config: optional — always skippable, never gates the flow.
    if (n === 3) return true;
    // 3 attached: connectPreview ran (it stays true across re-attaches; a
    // re-attach also clears discovery, so step 4 re-gates itself).
    if (n === 4) return previewed;
    // 4 discovered: runDiscover completed (its error paths leave it null).
    if (n === 5) return discovered !== null;
    // 5 restored — OR nothing to restore: zero-target users must reach the
    // kit (08-UI-SPEC: they are never stranded on the restore step).
    if (n === 6) {
      return restoreAllResult !== null || (containers.length === 0 && vms.length === 0);
    }
    return false;
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));
  const anyDiscovered = containers.length > 0 || vms.length > 0 || fileSets.length > 0;

  // --- Step 5's read-only feeds (Plan 03) ------------------------------------
  // The step's ONLY fetch is a read: listRuns, polled while the step is on
  // screen AND the page is visible (the PRIM-04 gate — hiding pauses the
  // chain; the return refetches FIRST, reconciling a run that finished in the
  // background from the SERVER record, never from a clock). This is the same
  // consumer-side contract RunDetailSheet documents for its hosts; it is NOT
  // a restore fire path (D-02's forbidden fork is a second restore trigger —
  // restoreAll and the rows' RestoreAction stay the only ones).
  const flowVisible = useVisibilityGate();
  const [restoreRuns, setRestoreRuns] = useState<Run[]>([]);
  useEffect(() => {
    if (step !== 5 || !flowVisible) return;
    let cancelled = false;
    const fetchRuns = () => {
      listRuns()
        .then((res) => {
          if (!cancelled && res.ok) setRestoreRuns(res.runs ?? []);
        })
        .catch(() => {
          // A failed read leaves the last snapshot on screen; the poll retries.
        });
    };
    fetchRuns();
    const id = setInterval(fetchRuns, MOBILE_RUNS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, flowVisible]);

  // OUR targets keyed exactly the way restore runs record themselves
  // (domain:target — RestoreRow's matchRun discipline, FileSetRecoveryRow's
  // files:set.Name), so the badge feed below only ever names a target this
  // flow discovered.
  const ourTargets = new Map<string, string>();
  for (const c of containers) ourTargets.set(`container:${c.name}`, c.name);
  for (const v of vms) ourTargets.set(`vm:${v.libvirtName}`, v.name);
  for (const s of fileSets) ourTargets.set(`files:${s.name}`, s.name);
  const ourRestoreRuns = restoreRuns.filter(
    (r) => r.kind === "restore" && ourTargets.has(`${r.domain}:${r.target}`),
  );
  const targetBadges = latestRestoreByTarget(ourRestoreRuns);
  const anyRestoreInFlight = ourRestoreRuns.some((r) => r.status === "running");

  // The optional integrity verify beat (SCRN-06 beat 3): one row, firing
  // checkDomain SEQUENTIALLY over every domain that has discovered targets,
  // through the locally-copied mapping. Read-only, never a gate: no restore
  // control below consults this state, and the row's copy never implies it
  // does. Results land per domain as they resolve (busy shows integrity.
  // checking until the last one settles).
  const verifyDomains = [
    ...(containers.length > 0 ? (["container"] as const) : []),
    ...(vms.length > 0 ? (["vm"] as const) : []),
    ...(fileSets.length > 0 ? (["files"] as const) : []),
  ]
    .map(restoreVerifyDomainFor)
    .filter((d): d is "containers" | "vms" | "flash" | "files" => d !== null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResults, setVerifyResults] = useState<{ domain: string; ok: boolean; error: string | null }[]>([]);
  async function runVerify() {
    if (verifyBusy || verifyDomains.length === 0) return;
    setVerifyBusy(true);
    setVerifyResults([]);
    const results: { domain: string; ok: boolean; error: string | null }[] = [];
    for (const d of verifyDomains) {
      try {
        const res = await checkDomain(d);
        // Backend error text verbatim when present (pre-scrubbed server-side).
        results.push({ domain: d, ok: res.ok, error: res.ok ? null : res.error ?? t("verify.failed") });
      } catch (err) {
        results.push({ domain: d, ok: false, error: err instanceof Error ? err.message : t("verify.failed") });
      }
      setVerifyResults([...results]);
    }
    setVerifyBusy(false);
  }

  // LOCAL hue counter for this block's rows (the UI-SPEC hue discipline: the
  // mobile block uses its OWN counter — the page-flat nextHue() is
  // desktop-only by evaluation order, and a call at this mount site would
  // shift every desktop heading after it on each 48rem viewport cross).
  let mobileHueSeq = 0;
  const mobileHue = () => mobileHueSeq++;

  // The kit download, re-hosted VERBATIM from the desktop card's inline button
  // handler (the same frozen api fn, the same refusal -> toast + shake
  // handling). Deliberately a body-copy rather than an extraction: extracting
  // a shared callback would rewrite the desktop button's onClick, and the
  // tracer freezes desktop bytes byte-for-byte (D-01). Both call sites fire
  // the identical downloadRecoveryKit call, so D-02's single fire path holds
  // at the API boundary; noted in 08-01-SUMMARY for the plan that next
  // touches this step.
  function fireKitDownload() {
    setKitError(null);
    void downloadRecoveryKit().then((err) => {
      setKitError(err);
      if (err) {
        push(err, "fail");
        setKitShake((n) => n + 1);
      }
    });
  }

  // The confirm-gated restore row (Plan 02, D-03): the promise gate FIRST —
  // below md useConfirm presents ConfirmSheet (destructive control on top,
  // safe cancel at the thumb-default bottom), so the destructive action never
  // sits in the sticky bar's thumb-default slot — then the EXISTING shared
  // handler. restoreOwnConfig stays the ONLY settings-write path for this
  // step: it re-fetches the server baseline and merges before the PUT
  // (D-02, Pitfall 6).
  async function restoreConfigGated() {
    if (!(await confirm(t("config.restoreChain.title")))) return;
    await restoreOwnConfig();
  }

  // The step's own StepState, desktop parity (the attach card shows the
  // readability state only once attached; the kit card carries none).
  const stepState: StepState =
    step === 1
      ? readableState
      : step === 2
        ? configStepState
        : step === 3
          ? previewed
            ? readableState
            : "idle"
          : step === 4
            ? discoverStepState
            : step === 5
              ? restoreStepState
              : "idle";

  const badge = MOBILE_STEP_BADGE[stepState];

  // BAR ANATOMY (the SAFE action owns the bottom row — the thumb-default
  // position, D-03):
  //   1: Check while unanswered, else Continue.
  //   2: Continue always (optional step — it never gates).
  //   3: Connect & preview always (accent while unattached, secondary once
  //      attached): the fields stay editable and the bar is their only save
  //      path, so hiding it after a first attach would strand field edits;
  //      Continue joins it (bottom, safe) once attached.
  //   4: Discover while undiscovered, else Continue.
  //   5: Continue only when the kit gate holds — with the gate unmet the bar
  //      renders NO action at all (a Continue past a gate cannot render; the
  //      restore controls live in the body, secondary/tonal, D-03).
  //   6: the kit download + Done (the flow's terminal).
  return (
    <>
      <div className="flex flex-col gap-4 glim-content-fade">
        {/* Position chip (reservation 12: accentSoft/accentText tonal chip,
            tabular-nums, single-line by design) + Back (>=44px hit area).
            Back is presentation-only navigation: the shared state it returns
            to is untouched, so completed steps stay completed. */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center whitespace-nowrap rounded-pill bg-accentSoft px-2 py-1 text-xs font-semibold tabular-nums text-accentText">
            {t("recovery.mobile.stepOf")
              .replace("{n}", String(step))
              .replace("{total}", String(MOBILE_STEP_TOTAL))}
          </span>
          {step > 1 && (
            <Button
              label={t("common.back")}
              labelKey="common.back"
              tone="neutral"
              onClick={goBack}
              className="min-h-[2.75rem]"
            />
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-card border border-carbon-border bg-carbon-surface p-4">
          {/* Step title (the desktop StepCard's, verbatim) + the four-status
              Badge (TEXT label + status hue, never the bare dot) + the
              optional badge on the config step. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-carbon-text">
              {t(MOBILE_STEP_TITLES[step])}
            </span>
            <Badge tone={badge.tone} size="small">
              {t(badge.labelKey)}
            </Badge>
            {step === 2 && (
              <Badge tone="neutral" size="small">
                {t("spike.bestEffort")}
              </Badge>
            )}
          </div>

          {/* ---- Step 1: readability (the check's readouts; the action lives
                  in the bar below). ---- */}
          {step === 1 && (
            <>
              <p className="text-xs leading-relaxed text-carbon-textMuted">
                {t("recovery.appKeyExplain")}
              </p>
              {readableState === "ok" && (
                <span className="text-sm text-statusOk">{t("recovery.readable")}</span>
              )}
              {readableState === "warn" && (
                <>
                  <span className="text-sm text-statusWarn">{t("recovery.notReachable")}</span>
                  {lastError && (
                    <p
                      dir="ltr"
                      className="text-xs font-mono break-all text-start text-carbon-textMuted"
                    >
                      {lastError}
                    </p>
                  )}
                </>
              )}
              {readableState === "bad" && (
                <div className="rounded-card bg-statusFailBgSoft px-4 py-2 text-xs leading-relaxed text-statusFail">
                  {t("recovery.appKeyRemedy")}
                </div>
              )}
              {/* Which folders were read (#196) — the desktop card's own #196
                  reasoning: an empty answer must name where it looked. */}
              {readSources.length > 0 && readableState !== "idle" && (
                <p className="text-xs leading-relaxed wrap-break-word text-carbon-textMuted">
                  {t("recovery.readFrom")}{" "}
                  <span className="font-mono">{readSources.join(", ")}</span>
                </p>
              )}
            </>
          )}

          {/* ---- Step 2 (optional): the FULL config-restore body (Plan 02).
                  Every field re-hosts the desktop card's (D-02): the SAME
                  shared state (configSource, settings.configPath /
                  settings.configOffsite) and the SAME restoreOwnConfig
                  handler — this block adds presentation only, never a second
                  settings-write path (Pitfall 6). ---- */}
          {step === 2 && (
            <>
              <p className="text-xs leading-relaxed text-carbon-textMuted">
                {`${t("recovery.configHint")} ${t("recovery.configAppKeyReminder")}`}
              </p>
              {configSkipped ? (
                // The sanctioned empty resolution: a user without a settings
                // backup skips — no settings write can fire from this state.
                <p className="text-sm text-carbon-textMuted">{t("recovery.configSkipped")}</p>
              ) : settings ? (
                <>
                  {/* Where the config backup lives: the desktop card's source
                      toggle + local-path / off-site-URL field, same state. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-carbon-textMuted">{t("recovery.configSourceLabel")}</span>
                    <SourceToggle
                      source={configSource}
                      onChange={setConfigSource}
                      disabled={configPhase === "saving" || configPhase === "restarting"}
                    />
                  </div>

                  {configSource === "local" ? (
                    <FolderBrowser
                      label={t("recovery.configLocalPath")}
                      value={settings.configPath}
                      hostMountRoot={hostMountRoot}
                      onChange={(v) => setSettings((prev) => (prev ? { ...prev, configPath: v } : prev))}
                    />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-carbon-textSub">{t("recovery.configOffsiteUrl")}</label>
                      <input
                        value={settings.configOffsite}
                        spellCheck={false}
                        onChange={(e) =>
                          setSettings((prev) => (prev ? { ...prev, configOffsite: e.target.value } : prev))
                        }
                        placeholder="rest:http://host:8000/repo"
                        dir="ltr"
                        className={`${offsiteInput} text-start`}
                      />
                    </div>
                  )}

                  {/* D-03: the chain narration IS the consequence copy — the
                      numbered steps render READ-ONLY, ABOVE the destructive
                      control (DOM order = reading order, the Config
                      MobileRestoreSheet precedent at Config.tsx:1187-1197),
                      and the restore row awaits the shared confirm() promise
                      before the handler fires. Secondary/tonal styling,
                      mid-screen: the sticky bar keeps the safe Continue
                      (the destructive action never owns the thumb-default
                      slot). */}
                  <p className="text-sm font-semibold text-carbon-text">{t("config.restoreChain.title")}</p>
                  <ol className="list-decimal space-y-2 ps-5 text-xs leading-relaxed text-carbon-textSub">
                    <li>{t("config.restoreChain.step1")}</li>
                    <li>{t("config.restoreChain.step2")}</li>
                    <li>{t("config.restoreChain.step3")}</li>
                    <li>{t("config.restoreChain.step4")}</li>
                    <li>{t("config.restoreChain.step5")}</li>
                  </ol>
                  <Button
                    key={configShake}
                    label={t("recovery.configRestore")}
                    labelKey="recovery.configRestore"
                    tone="neutral"
                    onClick={() => void restoreConfigGated()}
                    disabled={configPhase === "saving" || configPhase === "restarting"}
                    busy={configPhase === "saving" || configPhase === "restarting"}
                    title={(configPhase === "saving" || configPhase === "restarting") ? t("recovery.configRestoring") : undefined}
                    className={`min-h-[2.75rem] w-full${configShake ? " glim-shake" : ""}`}
                  />
                  {/* Skip stays first-class: advances without firing any
                      restore call (the same state the desktop skip sets). */}
                  <Button
                    label={t("recovery.configSkip")}
                    labelKey="recovery.configSkip"
                    tone="neutral"
                    onClick={() => {
                      onConfigSkip();
                      setStep(3);
                    }}
                    className="min-h-[2.75rem] w-full"
                  />

                  {/* configPhase narration — the SAME states Config's mobile
                      sheet presents (Config.tsx:1200-1228), class-for-class.
                      The mid-flow window reload is CORRECT (Pitfall 7): the
                      flow re-enters at step 1 with the restored settings
                      live; step position is deliberately not preserved. */}
                  {configPhase === "restarting" && (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-accentText">{t("recovery.configRestarting")}</p>
                      <Badge as="button" onClick={() => window.location.reload()} tone="neutral" size="small" className="self-start">
                        {t("recovery.configReload")}
                      </Badge>
                    </div>
                  )}
                  {configPhase === "manual" && (
                    <div className="rounded-card bg-statusWarnBg px-4 py-2 text-xs text-statusWarn leading-relaxed">
                      {t("recovery.configManualRestart")}
                    </div>
                  )}
                  {configPhase === "reload" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-statusWarn">{t("recovery.configReloadWhenBack")}</span>
                      <Button
                        label={t("recovery.configReload")}
                        labelKey="recovery.configReload"
                        tone="neutral"
                        onClick={() => window.location.reload()}
                      />
                    </div>
                  )}
                  {/* Backend error text verbatim (pre-scrubbed server-side,
                      T-08-03 — the APP_KEY remap already happened inside
                      restoreOwnConfig). Failure keeps the user ON this step;
                      the chrome around it stays stable. */}
                  {configPhase === "error" && configError && (
                    <div className="rounded-card bg-statusFailBgSoft px-4 py-2 text-xs text-statusFail leading-relaxed wrap-break-word">
                      {configError}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-carbon-textMuted">{t("dashboard.checking")}</p>
              )}
            </>
          )}

          {/* ---- Step 3: attach — the desktop card's fields, re-hosted (same
                  components, same handlers, same write-only secret contract
                  via CloudCard/RcloneCard's RevealInputs). ---- */}
          {step === 3 &&
            (settings ? (
              <>
                <EncryptionStatus
                  t={t}
                  detection={encDetection}
                  detecting={encDetecting}
                  encryptionEnabled={settings.encryptionEnabled}
                  onOverride={(v) =>
                    setSettings((prev) => (prev ? { ...prev, encryptionEnabled: v } : prev))
                  }
                />
                <FolderBrowser
                  label={t("settings.containersPath")}
                  value={settings.containersPath}
                  hostMountRoot={hostMountRoot}
                  onChange={(v) => setSettings((prev) => (prev ? { ...prev, containersPath: v } : prev))}
                />
                <FolderBrowser
                  label={t("settings.vmsPath")}
                  value={settings.vmsPath}
                  hostMountRoot={hostMountRoot}
                  onChange={(v) => setSettings((prev) => (prev ? { ...prev, vmsPath: v } : prev))}
                />
                <FolderBrowser
                  label={t("settings.flashPath")}
                  value={settings.flashPath}
                  hostMountRoot={hostMountRoot}
                  onChange={(v) => setSettings((prev) => (prev ? { ...prev, flashPath: v } : prev))}
                />
                <FolderBrowser
                  label={t("settings.filesPath")}
                  value={settings.filesPath}
                  hostMountRoot={hostMountRoot}
                  onChange={(v) => setSettings((prev) => (prev ? { ...prev, filesPath: v } : prev))}
                />
                <StepDisclosure label={t("settings.offsiteTitle")} tip={t("settings.offsiteHint")} gap="gap-2">
                  {([
                    ["containersOffsite", "nav.containers"],
                    ["vmsOffsite", "nav.vms"],
                    ["flashOffsite", "nav.flash"],
                    ["filesOffsite", "nav.files"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-xs text-carbon-textSub">{t(label)}</label>
                      <input
                        value={settings[key]}
                        spellCheck={false}
                        onChange={(e) =>
                          setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                        }
                        placeholder="rest:http://host:8000/repo"
                        dir="ltr"
                        className={`${offsiteInput} text-start`}
                      />
                    </div>
                  ))}
                </StepDisclosure>
                {/* Fixed hue literals (3/4) — the exact indices the desktop's
                    evaluation order hands CloudCredsDisclosure. NO nextHue()
                    here: see the mount comment's hue-discipline note. */}
                <CloudCredsDisclosure t={t} cloudHue={3} rcloneHue={4} />
              </>
            ) : (
              <p className="text-sm text-carbon-textMuted">{t("dashboard.checking")}</p>
            ))}

          {/* ---- Step 4: discover (the action lives in the bar; the body is
                  readouts only). ---- */}
          {step === 4 && (
            <>
              {discovered && discovered.containers + discovered.vms + discovered.files > 0 && (
                <span className="text-sm text-statusOk">
                  {t("recovery.foundCounts")
                    .replace("{c}", String(discovered.containers))
                    .replace("{v}", String(discovered.vms))}
                  {discovered.files > 0 && (
                    <> {t("recovery.filesFound").replace("{f}", String(discovered.files))}</>
                  )}
                </span>
              )}
              {discovered && discovered.containers + discovered.vms + discovered.files === 0 && (
                <p className="text-sm text-statusWarn">{t("recovery.foundNone")}</p>
              )}
              {discoverError && (
                <div className="rounded-card bg-statusFailBgSoft px-4 py-2 text-xs leading-relaxed wrap-break-word text-statusFail">
                  {discoverError}
                </div>
              )}
            </>
          )}

          {/* ---- Step 5: the populated restore body (Plan 03). D-03 anatomy:
                  the destructive controls are secondary/tonal rows IN THE
                  BODY, mid-screen — the sticky bar keeps the safe Continue.
                  Zero targets keep the empty copy (the kit gate opens on the
                  empty set). ---- */}
          {step === 5 && (
            <>
              {discovered && discovered.containers + discovered.vms + discovered.files > 0 && (
                <span className="text-sm text-statusOk">
                  {t("recovery.foundCounts")
                    .replace("{c}", String(discovered.containers))
                    .replace("{v}", String(discovered.vms))}
                  {discovered.files > 0 && (
                    <> {t("recovery.filesFound").replace("{f}", String(discovered.files))}</>
                  )}
                </span>
              )}
              {!anyDiscovered ? (
                <p className="text-sm text-carbon-textMuted">{t("recovery.noneDiscovered")}</p>
              ) : (
                <>
                  {/* Restore all — every container then VM, sequential + left
                      stopped. The confirm gate lives INSIDE the shared
                      restoreAll handler (its first line awaits the same
                      useConfirm promise the desktop button rides; below md
                      that presents ConfirmSheet — destructive control on top,
                      safe cancel at the thumb-default bottom). This row is
                      presentation ONLY: no second fire path (D-02). File sets
                      are excluded exactly as the desktop card excludes them
                      (a rediscovered set has no original path). */}
                  {(containers.length > 0 || vms.length > 0) && (
                    <div className="flex flex-col gap-2">
                      {runningActivity.active && !restoreAllBusy && (
                        <span className="text-xs text-carbon-textMuted">
                          {t(busyPhraseKey(runningActivity.phase))}
                        </span>
                      )}
                      {restoreAllResult && (
                        <span
                          className={`text-sm ${restoreAllResult.fail > 0 ? "text-statusWarn" : "text-statusOk"}`}
                        >
                          {t("recovery.restoreAllResult")
                            .replace("{ok}", String(restoreAllResult.ok))
                            .replace("{fail}", String(restoreAllResult.fail))}
                        </span>
                      )}
                      <Button
                        label={t("recovery.restoreAll")}
                        labelKey="recovery.restoreAll"
                        tone="neutral"
                        onClick={() => void restoreAll()}
                        disabled={restoreAllBusy || runningActivity.active}
                        busy={restoreAllBusy}
                        className="min-h-[2.75rem] w-full"
                      />
                    </div>
                  )}

                  {/* Per-target four-status Badges (VERIFY-05: text label +
                      hue, never color alone): the NEWEST restore-kind run per
                      discovered target, rendered through the shared
                      statusTone/statusLabel. A cancelled restore is the
                      NEUTRAL terminal — statusLabel's own "Cancelled" bucket
                      — never a failure tone; "running" shows the active
                      bucket while the restore moves. Empty until a run
                      record exists (honest: no fabricated outcomes). */}
                  {targetBadges.map(([key, run]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs text-carbon-text">
                        {ourTargets.get(key) ?? run.target}
                      </span>
                      <Badge tone={statusTone(run.status)} size="small" className="shrink-0">
                        {statusLabel(run.status, t)}
                      </Badge>
                    </div>
                  ))}

                  {/* VM restore needs the libvirt SSH link — advisory note,
                      never a block (desktop card parity: the note degrades
                      the VM rows' expectations, it never skips them). */}
                  {vms.length > 0 && vmSshConfigured === false && (
                    <div className="rounded-card bg-statusWarnBg px-4 py-2 text-xs text-statusWarn leading-relaxed">
                      {t("recovery.vmSshNote")}
                    </div>
                  )}

                  {/* Containers first, then VMs — the desktop card's own rows,
                      re-hosted verbatim (their RestoreAction confirmMessage
                      path already presents the per-row ConfirmSheet below md,
                      with the target name substituted). Hue rides the LOCAL
                      counter above — never nextHue(). */}
                  {containers.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs text-carbon-textSub pt-1 pb-1">
                        {t("nav.containers")}
                      </span>
                      {containers.map((c) => (
                        <RestoreRow
                          key={`container:${c.name}`}
                          domain="container"
                          name={c.name}
                          lastBackup={c.lastBackup}
                          t={t}
                          otherActive={rowOtherActive}
                          hueIndex={mobileHue()}
                        />
                      ))}
                    </div>
                  )}
                  {vms.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs text-carbon-textSub pt-2 pb-1">{t("nav.vms")}</span>
                      {vms.map((v) => (
                        <RestoreRow
                          key={`vm:${v.libvirtName}`}
                          domain="vm"
                          name={v.libvirtName}
                          displayName={v.name}
                          lastBackup={v.lastBackup}
                          t={t}
                          otherActive={rowOtherActive}
                          hueIndex={mobileHue()}
                        />
                      ))}
                    </div>
                  )}
                  {/* File sets — restore into a chosen folder (restoreAll
                      covers containers + VMs only; a rediscovered set has no
                      original path, so each row picks its own target). The
                      desktop card's InfoBubble hint moves with the label. */}
                  {fileSets.length > 0 && (
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-1 self-start text-xs text-carbon-textSub pt-2 pb-1">
                        {t("nav.files")}
                        <InfoBubble tip={t("recovery.filesRestoreHint")} />
                      </span>
                      {fileSets.map((s) => (
                        <FileSetRecoveryRow
                          key={`files:${s.id}`}
                          set={s}
                          hostMountRoot={hostMountRoot}
                          t={t}
                          otherActive={rowOtherActive}
                          hueIndex={mobileHue()}
                        />
                      ))}
                    </div>
                  )}

                  {/* Live progress + log (D-04, read-only): the frozen
                      pipeline consumed from outside. IN-FLIGHT renders
                      through the visibility-gated live section — mounting IS
                      the SSE subscription, so hiding the page pauses the
                      pipeline AND the runs poll above, and returning
                      reconciles from the refetched server records (the run
                      that finished in the background arrives as its terminal
                      record, never extrapolated). Terminal runs render the
                      pure history view (ungated: a pure view needs no live
                      connection). Both go through MobileLogList — the ONE
                      log style. */}
                  {anyRestoreInFlight ? (
                    flowVisible ? (
                      <MobileRestoreLiveSection runs={ourRestoreRuns} />
                    ) : null
                  ) : ourRestoreRuns.some((r) => r.finishedAt != null) ? (
                    <MobileRestoreHistoryLog runs={ourRestoreRuns} />
                  ) : null}

                  {/* The optional integrity verify row (SCRN-06 beat 3):
                      fires checkDomain per discovered domain through the
                      locally-copied mapping. NON-BLOCKING by construction —
                      nothing above consults verifyBusy/verifyResults, and
                      the restore rows stay enabled while it runs. Result
                      lines: Badge (domain, ok/fail hue) + status text —
                      backend reason verbatim on fail. */}
                  {verifyDomains.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Button
                        label={verifyBusy ? t("integrity.checking") : t("integrity.verify")}
                        labelKey={verifyBusy ? "integrity.checking" : "integrity.verify"}
                        tone="neutral"
                        onClick={() => void runVerify()}
                        disabled={verifyBusy}
                        busy={verifyBusy}
                        className="min-h-[2.75rem] w-full"
                      />
                      {verifyResults.map((r) => (
                        <div key={r.domain} className="flex items-start gap-2 text-xs">
                          <Badge tone={r.ok ? "ok" : "fail"} size="small" className="shrink-0">
                            {t(VERIFY_DOMAIN_LABEL[r.domain])}
                          </Badge>
                          {r.ok ? (
                            <span className="flex items-center gap-2 text-statusOk">
                              <CheckDraw />
                              {t("integrity.ok")}
                            </span>
                          ) : (
                            <span className="min-w-0 wrap-break-word text-statusFail">{r.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ---- Step 6: the kit (hint + refusal readout; the download
                  itself lives in the bar). ---- */}
          {step === 6 && (
            <>
              <p className="text-xs leading-relaxed text-carbon-textMuted">{t("recovery.kitHint")}</p>
              {kitError && (
                // Backend-provided error text verbatim, same as the desktop
                // card (fail-closed refusals are English by design).
                <span className="text-xs wrap-break-word text-statusFail">✗ {kitError}</span>
              )}
            </>
          )}
        </div>
      </div>

      {step === 1 && (
        <StickyActionBar className="md:hidden">
          {readableState === "idle" ? (
            <Button
              label={t("recovery.recheck")}
              labelKey="recovery.recheck"
              tone="accent"
              onClick={() => void checkReadable()}
              disabled={checking}
              busy={checking}
              title={checking ? t("dashboard.checking") : undefined}
              className="min-h-[2.75rem] w-full"
            />
          ) : (
            <Button
              label={t("common.continue")}
              labelKey="common.continue"
              tone="accent"
              onClick={() => setStep(2)}
              className="min-h-[2.75rem] w-full"
            />
          )}
        </StickyActionBar>
      )}
      {step === 2 && (
        <StickyActionBar className="md:hidden">
          <Button
            label={t("common.continue")}
            labelKey="common.continue"
            tone="accent"
            onClick={() => setStep(3)}
            className="min-h-[2.75rem] w-full"
          />
        </StickyActionBar>
      )}
      {step === 3 && (
        <StickyActionBar className="md:hidden">
          <Button
            key={connectPreviewShake}
            label={t("recovery.connectPreview")}
            labelKey="recovery.connectPreview"
            tone={previewed ? "neutral" : "accent"}
            onClick={() => void connectPreview()}
            disabled={attachState === "saving"}
            busy={attachState === "saving"}
            className={`min-h-[2.75rem] w-full${connectPreviewShake ? " glim-shake" : ""}`}
          />
          {previewed && (
            <Button
              label={t("common.continue")}
              labelKey="common.continue"
              tone="accent"
              onClick={() => setStep(4)}
              className="min-h-[2.75rem] w-full"
            />
          )}
        </StickyActionBar>
      )}
      {step === 4 && (
        <StickyActionBar className="md:hidden">
          {discovered === null ? (
            <Button
              label={t("recovery.discover")}
              labelKey="recovery.discover"
              tone="accent"
              onClick={() => void runDiscover()}
              disabled={discovering}
              busy={discovering}
              title={discovering ? t("containers.discovering") : undefined}
              className="min-h-[2.75rem] w-full"
            />
          ) : (
            <Button
              label={t("common.continue")}
              labelKey="common.continue"
              tone="accent"
              onClick={() => setStep(5)}
              className="min-h-[2.75rem] w-full"
            />
          )}
        </StickyActionBar>
      )}
      {/* Step 5's bar EXISTS only when the kit gate holds — a Continue past an
          unmet gate cannot render (gating decides, not the button). */}
      {step === 5 && gateTo(6) && (
        <StickyActionBar className="md:hidden">
          <Button
            label={t("common.continue")}
            labelKey="common.continue"
            tone="accent"
            onClick={() => setStep(6)}
            className="min-h-[2.75rem] w-full"
          />
        </StickyActionBar>
      )}
      {step === 6 && (
        <StickyActionBar className="md:hidden">
          <Button
            key={kitShake}
            label={t("recovery.kitDownload")}
            labelKey="recovery.kitDownload"
            tone="neutral"
            onClick={fireKitDownload}
            className={`min-h-[2.75rem] w-full${kitShake ? " glim-shake" : ""}`}
          />
          {/* The terminal row: home is where the restored-but-stopped targets
              get started ("Start them from the Containers/VMs tabs"), so Done
              lands there rather than dead-ending on the flow. */}
          <Button
            label={t("common.done")}
            labelKey="common.done"
            tone="accent"
            onClick={() => navigate("/")}
            className="min-h-[2.75rem] w-full"
          />
        </StickyActionBar>
      )}
    </>
  );
}
