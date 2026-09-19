// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Sidebar <-> navModel registry consistency.
//
// Sidebar's header comment says the rail derives from the one ordered nav
// registry (lib/navModel.ts), but the rail still evaluates its own hand-written
// NavItem JSX (with a nextHue() counter and inline settings gates, which is the
// part the registry deliberately cannot own; see navModel.ts's header). Two
// lists describing one navigation is exactly the drift the registry exists to
// kill, so this file pins the two together: whatever Sidebar renders must equal
// destinations(settings) filtered to enabled; same routes, same order, same
// gates; across gate combinations, and any divergence on either side fails
// here instead of silently becoming a rail the registry no longer describes.
//
// Routes are read off the rendered anchors' href (NavLink renders `to` as
// href), so the comparison is structural and never re-types the labels. The
// footer's sign-out and view toggle are buttons, not links, so every anchor in
// the render is a nav destination and DOM order is the rail's order.
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { I18nProvider } from "../lib/i18n";
import { AdvancedProvider } from "../lib/advanced";
import type { Settings } from "../lib/api";
import { destinations } from "../lib/navModel";

// The gate fields destinations() reads; the navModel.test.ts idiom (`as
// Settings` partials) keeps every unused Settings field out of the fixtures.
const ALL_OFF = {
  vmsEnabled: false,
  flashEnabled: false,
  filesEnabled: false,
  configEnabled: false,
  receiverEnabled: false,
  fleetEnabled: false,
  pullEnabled: false,
} as Settings;

const ALL_ON = {
  ...ALL_OFF,
  vmsEnabled: true,
  flashEnabled: true,
  filesEnabled: true,
  configEnabled: true,
  receiverEnabled: true,
  fleetEnabled: true,
  pullEnabled: true,
} as Settings;

// A mixed middle state: consecutive gated tabs split on/off around the list,
// the shape most likely to expose an ordering or gate drift.
const MIXED = {
  ...ALL_OFF,
  vmsEnabled: true,
  filesEnabled: true,
  pullEnabled: true,
} as Settings;

/** Renders the Sidebar alone (no chrome siblings, so every anchor is a nav
 *  destination) and returns the destinations it rendered, in DOM order, as
 *  href routes. */
function renderedRoutes(settings: Settings | null): string[] {
  const { container } = render(
    <MemoryRouter initialEntries={["/"]}>
      <I18nProvider>
        <AdvancedProvider>
          <Sidebar settings={settings} authEnabled={false} />
        </AdvancedProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
  const anchors = Array.from(container.querySelectorAll("a[href]"));
  return anchors.map((a) => a.getAttribute("href") ?? "");
}

function registryRoutes(settings: Settings | null): string[] {
  return destinations(settings)
    .filter((d) => d.enabled)
    .map((d) => d.to);
}

beforeEach(() => {
  localStorage.removeItem("bv-lang");
  localStorage.removeItem("bombvault.advanced");
});

afterEach(cleanup);

describe("Sidebar renders exactly the navModel registry", () => {
  it.each([
    ["every gate off", ALL_OFF],
    ["every gate on", ALL_ON],
    ["a mixed middle state", MIXED],
    ["null settings (pre-boot)", null],
  ])("%s: the rail's links equal destinations(settings) filtered to enabled, in registry order", (_name, settings) => {
    expect(renderedRoutes(settings)).toEqual(registryRoutes(settings));
  });
});
