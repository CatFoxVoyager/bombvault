import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { BottomNav } from "../components/mobile/BottomNav";
import { useEffect, useRef, useState, useCallback } from "react";
import { getSettings, getAuth, getHealth, type Settings } from "../lib/api";
import { useIsDesktop } from "../lib/useMediaQuery";
import { LoginPage } from "../pages/Login";
import { WhatsNewDialog } from "../components/WhatsNewDialog";
import { sync as syncDisplayPrefs } from "../lib/displayPrefs";

// Per-browser record of the last BombVault version this browser saw. When the
// running version differs, the "What's new" dialog (#48) is shown once.
const LAST_SEEN_VERSION_KEY = "bombvault.lastSeenVersion";

// releaseTag reduces a build version to its GitHub release tag. :latest builds
// carry SemVer build metadata (e.g. "v5.0.0+main.fcc0544", issue #22); both the
// release-notes lookup and the seen-version comparison want the plain tag
// "v5.0.0" — otherwise the dialog fetches a tag that doesn't exist (404) and the
// changing short SHA re-nags on every :latest rebuild (issue #48). Returns null
// for "dev" / "0.0.0" / anything without an x.y.z core, so those never nag.
function releaseTag(version: string): string | null {
  const m = version.match(/\d+\.\d+\.\d+/);
  if (!m || m[0] === "0.0.0") return null;
  return `v${m[0]}`;
}

// Auth probe state: null = not yet fetched, false = auth off or authed,
// true = auth on AND not authed (show login).
type AuthGateState = "loading" | "pass" | "blocked";

export function Layout() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [authGate, setAuthGate] = useState<AuthGateState>("loading");
  // Whether a login password is set at all. Separate from authGate, which only
  // answers "may this browser in": the sidebar needs a sign-out row exactly when
  // there is something to sign out OF, and on an instance with no password
  // there is not.
  const [authEnabled, setAuthEnabled] = useState(false);
  // The version to show the "What's new" dialog for (null = don't show).
  const [whatsNewVersion, setWhatsNewVersion] = useState<string | null>(null);
  const location = useLocation();
  // THE ONE chrome switch (phase 5): at/above Tailwind's md breakpoint the
  // desktop shell renders exactly as it always has; below it the mobile shell
  // renders in its place. The breakpoint literal lives only in
  // lib/useMediaQuery.ts, and this hook call is its only consumer — a second
  // JS breakpoint anywhere else would let the two chrome systems disagree for
  // the 1px window where their answers differ.
  const isDesktop = useIsDesktop();

  // Tap-on-active (SHELL-02): tapping the ALREADY-active destination scrolls
  // the main scroller back to the top instead of navigating. The scroller is
  // THIS component's <main id="bv-main"> below, so the mechanism lives here
  // and the chrome surfaces receive it as a prop — they never query the DOM
  // for the scroller themselves. `?.` guards the guarded: the element exists
  // in every state this can be called from, but a callback that throws because
  // of a render-order surprise is worse than a no-op.
  const scrollMainToTop = useCallback(() => {
    document.getElementById("bv-main")?.scrollTo({ top: 0 });
  }, []);

  // Ref on the shell root: the keyboard mechanism's focus listeners attach
  // HERE (not document-wide), so they exist only while a shell is rendered.
  const shellRef = useRef<HTMLDivElement>(null);

  // THE keyboard mechanism (SHELL-05/06) — ONE listener set at Layout level,
  // the locked decision: a per-component listener would multiply with every
  // new input-bearing page and drift exactly the way duplicated logic does.
  //
  // Why it exists at all: plan 04's `interactive-widget=resizes-content`
  // viewport meta makes the LAYOUT viewport shrink when the Android keyboard
  // opens, and the h-dvh root tracks that shrinkage — but a focused field can
  // still end up ABOVE the shrunken scroller's visible area if it sat below
  // the fold before the keyboard opened. This mechanism guarantees the field
  // the user is typing into stays visible: when the visual viewport resizes
  // while a text field inside the shell holds focus, that field is scrolled
  // back into view within the bv-main scroller (block "nearest" — never a
  // jump, only the minimal scroll that reveals it), deferred to the next
  // frame so the resize has settled and the browser's own scroll anchoring
  // has had its pass first.
  //
  // The mechanism only ever SCROLLS (no layout mutation, no focus stealing —
  // T-05-11, the DoS-class boundary is availability, and scrolling is the
  // gentlest possible response). The visualViewport presence guard is the
  // jsdom discipline (lib/testSetup/matchMedia.ts): environments without the
  // API — jsdom, old browsers — no-op the whole mechanism.
  //
  // Attachment discipline: active ONLY on the mobile branch (desktop never
  // pays the cost, and a desktop resize is a window resize the browser
  // already handles), and only while the shell actually renders — hence the
  // authGate dependency, because blocked/loading render no shell root at all.
  // Every listener added here is removed in the cleanup, so a branch switch
  // or unmount tears the whole set down (asserted by mobileShellSource.test).
  useEffect(() => {
    if (isDesktop || authGate !== "pass") return;
    const root = shellRef.current;
    if (!root) return;
    // The field currently holding focus, or null. focusout carries
    // relatedTarget (where focus is GOING), so a hop between two fields
    // never blips the tracking through null.
    let focusedField: HTMLElement | null = null;
    const isTextField = (el: EventTarget | null): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === "TEXTAREA") return true;
      if (el.tagName === "INPUT") {
        // Buttons and pickers open no keyboard; tracking them would scroll
        // on pure UI clicks.
        const type = (el as HTMLInputElement).type;
        return type !== "checkbox" && type !== "radio" && type !== "button" && type !== "submit" && type !== "file";
      }
      return false;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target)) focusedField = e.target;
    };
    const onFocusOut = (e: FocusEvent) => {
      if (isTextField(e.relatedTarget)) return;
      focusedField = null;
    };
    // The guard IS the contract: without visualViewport there is no resize
    // signal to listen to, and synthesizing one (polling innerHeight) is the
    // kind of cleverness that fires spuriously on desktop-browser chrome.
    if (typeof window === "undefined" || typeof window.visualViewport === "undefined") return;
    const viewport = window.visualViewport;
    // TS's lib types keep `| null` after the typeof guard, and some engines
    // report the property as null rather than absent — the bail-out covers
    // both shapes of "no visual viewport here".
    if (!viewport) return;
    const onViewportResize = () => {
      if (!focusedField) return;
      // Next frame: the resize event lands before the layout viewport has
      // settled; scrolling in the same tick measures a stale box.
      requestAnimationFrame(() => {
        focusedField?.scrollIntoView({ block: "nearest" });
      });
    };
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    viewport.addEventListener("resize", onViewportResize);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      viewport.removeEventListener("resize", onViewportResize);
    };
  }, [isDesktop, authGate]);

  // Check auth state; used on mount and after a successful login.
  const checkAuth = useCallback(() => {
    getAuth()
      .then((res) => {
        setAuthEnabled(res.enabled);
        if (res.enabled && !res.authed) {
          setAuthGate("blocked");
        } else {
          setAuthGate("pass");
        }
      })
      .catch(() => {
        // If the auth check itself fails (network error, server down) treat as
        // pass so the app doesn't get stuck in a permanent login screen.
        setAuthGate("pass");
      });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load settings to drive the chrome's destination lists (desktop sidebar and
  // mobile bar/sheet alike — both read the ONE registry through this state).
  const loadSettings = useCallback(() => {
    getSettings()
      .then((res) => {
        if (res.ok) setSettings(res.settings);
      })
      .catch(() => {
        // Non-fatal: chrome simply won't reveal VMs/Flash tabs. The mobile
        // surfaces inherit exactly this degradation (UI-SPEC: the chrome
        // performs no fetches; settings stays non-fatal here).
      });
  }, []);

  // Initial load once auth is cleared.
  useEffect(() => {
    if (authGate !== "pass") return;
    loadSettings();
  }, [authGate, loadSettings]);

  // The look, once auth is cleared — and this is the whole of issue #191 on an
  // instance with a password set.
  //
  // main.tsx calls sync() as the page boots, which is right for an instance
  // with no password and for a session that is already valid. On a PASSWORD-
  // PROTECTED instance whose cookie is gone, that call lands on the login
  // screen: /api/display-prefs is not in the auth gate's public list, so it
  // answers 401, sync() sees a non-ok response and returns. Signing in then
  // flips this state and renders the app WITHOUT reloading the page, so nothing
  // ever asked again. The server had every setting the whole time and the
  // browser never received one.
  //
  // That is why clearing site data reset everything for the reporter three
  // times over: clearing cookies signs you out, and signing back in was the
  // step that skipped the reconcile. It is also why it never reproduced here
  // until an instance with a password was tried, and why the two earlier fixes,
  // both real bugs, changed nothing for him: neither was on a path his browser
  // reached.
  //
  // Running for every "pass" is deliberate rather than only after a login: it
  // costs one GET, it is idempotent, and a state machine that has to know WHY
  // it opened is the kind of thing that quietly stops being true.
  useEffect(() => {
    if (authGate !== "pass") return;
    void syncDisplayPrefs();
  }, [authGate]);

  // Live-refresh when settings change elsewhere (e.g. enabling a domain on the
  // Settings page) so a newly-enabled tab appears immediately — no page reload.
  useEffect(() => {
    const onChange = () => loadSettings();
    window.addEventListener("bv:settings-changed", onChange);
    return () => window.removeEventListener("bv:settings-changed", onChange);
  }, [loadSettings]);

  // "What's new" detection (#48): once past the auth gate, compare the running
  // version against the last one this browser saw. Show the dialog when it
  // differs from a previously stored value; on a brand-new browser just record
  // the version silently (don't nag a first-time user). "dev"/unknown builds are
  // ignored. lastSeenVersion is updated the moment we decide to show it, so a
  // new version can never re-nag on the next mount.
  useEffect(() => {
    if (authGate !== "pass") return;
    let active = true;
    getHealth()
      .then((h) => {
        if (!active) return;
        // Compare + store the plain release tag, not the raw build string, so
        // the dialog looks up an existing GitHub tag and :latest's changing
        // short SHA doesn't re-nag on every rebuild (issue #48).
        const tag = h.version ? releaseTag(h.version) : null;
        if (!tag) return;
        let last: string | null;
        try {
          last = localStorage.getItem(LAST_SEEN_VERSION_KEY);
        } catch {
          /* localStorage unavailable — skip the dialog entirely */
          return;
        }
        if (last === null) {
          // First ever open on this browser: remember it, don't show the dialog.
          try {
            localStorage.setItem(LAST_SEEN_VERSION_KEY, tag);
          } catch {
            /* ignore */
          }
          return;
        }
        if (last !== tag) {
          try {
            localStorage.setItem(LAST_SEEN_VERSION_KEY, tag);
          } catch {
            /* ignore */
          }
          setWhatsNewVersion(tag);
        }
      })
      .catch(() => {
        /* version is best-effort; no dialog on a failed health probe */
      });
    return () => {
      active = false;
    };
  }, [authGate]);

  // While loading the auth state show nothing (avoids flash of app content).
  if (authGate === "loading") {
    return null;
  }

  // Auth is ON and not authenticated — show the login screen. This branch
  // returns BEFORE the shell root below, which is why login never renders any
  // chrome (no Sidebar, no bottom bar): the guarantee is structural, not CSS
  // (SHELL-07).
  if (authGate === "blocked") {
    return <LoginPage onLogin={checkAuth} />;
  }

  // The scroller — identical in both chrome branches on purpose: per-page
  // content (the Outlet subtree) must never know which chrome is mounted
  // around it, so `main` keeps the exact class contract it has always had and
  // gains only the `bv-main` id, the stable scroll target both chrome surfaces
  // address (tap-on-active). Carrying the id in BOTH branches is the point:
  // a page cannot tell, and a resize across the breakpoint re-attaches to the
  // same id either way.
  const scroller = (
    <main id="bv-main" className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 min-w-0">
      {/* Padding shrinks to p-4 BELOW the md breakpoint only (plan 06-02
          Task 3): the desktop 24px gutter is half a 360px phone's width
          wasted on air around the same Cards, so narrow viewports get 16px
          and every viewport at/above Tailwind's md (48rem — the ONE
          breakpoint, useMediaQuery's DESKTOP_QUERY) keeps the exact p-6 the
          desktop shell has always rendered. Byte-identical desktop is the
          D-07/06-02 hard guarantee; this is the mobile-only half of that
          swap. */}
      {/* `flex flex-col` added here (sticky-footer page-shell fix, jdp live
          review — "die Versionsnummer soll unterhalb der untersten Card
          stehen, nicht die Cards durchfahren lassen"): `main` is the actual
          scrollable viewport (overflow-y-auto, sized to exactly the shell
          height minus its own padding — p-4 below md, p-6 at/above — via the
          flex-stretch above) — a
          page that wants its own footer to sit flush with the BOTTOM of this
          box when its content is short, while still scrolling normally
          underneath it when content is tall, needs `main`'s direct child to
          become a flex item it can measure/fill against. Harmless for every
          OTHER route: a page that doesn't opt into filling that height (see
          `glim-page-enter` below) just renders at its own natural height with
          invisible blank flex space below it — no visible change. */}
      {/* `flex-1 flex flex-col` added (same fix as above): makes this
          per-route wrapper fill `main`'s available height (a definite size,
          since it's now a flex item of a sized flex column) AND pass a flex
          column context down to whichever page Outlet renders — Settings.tsx
          is the one page that currently uses this to push its own
          AboutFooter to the bottom of the column instead of leaving it
          fixed to the viewport (see AboutFooter's own header comment for
          the full before/after). Every other page ignores the extra
          height exactly as described above. */}
      <div key={location.pathname} className="glim-page-enter flex-1 flex flex-col">
        <Outlet />
      </div>
    </main>
  );

  // The shell root. `h-dvh` (SHELL-05) tracks the visual viewport as mobile
  // browser chrome collapses/expands — the static screen-height class it
  // replaced kept the LARGEST viewport height and stranded bottom-docked
  // content under expanded browser chrome. On desktop dvh equals the viewport
  // height, so the desktop shell renders unchanged. The flex DIRECTION is the
  // chrome switch's other half: desktop is the historical row (rail | main);
  // mobile stacks the scroller over its normal-flow bottom bar (SHELL-02 —
  // the bar is a flex SIBLING of `main`, never a fixed overlay, so the
  // browser reserves its height and the scroller ends above it by
  // construction).
  return (
    <div ref={shellRef} className={`flex h-dvh overflow-hidden bg-carbon-background ${isDesktop ? "" : "flex-col"}`}>
      {/* THE ONE CHROME SWITCH — exactly one chrome surface renders at a time.
          The desktop branch is today's tree verbatim (same Sidebar, same
          scroller, same classes); the mobile branch is the same scroller with
          the bottom bar as its flex sibling BELOW it. The hidden surface is
          NOT RENDERED at all, never CSS-hidden: a display:none Sidebar would
          still run its subscriptions, dialogs and label engine below the
          breakpoint. What'sNewDialog renders outside the switch — it is a
          fixed-position dialog and belongs to both shells. */}
      {isDesktop ? (
        <>
          <Sidebar settings={settings} authEnabled={authEnabled} />
          {scroller}
        </>
      ) : (
        <>
          {scroller}
          <BottomNav
            settings={settings}
            authEnabled={authEnabled}
            scrollMainToTop={scrollMainToTop}
          />
        </>
      )}
      {whatsNewVersion && (
        <WhatsNewDialog version={whatsNewVersion} onClose={() => setWhatsNewVersion(null)} />
      )}
    </div>
  );
}
