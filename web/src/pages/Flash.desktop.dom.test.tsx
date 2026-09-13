// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// 07-03 (MORE-01a / D-01): the Flash page's desktop-identity test — the exact
// mirror of the VMs.test.tsx double-gate block. jsdom's matchMedia stub
// answers "desktop", so the full <Flash> page renders the DESKTOP
// presentation (the three desktop cards, byte-identical structure) and the
// mobile hero + snapshot block is never mounted. The max-md:hidden wrappers
// must exist (the gate's other half), and the mobile-only surfaces must be
// absent: the Fab, the hero, the tonal snapshot entries, the Load-more
// button and the zip-export sheet entry are all e2e-only surfaces.
// The mobile presentation itself is exercised by the staged Playwright
// harness (e2e/destination-vms-flash.spec.ts); see the mount-discipline
// comment on Flash().
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Flash } from "./Flash";

class FakeEventSource {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  close() {
    /* no-op */
  }
}

vi.stubGlobal("EventSource", FakeEventSource);

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    listRuns: vi.fn(async () => ({ ok: true, runs: [] })),
    // Page-level fetches. The mobile block's own fetches (gate getSettings,
    // the zip sheet's settings access) never run under jsdom's desktop
    // matchMedia — the stubs only have to exist.
    listFlashSnapshots: vi.fn(async () => ({ ok: true, snapshots: [] })),
    getSettings: vi.fn(async () => ({
      ok: true,
      settings: {} as never,
      hostMountRoot: "",
      platform: "generic",
    })),
  };
});

// Imported AFTER vi.mock so this binding is the mocked function.
import { listFlashSnapshots } from "../lib/api";
import type { Snapshot } from "../lib/api";

const snaps: Snapshot[] = Array.from({ length: 25 }, (_, i) => ({
  id: `snap${String(i).padStart(2, "0")}f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6`,
  time: new Date(Date.UTC(2026, 0, 1, 12, 0, 0) + i * 3_600_000).toISOString(),
  paths: ["/boot"],
  tags: ["flash"],
  hostname: "tower",
}));

afterEach(() => {
  cleanup();
});

describe("Flash page D-01 double gate (desktop identity in jsdom)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listFlashSnapshots).mockResolvedValue({ ok: true, snapshots: snaps });
  });

  it("renders the desktop page with the max-md:hidden gate present and the mobile block absent", async () => {
    render(
      <MemoryRouter>
        <Flash />
      </MemoryRouter>
    );

    // The desktop content arrives (listFlashSnapshots resolved).
    await waitFor(() =>
      expect(screen.getAllByText(/snap\d\d/).length).toBeGreaterThan(0)
    );

    // D-01 first half: the desktop JSX carries the below-md hide class.
    expect(document.body.querySelector('[class*="max-md:hidden"]')).not.toBeNull();

    // D-01 second half: the mobile block never mounts in jsdom — none of its
    // unique surfaces exist. All 25 desktop snapshot rows render unwrapped
    // (the desktop list is NOT windowed), so "Load more" cannot appear; the
    // zip-export sheet entry and the settings gate card are mobile-only.
    expect(screen.queryByText("common.loadMore")).toBeNull();
    expect(screen.queryByRole("button", { name: "flash.zipExport.title" })).toBeNull();
    expect(screen.queryByText("settings.flashEnabled")).toBeNull();
    expect(screen.queryByText("nav.settings")).toBeNull();
    for (const snap of snaps) {
      expect(screen.getAllByText(snap.id.slice(0, 8)).length).toBeGreaterThan(0);
    }
  });
});
