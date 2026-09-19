// ConfirmDialog is the app's styled replacement for window.confirm(): a modal
// card with a header, a scrolling message and a Cancel/Confirm footer. The
// backdrop, the header close button and Cancel all call onCancel.
//
// It is a pure component, so tests can call it without a DOM. The stateful
// half (request queue, promise, portal, Escape, focus trap and focus return)
// lives in lib/useConfirm.tsx, which has to handle keys even after focus has
// left the dialog.
import type { ReactNode, Ref } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { IconClose } from "./Sidebar";
import { IconCancel } from "./glyphs";

export interface ConfirmDialogProps {
  /** A generic title such as t("confirmDialog.title"); the question itself
   *  goes in `message`. */
  title: string;
  message: string;
  confirmLabel: string;
  /** Translation key behind `confirmLabel`, so the confirm button can pick
   *  a glyph. A composed or data label has none. */
  confirmLabelKey?: string;
  cancelLabel: string;
  /** Accessible name of the header close button, separate from cancelLabel
   *  so the two controls are not announced alike. Leave it out to draw no
   *  close button, since two controls that both cancel read as a choice
   *  between two answers. */
  closeLabel?: string;
  /** Glyph for a confirm label that has no translation key to pick one
   *  from. Wins over `confirmLabelKey`. */
  confirmGlyph?: ReactNode;
  /** A slot under the message for a control the action needs an answer to,
   *  such as a switch for "also remove X". Keep it to a switch or two. */
  extra?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  /** The dialog card's root DOM node, for useConfirm.tsx's focus trap. */
  ref?: Ref<HTMLDivElement>;
}
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmLabelKey,
  cancelLabel,
  closeLabel,
  confirmGlyph,
  extra,
  onConfirm,
  onCancel,
  ref,
}: ConfirmDialogProps) {
  return (
    <div
      className="glim-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmdialog-title"
        aria-describedby="confirmdialog-message"
        className="glim-modal-card relative flex max-h-[85vh] w-full max-w-md flex-col rounded-card bg-carbon-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          {/* The heading Badge overlaps the card's top edge. It is positioned
              against the outer card, which has no overflow of its own, so it
              is not clipped; see Badge.tsx. */}
          <h2 id="confirmdialog-title" className="flex items-center">
            <Badge tone="heading" size="heading" wrap>{title}</Badge>
          </h2>
          {closeLabel !== undefined && (
            <Button
              label={closeLabel}
              labelKey="common.close"
              glyph={<IconClose />}
              tone="neutral"
              onClick={onCancel}
              className="shrink-0"
            />
          )}
        </div>

        {/* The message is also the dialog's accessible description, so the
            stakes are announced, not just shown. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p id="confirmdialog-message" className="text-sm leading-relaxed text-carbon-textSub wrap-break-word">
            {message}
          </p>
          {/* Outside the described paragraph, so a switch is reached as a
              control rather than read out as prose. */}
          {extra !== undefined && <div className="mt-4">{extra}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <Button
            label={cancelLabel}
            labelKey="common.cancel"
            glyph={<IconCancel />}
            tone="neutral"
            autoFocus
            onClick={onCancel}
          />
          {/* Confirm looks like Cancel. The question states the stakes, and a
              red button on every delete teaches people to read past it. */}
          <Button
            label={confirmLabel}
            // The meaning changes with the action confirmed (delete, prune,
            // overwrite), so there is no fixed key.
            labelKey={confirmLabelKey ?? null}
            glyph={confirmGlyph}
            tone="neutral"
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>
  );
}
