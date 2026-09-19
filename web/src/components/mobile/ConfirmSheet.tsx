import { useId } from "react";
import { Button } from "../Button";
import { IconCancel } from "../glyphs";
import { BottomSheet } from "./BottomSheet";

// The tone union the desktop ConfirmDialog dropped (GlimStone 1.12.0: no
// status colour on the commit button). The mobile sheet keeps it ON PURPOSE —
// a destructive confirm surfaces as the danger Button here — so the type is
// owned and exported HERE now; useConfirm imports it from this file.
export type ConfirmTone = "fail" | "warn";

// ---------------------------------------------------------------------------
// ConfirmSheet — the MOBILE presentation half of useConfirm.
//
// useConfirm's ONE promise API (`confirm(message) -> Promise<boolean>`)
// previously had exactly one face: ConfirmDialog, the centered desktop card.
// Below the 48rem breakpoint that card is the wrong shape twice over — it
// asks for a precise click on two side-by-side buttons, and its max-w-md
// card ignores everything a thumb-reachable surface has to own (safe-area
// insets, the 44px touch floor, chrome that stays put). So the stateful half
// (lib/useConfirm.tsx) keeps its exact contract and swaps the PRESENTATION
// half on useIsDesktop: desktop gets ConfirmDialog byte-identically (not one
// class token may move), narrow viewports get this sheet. Same promise, same
// settle paths, same translated strings — only the surface changes.
//
// Hookless and portal-less by construction, same doctrine as ConfirmDialog
// itself: everything modal lives in the stateful half or in BottomSheet (the
// sheet primitive), so this file is props in, an element tree out. The
// sheet's containment machinery (portal, Escape, Tab trap, focus capture and
// restore) is BottomSheet's; useConfirm's own Escape listener fires too, and
// that is benign — settle() nulls its resolver on first call, so the double
// dispatch resolves the promise exactly once (asserted in
// ConfirmSheet.dom.test.tsx).
//
// The action stack follows the desktop card's rule on a vertical axis: the
// forward action comes LAST. Both buttons live in BottomSheet's footer slot
// — pinned below the scrolling message, never scrolled away — and the
// confirm sits at the very bottom, under the thumb's resting arc, with
// cancel above it. Both stand on the key-control height (the glim-btn-key
// stage, --btn-h-key): a thumb-first surface hands its commit button the
// tallest sanctioned box, not the default control height.
//
// The message is aria-describedby from the dialog panel — ConfirmDialog
// parity: screen readers announce the question, not just the title, when
// focus lands inside the sheet. The message element's id (useId, so sheets
// can coexist) is handed to the primitive through its describedBy prop.
// ---------------------------------------------------------------------------
export interface ConfirmSheetProps {
  /** Same generic window title ConfirmDialog takes (t("confirmDialog.title")). */
  title: string;
  /** The exact per-call-site copy passed to confirm() — unchanged, mechanism swap only. */
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Fault-red for irreversible actions (the default), warn-amber for the
   *  "light" branch — the ConfirmTone union, passed straight through to both
   *  the panel surface (BottomSheet's tone) and the confirm Button. */
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "fail",
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const messageId = useId();
  return (
    <BottomSheet
      open
      onClose={onCancel}
      title={title}
      tone={tone}
      describedBy={messageId}
      // Stacked actions in BottomSheet's footer slot: chrome pinned while the
      // message scrolls, safe-area bottom inset owned by the primitive. The
      // consumer padding is vertical only — the footer already owns the
      // inset-clamped sides. Cancel above, confirm last (under the thumb);
      // both on the key-control height.
      footer={
        <div className="flex flex-col gap-3 py-3">
          <Button
            label={cancelLabel}
            labelKey="common.cancel"
            glyph={<IconCancel />}
            tone="neutral"
            onClick={onCancel}
            className="glim-btn-key w-full"
          />
          {/* bv-convention-exception: no-status-color-on-control -- the same
              sanctioned exception as ConfirmDialog's confirm button, cited by
              the design language itself: "the destructive control is always
              the fault colour". The guard exists to stop bespoke red on
              arbitrary controls; the ONE place status colour IS the meaning is
              the destructive confirmation, and this is its mobile face —
              tone is the closed ConfirmTone union, so no third shade can
              drift in. */}
          <Button
            label={confirmLabel}
            // The confirm button's meaning changes with the action it confirms
            // (delete, prune, overwrite), so no fixed translation key can pick
            // its glyph — ConfirmDialog passes the identical null. The
            // destructive control is never default-focused (no autoFocus; the
            // open effect lands on the header close button).
            labelKey={null}
            tone={tone === "fail" ? "danger" : "warn"}
            onClick={onConfirm}
            className="glim-btn-key w-full"
          />
        </div>
      }
    >
      {/* The message — ConfirmDialog's exact text treatment; the sheet body
          owns no content padding, so the consumer supplies it (the primitive's
          documented contract). Side padding stays OFF the content: the
          primitive's body is already inset-clamped, so a px here would double
          it; the block owns only its vertical breathing room. */}
      <div className="py-4">
        <p id={messageId} className="text-sm leading-relaxed text-carbon-textSub wrap-break-word">{message}</p>
      </div>
    </BottomSheet>
  );
}
