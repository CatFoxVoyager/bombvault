// ---------------------------------------------------------------------------
// Platform chrome — PLAT-01 (phase 7, plan 07-01 Task 1).
//
// The data-platform layer's live proof on the compiled binary: the attribute
// resolves (material on a fresh profile — the recorded no-OS-detection
// default), persists and flips from the seeded bv-platform preference, and —
// the part a custom-property read alone cannot prove — reaches real
// CONSUMERS: under cupertino the routed page's <h1> computes the HIG large
// title (32px/700) and the check consumer resolves the circular 999px radius;
// under material the same two consumers compute their existing expressions
// (20px/600 — Dashboard's max-md:text-xl — and the square 0px). Computed
// properties on consuming elements, not custom-property token reads: a token
// with zero consumers would pass a token read with nothing shipped.
//
// The checkbox consumer lives on /vms, not /settings: the plan's premise that
// /settings renders native checkboxes is stale — every settings row has been
// converted to ToggleRow, so no input[type=checkbox] exists anywhere on that
// page to assert against. VMs is the mobile-visible native-checkbox surface
// that exists TODAY: its desktop list still renders below md (the VMs mobile
// block is plan 07-03's work), so the rows are genuinely visible at 360px.
// The list itself is staged — maquette-screens' route.fulfill shape — because
// the harness DB has no VMs; one running VM yields both the per-row select
// checkbox and the toolbar's select-all.
//
// HOW the check consumer is asserted, and why not toHaveCSS("border-radius"):
// Chromium normalizes author border-radius on appearance:auto checkboxes out
// of the cascade — computed style reports 0px for ANY author value (a div
// with the same declaration reports it fine; an appearance:none checkbox
// reports it fine; screenshots of a 0px and a 999px native checkbox are
// pixel-identical — measured during 07-01). The radius can only be observed
// where the engine honors it (Firefox; a future custom-painted check). So the
// e2e proves the two things Chromium CAN observe about this consumer: the
// rule shipped INSIDE the max-md media block (breakpoint-scoped, T-07-02's
// desktop invariance), and --mob-check-radius RESOLVES AT a live checkbox
// element to the attribute-correct value — the full inheritance chain from
// :root[data-platform] to the consuming element.
//
// Desktop gets one assertion, the desktop-untouched pattern: the shell is
// exactly what renders with the attribute present — the --mob-* consumers are
// scoped below md, so >=48rem must not move (T-07-02).
// ---------------------------------------------------------------------------
import { expect, test, type Page } from "@playwright/test";

const PLATFORM_KEY = "bv-platform";

// Seed the persisted platform BEFORE any page script runs — a returning
// visitor's localStorage, not a mid-session write — the narrow-viewport
// spec's bootSeededPage shape. No display-prefs route.abort needed: bv-platform
// is not one of displayPrefs' synced KEYS, so the boot-time reconciliation
// cannot clobber or publish it (it only ever re-reads this browser's value).
async function seedPlatform(page: Page, value: string): Promise<void> {
  await page.addInitScript(
    ([key, val]) => {
      window.localStorage.setItem(key, val);
    },
    [PLATFORM_KEY, value] as const,
  );
}

// The staged VM list for the check-consumer assertions (see the header): one
// live ("running" — the page's live/installed filter drops "not-installed")
// VM, wire-shaped exactly like VMView in internal/api/service.go.
const STAGED_VM = {
  name: "win10",
  libvirtName: "win10",
  state: "running",
  method: "graceful",
  includeInSchedule: true,
  lastBackup: null,
  lastBackupStarted: null,
};

async function stageVMs(page: Page): Promise<void> {
  await page.route("**/api/vms", (route) =>
    route.fulfill({ json: { ok: true, vms: [STAGED_VM] } }),
  );
}

// The check consumer, observed the way Chromium allows (see the header):
// returns the rule state — the checkbox rule's presence and its media
// scoping — plus the platform token resolved AT a live checkbox element.
async function readCheckConsumer(page: Page): Promise<{
  ruleFound: boolean;
  ruleInMobileMedia: boolean;
  varAtCheckbox: string;
}> {
  return page.evaluate(() => {
    const cb = document.querySelector("input[type='checkbox']");
    let ruleFound = false;
    let ruleInMobileMedia = false;
    const walk = (rules: CSSRuleList, inMobileMedia: boolean): void => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) {
          // Chromium's conditionText keeps spaces ("not all and (width >=
          // 48rem)") — compare space-stripped, matching the compiled output.
          const isMobileBlock = rule.conditionText
            .replaceAll(" ", "")
            .includes("(width>=48rem)");
          walk(rule.cssRules, inMobileMedia || isMobileBlock);
        } else if (
          rule instanceof CSSStyleRule &&
          rule.selectorText?.includes("checkbox") &&
          rule.style.getPropertyValue("border-radius").includes("var(--mob-check-radius)")
        ) {
          ruleFound = true;
          ruleInMobileMedia = inMobileMedia;
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin sheet — none here, but don't die on principle
      }
      walk(rules, false);
    }
    return {
      ruleFound,
      ruleInMobileMedia,
      varAtCheckbox: cb
        ? getComputedStyle(cb).getPropertyValue("--mob-check-radius").trim()
        : "",
    };
  });
}

test("mobile fresh profile: data-platform resolves to material", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-android", "mobile-only: the platform chrome contract");
  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "material");
});

test("mobile cupertino: attribute flips, token resolves, consumers re-skin", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-android", "mobile-only: the platform chrome contract");
  await seedPlatform(page, "cupertino");

  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "cupertino");
  // The variant block is present and resolving on :root ...
  const titleToken = await page
    .evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mob-title-size"))
    .then((v) => v.trim());
  expect(titleToken).not.toBe("");
  // ... and the page heading CONSUMES it — the HIG large title (32px/700).
  const h1 = page.locator("#bv-main h1");
  await expect(h1).toHaveCSS("font-size", "32px");
  await expect(h1).toHaveCSS("font-weight", "700");

  // The check consumer on a mobile-visible surface: the rule is present,
  // breakpoint-scoped, and the token resolves at a live checkbox to the
  // circular HIG value (see the header for the Chromium normalization limit).
  // toBeVisible first: the staged list renders after the route reply lands,
  // and it proves the surface is genuinely PAINTED at 360px, not just attached.
  await stageVMs(page);
  await page.goto("/vms");
  const checkbox = page.locator("input[type='checkbox']").first();
  await expect(checkbox).toBeVisible();
  const cupCheck = await readCheckConsumer(page);
  expect(cupCheck.ruleFound).toBe(true);
  expect(cupCheck.ruleInMobileMedia).toBe(true);
  expect(cupCheck.varAtCheckbox).toBe("999px");
});

test("mobile material: the same consumers keep today's expressions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-android", "mobile-only: the platform chrome contract");
  await seedPlatform(page, "material");

  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "material");
  // Material inertness: the heading keeps its existing expression (Dashboard's
  // max-md:text-xl below the breakpoint), NOT the 32px large title.
  const h1 = page.locator("#bv-main h1");
  await expect(h1).toHaveCSS("font-size", "20px");
  await expect(h1).toHaveCSS("font-weight", "600");

  // The check rule resolves its variable under BOTH attribute values:
  // material's 0px is today's native rendering (square-cornered control).
  await stageVMs(page);
  await page.goto("/vms");
  await expect(page.locator("input[type='checkbox']").first()).toBeVisible();
  const matCheck = await readCheckConsumer(page);
  expect(matCheck.ruleFound).toBe(true);
  expect(matCheck.ruleInMobileMedia).toBe(true);
  expect(matCheck.varAtCheckbox).toBe("0px");
});

test("desktop: shell unchanged with the attribute present", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280", "desktop-only: the >=48rem invariance check");
  await page.goto("/dashboard");
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  await expect(page.getByTestId("bottom-nav")).toHaveCount(0);
  await expect(page.locator("#bv-main")).toHaveCount(1);
});
