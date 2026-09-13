// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// GlimStone motion-engine persistence. `.dom.test.tsx` mirrors shape.dom.
// test.tsx's own naming convention for the jsdom opt-in exception (this file
// renders no JSX either — it only needs jsdom for `document`/`localStorage`,
// both of which vitest's jsdom environment provides via the per-file
// `// @vitest-environment jsdom` docblock).
//
// Covers the full round-trip: applyMotionIntensity's validate-or-default-to-
// "wild" contract, getMotionIntensity's read-back of a stored value (falling
// back to "wild" on nothing-stored/corrupt/invalid), and
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

  it('defaults to "wild" for undefined', () => {
    applyMotionIntensity(undefined);
    expect(document.documentElement.getAttribute("data-motion")).toBe("wild");
  });

  it('defaults to "full" for an invalid/unknown string', () => {
    applyMotionIntensity("turbo");
    expect(document.documentElement.getAttribute("data-motion")).toBe("wild");
  });
});

describe("getMotionIntensity", () => {
  it('defaults to "full" when nothing is stored', () => {
    expect(getMotionIntensity()).toBe("wild");
  });

  it("round-trips a validly stored intensity", () => {
    localStorage.setItem(STORAGE_KEY, "subtle");
    expect(getMotionIntensity()).toBe("subtle");
  });

  it('falls back to "full" for a corrupt/invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, "not-a-motion-level");
    expect(getMotionIntensity()).toBe("wild");
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

describe("the rename from \"full\" to \"wild\" (GlimStone 1.10.0)", () => {
  // The name changed because it is about the setting's ENERGY rather than its
  // completeness, which is what somebody is actually choosing between. What
  // matters here is the browser that already holds the old word.
  //
  // It is tempting to skip this: the new default IS the top stage, so a stored
  // "full" falling through to the default lands on the same setting. That
  // reasoning is why it needs a test - it is true by coincidence, not by
  // construction. Somebody who deliberately chose the top stage would have
  // their own choice silently replaced by a default that happens to match, and
  // the day the default changes, their setting moves without them.
  beforeEach(() => localStorage.clear());

  it("reads an old stored value as the new one", () => {
    localStorage.setItem(STORAGE_KEY, "full");
    expect(getMotionIntensity()).toBe("wild");
  });

  it("rewrites it, so the old word does not sit there forever", () => {
    localStorage.setItem(STORAGE_KEY, "full");
    getMotionIntensity();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("wild");
  });

  it("applies it, for the boot path that never goes through the getter", () => {
    // applyMotionIntensity is documented as taking an unvalidated value
    // straight out of localStorage, so it is the one place an old word can
    // arrive without passing the getter. Without its own mapping the page
    // would boot on the default attribute instead of the stored choice.
    applyMotionIntensity("full");
    expect(document.documentElement.getAttribute("data-motion")).toBe("wild");
  });

  it("still falls back for a word that never existed", () => {
    localStorage.setItem(STORAGE_KEY, "ZZZ-not-a-stage");
    expect(getMotionIntensity()).toBe("wild");
  });
});
