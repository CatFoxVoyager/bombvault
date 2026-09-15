// LanguageCard, lifted out of Settings.tsx ([337]).
//
// A MOVE, not a rewrite: the component is byte-identical to what stood
// in Settings.tsx, and it was already module-level and prop-driven, so
// nothing crosses a new seam. See that file's own note for why the cut
// stops here rather than continuing into SettingsPage itself.
import { Card } from "../settings/shared";
import { DropdownListbox } from "../../components/DropdownListbox";
import { Flag } from "../../components/Sidebar";
import { useRef, useState } from "react";
import { useT } from "../../lib/i18n";
import { stepIndex } from "../../lib/selectScroll";

// ---------------------------------------------------------------------------
// Language Card (GlimStone follow-up pass, live-review point 9) — the app's
// UI-language switcher, MOVED here out of Sidebar.tsx's own footer, not
// duplicated (jdp: "verschieb den Sprachschalter... auch als eigene card ins
// allgemein setting"). Same picker mechanism as before: useT()'s
// lang/setLanguage/languages (lib/i18n.ts — a flat 42-locale list, persisted
// to localStorage's "bv-lang" key, applied to <html lang>/[dir] immediately,
// no Save step) and Sidebar.tsx's own exported `Flag` glyph for each entry.
// Only the TRIGGER's styling changed, from the sidebar's nav-rail look
// (navBase/navInactive, which key off `--sidebar-text`/`--sidebar-hover` and
// mean nothing outside the rail) to a plain bg-carbon-surface2 button — the
// same idle-chip fill every other inline picker trigger in this file already
// uses (e.g. VMSSHCard's copy buttons above). The dropdown listbox itself
// (role="listbox", flag+label options, outside-click/Escape-to-close) is
// reused verbatim; only the open direction flipped from `bottom-full` (the
// sidebar footer sits at the viewport's bottom edge) to `top-full` (this
// Card sits in normal page flow, so it opens downward like any other
// dropdown on this page).
export function LanguageCard({ t, hueIndex }: { t: ReturnType<typeof useT>["t"]; hueIndex?: number }) {
  const { lang, setLanguage, languages } = useT();
  const [open, setOpen] = useState(false);
  // The BUTTON itself, not its wrapper — DropdownListbox sizes the portalled
  // panel to what this ref measures, and an `inline-block` wrapper inside a
  // flex column is blockified and stretched to the Card's full width. See
  // StopContainersEditor's own copy of this note in Containers.tsx.
  const ref = useRef<HTMLButtonElement>(null);

  const current = languages.find((l) => l.code === lang) ?? languages[0];

  // Outside-click / Escape / scroll dismissal lives in DropdownListbox now,
  // together with the panel it dismisses — this card's own two hand-rolled
  // listener effects are gone. They were also the pattern Containers.tsx's
  // multi-select copied wholesale, and that copy sat under an
  // `overflow-hidden` card that hard-clipped the panel (see
  // DropdownListbox.tsx's header). Fixing the copy and leaving the original
  // behind as a second, subtly different implementation of the same control
  // is exactly the sibling drift this repo keeps out; both call sites now
  // render the one shared, portalled panel.
  //   Not merely cosmetic here either: this list is 42 locales deep and
  // always opened straight downward with no viewport awareness at all, so on
  // a short window it ran off the bottom edge. The shared panel clamps and
  // flips above the trigger when there is no room below.

  return (
    <Card title={t("settings.language")} hueIndex={hueIndex}>
      <div className="inline-block max-md:block">
        {/* w-48 (GlimStone follow-up pass, live-review round — "widen the
            Language button, then match the Theme button to it"): was
            content-hugging (only as wide as the current flag+label pair),
            which read as too narrow/incidental for a deliberate settings
            control. w-48 (192px) isn't an arbitrary new number — it was the
            SAME width this button's own dropdown listbox already hard-coded,
            so the trigger sits flush above the exact footprint of the menu it
            opens, rather than a narrower button popping open a visibly wider
            list. That number is no longer restated on the listbox at all:
            DropdownListbox sizes the portalled panel to THIS trigger's own
            measured width, so the two can no longer drift apart.
            `truncate`/`min-w-0` on
            the label span below keeps a genuinely long locale name (this
            list has 42) from overflowing the now-fixed width instead of
            just growing the button the way it used to.

            REVERSED below md (UI review lot 1, P2-10): a deliberate 192px
            reads as an orphaned fixed width inside a full-width Card on a
            phone — the control shrank from its surroundings instead of
            sitting in them. So under the same breakpoint the trigger goes
            full-width, spanning the Card body like every other full-bleed
            mobile control; desktop >=48rem keeps the flush
            trigger-over-listbox footprint untouched (every added class is
            max-md:-scoped). Two pieces, because one alone silently no-ops:
            the wrapper flips from `inline-block` to block below md as well —
            an inline-block parent shrink-wraps its content, so a full-width
            button inside it would collapse straight back to label width.
            The mobile panel width follows automatically: DropdownListbox
            sizes its portalled panel to THIS trigger's own measured width
            (the mechanism the paragraph above already documents), so no
            second width literal and no new key are needed. */}
        {/* Mobile hit-area extension (D-06 fix 1 / VERIFY-04, phase 8): this
            card-local raw button measures ~33px tall (py-1.5 + text-sm) —
            under the 44px floor — and it does not route through the shared
            Button, so it gets the Toggle bleed pattern at its own site:
            below md an invisible ::after bleeds 12px past every side (~57px
            activation box). max-md:relative anchors the pseudo-element to
            THIS button, not its Card; desktop >=48rem byte-identical (every
            class is max-md:-scoped). */}
        <button
          ref={ref}
          type="button"
          aria-label={`${t("language.label")}: ${current.label}`}
          title={`${t("language.label")}: ${current.label}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 w-48 max-md:w-full rounded-control bg-carbon-surface2 px-3 py-1.5 text-sm text-carbon-text hover:bg-carbon-surface3 transition-colors max-md:relative max-md:after:absolute max-md:after:-inset-3 max-md:after:content-['']"
        >
          <Flag code={current.flag} />
          <span className="min-w-0 truncate text-start">{current.label}</span>
        </button>
        <DropdownListbox
          open={open}
          onClose={() => setOpen(false)}
          triggerRef={ref}
          label={t("language.label")}
          // The wheel on the closed trigger, clamped at both ends (GlimStone
          // 1.8.0). The language picker is the rule's own example of a value
          // people reach for and should not have to open a list of 42 to
          // change, and this app has no native <select> left here for the
          // platform behaviour to ride on.
          wheelStep={(delta) => {
            const at = languages.findIndex((l) => l.code === lang);
            const next = stepIndex(languages.length, at < 0 ? 0 : at, delta);
            const picked = languages[next];
            if (picked && picked.code !== lang) setLanguage(picked.code);
          }}
        >
          {languages.map((l) => (
            /* Same D-06 fix-1 bleed as the trigger above: option rows measure
               ~37px (py-2 + text-sm), under the floor, and are card-local raw
               buttons. Adjacent options' 12px bleeds overlap inside the row
               gap — the Toggle pattern's intended forgiveness: where two
               bleeds share a point the later sibling wins, which resolves a
               between-rows tap to the row it sits closer beneath. Desktop
               >=48rem byte-identical (max-md:-scoped). */
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === lang}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-start transition-colors max-md:relative max-md:after:absolute max-md:after:-inset-3 max-md:after:content-[''] ${
                l.code === lang
                  ? "bg-carbon-surface3 text-carbon-text"
                  : "text-carbon-textSub hover:bg-carbon-hover hover:text-carbon-text"
              }`}
            >
              <Flag code={l.flag} />
              <span>{l.label}</span>
            </button>
          ))}
        </DropdownListbox>
      </div>
    </Card>
  );
}
