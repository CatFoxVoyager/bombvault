// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// BottomNav's dom contract — the bar-card and the More trigger.
//
// The geometry half of the bar-card (insets, radius, safe areas) is CSS and
// jsdom computes no layout, so the observable form here is the CLASS TOKEN:
// the host paints nothing (transparent, no border anywhere on the bar) and
// the card carries the sidebar surface token and the card radius — the same
// targeted-token discipline BottomSheet.dom.test.tsx states for its own
// styling contracts. What IS behavioural here:
//   - the More trigger is a disclosure: aria-haspopup="dialog" and
//     aria-expanded that tracks the sheet's open state;
//   - the More trigger reads as ACTIVE (filled accent) exactly while the
//     current route lives on the More side of the registry (Settings, the
//     gated tabs) and never while a bar destination is current;
//   - every slot carries the colour engine (glim-hue + its own --item-hue)
//     with the active/filled slot additionally carrying glim-active.
// ---------------------------------------------------------------------------
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { I18nProvider } from "../../lib/i18n";
import type { Settings } from "../../lib/api";

function draw(path: string, settings: Settings | null = null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <BottomNav settings={settings} authEnabled={false} scrollMainToTop={() => undefined} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

function bar() {
  return screen.getByTestId("bottom-nav");
}

afterEach(cleanup);

describe("BottomNav bar-card", () => {
  it("the host paints nothing and carries no line: transparent ground, zero border tokens", () => {
    // Separation by shade, never by a line — any border/ring class on the
    // host would reintroduce the strip-with-a-line-on-top the bar-card
    // language replaced.
    draw("/dashboard");
    const host = bar();
    expect(host.className).toContain("bg-transparent");
    expect(host.className).not.toMatch(/border-\S+/);
    expect(host.className).not.toMatch(/ring-\S+/);
    // The bottom safe area belongs to the host (the card floats above it).
    expect(host.className).toContain("pb-[var(--safe-area-bottom)]");
  });

  it("the card carries the sidebar surface token and the card radius, still with no line", () => {
    draw("/dashboard");
    const card = bar().querySelector("div.rounded-card");
    expect(card).not.toBeNull();
    expect(card!.className).toContain("bg-carbon-sidebar");
    expect(card!.className).not.toMatch(/border-\S+/);
  });

  it("fresh-DB fixture renders the three enabled bar destinations plus the More trigger", () => {
    draw("/dashboard");
    const slots = bar().querySelectorAll("div.flex.h-14 > *");
    expect(slots).toHaveLength(4);
    expect(within(bar()).getByRole("link", { name: "Dashboard" })).toBeTruthy();
    expect(within(bar()).getByRole("link", { name: "Recovery" })).toBeTruthy();
    expect(within(bar()).getByRole("link", { name: "Containers" })).toBeTruthy();
    expect(within(bar()).getByRole("button", { name: "More" })).toBeTruthy();
  });
});

describe("BottomNav colour engine", () => {
  it("every slot carries glim-hue and its own --item-hue, pairwise distinct", () => {
    draw("/dashboard");
    const slots = Array.from(bar().querySelectorAll("div.flex.h-14 > *")) as HTMLElement[];
    const hues = slots.map((s) => s.style.getPropertyValue("--item-hue"));
    for (const hue of hues) {
      expect(hue).toMatch(/^#/);
    }
    expect(new Set(hues).size).toBe(hues.length);
    for (const slot of slots) {
      expect(slot.className).toContain("glim-hue");
    }
  });

  it("the active destination slot fills with the accent and carries glim-active; resting slots do not", () => {
    draw("/dashboard");
    const active = within(bar()).getByRole("link", { name: "Dashboard" });
    expect(active.className).toContain("bg-accent");
    expect(active.className).toContain("text-accentContrast");
    expect(active.className).toContain("glim-active");
    const resting = within(bar()).getByRole("link", { name: "Containers" });
    expect(resting.className).not.toContain("bg-accent");
    expect(resting.className).not.toContain("glim-active");
  });
});

describe("BottomNav More trigger", () => {
  it("announces a dialog and tracks the sheet's open state in aria-expanded", () => {
    draw("/dashboard");
    const trigger = within(bar()).getByRole("button", { name: "More" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("is filled while a More-side route is current (Settings), not while a bar destination is", () => {
    draw("/settings");
    const onMoreRoute = within(bar()).getByRole("button", { name: "More" });
    expect(onMoreRoute.className).toContain("bg-accent");
    expect(onMoreRoute.className).toContain("glim-active");
    cleanup();
    draw("/dashboard");
    const onBarRoute = within(bar()).getByRole("button", { name: "More" });
    expect(onBarRoute.className).not.toContain("bg-accent");
    expect(onBarRoute.className).not.toContain("glim-active");
  });
});
