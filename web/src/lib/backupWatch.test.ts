// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Regression test for #154: "select all VMs, back up selected" silently
// skipped exactly one VM (Windows Server 2022) with no success line, no
// failure line, nothing in the activity log at all.
//
// Root cause: fireAndWaitRun (the bulk "back up / restore selected" fire-
// retry-wait helper every batch item runs through) used to give up firing a
// batch item after a fixed 30s "busy" retry budget (the old BUSY_RETRY_MS).
// But the previous item's single-flight guard (service.go's batchActive)
// does not release until that item's entire backup call returns; which
// includes its own inline, synchronous off-site replication
// (Service.replicateOffsite, called from BackupVM/Backup after the run row
// is already marked "success" but before the wrapping goroutine, and
// therefore batchActive, releases). The reported activity log shows real
// inline replications taking 20-40s; a 37s one sits right past the old 30s
// budget. The next batch item's start() kept getting rejected "a backup is
// already running" until the retry gave up; and because start() never
// actually succeeded for that item, no run was ever recorded for it: nothing
// to show in the activity log, exactly the silent skip reported.
//
// The fix folds the fire-retry budget into the same generous watchTimeoutMs
// deadline already used to wait out a real in-progress backup/restore, so a
// transient "still releasing" busy signal is retried for as long as a batch
// item is allowed to run at all, never abandoned on an arbitrary shorter
// clock. This test pins that: it fails against the pre-fix 30s cap (the
// batch item never starts) and passes once the retry survives past it.
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { Run } from "./api";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, listRuns: vi.fn() };
});

import { listRuns } from "./api";
import { fireAndWaitRun, useBackupWatch } from "./backupWatch";

const mockedListRuns = vi.mocked(listRuns);

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "run-1",
    targetId: "target-1",
    kind: "backup",
    status: "success",
    startedAt: 0,
    finishedAt: 1,
    snapshotId: "abc123",
    bytes: 0,
    error: "",
    acknowledged: false,
    target: "Windows Server 2022",
    domain: "vm",
    ...overrides,
  };
}

describe("fireAndWaitRun busy-retry (#154)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedListRuns.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps retrying a busy start well past the old 30s cap and still starts + succeeds", async () => {
    const t0 = Date.now();
    // No prior runs for this target before we fire.
    mockedListRuns.mockResolvedValue({ ok: true, runs: [] });

    // Simulate the previous batch item's inline off-site replication holding
    // the shared single-flight guard for 40 real seconds; longer than the
    // old fixed 30s retry budget, matching the ~37-40s replication windows
    // visible in the reported activity log.
    const BUSY_FOR_MS = 40_000;
    let startCalls = 0;
    const start = vi.fn(async () => {
      startCalls++;
      if (Date.now() - t0 < BUSY_FOR_MS) {
        return { ok: false, error: "a backup is already running" };
      }
      // The guard has freed up: this start actually succeeds and a run gets
      // recorded; from here on, listRuns() must surface it.
      mockedListRuns.mockResolvedValue({
        ok: true,
        runs: [makeRun({ id: "new-run", status: "success" })],
      });
      return { ok: true, started: true };
    });

    const resultPromise = fireAndWaitRun({
      kind: "backup",
      matchRun: (r) => r.domain === "vm" && r.target === "Windows Server 2022",
      start,
      // fireAndWaitRun now takes the translate function for its failure tail
      // (bombvault/user-message-is-translated). This test never reaches that
      // tail, so identity is enough and keeps the assertions reading in keys.
      t: ((key: string) => key) as never,
    });

    // Fast-forward well past the old 30s cap (retry) and the poll interval
    // (watch); the batch item must still complete successfully.
    await vi.advanceTimersByTimeAsync(70_000);

    await expect(resultPromise).resolves.toEqual({ ok: true });
    // Proves the helper kept retrying the busy start past the old 30s/30-call
    // ceiling instead of giving up early.
    expect(startCalls).toBeGreaterThan(35);
  });
});

// ---------------------------------------------------------------------------
// useBackupWatch's poll chain; the visibility contract the header comment in
// backupWatch.ts promises: the chain never timer-polls a hidden page, refetches
// on the return edge, and stays one chain no matter how violently the tab
// flips. The one-chain property is the regression that matters: before the
// chain-timer existed, a hide+show while a tick was pending left that tick
// alive beside the restarted chain, and every live execution scheduled its
// own successor; two chains forever, doubling the runs traffic (the busy
// flag cannot see the fork; the two hops are staggered, not concurrent).
//
// The harness is the real hook over the mocked api module (only listRuns is
// stubbed; the type surface stays real) with document.visibilityState
// shadowed the way useVisibilityGate.test.ts drives it; transitions are
// announced with the browser's own visibilitychange event, never by poking
// module internals.
// ---------------------------------------------------------------------------

class FakeEventSource {
  onmessage: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  close() {}
}

/** Shadow visibilityState and announce the flip the way a browser does. */
function setPageVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/** A run for the watched target that is still in flight; the response that
 *  keeps a chain alive and polling. The makeRun defaults above describe a VM;
 *  the watched target here is a container named plex. */
function runningPlex(): Run[] {
  return [
    makeRun({
      id: "new-run",
      status: "running",
      finishedAt: null as unknown as number,
      snapshotId: "",
      domain: "containers",
      target: "plex",
    }),
  ];
}

describe("useBackupWatch poll chain", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedListRuns.mockReset();
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete (document as { visibilityState?: unknown }).visibilityState;
    vi.useRealTimers();
  });

  /** Mount the hook against the plex target and drive one fire() through the
   *  baseline snapshot, the start POST and the 600ms first poll. Returns the
   *  harness plus the listRuns call count the watch has consumed so far. */
  async function renderAndFire(over: Partial<Parameters<typeof useBackupWatch>[0]> = {}) {
    const onRun = vi.fn();
    const utils = renderHook(() =>
      useBackupWatch({
        progressKey: "container:plex",
        start: async () => ({ ok: true, started: true }),
        matchRun: (r) => r.domain === "containers" && r.target === "plex",
        onRun,
        ...over,
      })
    );
    await act(async () => {
      void utils.result.current.fire();
      // Baseline listRuns + the start POST; promise hops, no timers yet.
      await vi.advanceTimersByTimeAsync(0);
    });
    const afterFire = mockedListRuns.mock.calls.length;
    // The first poll hop, 600ms after the accepted start.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(mockedListRuns.mock.calls.length).toBe(afterFire + 1);
    return { onRun, ...utils };
  }

  it("polls nothing while the page is hidden and resumes one chain on return", async () => {
    mockedListRuns.mockResolvedValue({ ok: true, runs: runningPlex() });
    const callsAtStart = mockedListRuns.mock.calls.length;
    await renderAndFire();
    const settled = mockedListRuns.mock.calls.length;
    expect(settled).toBeGreaterThan(callsAtStart);

    // Hidden: the next pending tick hits the gate and the chain stops; no
    // matter how long the tab stays in the background.
    setPageVisibility("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mockedListRuns.mock.calls.length).toBe(settled);

    // Return: the visibility edge refetches immediately (the reconcile)…
    setPageVisibility("visible");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockedListRuns.mock.calls.length).toBe(settled + 1);

    // …and the cadence resumes at the normal 2s from that refetch: three
    // ticks in a 6s stretch, never more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(mockedListRuns.mock.calls.length).toBe(settled + 1 + 3);
  });

  it("keeps exactly one chain across rapid hide/show flips", async () => {
    mockedListRuns.mockResolvedValue({ ok: true, runs: runningPlex() });
    await renderAndFire();
    const settled = mockedListRuns.mock.calls.length;

    // Five hide/show pairs, each landing while a cadence tick is pending:
    // every visible edge restarts the chain directly while the pending tick
    // is still armed. This is the exact sequence that used to fork the chain.
    for (let i = 0; i < 5; i++) {
      setPageVisibility("hidden");
      setPageVisibility("visible");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
    }

    // One chain, counted over a 10s stretch: each of the 5 visible edges
    // contributed exactly one reconcile hop, and the surviving chain ticks
    // at the normal 2s cadence; 5 more hops in 10 seconds. Ten. A forked
    // chain would multiply the stretch's ticks by the number of live chains
    // and blow straight past it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mockedListRuns.mock.calls.length - settled).toBe(10);
  });

  it("never runs a second hop while one is in flight", async () => {
    // Call 1 is fire()'s baseline; call 2 is the first poll hop; hang that
    // one, so the visibility edge lands while a hop is genuinely awaiting.
    let calls = 0;
    let release!: () => void;
    mockedListRuns.mockImplementation(async () => {
      calls += 1;
      if (calls === 2) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return { ok: true, runs: runningPlex() };
    });
    await renderAndFire();
    expect(mockedListRuns.mock.calls.length).toBe(2);

    // The return edge fires while hop 2 is still hanging: the busy flag must
    // bounce the restart; one fetch in flight, not two.
    setPageVisibility("visible");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockedListRuns.mock.calls.length).toBe(2);

    // Release the hop: it completes and schedules its one successor. From
    // there the cadence is a single 2s chain; one call per 2s stretch, not
    // the doubled pair a forked chain would show.
    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(mockedListRuns.mock.calls.length).toBe(3);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(mockedListRuns.mock.calls.length).toBe(4);
  });

  it("reports the correlated run at the first poll that sees it, then carries fresher records", async () => {
    mockedListRuns
      // fire()'s baseline: nothing for this target yet.
      .mockResolvedValueOnce({ ok: true, runs: [] })
      // First poll: the pass's run exists; the correlation moment.
      .mockResolvedValueOnce({ ok: true, runs: runningPlex() })
      // Later polls: the same run, terminal.
      .mockResolvedValue({
        ok: true,
        runs: [
          makeRun({
            id: "new-run",
            status: "success",
            snapshotId: "abc123",
            domain: "containers",
            target: "plex",
          }),
        ],
      });
    const { onRun, result } = await renderAndFire();

    // The correlation landed on the first poll that saw the run, as a live
    // record; while the watch itself is still pending.
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0][0].id).toBe("new-run");
    expect(onRun.mock.calls[0][0].status).toBe("running");
    expect(result.current.state.phase).toBe("pending");

    // The next poll delivers the freshest record and resolves the watch
    // (the +100 slack clears the exact-boundary tick, same slack every
    // cadence advance in this file uses).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100);
    });
    expect(onRun).toHaveBeenCalledTimes(2);
    expect(onRun.mock.calls[1][0].status).toBe("success");
    expect(result.current.state.phase).toBe("success");
  });
});
