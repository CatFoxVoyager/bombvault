// ---------------------------------------------------------------------------
// The hidden fourth level: what the gesture opens, and what it must not become.
//
// Two rules are on trial here, and the second is the one with teeth.
//
// VALIDATING A STORED VALUE AND POPULATING A PICKER ARE DIFFERENT QUESTIONS.
// A browser that stored "storm" must get it back on the next load, or the
// gesture produced a setting that silently forgets itself; and no list may
// offer it. One array cannot answer both, which is why there are two.
//
// AN EASTER EGG THAT CHANGES BEHAVIOUR MUST NOT BECOME A PERMANENT ENTRY IN A
// SETTINGS LIST. The counter lives in the caller's own screen state, so leaving
// the screen resets it. What this file can prove is the half that lives in the
// module: the gesture is reachable ONLY from the top visible level, a tap
// anywhere else puts the count back to zero, and the count does not survive a
// detour - so five taps spread across three visits to the screen are not four
// taps plus one.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { MOTION_INTENSITIES, MOTION_STORED, STORM_TAPS, stormTap } from "./motion";

describe("the hidden motion level", () => {
  it("is a legal stored value and is offered by nothing", () => {
    expect(MOTION_STORED).toContain("storm");
    expect(MOTION_INTENSITIES).not.toContain("storm");
    // The picker's array is the one a Selector maps over. If the storm ever
    // leaks into it, every user sees a fourth option nobody asked for.
    expect(MOTION_INTENSITIES).toEqual(["off", "subtle", "wild"]);
  });

  it("opens on the fifth tap of the level already chosen", () => {
    const state = { taps: 0 };
    for (let i = 1; i < STORM_TAPS; i++) {
      expect(stormTap(state, "wild", "wild")).toBeUndefined();
    }
    expect(stormTap(state, "wild", "wild")).toBe("storm");
  });

  it("resets after it fires, so a sixth tap is not a second storm", () => {
    const state = { taps: 0 };
    for (let i = 1; i < STORM_TAPS; i++) stormTap(state, "wild", "wild");
    expect(stormTap(state, "wild", "wild")).toBe("storm");
    expect(stormTap(state, "wild", "wild")).toBeUndefined();
    expect(state.taps).toBe(1);
  });

  it("cannot be reached from any other level", () => {
    // Tapping "off" five times means somebody is annoyed, not curious.
    for (const level of ["off", "subtle"] as const) {
      const state = { taps: 0 };
      for (let i = 0; i < STORM_TAPS * 2; i++) {
        expect(stormTap(state, level, level)).toBeUndefined();
      }
    }
  });

  it("counts only taps on the level that is already active", () => {
    // Choosing wild from somewhere else is an ordinary change, not tap one.
    const state = { taps: 0 };
    expect(stormTap(state, "wild", "subtle")).toBeUndefined();
    expect(state.taps).toBe(0);
  });

  it("loses the count on a detour", () => {
    const state = { taps: 0 };
    stormTap(state, "wild", "wild");
    stormTap(state, "wild", "wild");
    stormTap(state, "subtle", "wild"); // wandered off
    expect(state.taps).toBe(0);
    for (let i = 1; i < STORM_TAPS; i++) {
      expect(stormTap(state, "wild", "wild")).toBeUndefined();
    }
    expect(stormTap(state, "wild", "wild")).toBe("storm");
  });
});
