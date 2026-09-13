// @vitest-environment jsdom
/**
 * The mark on the login screen.
 *
 * The login screen is the one surface of the app that carries no rail, so
 * before this it was an unlabelled password box on a plain background. On a box
 * running several instances, "which one am I unlocking" is a real question, and
 * the answer belongs above the field rather than in the browser tab.
 *
 * Two things have to hold:
 *   - both theme marks are present, switched by the `dark:` variant exactly as
 *     the rail does it, so the light mark never lands on the light surface;
 *   - the marks are decorative. The heading beside them already names the
 *     product, and an alt text here would have a screen reader say it twice.
 */
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ login: vi.fn() }));

import { LoginPage } from "./Login";

afterEach(cleanup);

describe("LoginPage mark", () => {
  it("shows both theme marks, one per colour scheme", () => {
    const { container } = render(<LoginPage onLogin={vi.fn()} />);
    const marks = Array.from(container.querySelectorAll("img"));
    const srcs = marks.map((m) => m.getAttribute("src"));
    expect(srcs).toContain("/logo.svg");
    expect(srcs).toContain("/logo-light.svg");

    const dark = marks.find((m) => m.getAttribute("src") === "/logo.svg")!;
    const light = marks.find((m) => m.getAttribute("src") === "/logo-light.svg")!;
    // The dark mark is the one for the LIGHT surface, so it hides in dark mode.
    expect(dark.className).toContain("block");
    expect(dark.className).toContain("dark:hidden");
    expect(light.className).toContain("hidden");
    expect(light.className).toContain("dark:block");
  });

  it("keeps the marks out of the accessibility tree", () => {
    const { container } = render(<LoginPage onLogin={vi.fn()} />);
    for (const img of Array.from(container.querySelectorAll("img"))) {
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
