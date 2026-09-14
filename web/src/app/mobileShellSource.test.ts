// ---------------------------------------------------------------------------
// Mobile shell source contract (SHELL-04/05/06/07) — the viewport correctness
// guard suite.
//
// The viewport contract is mostly DECLARATIVE — custom properties, a meta
// tag, a class name — and a declaration with no rule is invisible to
// TypeScript and to every assertion that only checks behavior: nothing fails
// when `viewport-fit=cover` is dropped from the meta, when a safe-area
// property loses its env() pairing, or when someone "simplifies" the FOUC
// script. So this suite asserts the SOURCE TEXT itself, the same way
// routedPages.test.ts pins the page-shell rule's scope.
//
// Three of these guards are load-bearing beyond style:
//   - The FOUC byte-identity guard (SHELL-06 / T-05-03): the inline head
//     script is first-paint theme logic whose bytes are security-adjacent.
//     The script's full text is copied below as EXPECTED_FOUC_SCRIPT and
//     compared verbatim — ANY edit to those bytes fails this suite, so a
//     change there has to be a deliberate act that updates this constant.
//   - The banned-literal negatives (SHELL-05): 100vh and min-h-screen are the
//     viewport-height trap (they keep the pre-keyboard height under the iOS
//     keyboard and strand content off-screen). The two literals appear in
//     THIS FILE on purpose, as negative-assertion needles — that is their
//     only sanctioned appearance; they must never survive in Login.tsx or
//     index.css. Plan 05 EXTENDS this file for the Layout/mobile-shell
//     asserts; it does not loosen these.
//   - The login-before-shell source order (SHELL-07): the login page's
//     chrome-free guarantee is STRUCTURAL — Layout's blocked branch returns
//     LoginPage before the shell root div is ever reached — so the guard
//     asserts source order, not rendered DOM.
//
// Node environment, no DOM: this reads source text, it does not render.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..");
const WEB = join(SRC, "..");

const indexHtml = readFileSync(join(WEB, "index.html"), "utf8");
const indexCss = readFileSync(join(SRC, "index.css"), "utf8");
const login = readFileSync(join(SRC, "pages", "Login.tsx"), "utf8");
const layout = readFileSync(join(HERE, "Layout.tsx"), "utf8");
const sidebar = readFileSync(join(SRC, "components", "Sidebar.tsx"), "utf8");
const bottomNav = readFileSync(join(SRC, "components", "mobile", "BottomNav.tsx"), "utf8");
const moreSheet = readFileSync(join(SRC, "components", "mobile", "MoreSheet.tsx"), "utf8");

// The FOUC script copied verbatim from index.html — indentation included.
// This is a BYTE constant: it must not be reformatted, requoted, or "tidied",
// because its entire job is to differ from index.html the moment index.html's
// copy changes. (It necessarily contains no backticks and no ${ sequences,
// which is what makes a plain template literal safe here.)
const EXPECTED_FOUC_SCRIPT = `    <script>
      (function () {
        try {
          var stored = localStorage.getItem("bv-theme");
          var resolved =
            stored === "dark" || stored === "light"
              ? stored
              : window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
          document.documentElement.setAttribute("data-theme", resolved);
        } catch (e) {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      })();
    </script>`;

// The first bare <script> in the head — the literal `<script>` (no
// attributes) matches only the FOUC script; the module script at the end of
// <body> carries type/src, so it can never shadow this match.
const FOUC_REGION = /<script>\n([\s\S]*?)<\/script>/;

describe("SHELL-04 — safe-area custom properties exist and are env-paired", () => {
  const DEFINITIONS = [
    ...indexCss.matchAll(/--safe-area-[a-z]+:\s*max\(env\(safe-area-inset-/g),
  ];

  it("finds the safe-area block at all (guards against this suite silently matching nothing)", () => {
    expect(
      DEFINITIONS.length,
      "no `--safe-area-*: max(env(...))` definitions were found in index.css. " +
        "The block was removed, renamed, or rewritten in a form this guard no longer " +
        "recognizes — safe areas are the whole of SHELL-04, so restore it or update " +
        "this guard deliberately."
    ).toBeGreaterThanOrEqual(4);
  });

  it.each(["top", "right", "bottom", "left"])(
    "defines --safe-area-%s as max(env(safe-area-inset-%s), 0px)",
    (side) => {
      // The 0px clamp is not decoration: env() can behave as invalid/unset in
      // a var() chain on browsers that parse the syntax but report nothing,
      // and every consumer's padding/calc must stay a valid length there.
      expect(
        new RegExp(
          `--safe-area-${side}:\\s*max\\(env\\(safe-area-inset-${side}\\),\\s*0px\\)`
        ).test(indexCss),
        `--safe-area-${side} is missing or no longer clamped as ` +
          `max(env(safe-area-inset-${side}), 0px). The clamp keeps every consumer's ` +
          `padding a valid length where env() resolves to nothing, and the env() ` +
          `pairing is what makes the inset real on notched devices (SHELL-04).`
      ).toBe(true);
    }
  );
});

describe("SHELL-06 — viewport meta carries the mobile directives", () => {
  const viewport = /<meta\s+name="viewport"\s+content="([^"]*)"\s*\/>/.exec(indexHtml);

  it("finds the viewport meta at all (guards against this suite silently matching nothing)", () => {
    expect(
      viewport,
      'no <meta name="viewport" content="..."> found in index.html. The meta was ' +
        "removed or reformatted beyond this guard's shape — restore it or update the " +
        "regex deliberately."
    ).not.toBeNull();
  });

  it("keeps the original width/device-width + initial-scale directives", () => {
    expect(
      viewport?.[1],
      "the viewport meta lost `width=device-width, initial-scale=1.0` — every mobile " +
        "surface depends on it; the SHELL-06 extension is additive, never a replacement."
    ).toContain("width=device-width, initial-scale=1.0");
  });

  it("declares viewport-fit=cover — the other half of the safe-area contract", () => {
    expect(
      viewport?.[1],
      'viewport-fit=cover is missing from the viewport meta. Without it the layout ' +
        "viewport is inset by the system chrome and EVERY env(safe-area-inset-*) — " +
        "and therefore every --safe-area-* custom property in index.css — silently " +
        "reads 0px. The meta line and the CSS block are one contract (SHELL-04)."
    ).toContain("viewport-fit=cover");
  });

  it("declares interactive-widget=resizes-content for the Android keyboard", () => {
    expect(
      viewport?.[1],
      "interactive-widget=resizes-content is missing from the viewport meta. The " +
        "Android keyboard then overlays instead of resizing the layout viewport, and " +
        "the Layout-level keyboard mechanism loses the resize signal it builds on " +
        "(SHELL-06)."
    ).toContain("interactive-widget=resizes-content");
  });
});

describe("SHELL-06 / T-05-03 — the FOUC script's bytes are guarded", () => {
  const region = FOUC_REGION.exec(indexHtml);

  it("finds a bare <script> region that is the FOUC script (self-guard)", () => {
    expect(
      region?.[1],
      'no bare `<script>` block found in index.html, or it is not the FOUC script. ' +
        "The FOUC killer is the FIRST bare script in <head>; if it moved or grew " +
        "attributes, update FOUC_REGION deliberately."
    ).toContain("bv-theme");
  });

  it("matches index.html byte for byte — ANY edit to those bytes fails here", () => {
    expect(
      indexHtml,
      "index.html's FOUC script no longer matches the guarded byte constant. Those " +
        "bytes are first-paint theme logic (T-05-03, mitigate): they stamp data-theme " +
        "synchronously before CSS paints, and a mutation is tampering with a " +
        "byte-critical region — duplicates of theme.ts's resolution logic that must " +
        "be kept in sync by hand. If the change is deliberate, update " +
        "EXPECTED_FOUC_SCRIPT in this test in the same commit and say why."
    ).toContain(EXPECTED_FOUC_SCRIPT);
  });
});

describe("SHELL-06 — the static theme-color fallback sits below the FOUC script", () => {
  const foucClose = indexHtml.indexOf("</script>");
  const themeColor = indexHtml.indexOf('<meta name="theme-color"');

  it("finds both markers at all (guards against this suite silently matching nothing)", () => {
    expect(foucClose, "no FOUC script close tag found — see the byte-identity guard above").toBeGreaterThan(-1);
    expect(
      themeColor,
      'no <meta name="theme-color"> found in index.html. The static tag is the ' +
        "first-paint browser-chrome color before JS runs; paint() in lib/theme.ts " +
        "mirrors the live theme into it afterwards."
    ).toBeGreaterThan(-1);
  });

  it("orders the fallback after the script", () => {
    expect(
      themeColor,
      "the static theme-color meta sits ABOVE the FOUC script's close. It must stay " +
        "below: the script region is byte-guarded (this suite fails on any edit " +
        "there), and the fallback's place is after it, beside the viewport meta."
    ).toBeGreaterThan(foucClose);
  });
});

describe("SHELL-05/07 — the login page's viewport discipline", () => {
  // Vacuity guard: if the component itself is renamed or the file replaced,
  // every negative below would pass vacuously against dead text.
  it("is reading the real LoginPage component (self-guard)", () => {
    expect(
      login,
      "Login.tsx no longer exports LoginPage — the login source asserts below are " +
        "running against a file that no longer contains the component."
    ).toContain("export function LoginPage");
  });

  it("sizes its root with the dynamic viewport unit, not a static one", () => {
    expect(
      login,
      "Login.tsx's root no longer uses min-h-dvh. The dynamic unit is what keeps the " +
        "page filling the visual viewport when the iOS keyboard collapses the browser " +
        "chrome (SHELL-05); a static unit keeps the pre-keyboard height and strands " +
        "the card off-screen."
    ).toMatch(/className="[^"]*min-h-dvh/);
  });

  it("keeps BOTH fields at a 16px effective font on narrow viewports", () => {
    const count = login.match(/max-md:text-base/g)?.length ?? 0;
    expect(
      count,
      "fewer than two max-md:text-base occurrences in Login.tsx. Both the password " +
        "field and the TOTP code field need it: iOS Safari zooms the viewport on " +
        "focus for any input under a 16px effective font (SHELL-07 — the one " +
        "sanctioned override of the 14px body token, mobile only)."
    ).toBeGreaterThanOrEqual(2);
  });

  it("contains no 100vh literal", () => {
    expect(
      login.includes("100vh"),
      "Login.tsx contains the banned viewport-height unit 100vh (SHELL-05: the " +
        "mobile shell uses dvh/svh exclusively — 100vh keeps the pre-keyboard " +
        "height under the iOS keyboard). Use a dvh/svh form."
    ).toBe(false);
  });

  it("contains no min-h-screen root class", () => {
    expect(
      login.includes("min-h-screen"),
      "Login.tsx contains the banned static viewport root class min-h-screen " +
        "(SHELL-05/07). Use min-h-dvh."
    ).toBe(false);
  });

  it("pads its container with the safe-area custom properties", () => {
    for (const side of ["left", "right", "bottom"]) {
      expect(
        login.includes(`var(--safe-area-${side})`),
        `Login.tsx's container no longer pads with var(--safe-area-${side}). The ` +
          "insets are what keep the card clear of notches and the home indicator in " +
          "every orientation (SHELL-07); they resolve to 0 on desktop."
      ).toBe(true);
    }
  });
});

describe("SHELL-06 — the browser chrome follows the applied theme", () => {
  it("paint() mirrors the resolved theme into the meta theme-color tag", () => {
    const paint = /function paint\(theme: Theme\): void \{[\s\S]*?theme-color/.exec(
      readFileSync(join(SRC, "lib", "theme.ts"), "utf8")
    );
    expect(
      paint,
      "paint() in lib/theme.ts no longer touches meta[name=theme-color]. paint() is " +
        "the single theme-application choke point (setTheme, applyStoredTheme and " +
        "the system-flip listener all funnel through it), so the mirror must live " +
        "there — browser chrome otherwise never follows dark/light switches (SHELL-06)."
    ).not.toBeNull();
  });
});

describe("SHELL-07 — login renders before any shell, structurally", () => {
  // SCOPE NOTE: this asserts ORDER only. Layout still carries the desktop
  // root class until plan 05 rewires it, and plan 05 EXTENDS this file with
  // the Layout/mobile-shell asserts — asserting viewport classes here would
  // leave the suite red for all of Wave 1.
  const blocked = /if \(authGate === "blocked"\) \{\s*\n\s*return <LoginPage/.exec(layout);
  // Plan 05 rewired the shell root (the extension this scope note pre-announced):
  // the root's height is now h-dvh (SHELL-05) and its className is a template
  // literal, because the ONE chrome switch appends `flex-col` on the mobile
  // branch — so the root div no longer matches a plain `className="flex` string.
  // The root also carries the shell ref (the keyboard mechanism's focus
  // listeners attach to it), which is why the match anchors the ref attribute.
  const shell = /<div ref=\{shellRef\} className=\{`flex h-dvh/.exec(layout);

  it("finds both the blocked branch and the shell root at all (self-guard)", () => {
    expect(
      blocked,
      'Layout.tsx no longer has a `return <LoginPage` in the authGate === "blocked" ' +
        "branch — the login screen's chrome-free guarantee is this early return, so " +
        "its removal is a SHELL-07 regression unless restructured deliberately."
    ).not.toBeNull();
    expect(
      shell,
      "Layout.tsx no longer renders a `<div ref={shellRef} className={`flex h-dvh ...`}>` " +
        "shell root — the shell root moved or was renamed; update this guard deliberately."
    ).not.toBeNull();
  });

  it("returns LoginPage before the shell root appears in source order", () => {
    expect(
      blocked!.index,
      "Layout.tsx renders the shell before (or instead of) the LoginPage blocked " +
        "return. SHELL-07's no-chrome guarantee is structural: the bottom bar can " +
        "never appear on login because the blocked branch returns before any shell " +
        "renders. Preserve that order."
    ).toBeLessThan(shell!.index);
  });
});

// ---------------------------------------------------------------------------
// The Layout/mobile-shell asserts deferred to plan 05 (this file's scope
// note pre-announced the extension): the shell root's viewport discipline,
// the stable scroll target, the ONE guarded keyboard mechanism, and the
// chrome testids living in the mobile component sources. Same rules as the
// rest of the suite — every assert carries a self-guard and a why.
// ---------------------------------------------------------------------------
describe("SHELL-05 — the shell root's viewport discipline", () => {
  // Vacuity guard: every assert below reads dead text if the component moved.
  it("is reading the real Layout component (self-guard)", () => {
    expect(
      layout,
      "Layout.tsx no longer exports Layout — the shell asserts below are running " +
        "against a file that no longer contains the component."
    ).toContain("export function Layout");
  });

  it("sizes the shell root with the dynamic viewport unit", () => {
    expect(
      layout.includes("h-dvh"),
      "Layout.tsx's shell root no longer uses h-dvh. The dynamic unit is what keeps " +
        "the shell filling the visual viewport as mobile browser chrome collapses " +
        "and expands (SHELL-05); a static unit keeps the pre-chrome height and " +
        "strands bottom-docked content under expanded chrome."
    ).toBe(true);
  });

  it("contains no banned viewport-height literal", () => {
    expect(
      layout.includes("100vh") || layout.includes("min-h-screen"),
      "Layout.tsx contains a banned viewport-height literal (`100vh` or " +
        "`min-h-screen`). The mobile shell uses dvh/svh exclusively (SHELL-05): the " +
        "static forms keep the LARGEST viewport height, which is exactly the trap " +
        "that strands content under the iOS keyboard or expanded browser chrome. " +
        "Use the dynamic unit."
    ).toBe(false);
  });

  it("keeps the bv-main id on the scroller, the chrome's stable scroll target", () => {
    expect(
      layout.includes('id="bv-main"'),
      "Layout.tsx's scroller no longer carries id=\"bv-main\". Both chrome surfaces " +
        "address the scroller through that id (tap-on-active, the keyboard " +
        "mechanism) and never query for it any other way — without it the " +
        "tap-on-active scroll silently no-ops."
    ).toBe(true);
  });
});

describe("SHELL-05/06 — the ONE keyboard mechanism lives at Layout level", () => {
  it("guards the mechanism on visualViewport presence, so jsdom and old browsers no-op", () => {
    expect(
      /typeof window\.visualViewport\s*===\s*"undefined"/.test(layout),
      "Layout.tsx's keyboard mechanism lost the visualViewport presence guard. The " +
        "guard IS the contract (the jsdom discipline, lib/testSetup/matchMedia.ts): " +
        "environments without the API must no-op the whole mechanism, not throw — " +
        "without it every Layout-rendering dom test crashes and old browsers break."
    ).toBe(true);
  });

  it("wires the focusin listener exactly once — one mechanism, not one per component", () => {
    const count = layout.match(/addEventListener\("focusin"/g)?.length ?? 0;
    expect(
      count,
      "Layout.tsx wires addEventListener(\"focusin\") more than once (or not at " +
        "all). ONE listener set at Layout level is the locked decision: a " +
        "per-component listener would multiply with every new input-bearing page " +
        "and drift exactly the way duplicated logic does."
    ).toBe(1);
  });

  it("tears down every listener it adds (cleanup in the effect's return)", () => {
    for (const event of ["focusin", "focusout", "resize"]) {
      expect(
        layout.includes(`removeEventListener("${event}"`),
        `Layout.tsx's keyboard mechanism no longer removes its "${event}" listener ` +
          "on cleanup. The mechanism attaches only while the mobile branch renders; " +
          "without the teardown a branch switch to desktop (or an unmount) leaks " +
          "listeners that keep scrolling a shell that no longer exists."
      ).toBe(true);
    }
  });

  it("attaches the mechanism only while the mobile branch renders", () => {
    expect(
      /if \(isDesktop \|\| authGate !== "pass"\) return;/.test(layout),
      "Layout.tsx's keyboard mechanism lost its isDesktop/authGate bail-out. The " +
        "mechanism must attach ONLY on the mobile branch of a rendered shell: " +
        "desktop never pays the cost, and the blocked/loading states render no " +
        "shell root to attach to."
    ).toBe(true);
  });

  it("is the only visualViewport consumer in the chrome (zero listeners outside Layout)", () => {
    for (const [name, source] of [
      ["Sidebar.tsx", sidebar],
      ["BottomNav.tsx", bottomNav],
      ["MoreSheet.tsx", moreSheet],
    ] as const) {
      expect(
        source.includes("visualViewport"),
        `${name} touches visualViewport. The keyboard mechanism is ONE Layout-level ` +
          "listener set — a second viewport-resize consumer in a chrome component " +
          "is exactly the drift the locked decision forbids."
      ).toBe(false);
    }
  });
});

describe("SHELL-02/03 — the chrome testids live in the mobile component sources", () => {
  // Vacuity guards: the testid asserts below pass vacuously against renamed
  // or replaced components.
  it("is reading the real mobile chrome components (self-guards)", () => {
    expect(
      bottomNav,
      "BottomNav.tsx no longer exports BottomNav — the testid asserts below are " +
        "running against a file that no longer contains the component."
    ).toContain("export function BottomNav");
    expect(
      moreSheet,
      "MoreSheet.tsx no longer exports MoreSheet — the testid asserts below are " +
        "running against a file that no longer contains the component."
    ).toContain("export function MoreSheet");
  });

  it("carries data-testid=bottom-nav on the bar and data-testid=more-sheet in the sheet", () => {
    expect(
      bottomNav.includes('data-testid="bottom-nav"'),
      "BottomNav.tsx lost data-testid=\"bottom-nav\". The e2e suite locates the bar " +
        "through that testid on both mobile projects — without it the chrome-switch " +
        "smoke and every sheet assertion fail."
    ).toBe(true);
    expect(
      moreSheet.includes('data-testid="more-sheet"'),
      "MoreSheet.tsx lost data-testid=\"more-sheet\". The e2e suite locates the " +
        "sheet content through that testid — without it the SHELL-03 assertions " +
        "cannot run."
    ).toBe(true);
  });

  it("names the nav landmark for assistive technology (05-UI-REVIEW finding 2)", () => {
    expect(
      bottomNav.includes('aria-label={t("nav.mobileNavigation")}'),
      "BottomNav.tsx's <nav> lost its accessible name. Exactly one of the two nav " +
        "landmarks mounts at a time, but a landmark still needs a name for screen " +
        "readers — the 05-UI-REVIEW finding 2 fix is one attribute; keep it."
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PLAT-01 (phase 7, D-12) — the platform axis's closed mechanism. The same
// negative-assertion discipline as the banned-viewport literals above, over a
// full src/ walk instead of a file list: BOTH UA identifiers are banned
// everywhere (a web page cannot honestly distinguish Android from iOS, so
// platform is the closed material|cupertino union + persisted preference —
// lib/platform.ts's recorded decision), and the data-platform attribute has
// ONE writer. The needles below appear in THIS FILE on purpose; that is their
// only sanctioned appearance in src/.
// ---------------------------------------------------------------------------
describe("PLAT-01 — the platform axis stays closed and UA-free", () => {
  // The walk this describe guards with. .ts/.tsx/.css only — src/ carries no
  // other author text, and this suite is node-env (no DOM), reading source.
  // readdirSync(recursive) yields paths RELATIVE to SRC; never route them
  // through path.relative (it would re-resolve them against the process CWD).
  const SOURCES: { path: string; text: string }[] = [];
  for (const entry of readdirSync(SRC, { recursive: true })) {
    const path = entry.toString().replaceAll("\\", "/");
    if (!/\.(ts|tsx|css)$/.test(path)) continue;
    SOURCES.push({ path, text: readFileSync(join(SRC, entry), "utf8") });
  }
  // The guard's own file is excluded from the needle scan: it contains the
  // banned literals as negative assertions, exactly like the 100vh ban above.
  const SELF = relative(SRC, fileURLToPath(import.meta.url)).replaceAll("\\", "/");
  const SCANNED = SOURCES.filter(({ path }) => path !== SELF);

  it("finds src files at all, including the platform layer (self-guard)", () => {
    expect(
      SOURCES.length,
      "the src/ walk found no source files — the PLAT-01 guards below would pass " +
        "vacuously against nothing. If the source layout moved, repoint SRC deliberately."
    ).toBeGreaterThan(50);
    expect(
      SOURCES.map(({ path }) => path),
      "lib/platform.ts is not among the walked files — the UA-free and " +
        "single-writer asserts below are running against a tree without the " +
        "layer they guard."
    ).toContain(join("lib", "platform.ts").replaceAll("\\", "/"));
  });

  it.each([
    "navigator.userAgent",
    "userAgentData",
  ] as const)("keeps %s out of every src file", (needle) => {
    const hits = SCANNED.filter(({ text }) => text.includes(needle)).map(({ path }) => path);
    expect(
      hits,
      `${needle} appeared in src/ (${hits.join(", ")}). Platform is the closed ` +
        "material|cupertino union plus a persisted preference (PLAT-01/D-12): a web " +
        "page cannot honestly distinguish Android from iOS, so user-agent sniffing " +
        "is banned app-wide and the phase 8 real-device pass is the venue to " +
        "revisit the default. If the identifier must be discussed, do it in " +
        "prose (this file's wording) — never as the code form the guard scans for."
    ).toEqual([]);
  });

  it("writes data-platform from exactly one site: lib/platform.ts's applyPlatform", () => {
    // SCANNED, not SOURCES: the needle string below lives in this file as the
    // negative assertion itself, same sanctioned-appearance rule as above.
    const writers = SCANNED.filter(({ text }) => text.includes('setAttribute("data-platform"')).map(({ path }) => path);
    expect(
      writers,
      "data-platform is written from more than one site (or from none). " +
        "applyPlatform() in lib/platform.ts is the ONE application choke point " +
        "(the applyShape discipline): the stored value is coerced against the " +
        "closed union there before it can reach the DOM (T-07-01) — a second " +
        "writer would bypass that coercion."
    ).toEqual([join("lib", "platform.ts").replaceAll("\\", "/")]);
  });
});

// ---------------------------------------------------------------------------
// PHASE-07 sweep — the 8/16 spacing + 400/600 weight discipline, asserted at
// the source level over every phase-7 mobile surface (07-08 Task 2).
//
// Why a source sweep: the discipline is DECLARATIVE — it lives in utility
// class strings — so no behavioral assert can catch a re-introduced `gap-3`;
// only reading the source can. The needle set IS the phase-7 scale decision
// (07-UI-SPEC, Spacing Scale): 8/16 stops only, which bans the 12px stops
// (`*-3`) and the half stops (`*-1.5` / `*-2.5`), and weights 400/600 only,
// which bans font-medium (500). The banned literals appear in THIS file as
// the negative assertions themselves — their only sanctioned appearance, the
// same house pattern as the 100vh needles above (which is also why
// RunDetailSheet.dom.test.tsx is absent from the list below: its
// not.toContain("font-medium") is a needle, not a violation).
//
// Scope: file-wide for the WHOLLY-phase-7 files — everything a 07-* plan
// created or owns end to end; a banned value anywhere in them is a real
// violation. The six destination pages + the four retrofitted components are
// MIXED files: their desktop halves legitimately carry legacy 12px values
// and are NOT held to the phase-7 scale, so for those the sweep is scoped to
// the MOBILE BLOCK regions — the `function Mobile*` file-tail components and
// the `{!isDesktop && (…)` / `{wizardOpen && !isDesktop && (…)` mounts (the
// D-01 mount discipline: mobile JSX only ever mounts under those gates).
//
// D-06 fix 3 (phase 8, BINDING — 08-UI-SPEC Spacing): this mobile-regions
// scoping is the CONTRACT, not a gap to close later. The sweep deliberately
// covers ONLY the mobile surfaces — the !isDesktop mounts, the Mobile* tail
// components, the max-md:hidden blocks' mobile counterparts, and the wholly
// mobile files — because the desktop halves of the mixed files legitimately
// keep their legacy values (e.g. Dashboard.tsx:3029 `gap-3`, :3037 `px-2.5`
// inside max-md:hidden blocks, and ActivityLog.tsx:418's desktop-only chip
// twins): desktop byte-identity above 48rem WINS over this guard's letter,
// so those values are never "normalized" to make a file-wide sweep pass. A
// future normalizing sweep over desktop halves would be a desktop-change
// plan, not an edit to this guard.
//
// Regions are computed on COMMENT-STRIPPED text for two reasons: why-comments
// carry unbalanced parentheses that would close a paren-scan early, and prose
// mentions of banned literals are sanctioned (index.css's token-derivation
// comments cite `p-3` / `py-2.5` / `px-3` as the numbers tokens replace).
//
// Anti-shrink (T-07-29, guard erosion): a mixed file must still carry its
// recorded mount anchors at their recorded counts, and its swept regions must
// still measure above a recorded character floor — deleting a mount gate or
// gutting a region to dodge the needle scan fails the suite. (The plan
// expected D-01 comment strings to serve as the markers; the real mounts
// carry inconsistent or no adjacent comments, so the MOUNT ANCHOR + COUNT +
// FLOOR triple is the marker. The whys live at OffsiteTargetsSection's
// "MOBILE PRESENTATION" and ActivityLog's "MOBILE toolbar/log" comments.)
// The file list, anchors, counts and floors change only with a written
// why-comment at the change site — never by deleting a needle to make a
// failing file pass.
// ---------------------------------------------------------------------------
describe("PHASE-07/08 — the 8/16 spacing + 400/600 weight discipline holds on every phase-7/8 mobile surface", () => {
  // [needle, human label] — matched with a token boundary on both sides so
  // `px-3` never matches inside `px-3.5`-style neighbors of other scales and
  // `top-3`/`h-3`-style non-spacing utilities never match at all.
  const SWEEP_NEEDLES: { needle: RegExp; label: string }[] = [
    {
      needle: /(^|[^a-zA-Z0-9_-])(?:gap|px|py|pt|pb|pl|pr|mt|mb|ml|mr|mx|my|m|p)-3(?![a-zA-Z0-9_-])/,
      label: "12px spacing stop (-3)",
    },
    {
      needle: /(^|[^a-zA-Z0-9_-])(?:gap-1\.5|gap-2\.5|py-2\.5|px-2\.5)(?![a-zA-Z0-9_-])/,
      label: "half spacing stop (-1.5/-2.5)",
    },
    {
      needle: /(^|[^a-zA-Z0-9_-])font-medium(?![a-zA-Z0-9_-])/,
      label: "font-medium (the banned 500 weight)",
    },
  ];

  /** Comment-stripped source: prose can cite banned literals (sanctioned),
   *  and unbalanced comment parentheses would break the mount paren-scan. */
  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
      .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  }

  /** The JSX each mobile mount renders: from the gate's `(` to its matching
   *  `)` on stripped text. Overlapping regions are harmless (double-swept). */
  function mountRegions(stripped: string, anchor: string): string[] {
    const regions: string[] = [];
    let at = stripped.indexOf(anchor);
    while (at >= 0) {
      let depth = 0;
      for (let i = at + anchor.length - 1; i < stripped.length; i++) {
        const ch = stripped[i];
        if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) {
            regions.push(stripped.slice(at, i + 1));
            break;
          }
        }
      }
      at = stripped.indexOf(anchor, at + anchor.length);
    }
    return regions;
  }

  function sweepHits(label: string, text: string): string[] {
    const hits: string[] = [];
    for (const { needle, label: what } of SWEEP_NEEDLES) {
      for (const m of text.matchAll(new RegExp(needle.source, "g"))) {
        hits.push(`${label}: ${what} (matched ${JSON.stringify(m[0])})`);
      }
    }
    return hits;
  }

  // The union of the 07-* plans' files that are phase-7 END TO END — no
  // desktop half, no legacy region. Paths are relative to web/.
  const WHOLLY_PHASE7_FILES = [
    "src/lib/platform.ts",
    "src/lib/platform.test.ts",
    "src/lib/useLoadMore.ts",
    "src/lib/useLoadMore.test.ts",
    "src/lib/i18n.ts",
    "src/index.css",
    "src/main.tsx",
    "src/components/mobile/Fab.tsx",
    "src/components/mobile/Fab.dom.test.tsx",
    "src/components/mobile/ListToolbar.tsx",
    "src/components/mobile/MobileSectionLabel.tsx",
    // The carried-fix file (07-08 Task 1): wholly mobile, so its whole text
    // is held to the scale — this is what keeps the font-medium purge purged.
    "src/components/mobile/RunDetailSheet.tsx",
    "src/pages/VMs.test.tsx",
    "src/pages/Flash.desktop.dom.test.tsx",
    "src/pages/Fleet.peerCard.dom.test.tsx",
    "e2e/platform-chrome.spec.ts",
    "e2e/destination-vms-flash.spec.ts",
    "e2e/destination-config-receiver-fleet.spec.ts",
    "e2e/destination-settings.spec.ts",
    "e2e/list-ergonomics.spec.ts",
    "e2e/settings-editors.spec.ts",
    "e2e/desktop-untouched.spec.ts",
  ];

  // The wholly-PHASE-8 files (08-04 Task 2 — D-06 fix-3 sweep extension):
  // files the 08-* plans created end to end join the same wholly-swept
  // discipline. Plans 01-03 created exactly ONE non-test source file — the
  // guided-restore e2e — because the mobile step flow itself lives INSIDE
  // Recovery.tsx, a MIXED file whose geography entry was calibrated by Plan
  // 03 Task 2 (the LAST writer of Recovery.tsx) against final geography and
  // now lives in MIXED_FILES below. Recovery.mobile.dom.test.tsx is
  // a dom TEST, not a swept source file (this plan's own scope note).
  const WHOLLY_PHASE8_FILES = ["e2e/guided-restore.spec.ts"];

  const ISD_MOUNT = "{!isDesktop && (";
  const WIZARD_MOUNT = "{wizardOpen && !isDesktop && (";

  // Mixed files: mobile regions + the exact recorded geography. isdMounts /
  // wizardMounts are file-wide gate counts (the anti-shrink anchors);
  // minChars floors the TOTAL swept size. Floors sit at ~50% of the recorded
  // geography so a gutted region trips while routine edits above it do not.
  const MIXED_FILES: {
    file: string;
    tailAnchor?: RegExp; // Mobile* components run from here to EOF
    slice?: [string, string]; // [from, to) literal anchors (Dashboard)
    isdMounts: number;
    wizardMounts: number;
    minChars: number;
  }[] = [
    { file: "src/pages/VMs.tsx", tailAnchor: /function Mobile/, isdMounts: 1, wizardMounts: 0, minChars: 9000 },
    { file: "src/pages/Flash.tsx", tailAnchor: /function Mobile/, isdMounts: 1, wizardMounts: 0, minChars: 7000 },
    { file: "src/pages/Config.tsx", tailAnchor: /function Mobile/, isdMounts: 1, wizardMounts: 0, minChars: 8000 },
    { file: "src/pages/Receiver.tsx", tailAnchor: /function Mobile/, isdMounts: 1, wizardMounts: 0, minChars: 10000 },
    { file: "src/pages/Fleet.tsx", tailAnchor: /function Mobile/, isdMounts: 1, wizardMounts: 0, minChars: 7000 },
    { file: "src/components/ActivityLog.tsx", isdMounts: 2, wizardMounts: 0, minChars: 1500 },
    { file: "src/pages/settings/NotifyCard.tsx", isdMounts: 1, wizardMounts: 0, minChars: 600 },
    { file: "src/components/OffsiteTargetsSection.tsx", isdMounts: 1, wizardMounts: 0, minChars: 2400 },
    { file: "src/pages/Settings.tsx", isdMounts: 1, wizardMounts: 1, minChars: 700 },
    {
      file: "src/pages/Dashboard.tsx",
      slice: ["function MobileNextRunCard", "export function Dashboard("],
      isdMounts: 2,
      wizardMounts: 0,
      minChars: 4500,
    },
    {
      // 08-03 Task 2: Recovery.tsx's guided-restore step flow — the first
      // /function Mobile/ match anchors on the step-5 helper block
      // (MobileLogList and siblings) and runs through MobileRecoveryFlow to
      // EOF, plus the one D-01 mount in Recovery()'s return. The entry is
      // calibrated HERE, by the file's LAST writer, against FINAL geography
      // (the populated step-5 body included): the floor sits at ~half the
      // recorded ~42.7k-char swept total, so a gutted mobile block trips it
      // while routine edits above it do not.
      file: "src/pages/Recovery.tsx",
      tailAnchor: /function Mobile/,
      isdMounts: 1,
      wizardMounts: 0,
      minChars: 20000,
    },
  ];

  it("sweep list resolves: every listed wholly-swept file exists (the list rots loudly)", () => {
    const missing = [
      ...WHOLLY_PHASE7_FILES,
      ...WHOLLY_PHASE8_FILES,
      ...MIXED_FILES.map(({ file }) => file),
    ].filter((f) => !existsSync(join(WEB, f)));
    expect(
      missing,
      "a sweep file is missing from the tree. If a file moved or was " +
        "renamed, repoint its list entry deliberately (with a why-comment) — " +
        "the sweep must never pass against a stale or silent list."
    ).toEqual([]);
  });

  it("wholly-swept phase-7/8 files carry no 12px stop, half stop, or 500 weight", () => {
    const hits = [...WHOLLY_PHASE7_FILES, ...WHOLLY_PHASE8_FILES].flatMap((f) =>
      sweepHits(f, stripComments(readFileSync(join(WEB, f), "utf8"))),
    );
    expect(
      hits,
      "a wholly-phase-7 file carries a banned spacing stop or the 500 weight. " +
        "The phase-7 scale is 8/16 stops and 400/600 weights (07-UI-SPEC); a " +
        "new value means either normalizing the site to the scale or editing " +
        "this guard WITH a written why at the change site — never silently."
    ).toEqual([]);
  });

  it.each(MIXED_FILES.map(({ file }) => [file]))(
    "mixed file %s holds the scale in its mobile regions with geography intact",
    (file) => {
      const scope = MIXED_FILES.find(({ file: f }) => f === file)!;
      const stripped = stripComments(readFileSync(join(WEB, file), "utf8"));

      // Anti-shrink: the mount gates exist at their recorded counts.
      expect(
        (stripped.match(new RegExp(ISD_MOUNT.replaceAll(/[()]/g, "\\$&"), "g")) || []).length,
        `${file}: the {!isDesktop && ( mount count changed. Each gate is a ` +
          "recorded mobile mount (D-01); a removed gate shrinks the swept " +
          "region — restore it or update the guard with a why.",
      ).toBe(scope.isdMounts);
      expect(
        (stripped.match(new RegExp(WIZARD_MOUNT.replaceAll(/[()]/g, "\\$&"), "g")) || []).length,
        `${file}: the {wizardOpen && !isDesktop && ( mount count changed — ` +
          "see the isDesktop note above.",
      ).toBe(scope.wizardMounts);

      // The mobile regions: tail/slice component block + every mount body.
      const regions: string[] = [];
      if (scope.tailAnchor) {
        const at = stripped.search(scope.tailAnchor);
        expect(
          at,
          `${file}: the function Mobile tail anchor is gone — the ` +
            "mobile components this sweep guards were moved or deleted. " +
            "Re-anchor the guard deliberately or restore the components.",
        ).toBeGreaterThanOrEqual(0);
        regions.push(stripped.slice(at));
      }
      if (scope.slice) {
        const [from, to] = scope.slice;
        const start = stripped.indexOf(from);
        const end = stripped.indexOf(to);
        expect(start, `${file}: slice start anchor ${from} not found`).toBeGreaterThanOrEqual(0);
        expect(end, `${file}: slice end anchor ${to} not found`).toBeGreaterThan(start);
        regions.push(stripped.slice(start, end));
      }
      regions.push(...mountRegions(stripped, ISD_MOUNT), ...mountRegions(stripped, WIZARD_MOUNT));

      expect(
        regions.reduce((sum, r) => sum + r.length, 0),
        `${file}: the swept mobile regions measure below the recorded floor — ` +
          "a region was gutted. Restore it or re-record the floor with a why."
      ).toBeGreaterThanOrEqual(scope.minChars);

      const hits = regions.flatMap((r, i) => sweepHits(`${file} region#${i}`, r));
      expect(
        hits,
        `${file}: a banned spacing stop or the 500 weight re-entered a MOBILE ` +
          "region. The desktop half may keep legacy values (that is why this " +
          "file is region-scoped), but the mobile block holds the phase-7 " +
          "scale: normalize the site, or edit this guard with a written why."
      ).toEqual([]);
    },
  );
});
