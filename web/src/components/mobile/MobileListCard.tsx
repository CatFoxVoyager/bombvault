import type { CSSProperties, ReactNode } from "react";
import { hueVars } from "../../lib/appearance";

// MobileListCard is the ONE compact row both phone list pages render: the
// monogram, the name, one muted meta line, the state badge and the accent
// chevron, over the card's own hue. The list card opens a detail; every
// control lives there, so the two pages' rows cannot grow different blocks.
//
// `badge` is the entry's state badge, built by the caller (the pages word
// "not installed" and pick the tone differently). `meta` is one truncated
// muted line or nothing. The whole row is a button that opens the detail;
// its accessible name is the title.
export function MobileListCard({
  title,
  meta,
  badge,
  hueIndex,
  onOpen,
}: {
  /** The entry's display name — also the monogram's letter and the row's
   *  accessible name. */
  title: string;
  /** One muted meta line under the title (a folder count, a method), or
   *  nothing. */
  meta?: ReactNode;
  /** The caller's state badge (tone and wording are the caller's domain). */
  badge: ReactNode;
  /** The list position that picks the card's rainbow hue, so the two
   *  sections of one list never hand the same colour to two entries. */
  hueIndex: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={hueVars(hueIndex) as CSSProperties}
      className="w-full text-start bg-carbon-surface rounded-card p-4 flex items-center gap-3 glim-hue min-h-[2.75rem] glim-content-fade"
    >
      <span
        aria-hidden
        className="h-10 w-10 shrink-0 rounded-card bg-carbon-surface2 flex items-center justify-center text-sm font-semibold text-carbon-textSub"
      >
        {title.charAt(0).toUpperCase()}
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-sm font-semibold text-carbon-text truncate">{title}</span>
        {meta !== undefined && (
          <span className="text-xs text-carbon-textMuted truncate">{meta}</span>
        )}
      </span>
      {badge}
      {/* The affordance arrow reads the card's own hue — the ONE accent
          reader on the card, so a hued card shows its colour on the control
          that opens the detail. */}
      <svg aria-hidden width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0 text-accentText">
        <path fill="currentColor" d="M4 1.3 8.5 6 4 10.7Z" />
      </svg>
    </button>
  );
}
