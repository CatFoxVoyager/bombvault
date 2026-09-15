// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Recovery.mobile.dom.test.tsx — 08-01 Task 3's dom fence around the D-01
// double gate and the MobileRecoveryFlow tracer (plan action items 1a-1e).
//
// WHY THIS FILE EXISTS: the mobile block was added to Recovery.tsx under the
// one invariant the whole phase rests on — the DESKTOP half is byte-identical,
// and the page-flat `hueSeq` counter's evaluation order is untouched. The
// block's own guard is its position in the JSX: it calls NO nextHue(). A stray
// call would renumber every desktop heading after the mount point whenever the
// viewport crossed 48rem, silently, with no desktop pixel changed. That is not
// observable by the guard suite's static sweeps, so it is asserted HERE, at
// runtime: the first eight rainbow carriers on a fresh mount must still be
// indices 0..7, in document order (assertion (a) below).
//
// WHAT IS ASSERTED (the plan's five items):
//   (a) hue sequence — six StepCards + CloudCredsDisclosure's two nextHue()
//       calls still receive 0..7 in order, read from the carriers' OWN inline
//       `--item-hue` custom property (the observable output of
//       hueVars(rainbowAt(i))). NOT via the `.glim-hue` class: Badge notches
//       and hue-enabled Buttons carry that class too, so it over-matches.
//   (b) gating chain — a fresh mobile mount renders step 1 only; each
//       Continue exists only while its gate holds; the zero-target path
//       reaches the kit step (the gate is
//       `restoreAllResult != null || (containers.length === 0 && vms.length === 0)`,
//       so zero-target users are never stranded).
//   (c) chip text — t("recovery.mobile.stepOf") renders "Step {n} of 6" at
//       every position the walk visits.
//   (d) Back preserves completed step state (presentation-only navigation —
//       the shared state is the single source).
//   (e) the StickyActionBar action label per state (primary key vs
//       common.continue vs common.done).
//
// THE DOUBLE GATE UNDER JSDOM: `max-md:hidden` is CSS, and jsdom applies no
// stylesheet — so the desktop half renders into the test DOM on BOTH stubs.
// That is exactly what makes (a) assertable on a mobile-answering stub, and it
// is why every shared-text query below is SCOPED either to the mobile flow's
// content subtree or to the StickyActionBar: the desktop card's own "Check"
// button and skip button are in the same document. The D-01 runtime shape is
// asserted directly instead of assumed: on a mobile stub the desktop half is
// still mounted (one component instance), and on the desktop stub the mobile
// block is genuinely absent from the DOM (it mounts behind `!isDesktop`, not
// behind CSS).
//
// Harness notes: useProgress() opens a real EventSource on mount, which jsdom
// does not implement — the same minimal stub VMs.test.tsx installs. matchMedia
// is stubbed per test (desktop- or mobile-answering) rather than relying on
// the global setup stub, so each case is deterministic regardless of file
// order (the Settings.settingsWrites.dom.test.tsx pattern).
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { I18nProvider, en } from "../lib/i18n";
import { ToastProvider } from "../lib/toast";
import { rainbowAt } from "../lib/appearance";
import type { Container, Settings } from "../lib/api";

// useProgress() (lib/progress.ts) opens a real EventSource on mount; jsdom
// does not implement it. A minimal stub is all the hook touches
// (.onmessage, .close()).
class FakeEventSource {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  close() {
    /* no-op */
  }
}

vi.stubGlobal("EventSource", FakeEventSource);

// jsdom has no ResizeObserver either; nothing under test depends on a measured
// width, so a no-op observer is enough (Settings.settingsWrites.dom.test.tsx's
// stub, kept verbatim).
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", FakeResizeObserver);

// ---------------------------------------------------------------------------
// Mocked api client — Recovery's mount fetches (getSettings + encryption
// detect + the VM-SSH probe) answer from here; the flow's handlers
// (discover probes, discoverAll, the target lists, putSettings, the kit
// download) are re-pointed per test via mockResolvedValueOnce. Zero targets
// everywhere by default: the tracer's choreography is the zero-target path.
// ---------------------------------------------------------------------------
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    discover: vi.fn(async () => ({ ok: true, discovered: 0, repo: "/host/user/backups/containers" })),
    discoverVMs: vi.fn(async () => ({ ok: true, discovered: 0, repo: "/host/user/backups/vms" })),
    discoverFiles: vi.fn(async () => ({ ok: true, discovered: 0, repo: "/host/user/backups/files" })),
    discoverAll: vi.fn(async () => ({ containers: 0, vms: 0, files: 0, skipped: [], skippedNeedsAction: false })),
    getSettings: vi.fn(async () => ({
      ok: true,
      settings: baseSettings(),
      hostMountRoot: "/host/user",
      platform: "unraid",
    })),
    putSettings: vi.fn(async () => ({ ok: true })),
    listContainers: vi.fn(async () => ({ ok: true, containers: [] })),
    listVMs: vi.fn(async () => ({ ok: true, vms: [] })),
    listFileSets: vi.fn(async () => ({ ok: true, fileSets: [] })),
    getVMSSH: vi.fn(async () => ({ ok: false })),
    detectEncryption: vi.fn(async () => ({
      ok: true,
      verdict: "unconfigured",
      applied: false,
      encryptionEnabled: false,
      repos: [],
    })),
    downloadRecoveryKit: vi.fn(async () => null),
    // Never called on the paths under test; stubbed so an accidental call
    // fails loudly on a missing shape instead of on `undefined is not a
    // function`.
    fileSetSnapshots: vi.fn(async () => ({ ok: true, snapshots: [] })),
    restore: vi.fn(async () => ({ ok: true })),
    restoreVM: vi.fn(async () => ({ ok: true })),
    restoreFileSet: vi.fn(async () => ({ ok: true })),
    restoreConfig: vi.fn(async () => ({ ok: true })),
    waitForAppBack: vi.fn(async () => true),
    foreignOpen: vi.fn(async () => ({ ok: true })),
    foreignClose: vi.fn(async () => ({ ok: true })),
    foreignRestore: vi.fn(async () => ({ ok: true })),
    listForeignFiles: vi.fn(async () => ({ ok: true, entries: [] })),
    foreignContainerWarnings: vi.fn(async () => ({ ok: true })),
  };
});

// Imported AFTER vi.mock so these bindings are the mocked functions.
import { discover, discoverVMs, discoverFiles, discoverAll, listContainers, putSettings, downloadRecoveryKit } from "../lib/api";

/** A settings object with the fields the page reads on mount (the
 *  Settings.settingsWrites.dom.test.tsx fixture shape). */
function baseSettings(over: Partial<Settings> = {}): Settings {
  return {
    encryptionEnabled: false,
    containersEnabled: true,
    vmsEnabled: true,
    flashEnabled: true,
    filesEnabled: true,
    configEnabled: true,
    receiverEnabled: false,
    fleetEnabled: false,
    containersPath: "/host/user/backups/containers",
    vmsPath: "/host/user/backups/vms",
    flashPath: "/host/user/backups/flash",
    filesPath: "/host/user/backups/files",
    configPath: "/host/user/backups/config",
    restoreFolder: "/host/user/backups/restore",
    containersSchedule: "off",
    vmsSchedule: "off",
    flashSchedule: "off",
    filesSchedule: "off",
    configSchedule: "off",
    containersOffsite: "",
    vmsOffsite: "",
    flashOffsite: "",
    configOffsite: "",
    filesOffsite: "",
    containersOffsiteSchedule: "off",
    vmsOffsiteSchedule: "off",
    flashOffsiteSchedule: "off",
    configOffsiteSchedule: "off",
    filesOffsiteSchedule: "off",
    everythingSchedule: "off",
    everythingPreHook: "",
    everythingPostHook: "",
    retentionKeepLast: 7,
    retentionKeepDaily: 7,
    retentionKeepWeekly: 4,
    retentionKeepMonthly: 6,
    defaultLanguage: "en",
    registryAuths: [],
    ...over,
  } as unknown as Settings;
}

function containerPayload(over: Partial<Container> = {}): Container {
  return {
    name: "plex",
    image: "lscr.io/test/plex:latest",
    state: "running",
    status: "Up 2 hours",
    ip: "",
    installed: true,
    includeInSchedule: false,
    lastBackup: null,
    lastBackupStarted: null,
    preHook: "",
    postHook: "",
    stopContainers: [],
    excludes: [],
    ...over,
  };
}

// The en copy, derived from the table itself so the test can never drift from
// what t() actually renders (the settingsWrites test's en-driven-labels
// pattern).
const L = {
  step1Title: en["recovery.step1"],
  notReachable: en["recovery.notReachable"],
  readable: en["recovery.readable"],
  readFrom: en["recovery.readFrom"],
  check: en["recovery.recheck"],
  connectPreview: en["recovery.connectPreview"],
  discover: en["recovery.discover"],
  kitDownload: en["recovery.kitDownload"],
  step2Title: en["recovery.stepConfig"],
  skip: en["recovery.configSkip"],
  skipped: en["recovery.configSkipped"],
  foundNone: en["recovery.foundNone"],
  noneDiscovered: en["recovery.noneDiscovered"],
  kitHint: en["recovery.kitHint"],
  pendingBadge: en["fleet.mesh.status.pending"],
  warnBadge: en["spike.info"],
  continue: en["common.continue"],
  back: en["common.back"],
  done: en["common.done"],
  foreignTitle: en["recovery.foreignTitle"],
};
const chipText = (n: number) =>
  en["recovery.mobile.stepOf"].replace("{n}", String(n)).replace("{total}", "6");
const foundCountsText = (c: number, v: number) =>
  en["recovery.foundCounts"].replace("{c}", String(c)).replace("{v}", String(v));

/** Per-test matchMedia stub — `desktop: true` answers "desktop" for every
 *  min-width query (the global setup stub's rule), `false` answers mobile for
 *  everything. Both shapes carry the full listener API useSyncExternalStore's
 *  subscription touches.
 *
 *  ONE STABLE OBJECT PER QUERY AXIS, and why: useMediaQuery.ts caches its
 *  MediaQueryList at module level (`desktopMql`, created on the FIRST
 *  window.matchMedia call and reused for the process lifetime). A stub that
 *  returns a fresh object per call would therefore be captured by whichever
 *  test ran first, and every later test would silently keep the first test's
 *  viewport answer. Returning the same mutable object each call (one for the
 *  width axis, one for the pointer axis, so the two module-level caches can
 *  never alias each other's `matches`) lets the cached list answer the
 *  CURRENT test's stub. */
const widthStub = {
  matches: true,
  media: "",
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
};
const pointerStub = { ...widthStub };
function stubMatchMedia(desktop: boolean) {
  // Set the flags DIRECTLY on the shared objects: the hook's module-level
  // cache means window.matchMedia is usually never called again after the
  // first test, but getSnapshot() reads `matches` on every render — so the
  // current test's answer must already be on the cached object when the
  // render starts.
  widthStub.matches = desktop;
  pointerStub.matches = false;
  window.matchMedia = ((query: string) => {
    const stub = query.includes("pointer") ? pointerStub : widthStub;
    stub.media = query;
    return stub;
  }) as unknown as typeof window.matchMedia;
}

// Imported AFTER vi.mock so this is the page with the mocked client.
const Recovery = (await import("./Recovery")).default;

/** RouteProbe renders the live MemoryRouter path so the flow's terminal
 *  action (Done -> "/") is assertable without spying on useNavigate. */
function RouteProbe() {
  const { pathname } = useLocation();
  return <span data-testid="route">{pathname}</span>;
}

function renderRecovery() {
  return render(
    <MemoryRouter initialEntries={["/recovery"]}>
      <RouteProbe />
      <I18nProvider>
        <ToastProvider>
          <Recovery />
        </ToastProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}

// --- scoping helpers --------------------------------------------------------
//
// The desktop half is ALWAYS in the jsdom DOM (see the header note), so shared
// copy ("Check", the skip button, step titles) matches twice. Everything
// mobile-side is therefore queried through one of two scopes: the flow's
// content subtree (anchored on the unique stepOf chip) or the StickyActionBar
// (the `sticky bottom-0 z-10` chrome no desktop element carries — the
// desktop-untouched battery's own leak needle).

/** The mobile flow's content div, anchored on the chip: chip span -> chip row
 *  -> content div (MobileRecoveryFlow's fragment root's first child). */
function flow() {
  const chip = screen.getByText(/^Step \d of 6$/);
  const content = chip.parentElement?.parentElement;
  if (!content) throw new Error("mobile flow content div not found");
  return within(content);
}

/** The mobile StickyActionBar — the ONLY sticky bottom bar on the page (the
 *  desktop stepper has none; that absence is its own leak needle). */
function bar(): HTMLElement {
  const el = document.body.querySelector<HTMLElement>(".sticky.bottom-0.z-10");
  if (!el) throw new Error("mobile sticky bar not rendered");
  return el;
}

/** The bar's button by visible text/aria-label. `includes` rather than
 *  equality because a busy Button may carry spinner glyphs alongside the
 *  label. */
function barButton(name: string): HTMLButtonElement {
  const btn = Array.from(bar().querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").includes(name),
  );
  if (!btn) {
    throw new Error(
      `no bar button "${name}"; bar has: ${Array.from(bar().querySelectorAll("button"))
        .map((b) => b.textContent?.trim())
        .join(" | ")}`,
    );
  }
  return btn;
}

// --- hue assertion ----------------------------------------------------------

/**
 * The rainbow carriers, in document order, with the page's OWN observable
 * output: the inline `--item-hue` custom property hueVars(rainbowAt(i)) sets.
 * Read from the style ATTRIBUTE (not CSSStyleDeclaration.getPropertyValue) so
 * the assertion does not depend on cssstyle's custom-property support.
 *
 * `.glim-notch-card` selects card ROOTS only — the six StepCards plus the two
 * nested Cards inside CloudCredsDisclosure plus ForeignRestoreCard's two step
 * cards. Badge notches and hue-enabled buttons also carry `.glim-hue`, but not
 * `.glim-notch-card`, so they never enter this list.
 */
function hueCarriers(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>(".glim-notch-card")).filter(
    (el) => /--item-hue:\s*\S+/.test(el.getAttribute("style") ?? ""),
  );
}

function inlineHue(el: Element): string {
  const m = /--item-hue:\s*([^;]+)/.exec(el.getAttribute("style") ?? "");
  return (m?.[1] ?? "").trim();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("desktop identity under the D-01 double gate", () => {
  it("keeps the first-8 rainbow sequence 0..7 and renders no mobile chrome on the desktop stub", async () => {
    stubMatchMedia(true);
    renderRecovery();
    await waitFor(() => expect(screen.getByText(L.step1Title)).toBeTruthy());

    // The mobile block is NOT rendered at all on desktop — it mounts behind
    // `!isDesktop`, not merely behind CSS (the D-01 second gate).
    expect(screen.queryByText(/^Step \d of 6$/)).toBeNull();
    expect(document.body.querySelector(".sticky.bottom-0.z-10")).toBeNull();

    // (a) fresh mount, creds disclosure still COLLAPSED: the six wizard
    // StepCards carry 0,1,2 — then 5,6,7. The gap is the contract working,
    // not a break: CloudCredsDisclosure's two nextHue() calls sit at its
    // COLLAPSED call site (fixed literals, the collapse-stable numbering the
    // component's own doc pins), so 3 and 4 are consumed with the cards not
    // yet in the DOM — which is exactly why card 4 sits at 5, not 3.
    const carriers = hueCarriers();
    expect(carriers.slice(0, 6).map(inlineHue)).toEqual(
      [0, 1, 2, 5, 6, 7].map((i) => rainbowAt(i)),
    );
    // The page-flat counter keeps running into ForeignRestoreCard's own
    // headings (its Badge takes 8 — not a glim-notch-card element — and its
    // two step cards 9 and 10; the palette is 8 positions, so those alias to
    // rainbowAt(1)/rainbowAt(2)). Pinned so a future re-order inside the
    // foreign card cannot silently shift the wizard's own indices either.
    expect(carriers).toHaveLength(8);
    expect(carriers.slice(6).map(inlineHue)).toEqual([rainbowAt(9), rainbowAt(10)]);

    // Expanding step 3's offsite section, then its nested credential
    // disclosure (CloudCredsDisclosure is its own StepDisclosure inside the
    // offsite one), materializes the two reserved cards INSIDE step 3's card,
    // between it and card 4 — the full desktop first-8 sequence, now in
    // document order, with the foreign tail after.
    fireEvent.click(screen.getByRole("button", { name: en["settings.offsiteTitle"] }));
    fireEvent.click(screen.getByRole("button", { name: en["recovery.cloudCreds"] }));
    const expanded = hueCarriers();
    expect(expanded.slice(0, 8).map(inlineHue)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rainbowAt(i)),
    );
    expect(expanded).toHaveLength(10);
    expect(expanded.slice(8).map(inlineHue)).toEqual([rainbowAt(9), rainbowAt(10)]);
  });
});

describe("mobile flow: chrome, gating, chip, Back, bar states", () => {
  it("fresh mount renders step 1 only, desktop half still mounted, hue sequence intact", async () => {
    stubMatchMedia(false);
    renderRecovery();

    // The flow's chrome is data-independent: the chip + bar render as soon as
    // the mount settles, before any check has run.
    await waitFor(() => expect(screen.getByText(chipText(1))).toBeTruthy());
    // (e) step 1's bar action is the primary key while unanswered —
    // `recovery.recheck`, not Continue.
    expect(barButton(L.check)).toBeTruthy();
    expect(bar().textContent).not.toContain(L.continue);
    // Step 1 only: no later step's content is on screen, and step 1 has no
    // Back yet (position 1 is the flow's floor).
    expect(flow().queryByText(L.step2Title)).toBeNull();
    expect(flow().queryByText(L.pendingBadge)).toBeTruthy(); // the idle StepState badge
    expect(flow().queryByRole("button", { name: L.back })).toBeNull();

    // The D-01 desktop half is STILL MOUNTED under jsdom (CSS never applies
    // here) — one component instance, its effects live. The foreign card is
    // the desktop-only surface by decision, so its presence is the marker.
    expect(screen.getByText(L.foreignTitle)).toBeTruthy();
    // ...and the hue sequence is unchanged WITH the flow rendered: the six
    // StepCards at 0,1,2,5,6,7 (3/4 still reserved inside the collapsed creds
    // disclosure — see the desktop test), foreign at 9/10 after.
    const carriers = hueCarriers();
    expect(carriers.slice(0, 6).map(inlineHue)).toEqual(
      [0, 1, 2, 5, 6, 7].map((i) => rainbowAt(i)),
    );
    expect(carriers).toHaveLength(8);
  });

  it("walks the zero-target path 1..6: gating decides, the chip counts, the bar follows the state", async () => {
    stubMatchMedia(false);
    renderRecovery();
    await waitFor(() => expect(screen.getByText(chipText(1))).toBeTruthy());

    // Step 1: Check fires the SAME guarded handler as the desktop card — the
    // three READ-ONLY probes (#44), no discover rebuild.
    fireEvent.click(barButton(L.check));
    await waitFor(() => expect(discover).toHaveBeenCalledWith(true));
    await waitFor(() => expect(discoverVMs).toHaveBeenCalledWith(true));
    await waitFor(() => expect(discoverFiles).toHaveBeenCalledWith(true));
    // Zero targets => the honest first-run "warn" answer (a warn never blocks).
    await waitFor(() => expect(flow().queryByText(L.notReachable)).toBeTruthy());
    await waitFor(() => expect(flow().queryByText(L.readFrom)).toBeTruthy());
    // (e) answered => the bar action flips to Continue (no re-fire needed).
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());

    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(2))).toBeTruthy());
    // (c) position 2; the optional step's two badges (four-status TEXT label
    // + the optional marker).
    expect(flow().queryByText(L.step2Title)).toBeTruthy();
    expect(flow().queryByText(L.pendingBadge)).toBeTruthy();

    // Step 2 -> 3 via the sanctioned skip (the tracer's step-2 body).
    fireEvent.click(flow().getByText(L.skip));
    await waitFor(() => expect(screen.getByText(chipText(3))).toBeTruthy());
    // Step 3's bar: Connect & preview ALWAYS (the fields' only save path)…
    expect(barButton(L.connectPreview)).toBeTruthy();
    // …and no Continue until attached (the gate owns the button).
    expect(bar().textContent).not.toContain(L.continue);

    // Attach: the SAME connectPreview the desktop card fires — re-fetch +
    // FULL-object PUT (parity pinned), then re-detect + re-probe.
    fireEvent.click(barButton(L.connectPreview));
    await waitFor(() => expect(putSettings).toHaveBeenCalledTimes(1));
    const putBody = vi.mocked(putSettings).mock.calls[0][0] as Settings;
    // Full object, merged on the server baseline — not a partial patch.
    expect(typeof putBody.retentionKeepLast).toBe("number");
    expect(putBody.containersPath).toBe("/host/user/backups/containers");
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());

    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(4))).toBeTruthy());
    // Step 4's bar: the primary key while undiscovered.
    expect(barButton(L.discover)).toBeTruthy();
    expect(bar().textContent).not.toContain(L.continue);

    // Discover: the same runDiscover (discoverAll + list refetch), zero
    // targets -> the remedy copy, not a misleading empty success.
    fireEvent.click(barButton(L.discover));
    await waitFor(() => expect(discoverAll).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(flow().queryByText(L.foundNone)).toBeTruthy());
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());

    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(5))).toBeTruthy());
    // Step 5's empty branch (tracer scope): the zero-target copy.
    expect(flow().queryByText(L.noneDiscovered)).toBeTruthy();
    // Zero targets => the kit gate HOLDS (containers/vms empty) => Continue
    // renders. Zero-target users are never stranded on the restore step.
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());

    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(6))).toBeTruthy());
    expect(flow().queryByText(L.kitHint)).toBeTruthy();
    // (e) the final bar: the kit download (neutral) + Done (accent, terminal).
    expect(barButton(L.kitDownload)).toBeTruthy();
    expect(barButton(L.done)).toBeTruthy();

    // Done is navigation, not state: the shared flow state is untouched, the
    // route moves home.
    fireEvent.click(barButton(L.done));
    await waitFor(() => expect(screen.getByTestId("route").textContent).toBe("/"));
  });

  it("Back preserves completed step state (presentation-only navigation)", async () => {
    stubMatchMedia(false);
    renderRecovery();
    await waitFor(() => expect(screen.getByText(chipText(1))).toBeTruthy());

    // Complete step 1 (warn answer) and skip step 2, then go BACK through
    // both: each step's completed state must still be on screen.
    fireEvent.click(barButton(L.check));
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());
    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(2))).toBeTruthy());
    fireEvent.click(flow().getByText(L.skip));
    await waitFor(() => expect(screen.getByText(chipText(3))).toBeTruthy());

    fireEvent.click(flow().getByRole("button", { name: L.back }));
    await waitFor(() => expect(screen.getByText(chipText(2))).toBeTruthy());
    // configSkipped survived the round trip — the SAME shared state the
    // desktop skip sets, re-rendered, not a per-step reset.
    expect(flow().queryByText(L.skipped)).toBeTruthy();

    fireEvent.click(flow().getByRole("button", { name: L.back }));
    await waitFor(() => expect(screen.getByText(chipText(1))).toBeTruthy());
    // Step 1's completed answer survived too, and its bar shows Continue (the
    // answered state), not a reset Check.
    expect(flow().queryByText(L.notReachable)).toBeTruthy();
    expect(barButton(L.continue)).toBeTruthy();
  });

  it("the kit gate blocks step 5's Continue while a discovered target has no restore result", async () => {
    stubMatchMedia(false);
    vi.mocked(discoverAll).mockResolvedValueOnce({ containers: 1, vms: 0, files: 0, skipped: [], skippedNeedsAction: false });
    vi.mocked(listContainers).mockResolvedValueOnce({
      ok: true,
      containers: [containerPayload()],
    });
    renderRecovery();
    await waitFor(() => expect(screen.getByText(chipText(1))).toBeTruthy());

    // Walk to step 4 and discover one container.
    fireEvent.click(barButton(L.check));
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());
    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(2))).toBeTruthy());
    fireEvent.click(flow().getByText(L.skip));
    await waitFor(() => expect(screen.getByText(chipText(3))).toBeTruthy());
    fireEvent.click(barButton(L.connectPreview));
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());
    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(4))).toBeTruthy());
    fireEvent.click(barButton(L.discover));
    await waitFor(() => expect(flow().queryByText(foundCountsText(1, 0))).toBeTruthy());
    await waitFor(() => expect(barButton(L.continue)).toBeTruthy());

    fireEvent.click(barButton(L.continue));
    await waitFor(() => expect(screen.getByText(chipText(5))).toBeTruthy());
    // A discovered target with no restore result leaves the kit gate UNMET:
    // step 5 renders NO bar AT ALL (the bar exists only when gateTo(6)
    // holds — a Continue past a gate cannot render; gating decides, not the
    // button). The restore rows themselves are Plan 03; nothing here can set
    // restoreAllResult yet.
    await waitFor(() => expect(flow().queryByText(foundCountsText(1, 0))).toBeTruthy());
    expect(document.body.querySelector(".sticky.bottom-0.z-10")).toBeNull();
  });
});
