import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Badge } from "../Badge";
import { IconClose } from "../navGlyphs";
import { useT } from "../../lib/i18n";

// ---------------------------------------------------------------------------
// BottomSheet — PRIM-01, the mobile bottom-sheet primitive (phase 05 plan 03).
//
// This is the stateful mechanism of lib/useConfirm.tsx re-expressed as a
// bottom-anchored sheet, NOT a third modal implementation. The repo's
// two-half doctrine (useConfirm.tsx ↔ ConfirmDialog.tsx, useReveal ↔
// RevealInput) is exactly how modal logic is allowed to propagate: the
// portal / document-level Escape / FOCUSABLE_SELECTOR Tab trap / focus
// restore below is lifted from useConfirm.tsx:78-149 with only the deltas a
// viewport change forces, each cited inline. A trap re-derived from scratch
// here is the documented house anti-pattern.
//
// The deltas from the ConfirmDialog mechanism, and why:
//   - The panel is bottom-anchored and capped at max-h-[85dvh] (not the
//     card's 85vh): dvh tracks mobile browser chrome that slides in and out,
//     which is the SHELL-05 viewport contract — the 100vh unit is banned from
//     the mobile shell entirely.
//   - The scroll body pads its bottom edge with var(--safe-area-bottom) so
//     content clears the home-indicator / gesture bar. The custom property
//     resolves to 0 until the shell defines the real value (plan 05).
//   - Entrance is a slide-up (translate-y-full → translate-y-0 after a double
//     requestAnimationFrame), applied under Tailwind's motion-safe: variant
//     ONLY — prefers-reduced-motion users get the sheet immediately, with no
//     transition. The glim-modal-card engine class is deliberately NOT
//     carried: its keyframe (glim-modal-in) is a 10px pop, the wrong motion
//     for a bottom-anchored surface. The scrim keeps the glim-modal-backdrop
//     fade, which ConfirmDialog applies in both motion modes.
//   - No drag-to-dismiss and no grabber handle, by plan prohibition. The
//     sheet closes via exactly three paths (scrim click, Escape, header close
//     button) and its internal scroll contains all interaction — background
//     content is unreachable through the Tab trap, so no body-scroll-lock.
//
// One deviation from the plan text, measured rather than guessed: the plan
// specifies a React 19 boolean `inert` on the scrim, but a Playwright probe
// against Chromium AND WebKit showed that inert elements are skipped in
// HIT-TESTING — a click on the scrim passes straight through to whatever sits
// behind it, which silently kills the scrim-click close path (the
// target === currentTarget guard can never fire) and worse, activates
// invisible background controls. So the scrim is `aria-hidden` instead, and
// scrim and panel are SIBLINGS inside the portal: the panel must not be a DOM
// child of an aria-hidden element, or the dialog itself would be hidden from
// assistive technology.
// ---------------------------------------------------------------------------

export interface BottomSheetProps {
  /** Whether the sheet is open. The caller owns the state; every close path calls onClose. */
  open: boolean;
  /** Called by every close path: scrim click, Escape, header close button. */
  onClose: () => void;
  /** The sheet's heading, already translated by the caller. */
  title: string;
  /** The sheet body. */
  children: ReactNode;
}

// The panel's own focusable controls, in DOM/tab order. Lifted verbatim from
// useConfirm.tsx:78-79 — same candidate set, same genericity (not hardcoded
// to the header close button, so the body can grow controls freely).
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const { t } = useT();
  const titleId = useId();
  // The panel's DOM node (for the Tab trap) and whatever had focus the moment
  // the sheet opened (to restore when it closes) — useConfirm.tsx:91-92's pair.
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Slide-up entrance: false = parked below the viewport (translate-y-full),
  // true = in place (translate-y-0). Flipped after a double rAF so the
  // browser paints the parked frame first and the transform transition
  // actually runs instead of coalescing both states into one paint.
  const [entered, setEntered] = useState(false);

  // Focus capture + initial focus-in + restore, in that order, in ONE effect.
  // Where useConfirm captures the trigger inside its confirm() callback
  // (before any re-render), a controlled component has no such call — the
  // open transition IS the entry point. There is deliberately no `autoFocus`
  // attribute anywhere: React applies autoFocus during the commit, which
  // would already have moved focus by the time this effect ran and the
  // "trigger" captured would be the sheet's own close button.
  //
  // The programmatic focus-in is ConfirmDialog parity: ConfirmDialog
  // auto-focuses its Cancel button on open (ConfirmDialog.tsx's "auto-focuses
  // the dialog's own Cancel button" note, asserted in ConfirmDialog.test.ts)
  // because focus must start INSIDE the aria-modal surface, never on the
  // now-hidden trigger behind it. The header close button is the sheet's
  // equivalent safe control.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    closeRef.current?.focus();
    const trigger = triggerRef.current;
    return () => {
      triggerRef.current = null;
      // useConfirm.tsx:112's restore, guarding the same way: a trigger that
      // unmounted while the sheet was open cannot take focus back.
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open]);

  // Escape (document-level, so it works no matter where focus currently is —
  // never an inline onKeyDown, the pattern documented broken at
  // useConfirm.tsx:25-33) + the Tab/Shift+Tab trap, lifted from
  // useConfirm.tsx:118-149 with card→panel and settle(false)→onClose().
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = focusableElements(panel);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const insidePanel = active instanceof Node && panel.contains(active);
      if (e.shiftKey) {
        if (!insidePanel || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!insidePanel || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Slide-up entrance under motion-safe: only (see the header note for why
  // the glim-modal-card pop is not used). The double rAF guarantees the
  // parked frame is painted before the flip.
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <>
      {/* The scrim: decoration, hidden from AT, the engine fade class plus the
          same black/60 as ConfirmDialog's backdrop. The click closes only when
          it landed on the scrim itself (target === currentTarget), so a click
          anywhere inside the panel bubbles through untouched —
          ConfirmDialog.tsx's exact guard. NOT `inert`: see the header
          deviation note — an inert scrim is skipped by hit-testing, so the
          click would land on whatever is BEHIND it instead of here. */}
      <div
        aria-hidden="true"
        className="glim-modal-backdrop fixed inset-0 z-50 bg-black/60"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      {/* Bottom-anchored panel — a SIBLING of the scrim, deliberately not its
          DOM child: a child of an aria-hidden element is hidden from AT, and
          role="dialog" content must never be. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-card bg-carbon-surface shadow-2xl motion-safe:transition-transform motion-safe:duration-200 ${
          entered ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          {/* Same title-as-window-chrome treatment as ConfirmDialog's header:
              the <h2> carries the id that aria-labelledby reads (the Badge's
              computed text content is included), just rendered as a heading
              Badge. useId instead of ConfirmDialog's hardcoded id: sheets can
              plausibly nest or coexist, and two identical ids would make the
              label ambiguous. */}
          <h2 id={titleId} className="flex items-center">
            <Badge tone="heading" size="heading" wrap>
              {title}
            </Badge>
          </h2>
          {/* A plain icon-only <button> with an aria-label is the sanctioned
              structural-affordance shape (lint-rules/icon-badge-needs-tooltip
              .js: "a dialog's close ×" is the rule's own cited exemption) —
              distinct accessible name per the ConfirmDialog strict-mode
              discipline (#178: two identically-named controls broke Playwright
              strict matching). */}
          <button
            ref={closeRef}
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="shrink-0 rounded-control p-2 text-carbon-textSub hover:bg-carbon-hover motion-safe:active:scale-[.97]"
          >
            <IconClose />
          </button>
        </div>
        {/* Body (scrolls) — the sheet's own scroll contains all interaction;
            background content is unreachable through the Tab trap, so there is
            no body-scroll-lock. The bottom padding clears the device safe
            area (resolves to 0 until plan 05 defines the variable). */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[var(--safe-area-bottom)]">
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
