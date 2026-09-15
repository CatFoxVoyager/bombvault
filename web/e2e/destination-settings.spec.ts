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
//   5. the D-06 fix-1 touch-target backstop (08-04): every shared-Button
//      instance in the stacked cards, the Language card's raw trigger, and
//      the language listbox's option rows clear the 44px floor THROUGH the
//      invisible ::after bleed (the hit geometry, not the frozen visual box),
//      and the Notify entry row clears it on its own min-height,
//   6. desktop /settings (1280 and the 768 breakpoint boundary): the Selector
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
import { expect, test, type Locator, type Page } from "@playwright/test";

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

// --- the D-06 fix-1 touch-floor machinery (08-04) ------------------------------
//
// The bleed is invisible by design, and that is exactly why a plain
// boundingBox() >= 44 assertion cannot prove it: an ::after pseudo-element is
// NOT part of its originating element's DOM bounding box, so the box Playwright
// measures is the FROZEN 32px visual — the same number before the fix, after
// the fix, and if the bleed were silently dropped. list-ergonomics.spec.ts's
// min-height floors stay plain bounding-box assertions because there the
// VISUAL box is the hit box; for bleed controls the proof has to read the
// rendered ::after's computed insets and grow the border box by them — the
// geometry a finger actually gets (a pseudo-element hit-tests to its
// originating button).
type HitBox = {
  name: string;
  visual: { w: number; h: number };
  hit: { w: number; h: number };
  bled: boolean;
};

/** Hit boxes for the located buttons: visual border box, bleed-grown hit box,
 *  and whether an absolutely-positioned ::after actually rendered on the
 *  element (the regression tell for a dropped max-md: bleed class). */
function hitBoxes(locator: Locator) {
  return locator.evaluateAll((els) =>
    els
      .filter((el) => {
        // The always-mounted desktop half is display:none at phone width and
        // measures a zero box — it is not part of the mobile battery.
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => {
        const b = el as HTMLButtonElement;
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b, "::after");
        const px = (v: string) => (v.endsWith("px") ? parseFloat(v) : 0);
        // Negative insets are the BLEED: the pseudo extends past the border
        // box by |inset| on that side. Anything else (0, auto, non-px) grows
        // nothing — which is the honest reading, not an assumption of 12px.
        const grow = (v: string) => -Math.min(0, px(v));
        return {
          name: b.getAttribute("aria-label") ?? b.textContent?.trim() ?? b.className,
          visual: { w: r.width, h: r.height },
          hit: {
            w: r.width + grow(cs.left) + grow(cs.right),
            h: r.height + grow(cs.top) + grow(cs.bottom),
          },
          bled: cs.content !== "none" && cs.position === "absolute",
        } satisfies HitBox;
      }),
  );
}

// One chip label -> one stacked-cards landmark, in TAB_ORDER order. Landmarks
// are default-mode (non-advanced) Card titles so the sweep needs no
// advanced-mode staging: General's Domains card, Paths & Storage's Backup
// Paths card, Schedules' Schedule options card, Off-site's Off-site retention
// card, Notifications'/Integrity's/System's title cards. System's marker is
// the Dashboard widget card — its FIRST unconditional card — because the
// resync absorbed upstream's [3559] move that relocated About BombVault off
// System onto General (the footer of the first tab), which also took the
// About card out of this sweep's per-tab spot-check.
const TAB_LANDMARKS: Array<[string, string]> = [
  ["General", "Domains"],
  ["Paths & Storage", "Backup Paths"],
  ["Schedules", "Schedule options"],
  ["Off-site", "Off-site retention"],
  ["Notifications", "Notifications"],
  ["Integrity", "Integrity & maintenance"],
  ["System", "Dashboard widget"],
];

// ---------------------------------------------------------------------------

test("mobile /settings: the chip strip renders seven tonal chips, wraps, and keeps the desktop strip mounted-hidden", async ({
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

  // The strip wraps, it never pans: seven chips with real labels cannot fit a
  // phone column on one row, and the Selector's flex-wrap contract (upstream
  // round 8 dropped the flex-nowrap "well" that genuinely spilled a 7-tab
  // strip past the page edge) stacks them into rows INSIDE the strip's own
  // box instead — no horizontal overflow to scroll, strip-local or page-wide.
  const { scrollWidth, clientWidth } = await strip.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // The wrap is real: chip tops span more than one row (the old flex-nowrap
  // contract pinned this spread at <= 8px — exactly one row; wrapping is the
  // whole point now), while the strip stays a strip, not an unbounded column.
  const tops = await chips.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().top),
  );
  const chipSpread = Math.max(...tops) - Math.min(...tops);
  expect(chipSpread).toBeGreaterThan(16);

  // No chip is clipped out of reach: wrapping keeps even the last TAB_ORDER
  // chip fully inside the strip's own box, no scrolling required.
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
    if (chipLabel === "Notifications") {
      // 07-07's NotifyCard sheet editor replaced this tab's mobile title
      // card with the D-01 entry row + fullHeight sheet: the only
      // "Notifications" h2 left in DOM sits inside the max-md:hidden
      // desktop half, so the stacked presentation to assert is the entry
      // row (title + the staged fixture's "Never" summary).
      await expect(
        page.getByRole("button", { name: "Notifications Never" }),
      ).toBeVisible();
    } else {
      await expect(cardHeading(page, landmark)).toHaveCount(1);
      await expect(cardHeading(page, landmark)).toBeVisible();
    }

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

test("mobile /settings: the D-06 fix-1 controls clear the 44px touch floor via the bleed", async ({
  page,
}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.has(testInfo.project.name),
    "mobile-only: the D-06 fix-1 bleed is the phone hit geometry",
  );
  await stageSettingsDomain(page);
  await page.goto("/settings");

  const strip = chipStrip(page);
  const chips = strip.getByRole("button");
  await expect(chips).toHaveCount(7);

  // --- Part 1: every shared-Button instance across ALL seven stacked tabs ---
  //
  // The sweep selector is `glim-btn:not(.glim-btn-chip)` because the chip
  // variant is the one deliberately-EXCLUDED control of D-06 fix 1: it is the
  // 18px remove glyph living INSIDE a pill (see Button.tsx's MOBILE_BLEED
  // comment), where a bleed would swallow taps meant for the pill's own text;
  // it rides its host row's floor instead. The chip strip's own buttons are
  // raw buttons, not glim-btn, so they are neither swept nor double-counted.
  // Zero-box entries are already filtered inside hitBoxes (the always-mounted
  // desktop half measures 0 at phone width).
  const seen: HitBox[] = [];
  for (const [chipLabel, landmark] of TAB_LANDMARKS) {
    await strip.getByRole("button", { name: chipLabel, exact: true }).tap();
    if (chipLabel === "Notifications") {
      await expect(page.getByRole("button", { name: "Notifications Never" })).toBeVisible();
    } else {
      await expect(cardHeading(page, landmark)).toBeVisible();
    }
    seen.push(
      ...(await hitBoxes(page.locator("#bv-main button.glim-btn:not(.glim-btn-chip)"))),
    );
  }
  // Self-guard: a broken locator would sweep nothing and the floor assertions
  // below would pass vacuously — the battery must prove it measured real
  // controls (seven tabs of card chrome measure dozens; 4 is the loud floor).
  expect(
    seen.length,
    "the glim-btn sweep measured almost nothing across all seven tabs — the " +
      "selector no longer matches the stacked cards' buttons, and every floor " +
      "assertion below this one is running vacuously. Repoint the sweep " +
      "deliberately.",
  ).toBeGreaterThanOrEqual(4);

  const shortfalls = seen
    .filter((box) => box.hit.h < 44 || box.hit.w < 44)
    .map((box) => `${box.name}: hit ${box.hit.w}x${box.hit.h} (visual ${box.visual.w}x${box.visual.h})`);
  expect(
    shortfalls,
    "a control in the stacked cards falls under the 44px touch floor even " +
      "with its bleed — D-06 fix 1's contract is a >=44px HIT box for every " +
      "shared-Button instance on the phone surface. Either the bleed class " +
      "was dropped at this site or the control needs the pattern applied.",
  ).toEqual([]);

  const unbled = seen.filter((box) => !box.bled).map((box) => box.name);
  expect(
    unbled,
    "a visible glim-btn on mobile renders NO absolutely-positioned ::after — " +
      "MOBILE_BLEED lives on the shared Button's className template, so a " +
      "missing bleed means the template lost the classes or this instance " +
      "overrides className in a way that drops them (the chip variant is the " +
      "only sanctioned exclusion, and it is filtered out of this sweep).",
  ).toEqual([]);

  // --- Part 2: the Language card's raw trigger — visual stays frozen -------
  //
  // The raw trigger proves the FIX's shape, not just its floor: the visual box
  // must stay UNDER 44 (the design language grows tap areas, never visual
  // size — glim-btn's frozen 32px is the whole reason the bleed exists), while
  // the hit box clears it on bleed alone.
  await strip.getByRole("button", { name: "General", exact: true }).tap();
  await expect(cardHeading(page, "Domains")).toBeVisible();
  const trigger = page.getByRole("button", { name: /^Language: / });
  await expect(trigger).toBeVisible();
  const [triggerBox] = await hitBoxes(trigger);
  expect(triggerBox, "the Language trigger resolved to nothing — its accessible name shape changed").toBeDefined();
  expect(
    triggerBox!.visual.h,
    "the Language trigger's VISUAL box grew to the 44 floor — the fix grows " +
      "the hit area through the invisible bleed, never the visible control; " +
      "desktop byte-identity depends on the visual box staying frozen.",
  ).toBeLessThan(44);
  expect(
    triggerBox!.hit.w >= 44 && triggerBox!.hit.h >= 44 && triggerBox!.bled,
    "the Language trigger does not clear 44px through its bleed — the " +
      "card-local max-md: bleed classes are gone or no longer render.",
  ).toBe(true);

  // --- Part 3: the listbox options inside the opened dropdown -------------
  await trigger.tap();
  const options = page.getByRole("option");
  const optionBoxes = await hitBoxes(options);
  expect(
    optionBoxes.length,
    "the language listbox rendered fewer than 2 options — the panel did not " +
      "open (or the option role moved), so the option-floor assertion would " +
      "run vacuously.",
  ).toBeGreaterThanOrEqual(2);
  const optionShortfalls = optionBoxes
    .filter((box) => box.hit.h < 44 || box.hit.w < 44)
    .map((box) => `${box.name}: hit ${box.hit.w}x${box.hit.h}`);
  expect(
    optionShortfalls,
    "a language option falls under the 44px floor even with its bleed — " +
      "the option rows carry the same card-local bleed as the trigger.",
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(options).toHaveCount(0);

  // --- Part 4: the Notify entry row — 44px on its own min-height ----------
  //
  // The entry row is the compliant control the battery proves needs NO fix:
  // a plain boundingBox assertion (no bleed machinery) because its floor is
  // the min-h-[2.75rem] class, not a pseudo-element.
  await strip.getByRole("button", { name: "Notifications", exact: true }).tap();
  const entryRow = page.getByRole("button", { name: "Notifications Never" });
  await expect(entryRow).toBeVisible();
  const rowBox = await entryRow.boundingBox();
  expect(rowBox, "the Notify entry row produced no box").not.toBeNull();
  expect(
    rowBox!.height >= 44 && rowBox!.width >= 44,
    `the Notify entry row measures ${rowBox!.width}x${rowBox!.height} — its ` +
      "own min-height floor regressed (min-h-[2.75rem]).",
  ).toBe(true);
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
