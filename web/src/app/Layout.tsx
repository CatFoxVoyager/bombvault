import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { BottomNav } from "../components/mobile/BottomNav";
import { useEffect, useState, useCallback } from "react";
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
    <main id="bv-main" className="flex-1 flex flex-col overflow-y-auto p-6 min-w-0">
      {/* `flex flex-col` added here (sticky-footer page-shell fix, jdp live
          review — "die Versionsnummer soll unterhalb der untersten Card
          stehen, nicht die Cards durchfahren lassen"): `main` is the actual
          scrollable viewport (overflow-y-auto, sized to exactly the shell
          height minus its own p-6 padding via the flex-stretch above) — a
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
    <div className={`flex h-dvh overflow-hidden bg-carbon-background ${isDesktop ? "" : "flex-col"}`}>
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
