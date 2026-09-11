// ---------------------------------------------------------------------------
// MoreSheet — SHELL-03, the mobile "More" sheet (phase 05, plan 05).
//
// The desktop rail's overflow surface, re-expressed for the thumb: the
// destinations that do NOT own a bottom-bar slot, in desktop Sidebar order.
// The row list is derived from the ONE nav registry (lib/navModel.ts, via
// moreDestinations) — never a second hand-written ordering, which is the
// drift SHELL-03 exists to kill. The sheet is the first consumer of the
// PRIM-01 BottomSheet primitive and fills ONLY its body: title row, close
// button, Escape/scrim dismissal, focus trap, scroll containment and safe
// area are the primitive's contract, already proven there.
//
// Rows use the same accent-tint language as the bar's active slot (locked
// decision): the row whose route is current reads --accentText on an
// --accentSoft backdrop, so a user who landed on /vms or /flash is never
// lost — no bar slot is active there, the sheet's row is.
// ---------------------------------------------------------------------------
import { NavLink } from "react-router-dom";
import type { Settings } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { moreDestinations } from "../../lib/navModel";
import { BottomSheet } from "./BottomSheet";

export interface MoreSheetProps {
  /** Whether the sheet is open (the trigger lives in BottomNav). */
  open: boolean;
  /** Every close path funnels here — including a row navigation, which
   *  closes the sheet so the destination is visible behind it. */
  onClose: () => void;
  /** Already-loaded settings, owned by Layout — the chrome performs no
   *  fetches of its own (UI-SPEC). */
  settings: Settings | null;
}

export function MoreSheet({ open, onClose, settings }: MoreSheetProps) {
  const { t } = useT();
  return (
    <BottomSheet open={open} onClose={onClose} title={t("nav.more")}>
      {/* 52px minimum row height (min-h-[3.25rem], UI-SPEC's maquette iOS list
          cell) — comfortably over the 44px touch floor; the padding never
          carries the floor, the min-height does. */}
      <div data-testid="more-sheet" className="flex flex-col gap-1 py-2">
        {moreDestinations(settings).map((d) => {
          const Icon = d.icon;
          return (
            <NavLink
              key={d.to}
              to={d.to}
              onClick={onClose}
              className="flex min-h-[3.25rem] items-center gap-3 rounded-control px-3 text-body text-carbon-text hover:bg-carbon-hover"
            >
              {/* 20px glyph — the rail's glim-nav-row sizing (the generated
                  glyphs come out at 16px and are scaled up here, exactly as
                  index.css scales them for the Sidebar). */}
              <span className="flex h-5 w-5 items-center justify-center [&_svg]:h-5 [&_svg]:w-5">
                <Icon />
              </span>
              <span className="min-w-0 truncate">{t(d.labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </BottomSheet>
  );
}
