// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// SettingsPage — the Platform card (D-11, quick 260914-nsv).
//
// The General tab's material|cupertino Selector is the FIRST writer of the
// bv-platform preference in src/ (lib/platform.ts had the whole mechanism —
// storage key, apply choke point, boot stamping — but nothing in the app
// wrote the key; only the e2e seeded it by hand). This file pins the write
// contract end to end against the real page:
//
//   - the card renders on the General tab (label hint + both segments);
//   - material is the default active segment (boot stamps the attribute —
//     and where nothing has, usePlatform() falls back to DEFAULT_PLATFORM);
//   - clicking Cupertino writes localStorage["bv-platform"] AND applies the
//     attribute through applyPlatform() — BOTH sides, storage and DOM, in
//     that order (getPlatform() reads storage, the page reads the attribute,
//     so the two must never diverge);
//   - clicking Material goes back, both sides.
//
// There is deliberately no assert on OS detection: PLAT-01 bans it, and the
// guard that enforces the ban lives in mobileShellSource.test.ts.
//
// Harness: the api mock set established by Settings.settingsWrites.dom.test.tsx
// (the page needs a settings payload and the four list stubs to mount), the
// I18nProvider + matchMedia/ResizeObserver stubs of Settings.themeCard.dom.
// test.tsx (jsdom implements none of them). jsdom opted in explicitly — real
// clicks on Selector segments and a real documentElement attribute.
// ---------------------------------------------------------------------------
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, en } from "../lib/i18n";
import { ToastProvider } from "../lib/toast";
import { PLATFORM_STORAGE_KEY } from "../lib/platform";
import type { Settings } from "../lib/api";

function baseSettings(): Settings {
  return {
    encryptionEnabled: true,
    containersEnabled: false,
    vmsEnabled: false,
    flashEnabled: false,
    filesEnabled: false,
    configEnabled: false,
    receiverEnabled: false,
    fleetEnabled: false,
    containersPath: "backups/containers",
    vmsPath: "backups/vms",
    flashPath: "backups/flash",
    filesPath: "backups/files",
    configPath: "backups/config",
    restoreFolder: "restore",
    containersSchedule: "daily 02:00",
    vmsSchedule: "off",
    flashSchedule: "off",
    filesSchedule: "off",
    configSchedule: "off",
    containersOffsite: "",
    vmsOffsite: "",
    flashOffsite: "",
    configOffsite: "",
    filesOffsite: "",
    containersOffsiteSchedule: "",
    vmsOffsiteSchedule: "",
    flashOffsiteSchedule: "",
    configOffsiteSchedule: "",
    filesOffsiteSchedule: "",
    everythingSchedule: "",
    everythingPreHook: "",
    everythingPostHook: "",
    retentionKeepLast: 5,
    retentionKeepDaily: 7,
    retentionKeepWeekly: 4,
    retentionKeepMonthly: 6,
    defaultLanguage: "en",
    registryAuths: [],
  } as unknown as Settings;
}

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    getSettings: () =>
      Promise.resolve({ ok: true, settings: baseSettings(), hostMountRoot: "/host/user", platform: "unraid" }),
    putSettings: () => Promise.resolve({ ok: true }),
    getAuth: () => Promise.resolve({ enabled: false, authed: false }),
    listContainers: () => Promise.resolve({ ok: true, containers: [] }),
    listVMs: () => Promise.resolve({ ok: true, vms: [] }),
    listFileSets: () => Promise.resolve({ ok: true, fileSets: [] }),
    getStatus: () => Promise.resolve({ ok: true }),
  };
});

// Imported AFTER vi.mock so the page picks up the mocked client.
const { SettingsPage } = await import("./Settings");

async function renderPage() {
  await act(async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SettingsPage />
        </ToastProvider>
      </I18nProvider>
    );
  });
}

/** Minimal matchMedia stub — the page reads prefers-color-scheme and the
 *  desktop breakpoint on mount; jsdom implements neither (same stub as the
 *  settingsWrites/themeCard harnesses). */
function stubMatchMedia() {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Minimal ResizeObserver stub — the page measures its tab strip on mount. */
function stubResizeObserver() {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

beforeEach(() => {
  stubMatchMedia();
  stubResizeObserver();
  // The ThemeCard pattern: each test starts from the NO-preference state, so
  // the default-active assert below can never read the previous test's write.
  // The attribute goes too: applyPlatform() leaves it stamped on
  // documentElement, and jsdom shares the document across a file's tests.
  window.localStorage.removeItem(PLATFORM_STORAGE_KEY);
  document.documentElement.removeAttribute("data-platform");
});

afterEach(() => {
  cleanup();
});

describe("the Platform card (D-11)", () => {
  it("renders on the General tab with both segments present", async () => {
    await renderPage();
    // The Card's heading proves the CARD rendered on this tab. The heading's
    // accessible name is title + hint: Card renders the hint as an InfoBubble
    // inside the heading badge, and the bubble's tip is the icon's aria-label
    // (InfoBubble.tsx: "the help text is also the icon's aria-label"), so it
    // contributes to the name — a plain-text query would find nothing, the
    // tip only exists as an attribute until the bubble opens.
    const heading = screen.getByRole("heading", {
      name: new RegExp(en["settings.platform"]),
    });
    expect(heading.textContent).toContain(en["settings.platform"]);
    expect(screen.getByRole("tab", { name: en["settings.platform.material"] })).toBeTruthy();
    expect(screen.getByRole("tab", { name: en["settings.platform.cupertino"] })).toBeTruthy();
  });

  it("has material active by default", async () => {
    await renderPage();
    expect(
      screen.getByRole("tab", { name: en["settings.platform.material"] }).getAttribute("aria-selected")
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: en["settings.platform.cupertino"] }).getAttribute("aria-selected")
    ).toBe("false");
  });

  it("clicking Cupertino persists bv-platform and applies the attribute", async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: en["settings.platform.cupertino"] }));
    });
    expect(document.documentElement.getAttribute("data-platform")).toBe("cupertino");
    expect(window.localStorage.getItem(PLATFORM_STORAGE_KEY)).toBe("cupertino");
    // The active segment follows the APPLIED value (usePlatform() re-reads
    // the attribute on the announcement) — no local mirror to fall behind.
    expect(
      screen.getByRole("tab", { name: en["settings.platform.cupertino"] }).getAttribute("aria-selected")
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: en["settings.platform.material"] }).getAttribute("aria-selected")
    ).toBe("false");
  });

  it("clicking Material goes back on both sides", async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: en["settings.platform.cupertino"] }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: en["settings.platform.material"] }));
    });
    expect(document.documentElement.getAttribute("data-platform")).toBe("material");
    expect(window.localStorage.getItem(PLATFORM_STORAGE_KEY)).toBe("material");
    expect(
      screen.getByRole("tab", { name: en["settings.platform.material"] }).getAttribute("aria-selected")
    ).toBe("true");
  });
});
