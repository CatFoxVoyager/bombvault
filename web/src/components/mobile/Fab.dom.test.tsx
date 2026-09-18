// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Fab dom tests — the primary-action contract.
//
// Mechanism chosen for the placement contract: the DOM class-token assert
// (StickyActionBar.dom precedent — assert CLASS, not computed layout; jsdom
// has no layout engine). The fixed/absolute ban is checked as whole class
// TOKENS, not substrings, so an unrelated token that merely contains the
// letters can never false-positive.
//
// The fork's fourth test — "renders null under cupertino" — is dropped here:
// it drove lib/platform's applyPlatform(), which does not exist on this
// branch. That test returns with the platform-axis PR, alongside the
// platform-conditional null gate it pins (see the component header).
// ---------------------------------------------------------------------------
import { fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Fab } from "./Fab";

describe("Fab", () => {
  it("renders the icon + label row and fires onClick", () => {
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
