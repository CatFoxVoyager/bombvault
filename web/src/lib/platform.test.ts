// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  applyPlatform,
  applyStoredPlatform,
  DEFAULT_PLATFORM,
  getPlatform,
  PLATFORMS,
  PLATFORM_STORAGE_KEY,
  usePlatform,
  type Platform,
} from "./platform";

// Behavioral proof for the PLAT-01 platform layer (phase 7, plan 07-01
// Task 1): the shape.ts contract cloned — closed union, validate-or-fall-back
// coercion at the ONE application choke point (T-07-01: an unvalidated stored
// value can never reach the DOM attribute), localStorage persistence, and a
// usePlatform() structural reader that updates live on the announcement
// without a remount. Every case asserts observable behavior (the attribute,
// the hook's output), never internals.

function probe(): void {
  document.documentElement.removeAttribute("data-platform");
  localStorage.clear();
}

beforeEach(probe);
afterEach(probe);

describe("applyPlatform — the one application choke point", () => {
  it("sets data-platform on <html> for a valid platform", () => {
    applyPlatform("cupertino");
    expect(document.documentElement.getAttribute("data-platform")).toBe("cupertino");
  });

  it("coerces an invalid value to the default instead of trusting it raw", () => {
    applyPlatform("fluent");
    expect(document.documentElement.getAttribute("data-platform")).toBe(DEFAULT_PLATFORM);
  });

  it("coerces undefined and non-string values to the default", () => {
    applyPlatform(undefined);
    expect(document.documentElement.getAttribute("data-platform")).toBe(DEFAULT_PLATFORM);
    // A hostile/ corrupt stored value is exactly the string-typed garbage the
    // coercion exists for (T-07-01).
    applyPlatform(42 as unknown as string);
    expect(document.documentElement.getAttribute("data-platform")).toBe(DEFAULT_PLATFORM);
  });
});

describe("getPlatform / applyStoredPlatform — the persistence round-trip", () => {
  it("defaults to material when the key is missing", () => {
    expect(getPlatform()).toBe("material");
    applyStoredPlatform();
    expect(document.documentElement.getAttribute("data-platform")).toBe("material");
  });

  it("persists the choice and re-applies it through the coercion", () => {
    localStorage.setItem(PLATFORM_STORAGE_KEY, "cupertino");
    expect(getPlatform()).toBe("cupertino");
    applyStoredPlatform();
    expect(document.documentElement.getAttribute("data-platform")).toBe("cupertino");

    localStorage.setItem(PLATFORM_STORAGE_KEY, "material");
    applyStoredPlatform();
    expect(document.documentElement.getAttribute("data-platform")).toBe("material");
  });

  it("coerces a corrupt stored value to material instead of applying it", () => {
    localStorage.setItem(PLATFORM_STORAGE_KEY, "somethingelse");
    expect(getPlatform()).toBe(DEFAULT_PLATFORM);
    applyStoredPlatform();
    expect(document.documentElement.getAttribute("data-platform")).toBe(DEFAULT_PLATFORM);
  });

  it("keeps the union closed and the storage key pinned", () => {
    // The key string is a contract (bv-* house convention; e2e seeds it
    // literally) — renaming it silently orphans every stored preference.
    expect(PLATFORM_STORAGE_KEY).toBe("bv-platform");
    expect(PLATFORMS).toEqual(["material", "cupertino"]);
  });
});

describe("usePlatform — the structural reader", () => {
  // createElement, not JSX: this is a .ts suite (jsx is .tsx-only here), and
  // the probe needs no markup worth the extension change.
  function Probe({ onPlatform }: { onPlatform: (p: Platform) => void }) {
    onPlatform(usePlatform());
    return createElement("span", null, "probe");
  }

  it("reads the current platform and re-reads live when applyPlatform announces", async () => {
    const seen: Platform[] = [];
    render(createElement(Probe, { onPlatform: (p) => seen.push(p) }));
    expect(seen.at(-1)).toBe("material"); // fresh jsdom storage → default

    // The announcement is what updates mounted consumers — no remount, no
    // prop change (the Fab flip under a live attribute change depends on it).
    await act(async () => {
      applyPlatform("cupertino");
    });
    expect(seen.at(-1)).toBe("cupertino");
    expect(screen.getByText("probe")).toBeTruthy(); // same mounted tree
  });
});
