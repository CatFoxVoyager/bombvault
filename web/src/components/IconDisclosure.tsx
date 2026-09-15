// ---------------------------------------------------------------------------
// The disclosure chevron: a triangle that points right when the section is
// closed and down when it is open.
//
// It is not in glyphs.tsx, and that is deliberate rather than an oversight.
// That file is generated ("do not hand-edit") and holds STATELESS marks that
// glyphFor picks by meaning. This one carries a state, so it cannot be a table
// entry and it cannot be resolved from a translation key: only the call site
// knows whether its own section is open.
//
// It lives here because it was already drawn twice, byte for byte, inline in
// two different pages, while three more disclosure buttons elsewhere in the app
// had no mark at all. That is the shape a shared drawing takes just before it
// grows a third variant: two copies and three gaps.
//
// The RTL rotation matters and is easy to lose. Closed, the triangle points
// toward the content it would reveal, which is right on an LTR page and LEFT on
// an RTL one; open, it points down in both. Hence `rotate-90` when open, and
// `rtl:rotate-180` only when closed.
// ---------------------------------------------------------------------------
export function IconDisclosure({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={`transition-transform ${open ? "rotate-90" : "rtl:rotate-180"}`}
    >
      <path fill="currentColor" d="M4 1.3 8.5 6 4 10.7Z" />
    </svg>
  );
}
