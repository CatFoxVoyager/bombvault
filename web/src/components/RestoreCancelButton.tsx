// ---------------------------------------------------------------------------
// RestoreCancelButton — cancel an in-flight restore, with a type-aware confirm.
//
// The confirmation text depends on the restore's ACTUAL destination:
//   - in-place (original locations): the hard warning — the target is left
//     partially restored and must be restored again to be usable.
//   - to a chosen folder (non-destructive): the light warning — the partial
//     output folder is simply left as-is.
//
// On confirm it POSTs POST /api/restore/cancel with the restore's exact progress
// key ("container:<name>" / "vm:<name>" / "stack:<project>"). Cancelling maps to a
// recorded "cancelled" run (not a failure); the fire-and-watch surfaces the
// neutral cancelled banner.
// ---------------------------------------------------------------------------

import { useState, type MutableRefObject } from "react";
import { cancelRestore } from "../lib/api";
import type { useT } from "../lib/i18n";
import { useConfirm } from "../lib/useConfirm";
import { Button } from "./Button";

type T = ReturnType<typeof useT>["t"];

export function RestoreCancelButton({
  cancelKey,
  inPlace,
  name,
  t,
  cancelledRef,
}: {
  /** The exact progress key the backend registered this restore under. */
  cancelKey: string;
  /** True for a destructive in-place restore (hard warning); false for a
   *  restore-to-a-folder (light warning). */
  inPlace: boolean;
  /** Human name substituted into the in-place warning ({name}). */
  name: string;
  t: T;
  /** Paired watch's cancelled flag: set true on a successful cancel so a no-run
   *  restore finishes "cancelled", not a green "Restored". */
  cancelledRef?: MutableRefObject<boolean>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  async function handle() {
    const msg = inPlace
      ? t("restore.cancelConfirmInPlace").replace(/\{name\}/g, name)
      : t("restore.cancelConfirmSafe");
    // The hard/light distinction lives entirely in the MESSAGE, and it always
    // did: restore.cancelConfirmInPlace says the target is left partially
    // restored and has to be restored again, restore.cancelConfirmSafe says
    // nothing was touched. The dialog used to colour itself to match, red
    // against amber, and GlimStone 1.12.0 took that away - what warns is the
    // question, and a colour cannot say more than the sentence above it.
    // `inPlace` is still what picks the sentence, which is the part that
    // carried the meaning all along.
    if (!(await confirm(msg))) return;
    setCancelling(true);
    try {
      await cancelRestore(cancelKey);
      // The cancel was accepted server-side: mark it so the watch's no-run
      // fallback reports "cancelled" instead of a phantom success.
      if (cancelledRef) cancelledRef.current = true;
    } catch {
      // A failed cancel POST leaves the restore running; the button stays
      // available to retry. The watch remains the source of truth for the outcome.
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      {/* NO bespoke red hover (whole-app sweep). This carried
          `hover:bg-statusFailBg hover:text-statusFail` — a colourless button
          at rest that flashed red under the cursor. That is the SAME
          treatment already removed from RestorePanel's delete badge,
          Config's snapshot rows, Files' per-snapshot delete and Flash's and
          VMs' own row actions (each of those call sites names it verbatim as
          the defect: "a plain text button whose only colour was a bespoke
          hover:bg-statusFailBg hover:text-statusFail red flash"). This was
          the last surviving copy — grepped across web/src to confirm.
            Nothing is lost by dropping it: the destructive weight of
          cancelling a restore is carried by the confirm dialog handle()
          already opens, which itself still uses the hard/light tone split
          (fail for an in-place restore, warn for a restore-to-a-folder) —
          that dialog tone is a STATUS surface and stays exactly as it was.
          Only this trigger's own bespoke hover colour goes. */}
      <Button
        label={t("restore.cancel")}
        labelKey="restore.cancel"
        tone="neutral"
        onClick={() => void handle()}
        disabled={cancelling}
        busy={cancelling}
        title={cancelling ? t("restore.cancelling") : undefined}
        className="self-start"
      />
      {confirmDialog}
    </>
  );
}
