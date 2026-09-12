// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// SelectionTree TOUCH-MODE twins (phase 6, D-01/D-02) — the interaction-layer
// contract of `interactionMode="touch"`, pinned against the SAME component
// the desktop suites exercise (never a fork: D-01's whole point is that this
// mode is a prop on the ONE tree).
//
// What these tests own that the desktop suites do not:
//   - tap-to-toggle: a row click toggles through onToggle (the ONE toggle
//     pipeline) instead of expanding — and two taps ROUND-TRIP the check,
//     the executable refutation of the checkbox double-fire hazard (research
//     Pitfall 1: a second, live toggle surface under the row would make two
//     taps a no-op).
//   - the chevron is a real, labelled >=44x44 button that expands WITHOUT
//     toggling — the dedicated-zone half of D-02 (expand and check never
//     share a hit area).
//   - the checkbox is purely presentational: pointer-events-none so real
//     taps fall through to the row, and no onChange — clicking the input
//     itself toggles nothing.
//   - the pointer default is UNTOUCHED: without the prop the row click
//     expands (never toggles) and the checkbox stays the live control —
//     the byte-identical-desktop guarantee (D-01) in its most observable form.
//
// Harness: the direct-render TreeHarness shape from SelectionTree.dom
// .test.tsx, but with a STATEFUL includes mirror on the harness side so a
// tap's optimistic round-trip is real state arithmetic, not a spy count.
// jsdom has no scrollIntoView — stubbed, same as the keyboard suite
// (focusNode calls it on every tap).
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { I18nProvider } from "../lib/i18n";
import type { BrowseResponse, MountInfo } from "../lib/api";

let browseCalls: string[] = [];

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    browse: (path: string) => {
      browseCalls.push(path);
      const reply: BrowseResponse = {
        ok: true,
        status: "ok",
        truncated: false,
        dirs: [{ name: "library", path: "user/appdata/plex/library" }],
      };
      return Promise.resolve(reply);
    },
  };
});

// Imported AFTER vi.mock so the tree picks up the mocked client.
const { SelectionTree } = await import("./SelectionTree");

const HOST_ROOT = "/mnt";
const MOUNT = "/mnt/user/appdata/plex";

const MOUNTS: MountInfo[] = [
  { source: MOUNT, dest: "/config", selected: true, isAppdata: false, reachable: true },
];

/** Stateful tree: `includes` mirrors what the taps mutate, exactly the way
 *  FoldersEditor's mirror does, so aria-checked round-trips are observable
 *  through the REAL classifyNode path. */
function TouchHarness({ taps }: { taps: string[] }) {
  const [includes, setIncludes] = useState<Set<string>>(() => new Set([MOUNT]));
  const toggle = (hostPath: string) => {
    taps.push(hostPath);
    setIncludes((prev) => {
      const next = new Set(prev);
      if (next.has(hostPath)) next.delete(hostPath);
      else next.add(hostPath);
      return next;
    });
  };
  return (
    <SelectionTree
      mounts={MOUNTS}
      customPaths={[]}
      includes={includes}
      exclusions={new Set()}
      hostSourceRoot={HOST_ROOT}
      containerName="touch"
      browseCache={new Map()}
      onToggle={toggle}
      onRemoveCustom={() => {}}
      interactionMode="touch"
    />
  );
}

/** The DESKTOP control harness: no interactionMode prop at all — the default
 *  the Files-page mount (and every existing caller) rides. */
function PointerHarness({ taps }: { taps: string[] }) {
  return (
    <SelectionTree
      mounts={MOUNTS}
      customPaths={[]}
      includes={new Set([MOUNT])}
      exclusions={new Set()}
      hostSourceRoot={HOST_ROOT}
      containerName="pointer"
      browseCache={new Map()}
      onToggle={(p) => taps.push(p)}
      onRemoveCustom={() => {}}
    />
  );
}

function renderTouch(taps: string[]): void {
  render(
    <I18nProvider>
      <TouchHarness taps={taps} />
    </I18nProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bv-lang", "en");
  browseCalls = [];
  // focusNode scrollIntoViews on every tap; jsdom does not implement it.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("SelectionTree touch mode: tap-to-toggle (D-02)", () => {
  it("tapping the row toggles the check through onToggle", async () => {
    const taps: string[] = [];
    renderTouch(taps);

    const row = screen.getByRole("treeitem", { name: /appdata\/plex/ });
    expect(row.getAttribute("aria-checked")).toBe("true");
    await act(async () => {
      fireEvent.click(row);
    });

    expect(taps).toEqual([MOUNT]);
    expect(screen.getByRole("treeitem", { name: /appdata\/plex/ }).getAttribute("aria-checked")).toBe("false");
  });

  it("tapping twice round-trips the check (never a zero-change double-fire)", async () => {
    const taps: string[] = [];
    renderTouch(taps);
    const name = /appdata\/plex/;

    await act(async () => {
      fireEvent.click(screen.getByRole("treeitem", { name }));
    });
    expect(screen.getByRole("treeitem", { name }).getAttribute("aria-checked")).toBe("false");

    await act(async () => {
      fireEvent.click(screen.getByRole("treeitem", { name }));
    });
    expect(screen.getByRole("treeitem", { name }).getAttribute("aria-checked")).toBe("true");

    // Two taps, two toggles — the double-fire hazard (Pitfall 1) would land
    // back on "true" after the FIRST tap, i.e. zero net change per tap.
    expect(taps).toEqual([MOUNT, MOUNT]);
  });

  it("guarded rows cannot toggle: the exact Space guard gates the tap too", async () => {
    const taps: string[] = [];
    render(
      <I18nProvider>
        <SelectionTree
          mounts={[{ ...MOUNTS[0], reachable: false }]}
          customPaths={[]}
          includes={new Set()}
          exclusions={new Set()}
          hostSourceRoot={HOST_ROOT}
          containerName="touch-guarded"
          browseCache={new Map()}
          onToggle={(p) => taps.push(p)}
          onRemoveCustom={() => {}}
          interactionMode="touch"
        />
      </I18nProvider>,
    );

    // An unreachable mount renders with NO tap handler at all — the same
    // rule Space obeys (`!spec.unreachable && !busyPaths?.has(...)`) is the
    // rule the finger obeys (T-02-10: one guard, one toggle semantics).
    await act(async () => {
      fireEvent.click(screen.getByRole("treeitem", { name: /appdata\/plex/ }));
    });
    expect(taps).toEqual([]);
  });
});

describe("SelectionTree touch mode: the chevron zone (D-02)", () => {
  it("expands through the labelled chevron button without toggling", async () => {
    const taps: string[] = [];
    renderTouch(taps);

    const row = screen.getByRole("treeitem", { name: /appdata\/plex/ });
    // (4) The chevron EXISTS as a real control with an accessible name —
    // the desktop glyph is aria-hidden decoration; the touch button is
    // announced ("Expand", the wave-1 common.expand key).
    const chevron = within(row).getByRole("button", { name: "Expand" });
    expect(row.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      fireEvent.click(chevron);
    });

    // Expansion happened through the lazy browse…
    expect(browseCalls).toEqual(["user/appdata/plex"]);
    expect(screen.getByRole("treeitem", { name: /appdata\/plex/ }).getAttribute("aria-expanded")).toBe("true");
    // …and the check did NOT move: the two gestures never share a pipeline.
    expect(taps).toEqual([]);
    expect(screen.getByRole("treeitem", { name: /appdata\/plex/ }).getAttribute("aria-checked")).toBe("true");
    // The name follows the state ("Collapse" once open) — same key pair the
    // chevron is labelled from.
    expect(
      within(screen.getByRole("treeitem", { name: /appdata\/plex/ })).getByRole("button", { name: "Collapse" }),
    ).toBeTruthy();
  });
});

describe("SelectionTree touch mode: the checkbox is purely presentational (Pitfall 1)", () => {
  it("carries pointer-events-none and toggles nothing when clicked itself", async () => {
    const taps: string[] = [];
    renderTouch(taps);

    const row = screen.getByRole("treeitem", { name: /appdata\/plex/ });
    const box = within(row).getByRole("checkbox", { hidden: true });
    // pointer-events-none is the half that makes REAL taps fall through to
    // the row (the one toggle surface).
    expect(box.className).toContain("pointer-events-none");

    // …and the DOM-level half: with onChange unwired, even a synthetic click
    // on the input (stopPropagation kept) toggles nothing — no dead zone and
    // no second pipeline.
    await act(async () => {
      fireEvent.click(box);
    });
    expect(taps).toEqual([]);
    expect(row.getAttribute("aria-checked")).toBe("true");
  });
});

describe("SelectionTree pointer default is untouched (D-01)", () => {
  it("row click expands (never toggles); the checkbox stays the live control", async () => {
    const taps: string[] = [];
    render(
      <I18nProvider>
        <PointerHarness taps={taps} />
      </I18nProvider>,
    );

    const row = screen.getByRole("treeitem", { name: /appdata\/plex/ });
    // No chevron button on the desktop tree — the glyph is aria-hidden.
    expect(within(row).queryByRole("button", { name: /expand/i })).toBeNull();

    await act(async () => {
      fireEvent.click(row);
    });
    // Desktop semantics: the row click EXPANDED…
    expect(browseCalls).toEqual(["user/appdata/plex"]);
    expect(screen.getByRole("treeitem", { name: /appdata\/plex/ }).getAttribute("aria-expanded")).toBe("true");
    // …and did NOT toggle.
    expect(taps).toEqual([]);

    // The checkbox is still the live toggle (no pointer-events-none, real
    // onChange): clicking it flips the check.
    const box = within(screen.getByRole("treeitem", { name: /appdata\/plex/ })).getByRole("checkbox", {
      hidden: true,
    });
    expect(box.className).not.toContain("pointer-events-none");
    await act(async () => {
      fireEvent.click(box);
    });
    expect(taps).toEqual([MOUNT]);
  });
});
