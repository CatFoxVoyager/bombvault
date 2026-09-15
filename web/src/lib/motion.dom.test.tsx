// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// GlimStone motion-engine persistence. `.dom.test.tsx` mirrors shape.dom.
// test.tsx's own naming convention for the jsdom opt-in exception (this file
// renders no JSX either — it only needs jsdom for `document`/`localStorage`,
// both of which vitest's jsdom environment provides via the per-file
// `// @vitest-environment jsdom` docblock).
//
// Covers the full round-trip: applyMotionIntensity's validate-or-default-to-
// "subtle" contract, getMotionIntensity's read-back of a stored value
// (falling back to "subtle" on nothing-stored/corrupt/invalid), and
// setMotionIntensity's persist-then-apply behavior — the identical shape of
// coverage shape.dom.test.tsx already has for its own sibling appearance
// setting.
//
// The default moved from "wild" to "subtle" (#228). "wild" tilts the whole
// route wrapper 1.2deg, scales it to .96 and travels 18px while the cards
// inside stagger in on their own, and a reporter on Firefox/macOS read that
// as the page trembling before it settled — with a green flash on top, since
// the nested transforms each get their own compositing layer. Nobody had
// chosen that: it was simply what shipped. "wild" stays one of the three
// offered levels, it just is not the one you get without asking.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import {
  MOTION_INTENSITIES,
  applyMotionIntensity,
  getMotionIntensity,
  setMotionIntensity,
  STORM_CLICKS,
  stormTap,
  type MotionIntensity,
} from "./motion";

const STORAGE_KEY = "bv-motion";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-motion");
});

describe("MOTION_INTENSITIES", () => {
  it("is exactly the three motion-engine values, in order", () => {
    expect(MOTION_INTENSITIES).toEqual(["off", "subtle", "wild"]);
  });
});

describe("applyMotionIntensity", () => {
  it("stamps data-motion with a valid value", () => {
    applyMotionIntensity("off");
    expect(document.documentElement.getAttribute("data-motion")).toBe("off");
    applyMotionIntensity("subtle");
    expect(document.documentElement.getAttribute("data-motion")).toBe("subtle");
    applyMotionIntensity("wild");
    expect(document.documentElement.getAttribute("data-motion")).toBe("wild");
  });

  it('defaults to "subtle" for undefined', () => {
    applyMotionIntensity(undefined);
    expect(document.documentElement.getAttribute("data-motion")).toBe("subtle");
  });

  it('defaults to "subtle" for an invalid/unknown string', () => {
    applyMotionIntensity("turbo");
    expect(document.documentElement.getAttribute("data-motion")).toBe("subtle");
  });
});

describe("getMotionIntensity", () => {
  it('defaults to "subtle" when nothing is stored', () => {
    expect(getMotionIntensity()).toBe("subtle");
  });

  it("round-trips a validly stored intensity", () => {
    localStorage.setItem(STORAGE_KEY, "subtle");
    expect(getMotionIntensity()).toBe("subtle");
  });

  it('falls back to "subtle" for a corrupt/invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, "not-a-motion-level");
    expect(getMotionIntensity()).toBe("subtle");
  });

  // WHY THE MIGRATION EXISTS NOW, and why it did not before. "full" was this
  // level's name before GSS 2.0.0 and is not one of the four, so a value
  // stored by an older visit fails validation and takes the default. While
  // the default WAS "wild", that landed on the same level under its new
  // name and a migration would have been a no-op - which is exactly what
  // the comment here used to say.
  //
  // Moving the default to "subtle" (#228) broke that coincidence. Without a
  // migration, somebody who had deliberately picked the strong level before
  // 2.0.0 would silently be moved down to a weaker one, and "we changed the
  // default" would have quietly become "we changed your choice". The two are
  // different promises, and only the first one was made.
  it('migrates a pre-2.0.0 stored "full" to "wild" rather than dropping it to the default', () => {
    localStorage.setItem(STORAGE_KEY, "full");
    expect(getMotionIntensity()).toBe("wild");
    applyMotionIntensity(getMotionIntensity());
    expect(document.documentElement.getAttribute("data-motion")).toBe("wild");
  });

  // The migration reads, it does not rewrite: getMotionIntensity is called on
  // every boot and a setter that writes from a getter turns one stale key into
  // a write on every page load. setMotionIntensity is what persists.
  it("leaves the stored string alone while migrating it on read", () => {
    localStorage.setItem(STORAGE_KEY, "full");
    getMotionIntensity();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("full");
  });
});

describe("setMotionIntensity", () => {
  it("persists the choice AND applies it to the document immediately", () => {
    setMotionIntensity("off");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("off");
    expect(document.documentElement.getAttribute("data-motion")).toBe("off");
    expect(getMotionIntensity()).toBe("off");
  });

  it("round-trips every intensity in MOTION_INTENSITIES", () => {
    for (const m of MOTION_INTENSITIES) {
      setMotionIntensity(m);
      expect(getMotionIntensity()).toBe(m);
      expect(document.documentElement.getAttribute("data-motion")).toBe(m);
    }
  });

  it("overwrites a previously persisted choice rather than merging", () => {
    setMotionIntensity("off");
    setMotionIntensity("wild");
    const stored: MotionIntensity | null = localStorage.getItem(STORAGE_KEY) as MotionIntensity | null;
    expect(stored).toBe("wild");
    expect(getMotionIntensity()).toBe("wild");
  });
});

// ---------------------------------------------------------------------------
// GSS 1.17.0's hidden fourth level.
//
// Two things are easy to get wrong here and both are silent. A gesture that
// counts clicks on the WRONG level turns an annoyed user into a surprised one;
// and a stored "storm" rejected at boot turns the level into a flicker that
// survives exactly until the next page load, which reads as the app forgetting
// a setting rather than as a hidden one behaving correctly.
// ---------------------------------------------------------------------------
describe("the storm", () => {
  it("is not in the list a picker builds from", () => {
    expect(MOTION_INTENSITIES).not.toContain("storm");
  });

  it("opens on the fifth click, and only from the level already chosen", () => {
    const state = { taps: 0 };
    for (let i = 1; i < STORM_CLICKS; i += 1) {
      expect(stormTap(state, "wild", "wild")).toBeUndefined();
    }
    expect(stormTap(state, "wild", "wild")).toBe("storm");
  });

  it("starts over after it has opened, so a sixth click is not a seventh", () => {
    const state = { taps: 0 };
    for (let i = 1; i < STORM_CLICKS; i += 1) stormTap(state, "wild", "wild");
    stormTap(state, "wild", "wild");
    expect(state.taps).toBe(0);
  });

  // Clicking "off" five times means somebody is annoyed, not curious.
  it("cannot be reached from any other level", () => {
    const state = { taps: 0 };
    for (let i = 0; i < STORM_CLICKS * 2; i += 1) {
      expect(stormTap(state, "off", "off")).toBeUndefined();
      expect(stormTap(state, "subtle", "subtle")).toBeUndefined();
    }
  });

  // The count is about ONE level, held down. A click elsewhere in between is
  // somebody browsing the picker rather than pressing the same button again.
  it("forgets the count when another level is clicked in between", () => {
    const state = { taps: 0 };
    stormTap(state, "wild", "wild");
    stormTap(state, "wild", "wild");
    stormTap(state, "subtle", "wild");
    for (let i = 1; i < STORM_CLICKS; i += 1) {
      expect(stormTap(state, "wild", "wild")).toBeUndefined();
    }
    expect(stormTap(state, "wild", "wild")).toBe("storm");
  });

  // A hidden level that cannot survive a reload is not a level, it is a
  // flicker: validating a stored value and populating a picker are two
  // different questions.
  it("survives a reload even though no picker offers it", () => {
    setMotionIntensity("storm");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("storm");
    expect(getMotionIntensity()).toBe("storm");
    document.documentElement.removeAttribute("data-motion");
    applyMotionIntensity(getMotionIntensity());
    expect(document.documentElement.getAttribute("data-motion")).toBe("storm");
  });
});
