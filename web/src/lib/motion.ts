import { save as saveDisplayPrefs } from "./displayPrefs";
// ---------------------------------------------------------------------------
// Motion intensity — off / subtle / wild (/ storm) via data-motion on <html> +
// localStorage.
//
// GlimStone motion-engine — a NEW axis (jdp, live-review: "Wäre eine
// Animationsengine gut?" -> "Echte Engine mit eigenem Nutzer-Schalter"), a
// DELIBERATE reversal of design-language.md's own prior Motion-Engine
// section (2026-08-18: "kein In-App-Schalter dafür ... kein fünfter
// Nutzer-Schalter, rein OS-gesteuert für jetzt"). jdp has now explicitly
// decided this should exist after all — see that doc's updated Motion
// Intensity write-up for the full course-correction note, quoting the old
// text rather than silently dropping it.
//
// Architecture mirrors shape.ts byte-for-byte: a small fixed enum painted
// onto <html> via one attribute, validated-or-fall-back-to-default,
// localStorage-only (no server round-trip — same "single-operator tool, no
// second viewer who needs to agree" reasoning shape.ts's own header already
// gives, and the same "applied at the app root" client-only pattern every
// other GlimStone axis in this app already follows — see
// apply-global-look-at-app-root for why these all stay client-side).
//
// This is a MANUAL preference that sits ALONGSIDE prefers-reduced-motion,
// never in front of it: index.css keys data-motion's actual effect strictly
// inside its own `@media (prefers-reduced-motion: no-preference)` block, so
// an OS-level reduced-motion user is unaffected by whatever this attribute
// says — that media query, not this file, is what enforces "OS wins." See
// index.css's own "Motion intensity" section header for the full cascade
// design and the off/subtle/wild resolution table for every keyframe.
// ---------------------------------------------------------------------------

export type MotionIntensity = "off" | "subtle" | "wild" | "storm";

/**
 * WHAT A PICKER OFFERS. The storm is deliberately not in here.
 *
 * Validating a stored value and populating a picker are two different
 * questions, and conflating them is what breaks the level below (GlimStone
 * 2.1.0). A persisted "storm" has to be ACCEPTED - somebody who found it and
 * then reloaded must get it back, or the gesture produced a setting that
 * silently forgets itself - while no list offers it.
 */
export const MOTION_INTENSITIES: MotionIntensity[] = ["off", "subtle", "wild"];

/** Every level the attribute may legally carry, the hidden one included. */
export const MOTION_STORED: MotionIntensity[] = [...MOTION_INTENSITIES, "storm"];

/** How many taps on the level already chosen open the one below the floor. */
export const STORM_TAPS = 5;

const STORAGE_KEY = "bv-motion";

/**
 * DEFAULT is "wild", not shape.ts's kind of arbitrary-but-fixed pick and not
 * theme.ts's "system" either — deliberately chosen, not just copied:
 *   - "system" (mirroring theme.ts) would be redundant here specifically,
 *     not wrong in general: prefers-reduced-motion is ALREADY read
 *     unconditionally by index.css's own (reduce) media block, completely
 *     independent of this attribute. A "system" option for THIS axis would
 *     just re-derive a signal the app already honours everywhere, for a
 *     control whose entire reason to exist is letting a user without OS-
 *     level reduced-motion still dial intensity as a STYLE preference.
 *   - the top stage over "off"/"subtle" because this axis is additive polish a
 *     user dials DOWN, not a compatibility fallback a user has to opt INTO
 *     — the same reasoning rainbow mode's own default (RAINBOW_OFF, an
 *     opt-in) does NOT apply here: rainbow changes what a list looks like
 *     (a real visual identity choice with no obviously-correct default),
 *     while motion intensity only ever makes existing, already-shipped
 *     animations quicker/smaller/absent — the top stage is simply what this app
 *     already looked like before this axis existed, so booting there means
 *     nobody's experience changes just because the toggle now exists.
 */
const DEFAULT: MotionIntensity = "wild";

function isMotionIntensity(v: unknown): v is MotionIntensity {
  // MOTION_STORED, not MOTION_INTENSITIES: this is the VALIDATION question.
  return typeof v === "string" && (MOTION_STORED as string[]).includes(v);
}

/**
 * The value a browser stored before GlimStone 1.10.0 renamed the top stage.
 *
 * It matters even though the new default IS the top stage: a stored "full"
 * would otherwise stop validating, fall through to DEFAULT, and be rewritten
 * the next time anything saves - so the user's own explicit choice would be
 * replaced by a default that happens to look the same. It also matters for the
 * one case where they differ: a browser that stored "full" while the default
 * was later changed would silently move.
 */
const RENAMED: Record<string, MotionIntensity> = { full: "wild" };

/** The stored preference, defaulting to the top stage when unset or corrupt. */
export function getMotionIntensity(): MotionIntensity {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null && stored in RENAMED) {
    const migrated = RENAMED[stored];
    localStorage.setItem(STORAGE_KEY, migrated);
    return migrated;
  }
  return isMotionIntensity(stored) ? stored : DEFAULT;
}

/**
 * applyMotionIntensity sets the attribute index.css's motion tokens key off,
 * validating against MOTION_INTENSITIES and falling back to the top stage for
 * anything else — matches shape.ts's own applyShape() exactly, so a caller
 * can hand this an unvalidated value (straight out of localStorage, say)
 * without checking it first.
 */
export function applyMotionIntensity(intensity: MotionIntensity | string | undefined): void {
  // The rename again, and it has to be here too: this function is documented
  // as taking an unvalidated value straight out of localStorage, so it is the
  // one place an old "full" can arrive without passing through the getter.
  const named = typeof intensity === "string" && intensity in RENAMED ? RENAMED[intensity] : intensity;
  const m = isMotionIntensity(named) ? named : DEFAULT;
  document.documentElement.setAttribute("data-motion", m);
}

/** setMotionIntensity persists the choice and applies it immediately (no
 * separate "Save" step, matching shape.ts's setShape()/accent.ts's
 * setAccent()). */
export function setMotionIntensity(intensity: MotionIntensity): void {
  localStorage.setItem(STORAGE_KEY, intensity);
  saveDisplayPrefs();
  applyMotionIntensity(intensity);
}

/** Called at boot in main.tsx before first render (flash prevention), same
 * spot shape.ts's applyStoredShape()/accent.ts's applyStoredAccent()/
 * theme.ts's applyStoredTheme() already run from. */
export function applyStoredMotionIntensity(): void {
  applyMotionIntensity(getMotionIntensity());
}

/**
 * The gesture that reveals the storm, and the rule it carries.
 *
 * SET THE MOTION TO THE TOP VISIBLE LEVEL, THEN TAP THAT SAME OPTION FIVE MORE
 * TIMES. It is the gesture of somebody pressing a button that is already
 * pressed because they wanted more of it, which is exactly who this level is
 * for. It cannot be reached from any other level on purpose: tapping "off" five
 * times means somebody is annoyed, not curious.
 *
 * THE RULE, and it is the part worth copying rather than the count: AN EASTER
 * EGG THAT CHANGES BEHAVIOUR MUST BE SWITCHABLE BACK OFF, AND MUST NOT QUIETLY
 * BECOME A PERMANENT ENTRY IN A SETTINGS LIST. Storing a "found it" flag would
 * put a fourth option in the picker for ever after one gesture, which turns a
 * secret into a setting somebody has to explain to themselves months later
 * (jdp, 13.09.2026: "sturm soll wieder verschwinden wenn man zb sanft
 * einstellt und die einstellungen verlaesst").
 *
 * So what keeps it visible is the plain truth about the current state: it is
 * offered while it is CHOSEN, because a picker that hid the value it is
 * currently showing would be lying about the interface, and otherwise only for
 * as long as the screen stays open.
 *
 * The caller owns the screen and therefore owns how long "open" means: keep
 * both the counter and the found flag in the settings screen's own state, never
 * in storage. Returns the level to switch to, or undefined when the tap was not
 * the fifth.
 */
export function stormTap(state: { taps: number }, tapped: string, current: string): MotionIntensity | undefined {
  if (tapped !== "wild" || current !== "wild") {
    state.taps = 0;
    return undefined;
  }
  state.taps += 1;
  if (state.taps < STORM_TAPS) return undefined;
  state.taps = 0;
  return "storm";
}
