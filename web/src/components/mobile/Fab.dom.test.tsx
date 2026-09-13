// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Fab dom tests — the material primary-action contract (PLAT-01, D-12).
//
// The platform axis is ATTRIBUTE-based (lib/platform stamps data-platform on
// <html>), so jsdom works here where width-gated surfaces cannot: the flip is
// a real applyPlatform() call, not a viewport simulation. Mechanism chosen for
// the placement contract: the DOM class-token assert (StickyActionBar.dom
// precedent — assert CLASS, not computed layout; jsdom has no layout engine).
// The fixed/absolute ban is checked as whole class TOKENS, not substrings, so
// an unrelated token that merely contains the letters can never false-positive.
// ---------------------------------------------------------------------------
import { act, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyPlatform } from "../../lib/platform";
import { Fab } from "./Fab";

// jsdom does not run main.tsx's boot here — each test stamps the attribute
// directly through the one choke point, exactly as boot would.
beforeEach(() => {
  document.documentElement.removeAttribute("data-platform");
  localStorage.clear();
  applyPlatform("material");
});

describe("Fab", () => {
  it("renders the icon + label row under material and fires onClick", () => {
    const onClick = vi.fn();
    const { getByRole, getByText, container } = render(
      createElement(Fab, {
        label: "New restore",
        icon: createElement("span", { "data-testid": "glyph" }),
        onClick,
      }),
    );
    expect(getByRole("button")).toBeTruthy();
    expect(getByText("New restore")).toBeTruthy();
    expect(container.querySelector("[data-testid='glyph']")).toBeTruthy();

    fireEvent.click(getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders null under cupertino — the sanctioned structural switch", () => {
    const { container } = render(
      createElement(Fab, { label: "New restore", icon: null, onClick: () => {} }),
    );
    expect(container.querySelector("button")).toBeTruthy();

    // A live flip, not a remount: the announcement is what unmounts the FAB,
    // the same mechanism a real preference change would drive.
    act(() => {
      applyPlatform("cupertino");
    });
    expect(container.querySelector("button")).toBeNull();
  });

  it("never carries fixed or absolute positioning classes (no-fixed contract)", () => {
    const { container } = render(
      createElement(Fab, { label: "New restore", icon: null, onClick: () => {} }),
    );
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    const tokens = (button?.className ?? "").split(/\s+/);
    expect(tokens).not.toContain("fixed");
    expect(tokens).not.toContain("absolute");
  });

  it("prefers ariaLabel for the accessible name when given", () => {
    const { getByRole } = render(
      createElement(Fab, {
        label: "New restore",
        icon: null,
        onClick: () => {},
        ariaLabel: "Start a new restore",
      }),
    );
    expect(getByRole("button", { name: "Start a new restore" })).toBeTruthy();
  });
});
