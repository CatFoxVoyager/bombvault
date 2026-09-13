// ---------------------------------------------------------------------------
// Settings e2e — the /settings mobile treatment (07-05, MORE-02).
//
// The dom twins prove the desktop identity in jsdom (every
// Settings.*.dom.test.tsx keeps passing unchanged — jsdom answers desktop, so
// the mobile chip strip never even mounts there); this spec proves the PHONE
// presentation on the real binary in real device emulation, plus the desktop
// dual-direction guard on /settings. Scenarios:
//
//   1. the chip strip renders one tonal chip per TAB_ORDER entry under the
//      pre-seeded `settings.tabsNavigation` aria-label, scrolls horizontally
//      at phone width (never wrapping), and the desktop Selector strip stays
//      MOUNTED-BUT-HIDDEN beside it (the D-01 max-md:hidden half),
//   2. tapping each chip switches the stacked cards — and the hidden desktop
//      strip's own selection follows, proving ONE tab state, two
//      presentations (T-07-16: no second tab state exists to desync),
//   3. the accent preset swatch opens the phase 6 TapPopover picker surface
//      and a selection made inside it applies to the live --accent token
//      (D-09: pickers as-today, unmodified primitives),
//   4. dark mode flips from the stacked Theme card (the same well Selector
//      the desktop card renders),
//   5. desktop /settings (1280 and the 768 breakpoint boundary): the Selector
//      strip + tabbed shell markers present, the measured strip-width cap on
//      the panels, and NONE of the mobile chrome.
//
// Harness honesty — what is staged and why (the destination-vms-flash /
// destination-config-receiver-fleet Rule 3 deviation, reused): the e2e
// webServer is the real bombvault binary over a wiped fresh DB, but
// /api/settings is staged field-for-field so a spec write can never reach the
// harness DB and the fixture values stay pinned regardless of Go defaults.
// The display-prefs route is METHOD-BRANCHED here rather than aborted flat:
// the GET stays aborted (the boot-look cut, 05-06 — the harness default
// English labels regardless of worker order) while the PUT is answered OK, so
// the localStorage-backed pref saves the picker scenario triggers do not
// error against a dead route.
//
// Locale pinning: `test.use({ locale: "en-US" })` — the same en copy the
// expectations below assert is what the 42-table i18n ships for the default
// fallback the aborted display-prefs reconciliation lands on.
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

// The two device projects from playwright.config.ts; everything else is a
// desktop project (destination-config-receiver-fleet.spec.ts's branching
// pattern).
const MOBILE_PROJECTS = new Set(["mobile-iphone", "mobile-android"]);
const DESKTOP_PROJECTS = new Set(["desktop-1280", "desktop-768"]);

// All copy in this spec is pinned to en-US (see the header note).
test.use({ locale: "en-US" });

// --- staged domains (Go JSON shapes, api.ts) --------------------------------

// GET /api/settings — mirrors the Settings interface field-for-field, the
// same fixture destination-config-receiver-fleet.spec.ts stages for its own
// surfaces; the /settings page reads it whole on boot.
function settingsBody(settingsOverrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    hostMountRoot: "/mnt/user",
    platform: "generic",
    settings: {
      encryptionEnabled: false,
      containersEnabled: true,
      vmsEnabled: true,
      flashEnabled: true,
      configEnabled: true,
      filesEnabled: true,
      receiverEnabled: true,
      fleetEnabled: true,
      containersPath: "/mnt/user/backups/containers",
      vmsPath: "/mnt/user/backups/vms",
      flashPath: "/mnt/user/backups/flash",
      configPath: "/mnt/user/backups/config",
      filesPath: "/mnt/user/backups/files",
      restoreFolder: "/mnt/user/backups/restore",
      flashZipExportEnabled: false,
      flashZipExportPath: "",
      flashZipExportKeep: 0,
      exportEncryptEnabled: false,
      exportAgeRecipients: "",
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
      containersSchedule: "off",
      vmsSchedule: "off",
      flashSchedule: "off",
      configSchedule: "off",
      filesSchedule: "off",
      everythingSchedule: "off",
      everythingPreHook: "",
      everythingPostHook: "",
      everythingPreHookSet: false,
      everythingPostHookSet: false,
      defaultLanguage: "en",
      retentionKeepLast: 7,
      retentionKeepDaily: 7,
      retentionKeepWeekly: 4,
      retentionKeepMonthly: 6,
      offsiteRetentionKeepLast: 7,
      offsiteRetentionKeepDaily: 7,
      offsiteRetentionKeepWeekly: 4,
      offsiteRetentionKeepMonthly: 6,
      offsiteLimitUpload: 0,
      backupCores: 0,
      offsiteLimitDownload: 0,
      metricsEnabled: false,
      metricsToken: "",
      metricsTokenSet: false,
      widgetToken: "",
      widgetTokenSet: false,
      drillsEnabled: true,
      offsiteDrillsEnabled: true,
      drillsSchedule: "weekly Sun 04:30",
      drillsSubsetPct: 10,
      recoveryKitAck: true,
      containersOffsiteImmutable: false,
      vmsOffsiteImmutable: false,
      flashOffsiteImmutable: false,
      configOffsiteImmutable: false,
      filesOffsiteImmutable: false,
      offsiteGrowthBudgetGB: 0,
      tamperTestSchedule: "weekly Sun 05:30",
      drDrillTarget: "",
      drDrillTargetVm: "",
      instanceName: "e2e-harness",
      fleetToken: "",
      fleetTokenSet: false,
      pruneImageAfterUpdate: false,
      resticCacheMaxMB: 4096,
      digestEnabled: false,
      digestSchedule: "weekly Mon 08:00",
      catchUpMissed: true,
      watchdogEnabled: true,
      registryAuths: [],
      restartHealthWait: true,
      restartHealthTimeoutSec: 120,
      reconcileUnraidUpdateStatus: true,
      perItemSchedules: true,
      ...settingsOverrides,
    },
  };
}

/** Route-level staging of the /settings page's own boot reads. Everything the
 *  stacked cards render on the DEFAULT (non-advanced) tabs comes from the
 *  staged settings object plus the fresh harness DB's own empty lists
 *  (containers/VMs/file sets/off-site targets), which the real binary answers
 *  deterministically for a wiped DATA_DIR. */
async function stageSettingsDomain(page: Page) {
  await page.route("**/api/display-prefs*", (route) =>
    // Method-branched (see the header note): GET aborts for the boot-look
    // cut; PUT answers OK so pref saves never error the picker scenario.
    route.request().method() === "GET"
      ? route.abort()
      : route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/settings", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: settingsBody() })
      : route.fulfill({ json: { ok: true } }),
  );
}

// --- shared locators ---------------------------------------------------------

// The card headings are h2s wrapping a heading Badge; filtering on hasText
// (substring) instead of an exact accessible name keeps the assertion stable
// for the cards whose hint bubble sits INSIDE the h2 (the bubble's own
// aria-label would join the heading's name computation).
//
// The locator DRILLS TO THE BADGE SPAN on purpose. A heading notch Badge
// positions itself `absolute top-0 -translate-y-1/2` (Badge.tsx — the notch
// straddling the card's top edge), so the wrapping h2 has NO in-flow content
// and collapses to a zero-height box. Playwright's visibility contract is
// "non-empty bounding box AND not visibility:hidden", so a toBeVisible on the
// h2 itself would fail at EVERY viewport — desktop included; this app's card
// titles simply never produce a boxed h2. The badge span carries the real,
// rendered box, so it is the element whose visibility means "this card's
// title is showing". (First proven live by this spec's first mobile run:
// locator resolved to the h2 14x, reported "hidden" throughout.)
function cardHeading(page: Page, text: string) {
  return page.locator("#bv-main").locator("h2").filter({ hasText: text }).locator("span").first();
}

// The chip strip: nav[aria-label="Settings sections"] (settings.tabsNavigation,
// pre-seeded by 07-02's single-writer i18n commit — no new key exists to
// misspell here).
function chipStrip(page: Page) {
  return page.getByRole("navigation", { name: "Settings sections" });
}

// The desktop Selector strip: role="tablist" labelled by t("settings.title").
// Below md it stays MOUNTED but display:none (the D-01 max-md:hidden half).
// `includeHidden` is load-bearing for exactly that half: role queries match
// only the accessibility tree, and a display:none element is OUT of it, so
// without the flag the mounted-hidden strip resolves to 0 elements on mobile
// and the D-01 "still mounted" assertion would be unprovable. On desktop the
// strip is visible and the flag is a no-op. The same flag is required on any
// role query INSIDE the strip (its tabs) when it is hidden.
function desktopStrip(page: Page) {
  return page.getByRole("tablist", { name: "Settings", includeHidden: true });
}

// One chip label -> one stacked-cards landmark, in TAB_ORDER order. Landmarks
// are default-mode (non-advanced) Card titles so the sweep needs no
// advanced-mode staging: General's Domains card, Paths & Storage's Backup
// Paths card, Schedules' Schedule options card, Off-site's Off-site retention
// card, Notifications'/Integrity's/System's title cards.
const TAB_LANDMARKS: Array<[string, string]> = [
  ["General", "Domains"],
  ["Paths & Storage", "Backup Paths"],
  ["Schedules", "Schedule options"],
  ["Off-site", "Off-site retention"],
  ["Notifications", "Notifications"],
  ["Integrity", "Integrity & maintenance"],
  ["System", "About BombVault"],
];

// ---------------------------------------------------------------------------

test("mobile /settings: the chip strip renders seven tonal chips, scrolls, and keeps the desktop strip mounted-hidden", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the MORE-02 chip strip is the phone surface",
  );
  await stageSettingsDomain(page);
  await page.goto("/settings");

  const strip = chipStrip(page);
  await expect(strip).toBeVisible();
  const chips = strip.getByRole("button");
  await expect(chips).toHaveCount(7);

  // The desktop half is in the DOM but never painted below md — the mounted-
  // hidden half of the D-01 double gate, NOT an either/or unmount.
  await expect(desktopStrip(page)).toHaveCount(1);
  await expect(desktopStrip(page)).not.toBeVisible();

  // The stacked cards are the shared panels with NO measured strip-width cap
  // below md (the desktop strip is display:none there — a hidden box measures
  // 0, and the maxWidth is isDesktop-gated precisely so it can never crush
  // the Cards flat).
  const panels = page.locator(".glim-tab-slide");
  await expect(panels).toHaveCount(1);
  const panelsStyle = (await panels.getAttribute("style")) ?? "";
  expect(panelsStyle).not.toMatch(/max-width/);

  // Default tab is General — the first stacked card set is already showing.
  await expect(cardHeading(page, "Domains")).toBeVisible();

  // Horizontal scroll, never wrap: seven chips with real labels cannot fit a
  // phone column, so the strip MUST overflow (scrollWidth > clientWidth).
  const { scrollWidth, clientWidth } = await strip.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrollWidth).toBeGreaterThan(clientWidth);

  // No chip is clipped out of reach: scrolling the strip brings even the
  // last TAB_ORDER chip fully inside the strip's own box.
  await chips.last().scrollIntoViewIfNeeded();
  const chipBox = await chips.last().boundingBox();
  const stripBox = await strip.boundingBox();
  expect(chipBox).not.toBeNull();
  expect(stripBox).not.toBeNull();
  expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(stripBox!.x + stripBox!.width + 1);
});

test("mobile /settings: tapping each chip switches the stacked cards — one tab state, two presentations", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the shared-state chip contract is the phone surface",
  );
  await stageSettingsDomain(page);
  await page.goto("/settings");

  const strip = chipStrip(page);
  const chips = strip.getByRole("button");
  await expect(chips).toHaveCount(7);

  for (const [chipLabel, landmark] of TAB_LANDMARKS) {
    await strip.getByRole("button", { name: chipLabel, exact: true }).tap();
    await expect(cardHeading(page, landmark)).toHaveCount(1);
    await expect(cardHeading(page, landmark)).toBeVisible();

    // ONE state, two presentations (T-07-16): the desktop strip's OWN
    // selection follows the chip tap — the same TabKey state rendering
    // through the aria-selected half, not a second state to drift.
    // includeHidden because the strip is display:none at phone width (see
    // desktopStrip's note): the tabs are out of the a11y tree there, but the
    // aria-selected ATTRIBUTE is exactly what we are asserting on.
    await expect(
      desktopStrip(page).getByRole("tab", { name: chipLabel, includeHidden: true }),
    ).toHaveAttribute("aria-selected", "true");

    // Accent reservation 10 on the strip: the ACTIVE chip alone carries the
    // accent-tonal pair; inactive chips are carbon-surface2/textMuted.
    const activeCls = (await strip
      .getByRole("button", { name: chipLabel, exact: true })
      .getAttribute("class")) ?? "";
    expect(activeCls).toContain("bg-accentSoft");
    expect(activeCls).toContain("text-accentText");
    expect(activeCls).not.toContain("bg-carbon-surface2");

    const firstLabel = TAB_LANDMARKS[0][0];
    if (chipLabel !== firstLabel) {
      const inactiveCls = (await strip
        .getByRole("button", { name: firstLabel, exact: true })
        .getAttribute("class")) ?? "";
      expect(inactiveCls).toContain("bg-carbon-surface2");
      expect(inactiveCls).toContain("text-carbon-textMuted");
      expect(inactiveCls).not.toContain("bg-accentSoft");
    }

    // The active chip's corners read the PLATFORM token (--mob-chip-radius,
    // the 999px pill 07-01 defines for both data-platform values) — the
    // token consumption proven on the computed style, never a literal.
    const radius = await strip
      .getByRole("button", { name: chipLabel, exact: true })
      .evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe("999px");
  }

  // The landmark loop ends on System; every OTHER tab's landmark is gone —
  // the panels really do swap wholesale, they do not stack on top of each
  // other.
  await expect(cardHeading(page, "Domains")).toHaveCount(0);
  await expect(cardHeading(page, "Off-site retention")).toHaveCount(0);
});

test("mobile /settings: the accent picker opens the phase 6 popover and a selection applies", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: D-09 — the tap pickers inside the stacked card",
  );
  await stageSettingsDomain(page);
  await page.goto("/settings");

  // The stacked General tab renders the same AccentCard row of preset
  // swatches; tapping one opens the shared ColorPickerPopover on TapPopover —
  // the phase 6 portaled dialog surface, unmodified.
  await page.getByRole("button", { name: "Preset 1", exact: true }).tap();
  const popover = page.getByRole("dialog");
  await expect(popover).toBeVisible();

  // A selection made INSIDE the picker applies to the live accent token:
  // typing a hex drives ColorPickerSwatch's one update path, which calls
  // setAccent -> applyAccent -> the --accent custom property on :root.
  const applied = page.waitForFunction(
    () => document.documentElement.style.getPropertyValue("--accent").toLowerCase() === "#34d1bf",
  );
  await popover.getByLabel("Hex").fill("#34d1bf");
  await applied;
});

test("mobile /settings: dark mode flips from the stacked Theme card", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the theme picker inside the stacked General tab",
  );
  await stageSettingsDomain(page);
  await page.goto("/settings");

  // The Theme card's own well Selector (label "Theme") renders in the
  // stacked cards exactly as on desktop — flip to Dark.
  await page.getByRole("tab", { name: "Dark" }).tap();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("tab", { name: "Dark" })).toHaveAttribute("aria-selected", "true");
});

for (const route of ["/settings"]) {
  test(`desktop ${route}: desktop chrome present, mobile chrome absent`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !DESKTOP_PROJECTS.has(testInfo.project.name),
      "desktop-only: the dual-direction guard for the 07-05 route",
    );
    await stageSettingsDomain(page);
    await page.goto(route);

    // Desktop chrome: the Sidebar rail, no bottom bar, the main scroller.
    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toHaveCount(0);
    await expect(page.locator("#bv-main")).toHaveCount(1);

    // The tabbed shell markers: the Selector strip visible with its seven
    // tabs, and the panels capped to the strip's MEASURED width (the desktop
    // maxWidth mechanism — a real px value, never the 0px a hidden strip
    // would measure).
    const strip = desktopStrip(page);
    await expect(strip).toBeVisible();
    await expect(strip.getByRole("tab")).toHaveCount(7);
    const panels = page.locator(".glim-tab-slide");
    await expect(panels).toHaveCount(1);
    const panelsStyle = (await panels.getAttribute("style")) ?? "";
    expect(panelsStyle).toMatch(/max-width:\s*\d+(\.\d+)?px/);

    // Phone chrome absent: the chip strip is unmounted (not hidden) on
    // desktop, and the mobile Fab / fullHeight sheet signatures exist
    // nowhere. The h-dvh check is dialog-scoped deliberately: the app shell
    // ROOT legitimately carries h-dvh on every route (SHELL-05).
    await expect(page.getByRole("navigation", { name: "Settings sections" })).toHaveCount(0);
    await expect(page.locator("button.h-13")).toHaveCount(0);
    await expect(page.locator('[role="dialog"].h-dvh')).toHaveCount(0);
  });
}
