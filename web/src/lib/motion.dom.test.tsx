// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// GlimStone motion-engine persistence. `.dom.test.tsx` mirrors shape.dom.
// test.tsx's own naming convention for the jsdom opt-in exception (this file
// renders no JSX either — it only needs jsdom for `document`/`localStorage`,
// both of which vitest's jsdom environment provides via the per-file
// `// @vitest-environment jsdom` docblock).
//
// Covers the full round-trip: applyMotionIntensity's validate-or-default-to-
// "full" contract, getMotionIntensity's read-back of a stored value (falling
// back to "full" on nothing-stored/corrupt/invalid), and
// setMotionIntensity's persist-then-apply behavior — the identical shape of
// coverage shape.dom.test.tsx already has for its own sibling appearance
// setting.
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
    expect(MOTION_INTENSITIES).toEqual(["off", "subtle", "full"]);
  });
});

describe("applyMotionIntensity", () => {
  it("stamps data-motion with a valid value", () => {
    applyMotionIntensity("off");
    expect(document.documentElement.getAttribute("data-motion")).toBe("off");
    applyMotionIntensity("subtle");
    expect(document.documentElement.getAttribute("data-motion")).toBe("subtle");
    applyMotionIntensity("full");
    expect(document.documentElement.getAttribute("data-motion")).toBe("full");
  });

  it('defaults to "full" for undefined', () => {
    applyMotionIntensity(undefined);
    expect(document.documentElement.getAttribute("data-motion")).toBe("full");
  });

  it('defaults to "full" for an invalid/unknown string', () => {
    applyMotionIntensity("turbo");
    expect(document.documentElement.getAttribute("data-motion")).toBe("full");
  });
});

describe("getMotionIntensity", () => {
  it('defaults to "full" when nothing is stored', () => {
    expect(getMotionIntensity()).toBe("full");
  });

  it("round-trips a validly stored intensity", () => {
    localStorage.setItem(STORAGE_KEY, "subtle");
    expect(getMotionIntensity()).toBe("subtle");
  });

  it('falls back to "full" for a corrupt/invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, "not-a-motion-level");
    expect(getMotionIntensity()).toBe("full");
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
    setMotionIntensity("full");
    const stored: MotionIntensity | null = localStorage.getItem(STORAGE_KEY) as MotionIntensity | null;
    expect(stored).toBe("full");
    expect(getMotionIntensity()).toBe("full");
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
      expect(stormTap(state, "full", "full")).toBeUndefined();
    }
    expect(stormTap(state, "full", "full")).toBe("storm");
  });

  it("starts over after it has opened, so a sixth click is not a seventh", () => {
    const state = { taps: 0 };
    for (let i = 1; i < STORM_CLICKS; i += 1) stormTap(state, "full", "full");
    stormTap(state, "full", "full");
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
    stormTap(state, "full", "full");
    stormTap(state, "full", "full");
    stormTap(state, "subtle", "full");
    for (let i = 1; i < STORM_CLICKS; i += 1) {
      expect(stormTap(state, "full", "full")).toBeUndefined();
    }
    expect(stormTap(state, "full", "full")).toBe("storm");
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
