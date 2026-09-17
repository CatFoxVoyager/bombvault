import { useState } from "react";
import type { OkEnvelope } from "../lib/api";
import type { useT } from "../lib/i18n";
import { useConfirm } from "../lib/useConfirm";
import { useToast } from "../lib/toast";
import { Button } from "./Button";

type T = ReturnType<typeof useT>["t"];

interface OrphanRemoveButtonProps {
  /** Whether the entry still has backups, read off its last-backup time. A VM
   *  entry rebuilt by Discover has no run record and, unlike a container (#44),
   *  no snapshot-time fallback, so it reads as none: the button then removes
   *  only the entry, and its snapshots stay for the next Discover to find. */
  hasBackups: boolean;
  /** Confirmation texts, already translated; each page names its own kind of item. */
  deleteConfirm: string;
  removeConfirm: string;
  /** Deletes every backup AND the entry. */
  deleteBackups: () => Promise<OkEnvelope>;
  /** Removes only the entry, never a snapshot. */
  removeEntry: () => Promise<OkEnvelope>;
  onDone: () => void;
  t: T;
}

// The one removal button on a not-installed card, shared by the Containers and
// VMs pages (#232). The two pages used to disagree: the container card offered
// only "Delete all backups" (bottom left), the VM card only "Remove entry"
// (bottom right), each whatever the entry's state.
//
// Which one shows follows from the entry. With backups it is "Delete all
// backups", because removing just the entry would leave those snapshots in the
// repository with nothing on the page pointing at them. Without backups there is
// nothing to delete, so it is "Remove entry". Taking an entry off the schedule
// while keeping its backups is the card's schedule switch, not this button.
//
// NO bespoke red, same as every other destructive action in the app: the label
// and the confirmation dialog carry the meaning. A failure toasts AND shakes.
export function OrphanRemoveButton({
  hasBackups,
  deleteConfirm,
  removeConfirm,
  deleteBackups,
  removeEntry,
  onDone,
  t,
}: OrphanRemoveButtonProps) {
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(0);
  const { push } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const failText = t(hasBackups ? "common.deleteFailed" : "common.removeFailed");

  async function run() {
    // TODO(#follow-up): once richer stake-detail copy ("N snapshots, X GB")
    // ships (deferred — needs new interpolated i18n keys across every
    // non-English locale), it renders here as extra body content passed to
    // confirm(), same as the two other flagged sites in VMs.tsx's
    // deleteAllConfirm and Files.tsx's deleteBackupsConfirm.
    if (!(await confirm(hasBackups ? deleteConfirm : removeConfirm))) return;
    setPending(true);
    try {
      const res = await (hasBackups ? deleteBackups() : removeEntry());
      if (res.ok) onDone();
      else {
        push(res.error ?? failText, "fail");
        setShake((n) => n + 1);
      }
    } catch (err) {
      push(err instanceof Error ? err.message : failText, "fail");
      setShake((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  // Two literal call sites rather than one with the key in a variable: the glyph
  // reach guard (glyphFor.reach.test.ts) reads labelKey statically, and each of
  // these keys resolves to its own mark only where it is written out.
  const shared = {
    tone: "neutral" as const,
    onClick: () => void run(),
    disabled: pending,
    busy: pending,
    title: pending ? t("dashboard.checking") : undefined,
    className: shake ? "glim-shake" : "",
  };
  return (
    <>
      {hasBackups ? (
        <Button key={shake} label={t("containers.deleteBackups")} labelKey="containers.deleteBackups" {...shared} />
      ) : (
        <Button key={shake} label={t("vms.removeEntry")} labelKey="vms.removeEntry" {...shared} />
      )}
      {confirmDialog}
    </>
  );
}
