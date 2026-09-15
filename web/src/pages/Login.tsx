import { useEffect, useState } from "react";
import {
  login,
  loginWithPasskey,
  passkeyStatus,
  passkeysAvailableInBrowser,
} from "../lib/api";
import { useT } from "../lib/i18n";
import { RevealInput } from "../components/RevealInput";
import { Button } from "../components/Button";
import { useReveal } from "../lib/useReveal";

interface LoginPageProps {
  /** Called after a successful login so the parent can re-check auth state. */
  onLogin: () => void;
}

// ---------------------------------------------------------------------------
// LoginPage — full-screen centered login form, shown when auth is ON + not authed.
//
// Since v8.6.0 it has a second step. The password field is submitted on its own
// first; if a second factor is armed the server answers needCode and the code
// field appears. The password is kept in state across that, so accepting the
// code does not mean typing the password again.
//
// The code field is NOT shown up front, even when GET /api/auth says a factor is
// armed. Asking for a code before the password has been accepted invites people
// to burn a 30-second window on a password they then mistype, and the round trip
// that reveals the field costs nothing.
// ---------------------------------------------------------------------------

export function LoginPage({ onLogin }: LoginPageProps) {
  const { t } = useT();
  const reveal = useReveal();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await login(password, needCode ? code : undefined);
      if (res.ok) {
        onLogin();
        return;
      }
      if (res.needCode) {
        setNeedCode(true);
        setCode("");
        // The first answer of needCode is not a failure, it is the form
        // discovering it has a second field. Only say something once the code
        // has actually been tried and rejected.
        setError(code === "" ? null : (res.error ?? t("auth.codeInvalid")));
        return;
      }
      setError(res.error ?? t("auth.invalidPassword"));
    } catch {
      setError(t("auth.loginError"));
    } finally {
      setBusy(false);
    }
  }

  // Whether to offer the passkey button at all. Three things have to be true:
  // the browser can do WebAuthn, this ADDRESS can carry a passkey (a bare IP
  // cannot, see internal/api/passkeys.go), and a key is actually registered for
  // it. Anything less and the button would open a prompt that cannot succeed,
  // which is worse than no button: it teaches people that passkeys are broken.
  const [passkeyOffer, setPasskeyOffer] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  useEffect(() => {
    if (!passkeysAvailableInBrowser()) return;
    let live = true;
    void passkeyStatus()
      .then((s) => {
        if (live) setPasskeyOffer(s.ok && s.supported === true && (s.here ?? 0) > 0);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function signInWithPasskey() {
    setPasskeyBusy(true);
    setError(null);
    try {
      const res = await loginWithPasskey();
      if (res.ok) {
        onLogin();
        return;
      }
      setError(res.error ?? t("auth.passkeySignInFailed"));
    } catch (err) {
      // A cancelled prompt lands here too. Its own message says more than any
      // sentence written in advance could.
      setError(err instanceof Error ? err.message : t("auth.passkeySignInFailed"));
    } finally {
      setPasskeyBusy(false);
    }
  }

  const submitDisabled = busy || password === "" || (needCode && code.trim() === "");

  return (
    // Mobile viewport contract (SHELL-05/07): min-h-dvh tracks the DYNAMIC
    // viewport so the page keeps filling the screen when the iOS keyboard
    // collapses the browser chrome (a static viewport unit would keep the
    // pre-keyboard height and strand the card off-screen — the
    // mobileShellSource guard suite bans both static literals in this file).
    // The safe-area paddings read the --safe-area-* custom properties from
    // index.css so the card clears the home indicator and rounded corners in
    // every orientation; they resolve to 0 on desktop.
    <div className="flex items-center justify-center min-h-dvh bg-carbon-background pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] pb-[var(--safe-area-bottom)]">
      <div className="w-full max-w-sm rounded-card bg-carbon-surface p-8 flex flex-col gap-6 shadow-lg">
        {/* Mark + title. The login screen is the one surface that carries no
            rail, so without this it is an unlabelled password box on a plain
            background: nothing on it says which instance is being unlocked, and
            on a box running several of these that is a real question.
            Two theme-specific marks, switched by the `dark:` variant exactly as
            the rail does it - the dark mark on the light surface, the light one
            on the dark surface. Decorative beside a heading that already names
            the product, so it is hidden from assistive technology rather than
            read out twice. */}
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center">
            <img
              src="/logo.svg"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-16 w-16 object-contain block dark:hidden"
            />
            <img
              src="/logo-light.svg"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-16 w-16 object-contain hidden dark:block"
            />
          </span>
          <h1 className="text-2xl font-semibold text-carbon-text text-center">
            {t("auth.loginTitle")}
          </h1>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bv-password"
              className="text-xs text-carbon-textSub font-medium"
            >
              {t("auth.passwordLabel")}
            </label>
            {/* max-md:text-base on both fields: iOS Safari zooms the viewport
                on focus for any input under a 16px effective font — the one
                place the 14px body token is overridden on narrow viewports
                (SHELL-07). Desktop rendering is unchanged. */}
            <RevealInput
              {...reveal}
              id="bv-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              wrapperClassName="w-full"
              className="rounded-control bg-carbon-surface2 text-carbon-text text-sm max-md:text-base px-3 py-2 glim-field-focus"
            />
          </div>

          {/* Second factor, once the password has been accepted. */}
          {needCode && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bv-code"
                className="text-xs text-carbon-textSub font-medium"
              >
                {t("auth.codeLabel")}
              </label>
              {/* Same 16px-effective-font rule as the password field. */}
              <input
                id="bv-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full rounded-control bg-carbon-surface2 text-carbon-text text-sm max-md:text-base px-3 py-2 tracking-[0.35em] glim-field-focus"
              />
              <p className="text-xs text-carbon-textSub">{t("auth.codeHint")}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-xs text-statusFail" role="alert">
              {error}
            </p>
          )}

          {/* Submit button */}
          <Button
            label={t("auth.signIn")}
            labelKey="auth.signIn"
            tone="accent"
            type="submit"
            disabled={submitDisabled}
            busy={busy}
            title={busy ? t("auth.signingIn") : undefined}
          />

          {/* The passkey, UNDER the password and not instead of it. The password
              is the way in that always works; the passkey is the convenient one,
              and only on an address that can carry it. Hidden entirely when it
              cannot rather than shown disabled: a disabled control on a login
              screen reads as "you are locked out". */}
          {passkeyOffer && !needCode && (
            <Button
              label={t("auth.signInWithPasskey")}
              labelKey="auth.signInWithPasskey"
              tone="neutral"
              type="button"
              onClick={() => void signInWithPasskey()}
              disabled={busy || passkeyBusy}
              busy={passkeyBusy}
            />
          )}
        </form>
      </div>
    </div>
  );
}
