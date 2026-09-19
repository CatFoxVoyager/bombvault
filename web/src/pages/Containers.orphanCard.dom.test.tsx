// @vitest-environment jsdom
// A container that is no longer installed, for example after a rename, keeps
// its card. The card needs the schedule switch to stop recording skips, and a
// removal button that matches the VM card's (VMs.test.tsx covers the same
// cases there).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Container } from "../lib/api";

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
    forgetContainer: vi.fn(async () => ({ ok: true })),
    deleteBackups: vi.fn(async () => ({ ok: true })),
    setInclude: vi.fn(async () => ({ ok: true })),
  };
});

const { deleteBackups, forgetContainer, setInclude } = await import("../lib/api");
const { ContainerRow } = await import("./Containers");
const { en } = await import("../lib/i18n");

const noop = () => {
  /* no-op */
};
const t = ((key: string) => key) as unknown as Parameters<typeof ContainerRow>[0]["t"];

const orphan: Container = {
  name: "radarr-movies",
  image: "ghcr.io/hotio/radarr:latest",
  state: "not-installed",
  status: "",
  ip: "",
  installed: false,
  includeInSchedule: true,
  lastBackup: null,
  lastBackupStarted: null,
  preHook: "",
  postHook: "",
  stopContainers: [],
  excludes: [],
  lastUpdateCheck: 0,
  lastUpdateResult: "",
  stack: "",
};

afterEach(() => {
  cleanup();
});

describe("ContainerRow when the container is no longer installed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers the schedule switch", () => {
    render(<ContainerRow container={orphan} installedContainers={[]} t={t} onDeleted={noop} index={0} />);
    const sw = screen.getByRole("switch", { name: en["containers.includeInSchedule"] });
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("saves the switch", async () => {
    render(<ContainerRow container={orphan} installedContainers={[]} t={t} onDeleted={noop} index={0} />);
    const sw = screen.getByRole("switch", { name: en["containers.includeInSchedule"] });

    fireEvent.click(sw);

    await waitFor(() => expect(sw.getAttribute("aria-checked")).toBe("false"));
    expect(setInclude).toHaveBeenCalledWith("radarr-movies", false);
  });

  it("offers Remove entry, not Delete all backups, when it has no backups", async () => {
    render(<ContainerRow container={orphan} installedContainers={[]} t={t} onDeleted={noop} index={0} />);
    expect(screen.queryByRole("button", { name: "containers.deleteBackups" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "vms.removeEntry" }));
    fireEvent.click(await screen.findByRole("button", { name: en["common.confirm"] }));

    await waitFor(() => expect(forgetContainer).toHaveBeenCalledWith("radarr-movies"));
    expect(deleteBackups).not.toHaveBeenCalled();
  });

  it("offers Delete all backups, not Remove entry, when it has backups", async () => {
    render(
      <ContainerRow
        container={{ ...orphan, lastBackup: 1_757_000_000 }}
        installedContainers={[]}
        t={t}
        onDeleted={noop}
        index={0}
      />
    );
    expect(screen.queryByRole("button", { name: "vms.removeEntry" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "containers.deleteBackups" }));
    fireEvent.click(await screen.findByRole("button", { name: en["common.confirm"] }));

    await waitFor(() => expect(deleteBackups).toHaveBeenCalledWith("radarr-movies"));
    expect(forgetContainer).not.toHaveBeenCalled();
  });
});
