// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Dashboard phone run-sheet state machine.
//
// The phone sheet host lives on the Dashboard page (no route), fed by two
// writers that must never fight over it: a row tap in Recent runs (opens a
// specific run) and the everything pass's watch (correlates the fired run and
// deep-links it). These tests pin the three behaviors the state machine
// exists for:
//
//   1. Jump guard; while the watch is still live, every poll re-reports the
//      correlated run. A sheet the user has since pointed at a different run
//      must not be yanked back to the everything pass by those ticks; only
//      (a) an empty sheet, (b) a refresh of the run already shown, or (c) the
//      first correlation of a user-armed fire may replace sheetRun.
//   2. Live refresh; a sheet opened from Recent runs resolves its run by id
//      out of the page's polled listRuns state at render, so it follows the
//      run from Running to its terminal status without being re-opened.
//   3. Rotation; crossing to desktop unmounts the sheet (and the phone
//      trigger): the bottom sheet has no desktop form, so it must not float
//      over the desktop grid.
//
// The page renders through the real components against a mocked api module
// (only the read endpoints are stubbed; ApiError and every type stay the real
// module's), with the desktop media query held at "phone"; jsdom otherwise
// answers desktop and the phone surface would never mount.
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider, en } from "../lib/i18n";
import { ToastProvider } from "../lib/toast";
import { AdvancedProvider } from "../lib/advanced";
import { DESKTOP_QUERY } from "../lib/useMediaQuery";
import type { Run } from "../lib/api";
import { Dashboard } from "./Dashboard";

// The one mutable runs list every listRuns() call reads; tests rewrite it to
// move time forward (a run going terminal, the watch finding its run).
let currentRuns: Run[] = [];
const listRunsMock = vi.fn(() => Promise.resolve({ ok: true, runs: currentRuns }));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    listRuns: () => listRunsMock(),
    getStatus: () => Promise.resolve({ ok: true, domains: [] }),
    getScheduleNext: () => Promise.resolve([]),
    getStats: () => Promise.resolve({ ok: false }),
    listContainers: () => Promise.resolve({ ok: true, containers: [] }),
    listVMs: () => Promise.resolve({ ok: true, vms: [] }),
    getSettings: () => Promise.resolve({ ok: true, settings: {} as never }),
    getHistory: () => Promise.resolve({ ok: true, days: [] }),
    getSpike: () => Promise.resolve({ ok: false }),
    backupEverythingNow: () => Promise.resolve({ ok: true, started: true }),
  };
});

/** A run with every wire field the page and sheet read. */
function makeRun(over: Partial<Run> & { id: string }): Run {
  const now = Math.floor(Date.now() / 1000);
  return {
    targetId: "containers:plex",
    kind: "backup",
    status: "failed",
    startedAt: now - 60,
    finishedAt: now - 30,
    snapshotId: "abc12345",
    bytes: 1024,
    error: "exit status 1: [path]",
    acknowledged: false,
    target: "plex",
    domain: "containers",
    ...over,
  };
}

// --- jsdom environment stubs -------------------------------------------------

const mqlListeners = new Set<() => void>();
let desktopMatches = false;

/** matchMedia stub whose only live answer is the desktop width query; the
 *  flip helper notifies subscribers the way a real MediaQueryList would. */
function installMatchMedia() {
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === DESKTOP_QUERY ? desktopMatches : false;
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_type: string, l: () => void) => mqlListeners.add(l),
    removeEventListener: (_type: string, l: () => void) => mqlListeners.delete(l),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function setDesktop(v: boolean) {
  desktopMatches = v;
  mqlListeners.forEach((l) => l());
}

class FakeEventSource {
  onmessage: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  close() {}
}

beforeEach(() => {
  vi.useFakeTimers();
  installMatchMedia();
  vi.stubGlobal("EventSource", FakeEventSource);
  desktopMatches = false;
  currentRuns = [];
  listRunsMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(
    <I18nProvider>
      <ToastProvider>
        <AdvancedProvider>
          <Dashboard />
        </AdvancedProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

/** Flush the mount-time fetch batch (every mocked read resolves in a
 *  microtask; one empty act hop settles them). */
async function settle() {
  await act(async () => {});
}

/** The recent-runs row button for a target (the runs section precedes the
 *  activity log in the phone column, so the first match is the row). */
function recentRunRow(target: string): HTMLElement {
  const rows = screen
    .getAllByRole("button", { name: new RegExp(target, "i") })
    .filter((el) => (el.getAttribute("aria-label") ?? "").length > 0);
  expect(rows.length).toBeGreaterThan(0);
  return rows[0];
}

/** Fire Backup Everything from the thumb-zone trigger, walking through the
 *  consequence sheet. Returns after the start POST has been accepted. */
async function fireEverything() {
  fireEvent.click(screen.getByRole("button", { name: en["settings.everythingTitle"] }));
  await settle();
  // The trigger button and the consequence sheet's confirm button share the
  // name settings.everythingTitle (the confirm names the outcome); the
  // confirm lives inside its own dialog.
  const dialogs = screen.getAllByRole("dialog");
  const confirmDialog = dialogs.find((d) =>
    within(d).queryByRole("button", { name: en["settings.everythingTitle"] })
  );
  expect(confirmDialog).toBeDefined();
  fireEvent.click(within(confirmDialog as HTMLElement).getByRole("button", { name: en["settings.everythingTitle"] }));
  // confirm resolution + fire()'s baseline listRuns + start POST; all
  // promise hops, no timers needed yet.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("Dashboard phone run sheet", () => {
  it("does not yank the sheet back to the everything run on later watch polls", async () => {
    const plex = makeRun({ id: "run-plex-1", target: "plex", status: "failed" });
    currentRuns = [plex];
    renderPage();
    await settle();

    fireEvent.click(recentRunRow("plex"));
    expect(within(screen.getByRole("dialog")).getAllByText(/plex/i).length).toBeGreaterThan(0);

    // Fire: baseline seeds with only plex; once the pass's run appears the
    // correlation deep-links the sheet to it (the armed steal; intended).
    await fireEverything();
    const everything = makeRun({
      id: "run-everything-1",
      target: "all-domains",
      targetId: "everything",
      domain: "everything",
      status: "running",
      finishedAt: null,
      error: "",
      snapshotId: "",
      bytes: 0,
    });
    currentRuns = [everything, plex];
    // The watch's first poll fires 600ms after the accepted start.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(within(screen.getByRole("dialog")).getByText(/all-domains/i)).toBeTruthy();

    // The user now opens a different run's sheet from Recent runs.
    fireEvent.click(recentRunRow("plex"));
    expect(within(screen.getByRole("dialog")).getAllByText(/plex/i).length).toBeGreaterThan(0);

    // Later polls keep re-reporting the still-running everything run; every
    // tick used to replace sheetRun and bounce the sheet back every two
    // seconds. The guard keeps the user's run on screen.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText(/plex/i).length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/all-domains/i)).toBeNull();
  });

  it("follows a run opened from Recent runs as its status changes", async () => {
    const jellyfin = makeRun({
      id: "run-jellyfin-1",
      target: "jellyfin",
      targetId: "containers:jellyfin",
      status: "running",
      finishedAt: null,
      error: "",
    });
    currentRuns = [jellyfin];
    renderPage();
    await settle();

    fireEvent.click(recentRunRow("jellyfin"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(en["run.statusRunning"])).toBeTruthy();

    // The run goes terminal; the page's 10s listRuns poll is the only thing
    // that moves (no re-open, no watch involved).
    currentRuns = [
      {
        ...jellyfin,
        status: "success",
        finishedAt: jellyfin.startedAt + 30,
        snapshotId: "deadbeef42",
      },
    ];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    expect(within(screen.getByRole("dialog")).getByText(en["spike.ok"])).toBeTruthy();
    expect(within(screen.getByRole("dialog")).queryByText(en["run.statusRunning"])).toBeNull();
  });

  it("unmounts the sheet and the trigger when the viewport crosses to desktop", async () => {
    const plex = makeRun({ id: "run-plex-2", target: "plex", status: "failed" });
    currentRuns = [plex];
    renderPage();
    await settle();

    fireEvent.click(recentRunRow("plex"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: en["settings.everythingTitle"] })).toBeTruthy();

    setDesktop(true);
    await act(async () => {});

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: en["settings.everythingTitle"] })).toBeNull();
  });
});
