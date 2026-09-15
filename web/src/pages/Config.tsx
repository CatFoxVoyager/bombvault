import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { hueVars, rainbowAt } from "../lib/appearance";
import {
  backupConfigNow,
  listConfigSnapshots,
  deleteSnapshot,
  getScheduleNext,
  getSettings,
  putSettings,
  restoreConfig,
  waitForAppBack,
} from "../lib/api";
import type { ScheduleNext, Snapshot, Settings } from "../lib/api";
import { useT } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import { PAGE_SHELL } from "../lib/pageShell";
import { BackupCancelButton } from "../components/BackupCancelButton";
import { ProgressBar } from "../components/ProgressBar";
import { useProgress, anyActive, busyPhraseKey } from "../lib/progress";
import { useBackupWatch } from "../lib/backupWatch";
import { SourceToggle, type RepoSource } from "../components/SourceToggle";
import { ToggleRow } from "./settings/shared";
import { useConfirm } from "../lib/useConfirm";
import { useToast } from "../lib/toast";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { InfoBubble } from "../components/InfoBubble";
import { IconBackupNow, IconTrash } from "../components/Sidebar";
import { tLtr } from "../lib/ltrFragments";
import { relativeTime } from "../lib/reltime";
import { CadenceBuilder } from "../components/CadenceBuilder";
import { ScheduleBadge, cadenceLabel, scheduleStatus } from "../components/ScheduleBadge";
import { BottomSheet } from "../components/mobile/BottomSheet";
import { Fab } from "../components/mobile/Fab";
import { MobileSectionLabel } from "../components/mobile/MobileSectionLabel";
import { StickyActionBar } from "../components/mobile/StickyActionBar";

type T = ReturnType<typeof useT>["t"];

// ---------------------------------------------------------------------------
// Backup button — fire-and-watch, mirroring the flash domain (see useBackupWatch:
// the config backup runs detached on the server and the POST returns immediately,
// so we watch the "config" progress + recorded run for the outcome).
//
// Square icon-only badge, flush right in the card (jdp, live review: "Tab
// Selbst-Backup: in der 'Einstellungen jetzt sichern' Card der 'Einstellungen
// jetzt sichern' Button soll ein quadratischer Badge mit Speichern-Glyph sein
// und ganz rechts angeordnet sein"). Was a full-width `bg-accent px-4 py-1.5
// text-sm` text button with THREE permanently-inline states stacked below it
// (blocked-elsewhere hint, a CheckDraw success line carrying the snapshot id,
// a red error message).
//
// This is the SAME conversion Flash.tsx's FlashBackupButton already received
// in 63f53d5, mirrored rather than re-invented — same `IconBackupNow` glyph,
// same `shape="square" size="icon" tone="active"` recipe, same `tip` priority
// order (pending → blocked-by-other → label), same `flex justify-end` wrapper
// at the call site, and the same terminal-state migration: success and error
// become TOASTS, because a square badge has no room for inline text. An error
// additionally shakes the badge, per the system-wide "a failed action toasts
// AND shakes its button" rule.
//
// That toast migration supersedes this comment's own earlier v8.0.0 audit
// note, which deferred it on the grounds that useBackupWatch's state shape
// also backs RESTORE outcomes elsewhere (sticky by design, kind="restore" —
// see the hook's SUCCESS_CLEAR_MS comment). That reasoning still correctly
// blocks changing the HOOK, which is untouched here. But rendering
// state.phase as a toast is a per-component decision, not a hook change:
// Containers.tsx's BackupButton and then Flash.tsx's both proved it — same
// hook, zero hook changes, just a different render for kind="backup"'s
// already-self-clearing 4s terminal states. VMs.tsx's VMBackupButton is the
// one remaining full-width text button of this family and is NOT touched
// here; jdp's ask named this card, and unlike the source.hint sweep in this
// same pass that one is a different card layout (a per-VM row control), not
// another copy of this exact card.
function ConfigBackupButton({
  t,
  onBackedUp,
  externallyBusy = false,
  busyPhase,
  fireRef,
}: {
  t: T;
  onBackedUp: () => void;
  /** True when a backup/restore is running elsewhere (any domain). */
  externallyBusy?: boolean;
  busyPhase?: string;
  /** Optional ref the caller fires to trigger the SAME fire() — the mobile
   *  Fab hosts the same action (07-03's FlashBackupButton precedent: "FAB
   *  under material hosts the same action"), so ONE watcher owns the toasts
   *  and the busy state no matter which trigger the user pressed. Desktop
   *  callers omit it and are unchanged. */
  fireRef?: { current: (() => void) | null };
}) {
  const { state, fire, isPending } = useBackupWatch({
    progressKey: "config",
    start: () => backupConfigNow(),
    matchRun: (r) => r.domain === "config",
    onDone: onBackedUp,
  });
  // Keep the caller's ref pointed at the live fire() (same effect shape as
  // FlashBackupButton's).
  useEffect(() => {
    if (fireRef) fireRef.current = fire;
  });
  // A backup/restore/replication elsewhere blocks a new config backup.
  const blockedByOther = externallyBusy && !isPending;
  const { push } = useToast();
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a
  // failed action toasts AND shakes its button.
  const [shake, setShake] = useState(0);
  // Tracks the last phase already reported, so this effect toasts exactly
  // once per NEW terminal transition — same guard as Flash.tsx's
  // FlashBackupButton (state.phase can only ever start at "idle", so this
  // never fires on mount, only on a real fire()-driven change).
  const seenPhase = useRef(state.phase);

  useEffect(() => {
    if (state.phase === seenPhase.current) return;
    seenPhase.current = state.phase;
    if (state.phase === "success") {
      push(
        state.snapshotId ? `${t("settings.saved")} · ${state.snapshotId.slice(0, 8)}` : t("settings.saved"),
        "success"
      );
    } else if (state.phase === "error") {
      push(state.message, "fail");
      setShake((n) => n + 1);
    }
  }, [state, push, t]);

  // #178: stable name, exceptional states as tooltip only.
  const stateTip = isPending
    ? t("config.backingUp")
    : blockedByOther
      ? t(busyPhraseKey(busyPhase))
      : undefined;

  return (
    <Button
      key={shake}
      label={t("config.backupNow")}
      labelKey="config.backupNow"
      glyph={<IconBackupNow />}
      tone="accent"
      onClick={() => void fire()}
      disabled={isPending || blockedByOther}
      busy={isPending}
      title={stateTip}
      className={shake ? "glim-shake" : ""}
    />
  );
}

// ---------------------------------------------------------------------------
// Settings card — the config self-backup is configured on its own page (unlike
// flash, whose enable/path/off-site live on the Settings page): one place to say
// "protect BombVault itself". Persists via getSettings/putSettings — the same
// mechanism the rest of the app uses; no new persistence is invented.
// ---------------------------------------------------------------------------

// "saved"/"error" were removed from this type — the toast migration below
// (GlimStone form-engine Task 9) replaced that 3000ms inline-flash outcome
// with a real toast (push(), further down), so setSaveState now only ever
// sets "idle"/"saving" — see the comment on the state declaration itself.
type SaveState = "idle" | "saving";

function ConfigSettingsCard({
  t,
  settings,
  setSettings,
  hueIndex,
}: {
  t: T;
  settings: Settings;
  setSettings: (updater: (prev: Settings) => Settings) => void;
  /** Rainbow position for this Card's own heading notch — see Settings.tsx's
   *  own `Card`/Badge.tsx's `hueIndex` doc for the full history. This page
   *  has exactly three static, always-in-the-same-order Cards (this one,
   *  the backup Card, the snapshots Card below), a genuine small list, so
   *  each gets its own position rather than the flat single accent. */
  hueIndex?: number;
}) {
  const { push } = useToast();
  // Only "idle"/"saving" are ever set now — the SaveBar success/error pattern
  // (GlimStone form-engine Task 9's other toast candidate, alongside the
  // copy-feedback sites) used to hold "saved"/"error" here for a 3000ms
  // inline-text flash; that completion notice is now a toast instead (push
  // below), so there's no lingering render state left to revert from.
  // Only the setter survives: with the Save button gone there is no control
  // left to disable while a write is in flight, but the state still guards
  // against overlapping writes and keeps the shape of every other autosaving
  // card in the app.
  const [, setSaveState] = useState<SaveState>("idle");

  async function persist(enabled: boolean) {
    setSaveState("saving");
    try {
      // Re-fetch the latest settings and merge only the fields THIS card owns,
      // then PUT. Since the self-backup + off-site cadences moved to Settings ›
      // Schedules (the sole schedule owner), a full-object PUT of this page's
      // mount-time snapshot could otherwise re-assert a stale configSchedule/
      // configOffsiteSchedule and silently disable a schedule set elsewhere.
      const latest = await getSettings();
      // Do NOT fall back to the stale mount-time snapshot on a failed re-fetch:
      // the backend returns {ok:false} at HTTP 200 (does not throw), and PUTting
      // the old snapshot would re-assert a stale configSchedule/configOffsiteSchedule
      // now owned by Settings › Schedules, silently reverting a schedule set
      // elsewhere. Abort the save instead.
      if (!latest.ok) {
        setSaveState("idle");
        push(latest.error ?? t("config.loadSettingsFailed"), "fail");
        return;
      }
      // configOffsite/configOffsiteImmutable are deliberately NOT merged in
      // any more: since #176 self-backup has a full off-site card in Settings ›
      // Off-site like every other domain, and that card owns them. Sending this
      // page's mount-time snapshot would re-assert a stale repo URL and undo an
      // edit made there, exactly the way the schedules used to be clobbered
      // before they moved out for the same reason.
      // configPath left out for the same reason as the two above (#182): the
      // path row in Settings › Paths and storage owns it now, and re-asserting
      // this page's snapshot would undo a location set there.
      const merged: Settings = {
        ...latest.settings,
        configEnabled: enabled,
      };
      const res = await putSettings(merged);
      if (res.ok) {
        setSaveState("idle");
        // "fail"/"warn" toasts always surface even in quiet mode; "success"
        // is the routine, suppressible case (design-language.md "Toasts").
        push(t("settings.saved"), "success");
      } else {
        setSaveState("idle");
        push(res.error ?? t("common.saveFailed"), "fail");
      }
    } catch (err) {
      setSaveState("idle");
      push(err instanceof Error ? err.message : t("common.saveFailed"), "fail");
    }
  }

  return (
    // `glim-notch-card` (jdp, live-review — see Settings.tsx's Card() for the
    // full reasoning): lets this card's own hueIndex'd heading notch reveal
    // its colour in reactive rainbow mode on hover/focus anywhere in the
    // card, not just its own tiny badge glyph.
    //
    // `.glim-hue` ALSO added (rainbow-mode completeness sweep, jdp live
    // review: "Es sind nicht alle Buttons in den Regenbogen-Modus
    // eingepflegt"): `glim-notch-card` alone never redefines
    // --accent/--focus-ring, only the reactive-mode hover reveal — so the
    // Save button below stayed the flat theme accent regardless of rainbow.
    // Same hueIndex prop the Badge already uses (StepCard.tsx's/
    // Dashboard.tsx Card()'s own identical fix, same mechanism: custom
    // properties cascade to every descendant once redefined once here).
    <div
      className={`relative glim-notch-card bg-carbon-surface rounded-card p-5 flex flex-col gap-4${
        hueIndex !== undefined ? " glim-hue" : ""
      }`}
      style={hueIndex !== undefined ? (hueVars(rainbowAt(hueIndex)) as CSSProperties) : undefined}
    >
      {/* Task 5 (rule 11): same Badge-in-<h2> pattern as Settings.tsx's own
          Card component — this hand-rolled Card equivalent never shared
          Card's component, so it needed its own copy of the conversion.
          jdp live-review ("Infotexte in i Infobubbles"): the permanent <p>
          under the heading (what this whole Card protects) is exactly
          Card's own `hint` case — folded into an InfoBubble on the Badge
          itself, same content (`config.settingsHint`), same `onAccent` this
          badge's solid accent fill needs (see Settings.tsx's Card() and
          Flash.tsx's identical backup-Card fix for the reasoning). */}
      <h2 className="flex items-center">
        <Badge tone="heading" size="heading" wrap hueIndex={hueIndex}>
          {t("config.settingsTitle")}
          <InfoBubble tip={t("config.settingsHint")} onAccent />
        </Badge>
      </h2>

      {/* Rule 8, "explanations live in a bubble, not on the page": these were
          the app's LAST two `description` captions, on the same card whose own
          heading text the sweep did convert six lines above. A permanent grey
          paragraph is read once and costs vertical space forever. */}
      {/* Saves itself (#182, manilx: "switching the setting autosaves ... here i
          need to select save button"). Every other toggle in the app persists
          on the spot; this card kept a Save button because it used to own three
          text fields, and once those moved out a lone toggle behind a button
          was the only one of its kind left. */}
      <ToggleRow
        label={t("config.enabled")}
        hint={tLtr(t, "config.enabledHint")}
        checked={settings.configEnabled}
        onChange={(v) => {
          setSettings((prev) => ({ ...prev, configEnabled: v }));
          void persist(v);
        }}
      />

      {/* The backup location moved out too (#182, manilx: "Can't set
          credentials here"). It was a plain text field, while Settings › Paths
          and storage has had the same value as a full path row for a long
          time: local or remote, and for a remote one the safety dialog that
          holds bandwidth limits, append-only and, since #182, the credential
          set. Someone pointing self-backup at an S3 bucket from THIS field
          therefore had nowhere to say which keys it should use.
          Its caption was wrong for that case as well, promising a "relative
          subpath under the host mount root" for a value that had just been
          given an s3: URL.
          Keeping both would also have repeated the schedules/off-site mistake:
          two editors for one setting, with this page's mount-time snapshot
          able to overwrite the other one. */}
      <p className="text-xs text-carbon-textMuted">{t("config.pathMoved")}</p>

      {/* The self-backup + off-site cadences moved to Settings › Schedules (the
          single schedule owner), and since #176 the off-site repo and its
          append-only flag moved to Settings › Off-site, where self-backup now
          has the same card every other domain has: a setup wizard, a connection
          test, replicate-now, extra destinations and per-destination
          credentials. Only the enable toggle lives here now. */}
      <p className="text-xs text-carbon-textMuted">{t("config.offsiteMoved")}</p>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Snapshot row — id + timestamp, with a delete affordance (mirrors Flash's
// FlashSnapshotRow, minus the zip download). Delete targets the currently viewed
// repo via `source`; an off-site append-only repo refuses the delete server-side,
// so the returned error is surfaced in `deleteErr` rather than hidden.
// ---------------------------------------------------------------------------

function ConfigSnapshotRow({
  snap,
  source,
  onDeleted,
  t,
}: {
  snap: Snapshot;
  source: RepoSource;
  onDeleted: () => void;
  t: T;
}) {
  const [deleting, setDeleting] = useState(false);
  const { push } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a
  // failed delete toasts AND shakes the delete button.
  const [shake, setShake] = useState(0);

  async function handleDelete() {
    if (!(await confirm(t("snapshots.deleteConfirm")))) return;
    setDeleting(true);
    try {
      const res = await deleteSnapshot("config", snap.id, source);
      if (res.ok) onDeleted();
      else {
        push(res.error ?? t("common.deleteFailed"), "fail");
      }
    } catch (err) {
      push(err instanceof Error ? err.message : t("common.deleteFailed"), "fail");
      setShake((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  return (
    // py-1.5, not py-2.5: this row's delete badge grew 24px → 32px with the
    // app-wide square-icon-badge unification, and trimming 4px of padding per
    // side keeps the row at exactly the 44px it measured before. Same pairing
    // as RestorePanel's SnapshotRow, for the same reason.
    <div className="flex flex-col gap-1 py-1.5 border-b border-carbon-border last:border-0">
      <div className="flex items-center gap-3 text-sm">
        <span dir="ltr" className="font-mono text-start text-carbon-text text-xs w-20 shrink-0">{snap.id.slice(0, 8)}</span>
        <span className="text-carbon-textMuted text-xs flex-1">
          {new Date(snap.time).toLocaleString()}
        </span>
        {/* Square icon-only delete badge (jdp, live review: "Der
            Loeschen-Button bei Einstellungsbackups soll ein quadratischer
            Badge mit Glyph sein") — was a bare text `<button>` reading
            "Löschen", native `title=` tooltip. Routed through the shared
            Badge component (shape="square", `tip`) rather than a hand-rolled
            IconTipButton: Badge.tsx's own file header is explicit this is
            meant to be the ONE shared mechanism a square icon-only glyph
            badge renders through (its `tip` branch already wraps
            IconTipButton internally, see Badge()'s own `as==="button"`
            case) — OffsiteTargetsSection's "Ziel hinzufügen" button is the
            reference call site for that exact shape/tip pairing. Every
            OTHER snapshot-row delete button in this app (Flash/Files/VMs/
            RestorePanel's own FlashSnapshotRow etc.) is still the identical
            unconverted plain-text button; only this one call site (the one
            jdp's ask named) is converted here, but through the shared
            component so the next conversion has one real place to copy
            from instead of a second bespoke implementation.
            IconTrash (components/Sidebar.tsx) reused verbatim — already
            drawn filled/`currentColor`-only for exactly this "remove a row"
            role in Settings.tsx's Registries card, no new glyph needed.
              size="icon" — the app's one square-icon-badge size (32px). This
            was `size="large"` (24px), measured against its own pre-conversion
            text button; RestorePanel's delete badge copied that number from
            here, which is how one call site's local measurement became a
            second badge size elsewhere in the app. Both are now on the single
            shared stage — see Badge.tsx's "ONE SIZE FOR SQUARE ICON BADGES"
            block. This row's padding moved py-2.5 → py-1.5 in the same
            change, so the row still measures the 44px it did before.
              tone="active", NOT the tone="neutral" + `hover:bg-statusFailBg
            hover:text-statusFail` pair this badge shipped with. jdp, live
            review of the sibling badge RestorePanel copied from this one:
            "Der Löschen-Badge ist auch anders eingefärbt, soll nicht so sein,
            ganz normal in die Farbmodi integrieren." `neutral` is one of the
            tones Badge deliberately exempts from rainbow `hueIndex` (they are
            load-bearing STATUS signals), so a neutral badge takes no
            colour-engine position at all — this control stayed flat grey in
            every palette while every other icon badge in the app followed the
            engine, and the red hover made it the only badge with a bespoke
            colour treatment. `active` + icon-only resolves to the solid
            `bg-accent`/`text-accentContrast` pair and follows the accent/
            rainbow engine like every sibling.
              The action stays unambiguous without the red: the IconTrash
            glyph and the `tip` bubble (t("snapshots.delete")) both name it,
            and the click still routes through the confirm dialog below.
            Mirrors the already-shipped decision that "Deaktivieren" buttons
            must not be red either.
              `glim-shake` (the system-wide "failed delete shakes the delete
            button" rule) and `shrink-0` survive via `className` — behaviour
            and layout, not colour. */}
        <Button
          key={shake}
          label={t("snapshots.delete")}
          labelKey="snapshots.delete"
          glyph={<IconTrash />}
          tone="accent"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className={`shrink-0${shake ? " glim-shake" : ""}`}
        />
      </div>
      {confirmDialog}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config page — BombVault's OWN settings self-backup. Backup + status only; the
// restore flow (which restarts the app to swap the live DB) lives in the Recovery
// tab, so the self-referential restart stays in one place.
// ---------------------------------------------------------------------------

export function Config() {
  const { t } = useT();
  // D-01 double gate (the Containers/VMs/Flash mount-discipline precedent):
  // the desktop JSX below is always rendered and carries `max-md:hidden`, so
  // the desktop presentation stays byte-identical; the mobile card block
  // mounts only under `!isDesktop`. jsdom's matchMedia stub answers "desktop",
  // so Config.autosave.dom.test.tsx keeps testing the desktop page and the
  // mobile block is an e2e-only surface. The block owns every mobile-only
  // fetch (the settings gate, /api/schedule/next) inside itself, so the
  // desktop makes no new requests.
  const isDesktop = useIsDesktop();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [source, setSource] = useState<RepoSource>("local");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const progressMap = useProgress();
  const progress = progressMap["config"];
  // Any backup/restore/replication in flight (any domain) disables the config
  // backup button + shows a hint, instead of relying on the 409 round-trip.
  const running = anyActive(progressMap);

  useEffect(() => {
    getSettings()
      .then((res) => {
        if (res.ok) setSettings(res.settings);
      })
      .catch(() => undefined);
  }, []);

  function load() {
    setError(null);
    return listConfigSnapshots(source)
      .then((res) => {
        if (res.ok) setSnapshots(res.snapshots ?? []);
        else setError(res.error ?? t("config.loadBackupsFailed"));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : t("config.loadBackupsFailed"))
      );
  }

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return (
    // PAGE_SHELL (jdp live-review: "Im Tab Selbst-Backup und Flash sind die
    // Cards schmaler. Können wir die nicht überall gleich breit machen?").
    // This page — "Selbst-Backup" — is one of the two he named: it was
    // max-w-3xl (768px) against 1024px on five pages and 1152px on Dashboard,
    // the narrowest in the app. The gap here was already the correct 40px
    // from an earlier round; only the width changes. See lib/pageShell.ts for
    // the full before/after measurement table and why 1152px won.
    //   The heading is a single bare `<h1>+<p>` div with no tab-strip or
    // indicator row that needs a tighter gap of its own, so the one flat
    // PAGE_SHELL gap governs every gap on the page (heading→Card 1, 1→2,
    // 2→3) — no nested sub-wrapper needed the way Dashboard/Settings have.
    <div className={PAGE_SHELL}>
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-carbon-text">{t("config.title")}</h1>
        <p className="mt-1 text-sm text-carbon-textSub">{t("config.subtitle")}</p>
      </div>

      {/* Settings card — desktop only (the mobile block hosts its own toggle
          on the same write chain). The wrapper div rather than a className
          prop: ConfigSettingsCard predates the mobile language and takes no
          layout props; the wrapper keeps the desktop DOM one structural div
          wider and nothing else. */}
      {settings && (
        <div className="max-md:hidden">
          <ConfigSettingsCard t={t} settings={settings} setSettings={(u) => setSettings((prev) => (prev ? u(prev) : prev))} hueIndex={0} />
        </div>
      )}

      {/* Backup card. GlimStone follow-up pass ("half-overlap card notch"):
          split into an outer structural `relative` div (hosting the heading
          Badge, now `position: absolute`) + this same inner
          `relative overflow-hidden` div (unchanged, still the box
          ProgressBar.tsx documents clipping itself to) — the inner div's own
          overflow-hidden would otherwise clip the badge's -11px poke above
          it, so the badge needed to move outside that clipping box; see
          Badge.tsx's badgeClassName comment and Dashboard.tsx's Card() for
          the identical split. */}
      {/* `glim-notch-card` on this OUTER div, not the inner overflow-hidden
          box: the badge itself lives here (see the split's own comment
          above), so this is the element that has to be the hover/focus zone
          for index.css's card-wide reactive-hover rule — see Settings.tsx's
          Card() for the full reasoning. Its own bounding box is still
          exactly the visible card (h2 + the inner box beneath it), so this
          doesn't change what "hovering the card" looks like. */}
      {/* GlimStone follow-up pass (jdp, live review, root-mechanism fix
          replacing this file's own earlier `ps-5`-on-the-h2 patch): the
          outer div is deliberately unpadded (see the split comment above),
          which leaves Badge.tsx's own CSS static-position fallback measuring
          the badge's horizontal position against THIS outer div's bare edge
          instead of the inner p-5 box's content edge — the same bug this
          page ONCE fixed by adding `ps-5` to the `<h2>` alone (a real fix,
          but a per-call-site padding patch a future edit to this div could
          silently un-fix again). Replaced with `insetStart={5}` on the Badge
          itself: an explicit, self-documenting override at the ONE place
          that actually knows the inner box's own padding number — see
          Badge.tsx's own `insetStart` doc for the full mechanism and its
          other real call sites (Flash.tsx's identical Backup Card,
          Dashboard.tsx's Card() and SummaryCell(), all independently hit the
          identical mismatch).
          Also folds the permanent backupHint <p> into an InfoBubble on the
          Badge (same "Infotexte in Infobubbles" fix as Flash.tsx's sibling
          backup Card, same content, same onAccent). */}
      {/* `.glim-hue` added (rainbow-mode completeness sweep, jdp live review:
          "Es sind nicht alle Buttons in den Regenbogen-Modus eingepflegt"):
          `glim-notch-card` alone never redefines --accent/--focus-ring, only
          the reactive-mode hover reveal — so ConfigBackupButton's own
          bg-accent button below stayed flat regardless of rainbow. Same
          hueIndex={1} the Badge already uses; the inner overflow-hidden box
          inherits it too via ordinary CSS custom-property cascade. */}
      <div className="relative glim-notch-card glim-hue max-md:hidden" style={hueVars(rainbowAt(1)) as CSSProperties}>
        <h2 className="flex items-center">
          <Badge tone="heading" size="heading" wrap hueIndex={1} insetStart={5}>
            {t("config.backupTitle")}
            <InfoBubble tip={tLtr(t, "config.backupHint")} onAccent />
          </Badge>
        </h2>
        <div className="relative overflow-hidden bg-carbon-surface rounded-card p-5 flex flex-col gap-4">
          {/* jdp live-review: "der Button ... ganz rechts angeordnet" — the
              badge is the row's only content, right-aligned via justify-end.
              This app's established "push to the row's far edge" idiom is
              `ms-auto` on the badge itself when it shares a row with a leading
              sibling (see Containers.tsx's BackupButton/ExportButton row), but
              there is no leading sibling here, so justify-end on the row gets
              the identical flush-right result with nothing to push away from —
              byte-identical to how Flash.tsx's own backup card does it. */}
          <div className="flex justify-end">
            <ConfigBackupButton
              t={t}
              onBackedUp={() => void load()}
              externallyBusy={running.active}
              busyPhase={running.phase}
            />
          </div>

          {/* Stop a backup that is running (#200), gated exactly as on the
              Folders page: not on a RESTORE, which has its own control with its
              own warning, and only while the run is active. The server has
              accepted this key all along; only the button was missing. */}
          {progress && progress.active && progress.phase !== "restore" && (
            <div className="flex justify-end">
              <BackupCancelButton cancelKey={"config"} name={t("nav.config")} t={t} />
            </div>
          )}

          {/* Live backup/restore progress, pinned to the card's bottom edge */}
          {progress && (
            <ProgressBar percent={progress.percent} active={progress.active} />
          )}
        </div>
      </div>

      {/* Snapshots card — list + delete; restoring settings lives in Recovery.
          `glim-notch-card`: see Settings.tsx's Card() for the reasoning.
          `.glim-hue` added (rainbow-mode completeness sweep, jdp live
          review): same hueIndex={2} the Badge already uses — ConfigSnapshotRow's
          own delete button inherits it via the ordinary custom-property
          cascade, no per-row change needed. */}
      <div
        className="relative glim-notch-card glim-hue bg-carbon-surface rounded-card p-5 flex flex-col gap-4 max-md:hidden"
        style={hueVars(rainbowAt(2)) as CSSProperties}
      >
        {/* jdp live-review ("Infotexte in i Infobubbles"): this used to be a
            permanent bg-statusNeutralBg banner (Task 7 had already folded
            its COLOUR from the old fifth "info" hue into neutral, but kept
            the banner FORM — pure informational prose, not a live status
            readout, exactly rule 8's "read once, costs vertical space
            forever" case). Same content (`config.snapshotsHint`), now an
            InfoBubble on the heading Badge instead — the identical fix
            Flash.tsx's own Restore card (this page's direct sibling) just
            got for its own restoreNote banner. */}
        <h2 className="flex items-center">
          <Badge tone="heading" size="heading" wrap hueIndex={2}>
            {t("config.snapshotsTitle")}
            <InfoBubble tip={t("config.snapshotsHint")} onAccent />
          </Badge>
        </h2>

        {/* jdp live-review ("Tab Selbst-Backup: Info-Texte bitte in i
            Infobubbles"): `source.hint` used to render as a permanent
            `text-caption` <p> under this row — precisely rule 8's "read once,
            costs vertical space forever" case. Now an InfoBubble on the
            "Quelle" label, byte-identical in form to how Flash.tsx's own copy
            was converted in 63f53d5. The wrapping `flex flex-col gap-1` div
            goes with it: with the <p> gone it wrapped a single child.
              Swept in the SAME pass, not deferred again: this string sat as
            an identical permanent <p> at three FURTHER call sites
            (components/RestorePanel.tsx = the Containers tab's per-container
            panel, pages/VMs.tsx, pages/Files.tsx), all four converted
            together. 63f53d5 explicitly recorded them as "left for a future
            round" — fixing only the tab jdp happened to name is what turned
            this into a four-round defect in the first place. Zero new i18n
            keys; `source.hint` is already translated in all 42 locales. */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-carbon-textMuted">
            {t("source.label")}
            <InfoBubble tip={t("source.hint")} />
          </span>
          <SourceToggle source={source} onChange={setSource} disabled={loading} domain="config" />
        </div>

        {loading && <p className="text-xs text-carbon-textMuted">{t("dashboard.checking")}</p>}
        {error && <p className="text-xs text-statusFail">{error}</p>}
        {!loading && !error && snapshots.length === 0 && (
          <p className="text-xs text-carbon-textMuted">{t("config.none")}</p>
        )}
        {!loading && snapshots.length > 0 && (
          <div className="rounded-card bg-carbon-background px-3 py-1">
            {snapshots.map((snap) => (
              <ConfigSnapshotRow
                key={snap.id}
                snap={snap}
                source={source}
                onDeleted={() => void load()}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* D-01 second gate: the mobile card block. Mounted ONLY under !isDesktop
          (not just hidden) so the desktop makes no new requests and its DOM and
          network traffic stay identical — the block owns every mobile-only
          fetch (the settings gate, /api/schedule/next) inside itself. The
          SNAPSHOT data is shared with the desktop cards' own load() — one
          fetch, two presentations. */}
      {!isDesktop && (
        <MobileConfigBlock
          snapshots={snapshots}
          loading={loading}
          error={error}
          onRetry={() => void load()}
          running={running}
          progress={progress}
          onRefresh={() => void load()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile Config block (07-04, MORE-01b) — the Self-Backup page's card
// presentation below the 48rem breakpoint (D-01's second gate; the
// mount-discipline comment on Config() above is the other half).
//
// WHY A SEPARATE COMPONENT (the VMs/Flash block reasoning, verbatim in
// spirit): the block owns every mobile-only fetch — the destinations gate
// (getSettings → settings.configEnabled) and the D-06 next-fire read
// (getScheduleNext filtered to the config domain) — and because the desktop
// never mounts this component, the desktop makes no new requests and its DOM
// and network traffic stay identical.
//
// OFFSITE INDICATOR: the plan scopes it to "exactly where the desktop surface
// speaks offsite" — and the desktop Self-Backup page never does (its off-site
// card has lived in Settings › Off-site since #176, per config.offsiteMoved).
// So unlike the Flash hero, this status card renders no OffsiteIndicator —
// there is no desktop counterpart position to mirror.
//
// WRITES: the toggle and the schedule sheet serialize on ONE local
// queueSettingsWrite promise chain, re-fetch the latest settings at SEND time
// and merge ONLY the field the surface owns (T-07-13 — the desktop
// ConfigSettingsCard.persist / Settings.tsx save shape; Flash's MobileZipSheet
// kept the same shape local for the identical reason). Success dispatches
// "bv:settings-changed" so the mobile chrome (bottom bar / More sheet) drops
// or restores the Config tab immediately — Layout listens for exactly this
// event; the desktop page has no self-gating chrome and has never dispatched
// it, so that dispatch is mobile-only code.
// ---------------------------------------------------------------------------
function MobileConfigBlock({
  snapshots,
  loading,
  error,
  onRetry,
  running,
  progress,
  onRefresh,
}: {
  /** The page's own snapshot list — one fetch, two presentations. */
  snapshots: Snapshot[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  running: { active: boolean; phase?: string };
  progress?: { percent: number; active: boolean };
  onRefresh: () => void;
}) {
  const { t } = useT();
  const { push } = useToast();

  // GATE-OFF HONESTY (the VMs/Flash contract): an unknown gate state reads as
  // "on" — a failed settings fetch renders the real surface (whose own error
  // paths are honest) rather than ever claiming the domain is disabled when
  // we simply don't know.
  const [gate, setGate] = useState<"unknown" | "on" | "off">("unknown");
  // The toggle + schedule entry read their values from this same fetch — no
  // second settings read. Optimistic flips revert on a failed write.
  const [enabled, setEnabled] = useState(true);
  const [configSchedule, setConfigSchedule] = useState("off");
  const [enabledBusy, setEnabledBusy] = useState(false);
  // GlimStone standing rule (jdp, live review, emphatic, system-wide): a
  // failed action toasts AND shakes its control.
  const [enabledShake, setEnabledShake] = useState(0);
  const settingsWrites = useRef<Promise<unknown>>(Promise.resolve());

  // Serialize every write on ONE chain that never rejects (Settings.tsx's
  // queueSettingsWrite shape, kept local — same call Flash.tsx's
  // MobileZipSheet made for the same reason).
  function queueSettingsWrite<T>(run: () => Promise<T>): Promise<T> {
    const next = settingsWrites.current.then(run);
    settingsWrites.current = next.then(() => undefined, () => undefined);
    return next;
  }

  useEffect(() => {
    let alive = true;
    getSettings()
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setGate(r.settings.configEnabled === false ? "off" : "on");
          setEnabled(r.settings.configEnabled);
          setConfigSchedule(r.settings.configSchedule || "off");
        } else {
          setGate("on");
        }
      })
      .catch(() => {
        if (alive) setGate("on");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function persistEnabled(next: boolean) {
    const prev = enabled;
    setEnabled(next); // optimistic flip
    setEnabledBusy(true);
    try {
      await queueSettingsWrite(async () => {
        // Re-fetch at send time, merge ONLY the changed field (T-07-13) —
        // the desktop card's own persist shape, unchanged.
        const latest = await getSettings();
        if (!latest.ok) throw new Error(latest.error ?? t("config.loadSettingsFailed"));
        const res = await putSettings({ ...latest.settings, configEnabled: next });
        if (!res.ok) throw new Error(res.error ?? t("common.saveFailed"));
      });
      push(t("settings.saved"), "success");
      // Nav sync (mobile-only): configEnabled gates the Config tab in the
      // bottom bar / More sheet, so the chrome must re-read settings now.
      window.dispatchEvent(new Event("bv:settings-changed"));
    } catch (err) {
      setEnabled(prev); // revert
      setEnabledShake((n) => n + 1); // toast AND shake (GlimStone standing rule)
      push(err instanceof Error ? err.message : t("common.saveFailed"), "fail");
    } finally {
      setEnabledBusy(false);
    }
  }

  // D-06/FLOW-01: the config-domain next fire, SERVER-derived — no client
  // cadence math. scheduleTick bumps after the schedule sheet saves (the next
  // fire may have moved).
  const [scheduleNext, setScheduleNext] = useState<ScheduleNext | null>(null);
  const [scheduleTick, setScheduleTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getScheduleNext()
      .then((rows) => {
        if (alive) setScheduleNext(rows.find((r) => r.domain === "config") ?? null);
      })
      .catch(() => {
        if (alive) setScheduleNext(null);
      });
    return () => {
      alive = false;
    };
  }, [scheduleTick]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  // The mobile Fab fires the SAME watcher as the status card's trigger
  // (FlashBackupButton's fireRef precedent) — one action, one toast path.
  const fireRef = useRef<(() => void) | null>(null);

  // The newest snapshot drives the status Badge and the last-run line. Max
  // over parsed times — never an order assumption about the list payload.
  const newest =
    snapshots.length > 0
      ? snapshots.reduce((a, b) => (new Date(b.time).getTime() > new Date(a.time).getTime() ? b : a))
      : null;
  const newestUnix = newest ? new Date(newest.time).getTime() / 1000 : null;
  const progressLive = !!progress?.active;
  const scheduleActive = scheduleStatus(configSchedule) !== "off";
  // While the page fetch is in flight the card must not claim "Never" — the
  // desktop snapshots card shows the same "checking" copy for exactly this
  // reason (honesty until the data lands).
  const lastRunLine = loading
    ? t("dashboard.checking")
    : newest
      ? new Date(newest.time).toLocaleString()
      : t("containers.never");
  const statusBadge = progressLive
    ? { tone: "warn" as const, label: t("config.backingUp") }
    : newestUnix !== null
      ? { tone: "ok" as const, label: relativeTime(t, newestUnix) }
      : { tone: "neutral" as const, label: loading ? t("dashboard.checking") : t("containers.never") };

  return (
    <div className="flex flex-col gap-4 glim-content-fade">
      {/* Page-level load failure: this >=44px tonal row is the mobile recovery
          affordance; the desktop cards' own error paragraph stays hidden with
          them below md. folders.retry ("Try again") is the sanctioned existing
          label — the phase's pre-seed added no retry key (07-02). */}
      {error && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[2.75rem] w-full rounded-control bg-carbon-surface2 px-4 text-sm text-carbon-text"
        >
          {t("folders.retry")}
        </button>
      )}

      {gate === "off" ? (
        // The destinations gate, mobile face (the VMs/Flash contract): the
        // block says plainly that self-backup is off and links to the
        // settings row that turns it on.
        <div>
          <MobileSectionLabel t={t} labelKey="settings.configEnabled" />
          <div className="mt-2 flex flex-col gap-2 rounded-card border border-carbon-border bg-carbon-surface p-4">
            <p className="text-sm text-carbon-textSub">{t("settings.configEnabledHint")}</p>
            <Link
              to="/settings"
              className="flex min-h-[2.75rem] items-center rounded-control bg-carbon-surface2 px-4 text-sm text-carbon-text"
            >
              {t("nav.settings")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Status card (hue 0) — the card language over the SAME data the
              desktop backup card reads: status Badge (live backup wins, else
              the newest snapshot's relative age, else "Never"), last-run
              line, the page's ONE accent reservation (the existing
              ConfigBackupButton trigger, which the Fab also fires through
              fireRef), and the live ProgressBar. */}
          <div
            className="glim-hue glim-content-fade relative flex flex-col gap-2 overflow-hidden rounded-card bg-carbon-surface p-4"
            style={hueVars(rainbowAt(0)) as CSSProperties}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-carbon-surface2 text-carbon-textSub"
              >
                <IconBackupNow />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-carbon-text">{t("config.backupTitle")}</p>
                <p className="truncate text-xs text-carbon-textMuted">
                  {`${t("containers.lastBackup")}: ${lastRunLine}`}
                </p>
              </div>
              <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
            </div>
            <div className="flex justify-end">
              <ConfigBackupButton t={t} onBackedUp={onRefresh} externallyBusy={running.active} busyPhase={running.phase} fireRef={fireRef} />
            </div>
            {progress && <ProgressBar percent={progress.percent} active={progress.active} />}
          </div>

          {/* The configEnabled autosave toggle (the desktop settings card's
              own row, on the same write chain). */}
          <div className="rounded-card bg-carbon-surface p-4">
            <ToggleRow
              label={t("config.enabled")}
              checked={enabled}
              onChange={(v) => void persistEnabled(v)}
              disabled={enabledBusy}
              shakeNonce={enabledShake}
            />
          </div>

          {/* Schedule entry row → the fullHeight CadenceBuilder sheet. Tonal,
              never accent — the status card's trigger owns this surface's one
              accent reservation. Right side: the SERVER-derived next-fire
              chip (D-06, accent-soft) when the schedule is active and the
              server reports a fire, else the ScheduleBadge state label. */}
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            aria-expanded={scheduleOpen}
            className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-control bg-carbon-surface2 px-4 py-2 text-start text-sm text-carbon-text"
          >
            <span className="truncate">{t("settings.schedulesSelfBackup")}</span>
            <span className="flex shrink-0 items-center gap-2">
              {scheduleActive && scheduleNext ? (
                <span className="rounded-pill bg-accentSoft px-2 py-1 text-xs font-semibold text-accentText">
                  {new Date(scheduleNext.next).toLocaleString()}
                </span>
              ) : null}
              <ScheduleBadge
                status={scheduleStatus(configSchedule)}
                label={scheduleActive ? cadenceLabel(configSchedule, t) : t("jobs.notScheduled")}
              />
            </span>
          </button>

          {/* Restore entry: a tonal row (restore entries NEVER render accent
              — the plan's explicit prohibition) opening the guard-chain
              restore sheet. */}
          <button
            type="button"
            onClick={() => setRestoreOpen(true)}
            aria-expanded={restoreOpen}
            className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-control bg-carbon-surface2 px-4 py-2 text-start text-sm text-carbon-text"
          >
            <span className="truncate">{t("recovery.stepConfig")}</span>
          </button>
        </>
      )}

      {/* PLAT-01 / D-12: the surface's ONE accent reservation hosts its ONE
          primary action — the self-backup, the same watcher the status card's
          trigger uses (fireRef). Renders null under cupertino (the Fab's
          documented platform contract). */}
      {!error && gate !== "off" && (
        <div className="flex justify-end pt-1">
          <Fab
            label={t("config.backupNow")}
            icon={<IconBackupNow />}
            onClick={() => {
              if (!running.active) fireRef.current?.();
            }}
          />
        </div>
      )}

      {/* The schedule sheet (D-05/D-06 fullHeight) and the guard-chain
          restore sheet (D-04 content-sized) — component-local, hosted here. */}
      <MobileScheduleSheet
        open={scheduleOpen}
        schedule={configSchedule}
        onClose={() => setScheduleOpen(false)}
        onSaved={(next) => {
          setConfigSchedule(next);
          setScheduleTick((n) => n + 1);
        }}
      />
      <MobileRestoreSheet open={restoreOpen} onClose={() => setRestoreOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileScheduleSheet — the self-backup schedule below the breakpoint: the
// SAME CadenceBuilder the desktop Settings › Schedules card renders (default
// modes — a domain schedule accepts everyN; the #166 exact-cadence restriction
// is a per-item override rule), with an explicit apply in the StickyActionBar
// riding the ONE settings write chain (see MobileConfigBlock's header).
// ---------------------------------------------------------------------------
function MobileScheduleSheet({
  open,
  schedule,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** The stored cadence string — the draft is seeded from it on open. */
  schedule: string;
  onClose: () => void;
  /** A save landed: the entry row's badge + the next-fire chip refresh. */
  onSaved: (next: string) => void;
}) {
  const { t } = useT();
  const { push } = useToast();
  const [draft, setDraft] = useState(schedule);
  const [seededFor, setSeededFor] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(0);
  const settingsWrites = useRef<Promise<unknown>>(Promise.resolve());

  function queueSettingsWrite<T>(run: () => Promise<T>): Promise<T> {
    const next = settingsWrites.current.then(run);
    settingsWrites.current = next.then(() => undefined, () => undefined);
    return next;
  }

  // Seed the draft from the stored value on every open (CadenceBuilder
  // re-parses when `value` changes externally, so re-seeding per open is
  // what keeps the builder honest if another surface saved meanwhile).
  useEffect(() => {
    if (open && seededFor !== open) {
      setSeededFor(open);
      setDraft(schedule);
    }
    if (!open && seededFor !== null) setSeededFor(null);
  }, [open, seededFor, schedule]);

  async function applySchedule() {
    setSaving(true);
    try {
      const toStore = draft.trim() === "" ? "off" : draft.trim();
      await queueSettingsWrite(async () => {
        // Re-fetch at send time, merge ONLY configSchedule (T-07-13) —
        // a full-object PUT of a captured snapshot could re-assert a stale
        // value for any field owned by another surface (the exact clobber
        // the desktop schedule move to Settings was made to end).
        const latest = await getSettings();
        if (!latest.ok) throw new Error(latest.error ?? t("config.loadSettingsFailed"));
        const res = await putSettings({ ...latest.settings, configSchedule: toStore });
        if (!res.ok) throw new Error(res.error ?? t("common.saveFailed"));
      });
      push(t("settings.saved"), "success");
      onClose();
      onSaved(toStore);
      // Chrome sync (mobile-only) — see MobileConfigBlock's header.
      window.dispatchEvent(new Event("bv:settings-changed"));
    } catch (err) {
      setShake((n) => n + 1); // toast AND shake (GlimStone standing rule)
      push(err instanceof Error ? err.message : t("common.saveFailed"), "fail");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("settings.schedulesSelfBackup")} fullHeight>
      <div className="flex min-h-full flex-col">
        <div className="pt-4">
          <CadenceBuilder
            label={t("settings.schedulesSelfBackup")}
            value={draft}
            onChange={setDraft}
          />
        </div>
        <div className="min-h-4 flex-1" />
        <StickyActionBar>
          <Button
            label={t("common.cancel")}
            labelKey="common.cancel"
            tone="neutral"
            onClick={onClose}
            disabled={saving}
            className="w-full"
          />
          <Button
            key={shake}
            label={t("common.done")}
            labelKey="common.done"
            tone="accent"
            onClick={() => void applySchedule()}
            busy={saving}
            disabled={saving}
            className={`w-full ${shake ? "glim-shake" : ""}`}
          />
        </StickyActionBar>
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// MobileRestoreSheet — the config restore's mobile face (T-07-12): the D-03
// guard chain rendered READ-ONLY, in order, ABOVE an outcome-naming confirm —
// the chain is never collapsed behind a single confirm. The confirm reuses
// the EXISTING desktop copy (`recovery.configRestore`), and the call it fires
// is the SAME one Recovery.tsx's trigger fires (restoreConfig("latest")) —
// the sheet narrates the frozen chain; it never re-implements restore logic.
// Content-sized (no fullHeight): D-04's viewer rule.
// ---------------------------------------------------------------------------
type RestorePhase = "idle" | "saving" | "restarting" | "manual" | "reload" | "error";

function MobileRestoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { push } = useToast();
  const [phase, setPhase] = useState<RestorePhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  // Recovery.tsx's own classifier (module-local there, same one-line shape):
  // an APP_KEY mismatch gets the mapped remedy instead of the raw error.
  function isKeyMismatch(err: string | undefined): boolean {
    return !!err && /APP_KEY/i.test(err);
  }

  async function runRestore() {
    setPhase("saving");
    setMessage(null);
    try {
      const res = await restoreConfig("latest");
      if (!res.ok || !res.staged) {
        // An APP_KEY mismatch surfaces as Recovery's mapped remedy; anything
        // else is the backend's own scrubbed message verbatim.
        const msg = res.ok
          ? res.error ?? t("settings.error")
          : isKeyMismatch(res.error)
            ? t("recovery.appKeyRemedy")
            : res.error ?? t("settings.error");
        setMessage(msg);
        setPhase("error");
        setShake((n) => n + 1);
        push(msg, "fail");
        return;
      }
      if (res.autoRestart) {
        // BombVault restarts itself to apply the staged restore; poll until
        // it answers again, then reload (Recovery's own flow, waitForAppBack
        // shared verbatim from api.ts).
        setPhase("restarting");
        const back = await waitForAppBack();
        if (back) {
          window.location.reload();
        } else {
          setPhase("reload");
        }
      } else {
        // Docker socket unreachable: the restore is staged, the user must
        // restart the container themselves.
        setPhase("manual");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("settings.error");
      setMessage(msg);
      setPhase("error");
      setShake((n) => n + 1);
      push(msg, "fail");
    }
  }

  const busy = phase === "saving" || phase === "restarting";

  return (
    <BottomSheet open={open} onClose={onClose} title={t("recovery.stepConfig")}>
      <div className="flex flex-col gap-4 pt-4">
        <p className="text-sm font-semibold text-carbon-text">{t("config.restoreChain.title")}</p>
        {/* The D-03 chain: a real numbered <ol>, 12px step text, rendered
            BEFORE the confirm control below (DOM order = reading order — the
            e2e asserts the five <li> precede the confirm). */}
        <ol className="list-decimal space-y-2 ps-5 text-xs leading-relaxed text-carbon-textSub">
          <li>{t("config.restoreChain.step1")}</li>
          <li>{t("config.restoreChain.step2")}</li>
          <li>{t("config.restoreChain.step3")}</li>
          <li>{t("config.restoreChain.step4")}</li>
          <li>{t("config.restoreChain.step5")}</li>
        </ol>

        {/* Post-confirm states — Recovery's own keys and shapes, mobile-sized. */}
        {phase === "restarting" && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-accentText">{t("recovery.configRestarting")}</p>
            <Badge as="button" onClick={() => window.location.reload()} tone="neutral" size="small" className="self-start">
              {t("recovery.configReload")}
            </Badge>
          </div>
        )}
        {phase === "manual" && (
          <div className="rounded-card bg-statusWarnBg px-4 py-2 text-xs text-statusWarn leading-relaxed">
            {t("recovery.configManualRestart")}
          </div>
        )}
        {phase === "reload" && (
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
        {phase === "error" && message && (
          <div className="rounded-card bg-statusFailBgSoft px-4 py-2 text-xs text-statusFail leading-relaxed wrap-break-word">
            {message}
          </div>
        )}
      </div>

      <div className="min-h-4" />
      <StickyActionBar>
        <Button
          label={t("common.cancel")}
          labelKey="common.cancel"
          tone="neutral"
          onClick={onClose}
          disabled={busy}
          className="w-full"
        />
        <Button
          key={shake}
          label={t("recovery.configRestore")}
          labelKey="recovery.configRestore"
          tone="accent"
          onClick={() => void runRestore()}
          disabled={busy}
          busy={busy}
          title={busy ? t("recovery.configRestoring") : undefined}
          className={`w-full ${shake ? "glim-shake" : ""}`}
        />
      </StickyActionBar>
    </BottomSheet>
  );
}
