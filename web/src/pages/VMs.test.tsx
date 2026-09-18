// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Pins the fix for the severe VM-identifier regression: VMRow's action
// buttons (Backup Now here) must send VM.libvirtName — the raw libvirt
// domain name — to the backend, NEVER VM.name (display-only; on TrueNAS it is
// the resolved friendly name, not something virsh has ever heard of). Before
// this fix VMView/VM had only `name`, so every action call site had no choice
// but to send the display value, and virsh rejected it as "domain not found"
// on every TrueNAS VM whose friendly name differs from its raw name.
//
// This is the first component-level (jsdom) test in this repo — everything
// else under src/**/*.test.ts is pure-logic, node-environment (see
// vitest.config.ts). A cross-stack identifier/display-name bug like this one
// lives entirely in how a component wires a prop into an API call, which a
// pure-logic test cannot observe; hence the jsdom opt-in here.
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { VMRow, VMs } from "./VMs";
import type { VM, Settings } from "../lib/api";

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

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    // useBackupWatch's fire() snapshots listRuns() before AND polls it after
    // start() — stub it to an empty, always-ok list so the watch never blocks
    // on a real network call.
    listRuns: vi.fn(async () => ({ ok: true, runs: [] })),
    backupVMNow: vi.fn(async () => ({ ok: true, started: true })),
    forgetVM: vi.fn(async () => ({ ok: true })),
    deleteBackupsVM: vi.fn(async () => ({ ok: true })),
    setVMInclude: vi.fn(async () => ({ ok: true })),
    // Page-level fetches (the single-layout tests below render the full <VMs>
    // page). The mobile block's own fetches (getSettings/getScheduleNext)
    // never run under jsdom's desktop matchMedia — the stubs only have to
    // exist.
    listVMs: vi.fn(async () => ({ ok: true, vms: [] })),
    getSettings: vi.fn(async () => ({
      ok: true,
      settings: {} as Settings,
      hostMountRoot: "",
      platform: "generic",
    })),
    getScheduleNext: vi.fn(async () => []),
  };
});

// Imported AFTER vi.mock so this binding is the mocked function.
import { backupVMNow, deleteBackupsVM, forgetVM, setVMInclude, listVMs } from "../lib/api";
import { en } from "../lib/i18n";

const noop = () => {
  /* no-op */
};
// VMRow only needs t() to return a stable string per key; none of this test's
// assertions depend on real translations.
const t = ((key: string) => key) as unknown as Parameters<typeof VMRow>[0]["t"];

// A TrueNAS-shaped VM: the display name and the raw libvirt identifier
// deliberately differ, exactly the case that exposed the bug.
const trueNasVM: VM = {
  name: "debian",
  libvirtName: "550e8400-e29b-41d4-a716-446655440000",
  state: "running",
  method: "graceful",
  includeInSchedule: false,
  lastBackup: null,
  lastBackupStarted: null,
};

afterEach(() => {
  cleanup();
});

describe("VMRow action wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends VM.libvirtName to backupVMNow, never the display VM.name", async () => {
    render(<VMRow vm={trueNasVM} t={t} onRefresh={noop} index={0} />);

    // By ROLE and NAME, which is the query that survives #178: how much of a
    // control is shown is now the viewer's choice, so this button may render
    // its text, its glyph, or both. Its accessible name is the same either
    // way, and that is what has to keep working. getByLabelText was right
    // while it was strictly an icon-only badge carrying an aria-label; it
    // would now pass or fail depending on a display preference.
    fireEvent.click(screen.getByRole("button", { name: "containers.backupNow" }));

    await waitFor(() => expect(backupVMNow).toHaveBeenCalled());
    expect(backupVMNow).toHaveBeenCalledWith(trueNasVM.libvirtName);
    expect(backupVMNow).not.toHaveBeenCalledWith(trueNasVM.name);
  });

  it("still shows the display name to the user, not the raw identifier", () => {
    render(<VMRow vm={trueNasVM} t={t} onRefresh={noop} index={0} />);
    expect(screen.getByText(trueNasVM.name)).toBeTruthy();
    expect(screen.queryByText(trueNasVM.libvirtName)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pins the structure jdp asked for in a live review ("Im Zeitplan einschließen,
// letztes Backup und Backup-Ausklapp-Button bitte exakt wie im Container-Tab in
// der Container-Card darstellen und platzieren", plus "die Methode für den
// VM-Backup (Live und graceful) bitte in quadratische Badges mit Glyph
// umformen").
//
// These are deliberately structural assertions, not snapshot diffs: the defect
// class here is DRIFT — two pages slowly growing different answers to the same
// question — and drift is only caught by naming the shared contract out loud.
// A snapshot would go green on any change that was merely re-approved.
// ---------------------------------------------------------------------------
describe("VMRow matches the container card's structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the backups disclosure as a pressable chip, not a bespoke button", () => {
    render(<VMRow vm={trueNasVM} t={t} onRefresh={noop} index={0} />);

    // Selector's segments carry aria-pressed; the hand-rolled chevron button
    // this replaced carried nothing at all, so this assertion fails the moment
    // the disclosure regresses to a plain <button>.
    const chip = screen.getByRole("button", { name: "snapshots.title" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the backups pane collapsed until the chip is pressed, and the row owns that state", () => {
    render(<VMRow vm={trueNasVM} t={t} onRefresh={noop} index={0} />);

    // Closed: VMRestorePanel returns null, so nothing of its content exists.
    expect(screen.queryByText("source.label")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "snapshots.title" }));
    expect(
      screen.getByRole("button", { name: "snapshots.title" }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("shows last-backup as ONE combined summary line, the container row's shape", () => {
    render(<VMRow vm={trueNasVM} t={t} onRefresh={noop} index={0} />);

    // `lastBackup: null` on the fixture, so the combined string ends in the
    // "never" key. Two separate stacked <p>s — the shape this row used to have
    // — would leave no single node carrying both halves.
    expect(screen.getByText("containers.lastBackup: containers.never")).toBeTruthy();
  });

  it("offers the backup method as two icon-only badges, with the stored one active", () => {
    render(<VMRow vm={trueNasVM} t={t} onRefresh={noop} index={0} />);

    // A native <select> would expose a combobox and NO per-option segments.
    expect(screen.queryByRole("combobox")).toBeNull();

    // Selector's single-select segments are role="tab"/aria-selected (its
    // multi-select ones, like the backups chip above, are button/aria-pressed)
    // — and an icon-only segment's accessible name is its `label`, which is
    // the whole reason an icon-only control must carry one.
    const graceful = screen.getByRole("tab", { name: "vm.method.graceful" });
    const live = screen.getByRole("tab", { name: "vm.method.live" });
    // Both visible at once — the pair was chosen over a single cycling badge
    // precisely so the alternative never has to be inferred.
    expect(graceful.getAttribute("aria-selected")).toBe("true");
    expect(live.getAttribute("aria-selected")).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// #232: a not-installed card offers the same controls on the VM page as on the
// Containers page. The schedule switch, so an entry can come off the schedule
// without losing its backups, and ONE removal button in the top-right action
// corner: "Delete all backups" while it has backups, "Remove entry" once it has
// none. Removing only the entry while backups exist would hide those backups
// from the page, so that button is never offered then.
// ---------------------------------------------------------------------------
describe("VMRow when the VM is no longer defined (#232)", () => {
  // Display name and libvirt name differ on purpose, same as trueNasVM above.
  const orphan: VM = { ...trueNasVM, state: "not-installed", includeInSchedule: true };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers the schedule switch", () => {
    render(<VMRow vm={orphan} t={t} onRefresh={noop} index={0} />);
    const sw = screen.getByRole("switch", { name: en["containers.includeInSchedule"] });
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("saves the switch as a VM setting, under the libvirt name", async () => {
    render(<VMRow vm={orphan} t={t} onRefresh={noop} index={0} />);
    const sw = screen.getByRole("switch", { name: en["containers.includeInSchedule"] });

    fireEvent.click(sw);

    await waitFor(() => expect(sw.getAttribute("aria-checked")).toBe("false"));
    expect(setVMInclude).toHaveBeenCalledWith(orphan.libvirtName, false);
  });

  it("offers Remove entry, not Delete all backups, when it has no backups", async () => {
    render(<VMRow vm={orphan} t={t} onRefresh={noop} index={0} />);
    expect(screen.queryByRole("button", { name: "containers.deleteBackups" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "vms.removeEntry" }));
    fireEvent.click(await screen.findByRole("button", { name: en["common.confirm"] }));

    await waitFor(() => expect(forgetVM).toHaveBeenCalledWith(orphan.libvirtName));
    expect(deleteBackupsVM).not.toHaveBeenCalled();
  });

  it("offers Delete all backups, not Remove entry, when it has backups", async () => {
    render(<VMRow vm={{ ...orphan, lastBackup: 1_757_000_000 }} t={t} onRefresh={noop} index={0} />);
    expect(screen.queryByRole("button", { name: "vms.removeEntry" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "containers.deleteBackups" }));
    fireEvent.click(await screen.findByRole("button", { name: en["common.confirm"] }));

    await waitFor(() => expect(deleteBackupsVM).toHaveBeenCalledWith(orphan.libvirtName, "local"));
    expect(forgetVM).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The single-layout gate, tested on the desktop half. The VMs page renders as
// ONE responsive layout: the two faces (desktop rows / mobile cards) are
// gated in JSX on useIsDesktop(), so exactly one of them ever MOUNTS — there
// is no CSS-hidden twin kept in sync for nothing. jsdom's matchMedia stub
// (src/lib/testSetup/matchMedia.ts) answers "desktop", so the full <VMs>
// page here renders the DESKTOP presentation and the mobile card block is
// never mounted; that makes jsdom the right place to pin the desktop half of
// the contract:
//   - the rendered DOM carries ZERO hidden-by-utility classes — a `md:hidden`
//     or `max-md:hidden` anywhere in the container means a face is being
//     visually hidden instead of not mounted, the exact shape this page was
//     rewritten away from;
//   - the desktop list is NOT windowed — with more VMs than the mobile
//     block's 20-row window, all 25 rows render and the mobile load-more
//     stays absent;
//   - the mobile-only surfaces (the summary counts line, the per-card
//     schedule entry, the gate-off settings link) do not exist in the
//     desktop DOM.
// The phone face itself is exercised by the Playwright harness
// (web/e2e/destination-vms.spec.ts); see the mount-discipline comment on
// VMs().
// ---------------------------------------------------------------------------
describe("VMs page renders ONE layout (desktop identity in jsdom)", () => {
  // More VMs than the mobile block's 20-row window — enough to prove the
  // desktop list renders unwrapped while the mobile load-more stays absent.
  const manyVMs: VM[] = Array.from({ length: 25 }, (_, i) => ({
    name: `vm-${String(i).padStart(2, "0")}`,
    libvirtName: `id-${String(i).padStart(2, "0")}`,
    state: "running",
    method: "graceful",
    includeInSchedule: false,
    lastBackup: null,
    lastBackupStarted: null,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listVMs).mockResolvedValue({ ok: true, vms: manyVMs });
  });

  it("renders the desktop face with no hidden twin and the mobile block absent", async () => {
    const { container } = render(
      <MemoryRouter>
        <VMs />
      </MemoryRouter>
    );

    // The desktop content arrives (listVMs resolved).
    await waitFor(() => expect(screen.getByText("vm-00")).toBeTruthy());

    // No face is visually hidden: both utility literals are asserted as
    // class-substring absences over the whole rendered container. (The
    // broader `md:hidden` substring also covers `max-md:hidden`; both are
    // asserted so a failure names the exact literal that regressed.)
    expect(container.querySelector('[class*="md:hidden"]')).toBeNull();
    expect(container.querySelector('[class*="max-md:hidden"]')).toBeNull();

    // The mobile block never mounts in jsdom — none of its unique surfaces
    // exist. The summary counts line (its text embeds the nav.vms key), the
    // per-card schedule entry, the gate-off settings link and the load-more
    // button are all mobile-only; the desktop list is not windowed, so all
    // 25 rows are present and "Load more" cannot appear.
    expect(screen.queryByText(/nav\.vms/)).toBeNull();
    expect(screen.queryByRole("button", { name: "schedule.overrideTitle" })).toBeNull();
    expect(screen.queryByRole("link", { name: "nav.settings" })).toBeNull();
    expect(screen.queryByText("common.loadMore")).toBeNull();
    for (const vm of manyVMs) {
      expect(screen.getByText(vm.name)).toBeTruthy();
    }
  });
});
