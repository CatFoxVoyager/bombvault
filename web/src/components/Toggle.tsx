export interface ToggleProps {
  checked: boolean;
  /** Called with the flipped value when the switch is activated. */
  onChange: (next: boolean) => void;
  /** Always the accessible name; shown as visible text unless hideLabel. */
  label: string;
  /** Hides the visible caption. Only for callers that print the same text
   *  right next to the switch themselves; a card title further up does not
   *  count. */
  hideLabel?: boolean;
  disabled?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

// Toggle is the shared switch. The focus ring sits outside the track, on the
// card surface its contrast was measured against.
export function Toggle({ checked, onChange, label, hideLabel = false, disabled, className }: ToggleProps) {
  return (
    <span className={`inline-flex items-center gap-2${className ? ` ${className}` : ""}`}>
      {!hideLabel && <span className="text-sm text-carbon-text">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        // No title: the label is always visible next to the switch, so a
        // tooltip would only repeat it.
        // Below md an invisible ::after bleeds 12px past the track on every
        // side: the 36x20px visual size is frozen by the design language, but
        // the 44px touch floor still applies. The pseudo-element is part of
        // this button, so clicks anywhere in the bleed fire the switch; no
        // visible pixel changes at any width.
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-50 max-md:after:absolute max-md:after:-inset-3 max-md:after:content-[''] ${
          checked ? "bg-accent" : "bg-carbon-surface3"
        }`}
      >
        <span
          // translate-x is physical, but the flex rest position already
          // mirrors in RTL, so rtl: flips the sign. The `!` settles the tie
          // between two classes setting the same property.
          //
          // rtl: follows the page while the flex layout follows the nearest
          // dir attribute, so a Toggle must not sit inside a container with
          // its own dir. Wrap only the text that needs dir="ltr".
          //
          // rounded-pill shares the track's token, so the knob is a circle in
          // the round shape and follows the track in the others.
          className={`inline-block h-3.5 w-3.5 rounded-pill bg-carbon-background transition-transform ${
            checked ? "translate-x-[18px] rtl:-translate-x-[18px]!" : "translate-x-[3px] rtl:-translate-x-[3px]!"
          }`}
        />
      </button>
    </span>
  );
}
