// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Issue #179 (manilx): "Have to open it every time. Collapsed not a lot of info
// is shown."
//
// The scorecard IS the peer card's content — collapsed, a card shows little more
// than a name and a URL — so the open state is remembered per browser instead of
// resetting to closed on every visit.
//
// The screenshots on that issue also carry a second, unreported defect: the
// version read "vv8.0.0+main.e3db401". The value already carries its own "v".
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, en } from "../lib/i18n";
import { ToastProvider } from "../lib/toast";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    listFleetPeers: () =>
      Promise.resolve({
        ok: true,
        peers: [
          {
            id: "p1",
            name: "DXP480T",
            url: "http://192.168.2.53:3003",
            enabled: true,
            lastPollAt: 1_700_000_000,
            lastPollOk: true,
            lastPollError: "",
            lastPollVersion: "v8.0.0+main.e3db401",
            lastPollDomains: [],
          },
        ],
      }),
    listMeshOffers: () => Promise.resolve({ ok: true, offers: [] }),
    getSettings: () =>
      Promise.resolve({ ok: true, settings: { fleetEnabled: true }, hostMountRoot: "/host/user", platform: "unraid" }),
  };
});

const { Fleet } = await import("./Fleet");

async function renderFleet() {
  await act(async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <Fleet />
        </ToastProvider>
      </I18nProvider>
    );
  });
}

function detailsButton() {
  return screen.getByRole("button", { name: en["fleet.details"] });
}

function scorecardVisible() {
  return screen.queryByText(en["fleet.scorecardTitle"]) !== null;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe("fleet peer card", () => {
  it("starts collapsed when nothing has been remembered", async () => {
    await renderFleet();
    expect(scorecardVisible()).toBe(false);
  });

  it("remembers that details were opened", async () => {
    await renderFleet();
    await act(async () => {
      fireEvent.click(detailsButton());
    });
    expect(scorecardVisible()).toBe(true);
    expect(localStorage.getItem("bombvault.fleetDetailsOpen")).toBe("1");

    // The whole point of the issue: come back and it is still open.
    cleanup();
    await renderFleet();
    expect(scorecardVisible()).toBe(true);
  });

  it("remembers that they were closed again", async () => {
    localStorage.setItem("bombvault.fleetDetailsOpen", "1");
    await renderFleet();
    expect(scorecardVisible()).toBe(true);

    await act(async () => {
      fireEvent.click(detailsButton());
    });
    expect(scorecardVisible()).toBe(false);
    expect(localStorage.getItem("bombvault.fleetDetailsOpen")).toBe("0");
  });

  it("prints the peer version once, not with a doubled v", async () => {
    await renderFleet();
    expect(screen.getByText("v8.0.0+main.e3db401")).toBeTruthy();
    expect(screen.queryByText(/vv8\.0\.0/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 07-04 desktop identity (D-01 double gate, Fleet half): jsdom matchMedia
// reads as DESKTOP, so these tests pin the first gate — the entire desktop
// peer surface (cards, disclosure, version line) lives under the
// max-md:hidden wrapper — and the second gate's absence — the mobile block
// (gate label, fullHeight editor sheet markup) is never mounted here, so the
// desktop DOM and its network traffic stay identical. The mobile half is
// covered by e2e/destination-config-receiver-fleet.spec.ts, where the real
// viewport drives the real breakpoint.
// ---------------------------------------------------------------------------
describe("fleet desktop identity (07-04)", () => {
  it("keeps the desktop peer surface inside the mobile-hidden wrapper", async () => {
    await renderFleet();
    const version = screen.getByText("v8.0.0+main.e3db401");
    // Walk the ancestor chain: some wrapper must carry max-md:hidden so the
    // whole desktop list collapses below the 48rem breakpoint.
    let el: HTMLElement | null = version;
    let inHiddenWrapper = false;
    while (el) {
      if (
        typeof el.className === "string" &&
        el.className.split(/\s+/).includes("max-md:hidden")
      ) {
        inHiddenWrapper = true;
        break;
      }
      el = el.parentElement;
    }
    expect(inHiddenWrapper).toBe(true);
    // The desktop disclosure affordance rides in the same hidden surface.
    const wrapper = version.closest("div");
    expect(wrapper).not.toBeNull();
  });

  it("mounts no mobile block on the desktop", async () => {
    await renderFleet();
    // The mobile gate-off card's section label never renders on desktop —
    // the desktop page has no settings.fleetEnabled copy anywhere.
    expect(screen.queryByText(en["settings.fleetEnabled"])).toBeNull();
    // No fullHeight mobile sheet markup exists; the desktop edit surface is
    // the portal dialog, not a BottomSheet.
    expect(document.querySelector(".h-dvh")).toBeNull();
    // And the desktop list is not double-rendered: exactly one copy of the
    // peer card's URL line (a mobile twin would add a second).
    expect(screen.getAllByText("http://192.168.2.53:3003")).toHaveLength(1);
  });
});
