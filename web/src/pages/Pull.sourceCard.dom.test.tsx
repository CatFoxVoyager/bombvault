// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// What a pull source's card SAYS, in each state it can be in.
//
// The verdict badge reads the LAST RESULT rather than a live probe, and that is
// the decision this file exists to hold. The receiver's card can afford to probe
// on render because reading is free and tells you something true right now. A
// pull is a thing that HAPPENED: "it worked at 04:00" is the honest report, and
// a green tick from a probe run just now would be answering a different question
// while looking like an answer to this one.
//
// The four states are asserted together because each one is a different sentence
// to the person reading it: never pulled, it worked, it failed, and I am not
// pulling from this at all. A card that collapsed two of them would be the kind
// of wrong that reads as fine.
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, en } from "../lib/i18n";
import { ToastProvider } from "../lib/toast";
import type { PullSourceView } from "../lib/api";

const base: PullSourceView = {
  id: "p1",
  name: "Tower next door",
  repo: "rest:http://192.168.1.9:8000/their-containers",
  credsRef: "",
  domain: "containers",
  cadence: "daily 04:00",
  limitDownload: 0,
  limitUpload: 0,
  lastPullAt: 1_700_000_000,
  lastPullOk: true,
  lastPullError: "",
  snapshotsPulled: 7,
  enabled: true,
  createdAt: 1_600_000_000,
  sortOrder: 0,
  hasAppKey: true,
};

let rows: PullSourceView[] = [base];
const deleted: string[] = [];

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    listPullSources: () => Promise.resolve({ ok: true, sources: rows }),
    deletePullSource: (id: string) => {
      deleted.push(id);
      return Promise.resolve({ ok: true });
    },
  };
});

const { Pull } = await import("./Pull");

async function renderPull() {
  await act(async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <Pull />
        </ToastProvider>
      </I18nProvider>
    );
  });
}

beforeEach(() => {
  rows = [base];
  deleted.length = 0;
  localStorage.clear();
});

afterEach(cleanup);

describe("pull source card", () => {
  it("reports the last result, not a fresh probe", async () => {
    await renderPull();
    expect(screen.queryByText(en["pull.pullOk"])).not.toBeNull();
    // And the count that came with it, so the row says how much arrived rather
    // than only that something did.
    expect(screen.queryByText(en["pull.snapshotsPulled"].replace("{n}", "7"))).not.toBeNull();
  });

  it("says never pulled rather than guessing at a verdict", async () => {
    rows = [{ ...base, lastPullOk: null, lastPullAt: 0, snapshotsPulled: 0 }];
    await renderPull();
    expect(screen.queryByText(en["pull.neverPulled"])).not.toBeNull();
    expect(screen.queryByText(en["pull.pullOk"])).toBeNull();
  });

  it("shows the failure AND its reason, because a red badge alone is not a report", async () => {
    rows = [{ ...base, lastPullOk: false, lastPullError: "could not open the pull source" }];
    await renderPull();
    expect(screen.queryByText(en["pull.pullFailed"])).not.toBeNull();
    expect(screen.queryByText("could not open the pull source")).not.toBeNull();
  });

  it("a disabled source says so instead of reporting an old success", async () => {
    // The trap this pins: the row still carries lastPullOk=true from before it
    // was switched off, so a verdict computed from that alone would show a green
    // tick beside a source nothing is fetching from any more.
    rows = [{ ...base, enabled: false }];
    await renderPull();
    expect(screen.queryByText(en["pull.pullingOff"])).not.toBeNull();
    expect(screen.queryByText(en["pull.pullOk"])).toBeNull();
  });

  it("cannot be pulled from while it is switched off", async () => {
    rows = [{ ...base, enabled: false }];
    await renderPull();
    const btn = screen.getByRole("button", { name: en["pull.pullNow"] }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("removes only on the second click", async () => {
    await renderPull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en["receiver.remove"] }));
    });
    expect(deleted).toEqual([]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en["offsite.targets.confirmRemove"] }));
    });
    expect(deleted).toEqual(["p1"]);
  });
});
