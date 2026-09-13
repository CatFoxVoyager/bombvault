package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-webauthn/webauthn/webauthn"

	"github.com/junkerderprovinz/bombvault/internal/config"
)

// The constraint this whole feature is shaped around, pinned.
//
// WebAuthn binds a credential to a relying-party ID, which the specification
// requires to be a DOMAIN. BombVault's own Unraid template opens
// https://[IP]:3443, so the DEFAULT installation is exactly the case that
// cannot work, and the product has to say so rather than raise a browser
// prompt that fails with "NotAllowedError".
// webauthnSessionForTest is a stand-in for real session data. The ceremony
// bookkeeping below never looks inside it, so its contents are irrelevant; what
// is being tested is the handle around it.
var webauthnSessionForTest = webauthn.SessionData{Challenge: "test-challenge"}

func TestAnIPAddressCannotCarryAPasskey(t *testing.T) {
	for _, host := range []string{
		"192.168.20.63:3443", // the template's own shape
		"192.168.20.63",
		"10.0.0.1:80",
		"[fd00::1]:3443", // IPv6, brackets and all
		"[::1]:3443",     // the loopback address is still an ADDRESS
		"",
	} {
		r := httptest.NewRequest(http.MethodGet, "/api/auth/passkeys", nil)
		r.Host = host
		if _, err := rpIDFor(r); err == nil {
			t.Errorf("host %q was accepted as a relying-party id.\n"+
				"An IP address is not a domain: the browser refuses the whole exchange, so a\n"+
				"button offered here can only ever fail.", host)
		}
	}
}

// …and the addresses that CAN. localhost is the documented exception: the
// specification treats it as a secure context and browsers accept it as a
// relying-party id, which is what makes an SSH tunnel a working way to use this.
func TestAHostNameCarriesAPasskey(t *testing.T) {
	cases := map[string]string{
		"bombvault.example.com:3443": "bombvault.example.com",
		"BombVault.Example.COM":      "bombvault.example.com", // a domain is case-insensitive
		"localhost:3443":             "localhost",
		"tower.local":                "tower.local",
	}
	for host, want := range cases {
		r := httptest.NewRequest(http.MethodGet, "/api/auth/passkeys", nil)
		r.Host = host
		got, err := rpIDFor(r)
		if err != nil {
			t.Errorf("host %q was refused: %v", host, err)
			continue
		}
		if got != want {
			t.Errorf("host %q gave relying-party id %q, want %q", host, got, want)
		}
	}
}

// The refusal has to reach the screen as it was written. Every error leaving
// the API goes through scrubError, whose absolute-path regex redacts any
// slash-led token, so an example URL inside this sentence would arrive as
// "[path]" and the advice would be unusable. This package has been bitten by
// that trap three times; this is the guard for the fourth.
func TestThePasskeyRefusalSurvivesTheScrubber(t *testing.T) {
	msg := errPasskeyOrigin.Error()
	if got := scrubError(errPasskeyOrigin); got != msg {
		t.Errorf("the refusal is mangled on its way to the screen.\n  written: %s\n  arrives: %s\n"+
			"Remove the slash: the scrubber redacts any slash-led token.", msg, got)
	}
	if strings.ContainsAny(msg, "/\\") {
		t.Error("the refusal contains a slash, which the scrubber will redact")
	}
}

// The origin the library checks against has to be the one the BROWSER saw. A
// reverse proxy terminates TLS and forwards plain HTTP inwards, so the server's
// own scheme is the wrong one exactly in the deployment where passkeys work at
// all.
func TestTheOriginFollowsTheProxysScheme(t *testing.T) {
	h := &Handler{cfg: config.Config{HTTPOnly: true}}

	plain := httptest.NewRequest(http.MethodGet, "/api/auth/passkeys", nil)
	plain.Host = "bombvault.example.com"
	if got := h.originFor(plain); got != "http://bombvault.example.com" {
		t.Errorf("origin = %q, want the server's own scheme when nothing says otherwise", got)
	}

	proxied := httptest.NewRequest(http.MethodGet, "/api/auth/passkeys", nil)
	proxied.Host = "bombvault.example.com"
	proxied.Header.Set("X-Forwarded-Proto", "https")
	if got := h.originFor(proxied); got != "https://bombvault.example.com" {
		t.Errorf("origin = %q, want the scheme the browser saw.\n"+
			"Behind a proxy the server speaks plain HTTP while the browser speaks HTTPS, and the\n"+
			"origin the ceremony is checked against is the browser's.", got)
	}

	// A chain of proxies appends, and the FIRST value is the client's.
	chained := httptest.NewRequest(http.MethodGet, "/api/auth/passkeys", nil)
	chained.Host = "bombvault.example.com"
	chained.Header.Set("X-Forwarded-Proto", "https, http")
	if got := h.originFor(chained); got != "https://bombvault.example.com" {
		t.Errorf("origin = %q, want the first value of the forwarded chain", got)
	}
}

// A ceremony handle is single-use. A challenge that has been answered once must
// not be answerable again, or a captured answer could be replayed.
func TestACeremonyHandleWorksOnce(t *testing.T) {
	h := &Handler{}
	id, err := h.beginPasskeyCeremony(&webauthnSessionForTest, "bombvault.example.com")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := h.takePasskeyCeremony(id); !ok {
		t.Fatal("the handle did not work even once")
	}
	if _, ok := h.takePasskeyCeremony(id); ok {
		t.Error("the same ceremony handle was accepted twice.\n" +
			"A challenge that has been answered is spent; accepting it again is a replay.")
	}
}

// The map is reachable without a session (the LOGIN half has to be), so it
// needs a ceiling that does not depend on the caller behaving.
func TestCeremoniesAreBounded(t *testing.T) {
	h := &Handler{}
	for i := 0; i < passkeyCeremonyMax*3; i++ {
		if _, err := h.beginPasskeyCeremony(&webauthnSessionForTest, "bombvault.example.com"); err != nil {
			t.Fatal(err)
		}
	}
	h.passkeyMu.Lock()
	n := len(h.passkeyCeremonies)
	h.passkeyMu.Unlock()
	if n > passkeyCeremonyMax {
		t.Errorf("%d ceremonies are being held, the ceiling is %d.\n"+
			"This map is reachable without a session, so an unbounded one is a way to spend\n"+
			"this box's memory from outside.", n, passkeyCeremonyMax)
	}
}
