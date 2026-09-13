import type { ReactNode } from "react";
import { useT, type TranslationKey } from "../../lib/i18n";

// ---------------------------------------------------------------------------
// ListToolbar — the ONE sticky-in-flow search + filter-chips composite of the
// mobile list language (phase 7, LISTS-01 / D-10; consumed by the destination
// page plans 07-03..07-07). The search value and its handler are LIFTED — the
// toolbar owns no filter state of its own, and the chips slot renders whatever
// existing primitives the consumer passes (FilterPopover / TapPopover /
// ChipFilter). The placeholder arrives as a translation KEY (existing domain
// key where one exists, the pre-seeded common.search otherwise): the toolbar
// owns no i18n keys, it only resolves the one it is given.
//
// WHY STICKY-IN-FLOW AND NEVER position:fixed (the StickyActionBar discipline,
// locked Phase 5): fixed chrome fights the Layout visualViewport keyboard
// mechanism — a fixed search field does not move when the keyboard resizes the
// visual viewport — and needs manual width/safe-area syncing that in-flow
// sticky gets for free.
//
// WHY A DIRECT CHILD OF THE PAGE COLUMN: a sticky element is confined to its
// PARENT box — nested inside a card, the bar "sticks" only within that card's
// own height and scrolls away with it. As a direct child of the PAGE_SHELL
// column (whose nearest scrolling ancestor is main#bv-main, Layout.tsx) the
// row rides the page scroll and pins to the top while any of the list is on
// screen. For the same reason no overflow/contain wrapper may sit between this
// toolbar and main#bv-main — keep new page wrappers clean. The chips row's own
// overflow-x scroll is INSIDE the toolbar (a leaf), so it does not cage the
// sticky.
//
// Chrome mirrors the StickyActionBar precedent: sidebar surface + a hairline
// (bottom edge here — the bar hangs above the list, the action bar hangs below
// the content), 8/16 spacing stops, and the 44px touch floor on the input.
// ---------------------------------------------------------------------------

export function ListToolbar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (next: string) => void;
  placeholder: TranslationKey;
  children?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="sticky top-0 z-10 bg-carbon-sidebar border-b border-carbon-border py-2">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t(placeholder)}
          spellCheck={false}
          autoComplete="off"
          className="h-11 w-full rounded-control bg-carbon-surface2 px-2 text-sm text-carbon-text glim-field-focus"
        />
        {children !== undefined && children !== null && (
          /* Chips ride the existing filter primitives; horizontal overflow
             scrolls INSIDE the row (never wrapping — a second row of chips
             would eat the card list's first row on 320-360px phones). */
          <div className="flex items-center gap-2 overflow-x-auto flex-nowrap">{children}</div>
        )}
      </div>
    </div>
  );
}
