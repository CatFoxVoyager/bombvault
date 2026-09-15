// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// What the Instances strip SHOWS, for each combination of the three settings.
//
// Three pages became three tabs, and the thing that survived the merge is that
// each one is still gated on its own switch. That gate is where this can go
// quietly wrong in two opposite directions, so both are pinned here:
//
//   too much  a tab for a feature that is switched off, which offers a page
//             whose backend refuses every call it makes.
//   too little a strip that renders for a single choice. A row of tabs where
//             only one can ever be picked is furniture, not navigation.
//
// And one case that is neither: a URL hash naming a tab whose setting is off.
// That arrives from a bookmark made before the switch was flipped, and the
// honest answer is the first tab that IS on, not an empty panel under a live
// heading.
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { I18nProvider, en } from "../lib/i18n";

type Flags = { receiverEnabled: boolean; fleetEnabled: boolean; pullEnabled: boolean };

let flags: Flags = { receiverEnabled: true, fleetEnabled: true, pullEnabled: true };

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    getSettings: () => Promise.resolve({ ok: true, settings: flags }),
  };
});

// The three pages are mocked to a marker each: this file is about the strip and
// the gate, and rendering the real pages would drag three unrelated sets of API
// calls in with them.
vi.mock("./Receiver", () => ({ Receiver: () => <div>PANEL receiver</div> }));
vi.mock("./Fleet", () => ({ Fleet: () => <div>PANEL fleet</div> }));
vi.mock("./Pull", () => ({ Pull: () => <div>PANEL pull</div> }));

const { Instances } = await import("./Instances");

async function renderPage() {
  await act(async () => {
    render(
      <I18nProvider>
        <Instances />
      </I18nProvider>,
    );
  });
}

beforeEach(() => {
  flags = { receiverEnabled: true, fleetEnabled: true, pullEnabled: true };
  window.location.hash = "";
  localStorage.clear();
});

afterEach(cleanup);

describe("instances tab strip", () => {
  it("shows one tab per switched-on feature, and the first one's panel", async () => {
    await renderPage();
    expect(screen.queryByRole("tab", { name: en["receiver.title"] })).not.toBeNull();
    expect(screen.queryByRole("tab", { name: en["fleet.title"] })).not.toBeNull();
    expect(screen.queryByRole("tab", { name: en["pull.title"] })).not.toBeNull();
    expect(screen.queryByText("PANEL receiver")).not.toBeNull();
    expect(screen.queryByText("PANEL fleet")).toBeNull();
  });

  it("leaves out the tab of a feature that is switched off", async () => {
    flags = { receiverEnabled: true, fleetEnabled: false, pullEnabled: true };
    await renderPage();
    expect(screen.queryByRole("tab", { name: en["fleet.title"] })).toBeNull();
    expect(screen.queryByRole("tab", { name: en["pull.title"] })).not.toBeNull();
  });

  it("renders no strip at all when only one feature is on", async () => {
    flags = { receiverEnabled: true, fleetEnabled: false, pullEnabled: false };
    await renderPage();
    expect(screen.queryByRole("tablist")).toBeNull();
    // The panel is still there: one tab is not "no page".
    expect(screen.queryByText("PANEL receiver")).not.toBeNull();
  });

  it("falls back to an enabled tab when the hash names a disabled one", async () => {
    // The bookmark case: /instances#pull saved while pulling was on, opened
    // after it was switched off.
    window.location.hash = "#pull";
    flags = { receiverEnabled: true, fleetEnabled: false, pullEnabled: false };
    await renderPage();
    expect(screen.queryByText("PANEL pull")).toBeNull();
    expect(screen.queryByText("PANEL receiver")).not.toBeNull();
  });

  it("opens the tab the hash names when that one is on", async () => {
    window.location.hash = "#fleet";
    await renderPage();
    expect(screen.queryByText("PANEL fleet")).not.toBeNull();
    expect(screen.queryByText("PANEL receiver")).toBeNull();
  });

  it("shows nothing but the heading when all three are off", async () => {
    flags = { receiverEnabled: false, fleetEnabled: false, pullEnabled: false };
    await renderPage();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("PANEL receiver")).toBeNull();
    expect(screen.queryByText("PANEL fleet")).toBeNull();
    expect(screen.queryByText("PANEL pull")).toBeNull();
    // The heading stays, so the page is never a blank rectangle.
    expect(screen.queryByText(en["instances.title"])).not.toBeNull();
  });

  it("gives the three tabs three different names", async () => {
    // They were three sidebar rows and two of them wore the same glyph. Tabs
    // sit side by side, so a shared label would be worse here than it was
    // there.
    await renderPage();
    const names = screen.getAllByRole("tab").map((el) => el.textContent?.trim());
    expect(new Set(names).size).toBe(names.length);
  });
});
