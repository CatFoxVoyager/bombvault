package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"

	"github.com/junkerderprovinz/bombvault/internal/secret"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// Passkeys: signing in with the key on a phone, a laptop or a security stick
// instead of typing a password.
//
// ---------------------------------------------------------------------------
// THE CONSTRAINT THAT SHAPES ALL OF THIS, stated once here because every
// decision below follows from it.
//
// WebAuthn binds a credential to a RELYING PARTY ID, which the specification
// requires to be a DOMAIN. An IP address is not one, and browsers refuse the
// ceremony outright on an origin whose host is a bare address. They refuse it a
// second way on a page whose certificate the browser rejects, which is what a
// self-signed certificate is.
//
// BombVault's own Unraid template points at https://[IP]:3443 with a
// certificate that covers only localhost, so on the DEFAULT installation
// passkeys cannot work at all. They work when the instance is reached through a
// real hostname with a certificate the browser accepts, which in practice means
// a reverse proxy - and that is the setup somebody who wants passkeys is
// already running, because it is also the only sane way to expose this to the
// internet.
//
// So the feature is built to say so. rpIDFor refuses with a sentence naming the
// reason rather than letting the browser fail with "NotAllowedError", the card
// explains it before anybody clicks, and a registered key records WHICH address
// it belongs to, because a key registered through the proxy is invisible over
// the IP and vice versa. A silent list that does nothing would be worse than no
// feature.
//
// SECOND RULE: a passkey never replaces the password. It is an additional way
// in, never the only one. An operator whose phone is lost, whose proxy is down
// or who reaches the box by IP that day must still be able to open their own
// backups, and a lockout here is a lockout from the one tool that recovers
// everything else.
// ---------------------------------------------------------------------------

// passkeyCeremony is one in-flight registration or login.
//
// Kept in memory rather than in the database: it is valid for a minute or two,
// it is worthless afterwards, and writing an authentication challenge to disk on
// every button press buys nothing. The consequence is that a restart cancels a
// half-finished ceremony, which costs a second click.
type passkeyCeremony struct {
	session webauthn.SessionData
	rpID    string
	expires time.Time
}

const (
	// passkeyCeremonyTTL bounds how long a started ceremony stays completable.
	// The browser prompt itself usually times out sooner; this is the backstop
	// that keeps an abandoned challenge from lingering.
	passkeyCeremonyTTL = 5 * time.Minute
	// passkeyCeremonyMax bounds the map. A ceremony is only started by a request
	// this box answered, but the LOGIN one is reachable without a session, so it
	// needs a ceiling that does not depend on the caller behaving.
	passkeyCeremonyMax = 64
)

// beginPasskeyCeremony stores session data and returns the opaque handle the
// finish call has to present. The handle is what proves the finishing request
// belongs to the ceremony this box started; it is random, single-use and
// short-lived.
func (h *Handler) beginPasskeyCeremony(s *webauthn.SessionData, rpID string) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("ceremony handle: %w", err)
	}
	id := hex.EncodeToString(raw)

	h.passkeyMu.Lock()
	defer h.passkeyMu.Unlock()
	if h.passkeyCeremonies == nil {
		h.passkeyCeremonies = map[string]passkeyCeremony{}
	}
	now := time.Now()
	for k, c := range h.passkeyCeremonies {
		if now.After(c.expires) {
			delete(h.passkeyCeremonies, k)
		}
	}
	// Still full after the sweep: drop the oldest rather than grow without
	// bound. Losing somebody else's in-flight ceremony costs one more click;
	// an unbounded map reachable without a session does not.
	for len(h.passkeyCeremonies) >= passkeyCeremonyMax {
		oldestKey, oldest := "", time.Time{}
		for k, c := range h.passkeyCeremonies {
			if oldest.IsZero() || c.expires.Before(oldest) {
				oldestKey, oldest = k, c.expires
			}
		}
		delete(h.passkeyCeremonies, oldestKey)
	}
	h.passkeyCeremonies[id] = passkeyCeremony{session: *s, rpID: rpID, expires: now.Add(passkeyCeremonyTTL)}
	return id, nil
}

// takePasskeyCeremony consumes a handle. Single-use: a challenge that has been
// answered once must not be answerable again.
func (h *Handler) takePasskeyCeremony(id string) (passkeyCeremony, bool) {
	h.passkeyMu.Lock()
	defer h.passkeyMu.Unlock()
	c, ok := h.passkeyCeremonies[id]
	if !ok {
		return passkeyCeremony{}, false
	}
	delete(h.passkeyCeremonies, id)
	if time.Now().After(c.expires) {
		return passkeyCeremony{}, false
	}
	return c, true
}

// errPasskeyOrigin is the refusal an IP-address origin gets. It carries the
// whole explanation because this is the one message most operators will meet:
// the default installation is exactly the case that cannot work.
//
// NO SLASH anywhere in it. Every error leaving the API goes through scrubError,
// whose absolute-path regex redacts any slash-led token, so an example URL in
// here would arrive mangled - the trap this package has now been bitten by
// three times.
var errPasskeyOrigin = errors.New(
	"passkeys need a host name, and this page was opened on an IP address. " +
		"The standard binds a passkey to a domain and browsers refuse the whole exchange on a bare address, " +
		"and they refuse it again on a certificate the browser does not trust. " +
		"Reach BombVault through a reverse proxy under a real name with a valid certificate, open it there, and register the key on that address")

// rpIDFor derives the relying-party id from the request, and refuses when the
// address cannot carry one.
//
// The id is the HOST of the page the operator has open, without the port. It is
// taken from the request rather than from a setting on purpose: the same box is
// commonly reachable several ways, the browser will only ever offer a key whose
// id matches the bar, and a configured value would be wrong for every address
// except the one somebody remembered to type.
func rpIDFor(r *http.Request) (string, error) {
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	host = strings.TrimSpace(strings.Trim(host, "[]"))
	if host == "" {
		return "", errPasskeyOrigin
	}
	// localhost is the documented exception: the specification treats it as a
	// secure context and browsers accept it as a relying-party id, which makes a
	// port-forwarded tunnel a working way to use this.
	if strings.EqualFold(host, "localhost") {
		return "localhost", nil
	}
	if net.ParseIP(host) != nil {
		return "", errPasskeyOrigin
	}
	return strings.ToLower(host), nil
}

// originFor rebuilds the origin the browser will report, so the library can
// check the ceremony against it rather than against a guess.
func (h *Handler) originFor(r *http.Request) string {
	scheme := "https"
	if h.cfg.HTTPOnly {
		scheme = "http"
	}
	// A proxy that terminates TLS forwards plain HTTP inwards, so the scheme the
	// BROWSER saw is the one it reports and the one that has to match. Its own
	// header is the only witness to it.
	if fp := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); fp != "" {
		if i := strings.IndexByte(fp, ','); i > 0 {
			fp = strings.TrimSpace(fp[:i])
		}
		if fp == "http" || fp == "https" {
			scheme = fp
		}
	}
	return scheme + "://" + r.Host
}

// webAuthnFor builds the library handle for THIS request's address.
func (h *Handler) webAuthnFor(r *http.Request) (*webauthn.WebAuthn, string, error) {
	rpID, err := rpIDFor(r)
	if err != nil {
		return nil, "", err
	}
	w, err := webauthn.New(&webauthn.Config{
		RPID:          rpID,
		RPDisplayName: "BombVault",
		RPOrigins:     []string{h.originFor(r)},
	})
	if err != nil {
		return nil, "", err
	}
	return w, rpID, nil
}

// passkeyUser adapts this instance to the library's one-user-account model.
//
// BombVault has a single operator and no user table, so the account is the
// INSTANCE. Its handle has to be stable (a changed handle makes every existing
// credential unusable) and must not be guessable from the outside, so it is
// derived from the APP_KEY - the one secret that already defines this instance
// and already survives a reinstall through the /config backup.
type passkeyUser struct {
	id    []byte
	name  string
	creds []webauthn.Credential
}

func (u passkeyUser) WebAuthnID() []byte                         { return u.id }
func (u passkeyUser) WebAuthnName() string                       { return u.name }
func (u passkeyUser) WebAuthnDisplayName() string                { return u.name }
func (u passkeyUser) WebAuthnCredentials() []webauthn.Credential { return u.creds }

// passkeyUserID derives the stable, unguessable account handle. Hashed rather
// than used directly so the APP_KEY itself never leaves the box inside a
// credential.
func passkeyUserID(appKey string) []byte {
	sum := sha256.Sum256([]byte("bombvault-passkey-user:" + appKey))
	return sum[:]
}

// passkeyUserFor builds the account with the credentials registered for THIS
// address. Only those: a browser offered a key whose relying-party id does not
// match the page would refuse it, so listing the others would produce a prompt
// that cannot succeed.
func (h *Handler) passkeyUserFor(rpID string) (passkeyUser, []store.Passkey, error) {
	rows, err := h.store.PasskeysForRP(rpID)
	if err != nil {
		return passkeyUser{}, nil, err
	}
	u := passkeyUser{
		id:   passkeyUserID(h.cfg.AppKey),
		name: "bombvault",
	}
	for _, p := range rows {
		u.creds = append(u.creds, webauthn.Credential{
			ID:        p.CredentialID,
			PublicKey: p.PublicKey,
			Transport: parseTransports(p.Transports),
			Flags:     webauthn.CredentialFlags{BackupEligible: p.BackedUp, BackupState: p.BackedUp},
			Authenticator: webauthn.Authenticator{
				AAGUID:    p.AAGUID,
				SignCount: p.SignCount,
			},
		})
	}
	return u, rows, nil
}

func parseTransports(s string) []protocol.AuthenticatorTransport {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]protocol.AuthenticatorTransport, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, protocol.AuthenticatorTransport(p))
		}
	}
	return out
}

func joinTransports(ts []protocol.AuthenticatorTransport) string {
	out := make([]string, 0, len(ts))
	for _, t := range ts {
		if s := strings.TrimSpace(string(t)); s != "" {
			out = append(out, s)
		}
	}
	return strings.Join(out, ",")
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

type passkeyView struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// RPID is the address this key belongs to, shown in the list because a key
	// registered through the proxy does not exist over the IP.
	RPID string `json:"rpId"`
	// UsableHere is whether this key can answer on the address the browser has
	// open right now.
	UsableHere bool   `json:"usableHere"`
	BackedUp   bool   `json:"backedUp"`
	CreatedAt  int64  `json:"createdAt"`
	LastUsedAt int64  `json:"lastUsedAt"`
	Transports string `json:"transports"`
}

func passkeyViews(rows []store.Passkey, hereRPID string) []passkeyView {
	out := make([]passkeyView, 0, len(rows))
	for _, p := range rows {
		out = append(out, passkeyView{
			ID: p.ID, Name: p.Name, RPID: p.RPID,
			UsableHere: hereRPID != "" && p.RPID == hereRPID,
			BackedUp:   p.BackedUp, CreatedAt: p.CreatedAt, LastUsedAt: p.LastUsedAt,
			Transports: p.Transports,
		})
	}
	return out
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// handlePasskeyStatus serves GET /api/auth/passkeys.
//
// Public, like GET /api/auth, because the LOGIN screen has to know whether to
// offer the button before anybody is signed in. It answers with counts and the
// reason passkeys are unavailable when they are, never with a credential.
func (h *Handler) handlePasskeyStatus(w http.ResponseWriter, r *http.Request) {
	rpID, rpErr := rpIDFor(r)
	all, err := h.store.ListPasskeys()
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	here := 0
	for _, p := range all {
		if rpID != "" && p.RPID == rpID {
			here++
		}
	}
	body := map[string]any{
		"ok": true,
		// supported says whether THIS address can carry passkeys at all.
		"supported": rpErr == nil,
		"rpId":      rpID,
		"total":     len(all),
		"here":      here,
	}
	if rpErr != nil {
		body["reason"] = rpErr.Error()
	}
	// The list itself is only for somebody signed in. Before that the login
	// screen needs the counts and nothing else.
	hash, epoch, on := h.authEnabled()
	authed := false
	if on {
		if c, cErr := r.Cookie(sessionCookieName); cErr == nil {
			authed = secret.ValidSessionToken(h.cfg.AppKey, hash, epoch, c.Value)
		}
	}
	if !on || authed {
		body["passkeys"] = passkeyViews(all, rpID)
	}
	writeJSON(w, http.StatusOK, body)
}

// handlePasskeyRegisterBegin serves POST /api/auth/passkey/register/begin.
// Behind authGate: enrolling a key is something only a signed-in operator does.
func (h *Handler) handlePasskeyRegisterBegin(w http.ResponseWriter, r *http.Request) {
	if !h.requireAuthForSecrets(w, "registering a passkey") {
		return
	}
	wa, rpID, err := h.webAuthnFor(r)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	user, _, err := h.passkeyUserFor(rpID)
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	creation, session, err := wa.BeginRegistration(
		user,
		// The credentials already registered for this address are excluded, so an
		// authenticator that is already enrolled says so in the browser's own
		// prompt instead of producing a duplicate this box then has to refuse.
		webauthn.WithExclusions(credentialDescriptors(user.creds)),
		// Resident (discoverable) keys, because the point of a passkey is signing
		// in without first saying who you are. Preferred rather than required:
		// an older security key that cannot store one still works as a second way
		// in rather than being rejected.
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			ResidentKey:      protocol.ResidentKeyRequirementPreferred,
			UserVerification: protocol.VerificationPreferred,
		}),
	)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": scrubError(err)})
		return
	}
	handle, err := h.beginPasskeyCeremony(session, rpID)
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	writeJSON(w, http.StatusOK, okEnvelope(map[string]any{
		"ceremonyId": handle,
		"options":    creation.Response,
	}))
}

func credentialDescriptors(creds []webauthn.Credential) []protocol.CredentialDescriptor {
	out := make([]protocol.CredentialDescriptor, 0, len(creds))
	for _, c := range creds {
		out = append(out, c.Descriptor())
	}
	return out
}

// handlePasskeyRegisterFinish serves POST /api/auth/passkey/register/finish.
//
// The body is {ceremonyId, name, credential}. The credential is the browser's
// own answer, handed to the library verbatim: re-encoding it here would mean
// re-implementing the parsing that validates it.
func (h *Handler) handlePasskeyRegisterFinish(w http.ResponseWriter, r *http.Request) {
	if !h.requireAuthForSecrets(w, "registering a passkey") {
		return
	}
	var body struct {
		CeremonyID string          `json:"ceremonyId"`
		Name       string          `json:"name"`
		Credential json.RawMessage `json:"credential"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	cer, ok := h.takePasskeyCeremony(body.CeremonyID)
	if !ok {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    false,
			"error": "that registration has expired, start it again",
		})
		return
	}
	wa, rpID, err := h.webAuthnFor(r)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	if rpID != cer.rpID {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    false,
			"error": "this registration was started on a different address; open the one you want the key to work on and start again",
		})
		return
	}
	user, _, err := h.passkeyUserFor(rpID)
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	parsed, err := protocol.ParseCredentialCreationResponseBytes(body.Credential)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": scrubError(err)})
		return
	}
	cred, err := wa.CreateCredential(user, cer.session, parsed)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": scrubError(err)})
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		name = "Passkey"
	}
	saved, err := h.store.AddPasskey(store.Passkey{
		Name:         name,
		CredentialID: cred.ID,
		PublicKey:    cred.PublicKey,
		AAGUID:       cred.Authenticator.AAGUID,
		SignCount:    cred.Authenticator.SignCount,
		Transports:   joinTransports(cred.Transport),
		RPID:         rpID,
		BackedUp:     cred.Flags.BackupEligible,
	})
	if errors.Is(err, store.ErrPasskeyExists) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	log.Printf("api: passkey %q registered for %s", saved.Name, rpID) //nolint:gosec // G706: the name is %q-quoted and the rp id is a host name
	writeJSON(w, http.StatusOK, okEnvelope(map[string]any{
		"passkey": passkeyViews([]store.Passkey{saved}, rpID)[0],
	}))
}

// handlePasskeyLoginBegin serves POST /api/auth/passkey/login/begin.
// Public: it is one half of signing in.
func (h *Handler) handlePasskeyLoginBegin(w http.ResponseWriter, r *http.Request) {
	if _, _, on := h.authEnabled(); !on {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "no login is set up"})
		return
	}
	wa, rpID, err := h.webAuthnFor(r)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	user, rows, err := h.passkeyUserFor(rpID)
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	if len(rows) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    false,
			"error": "no passkey is registered for this address",
		})
		return
	}
	assertion, session, err := wa.BeginLogin(user)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": scrubError(err)})
		return
	}
	handle, err := h.beginPasskeyCeremony(session, rpID)
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	writeJSON(w, http.StatusOK, okEnvelope(map[string]any{
		"ceremonyId": handle,
		"options":    assertion.Response,
	}))
}

// handlePasskeyLoginFinish serves POST /api/auth/passkey/login/finish and, on a
// valid assertion, issues the session cookie.
//
// It goes through the SAME brute-force throttle the password login uses. A
// signature cannot be guessed, so the throttle is not what stops an attack here;
// it stops this endpoint from being the cheap way around the limit that does
// protect the password.
func (h *Handler) handlePasskeyLoginFinish(w http.ResponseWriter, r *http.Request) {
	hash, epoch, on := h.authEnabled()
	if !on {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "no login is set up"})
		return
	}
	key := loginClientKey(r)
	if h.loginThrottled(key) {
		writeJSON(w, http.StatusTooManyRequests, map[string]any{
			"ok":    false,
			"error": "too many attempts, wait a moment",
		})
		return
	}
	var body struct {
		CeremonyID string          `json:"ceremonyId"`
		Credential json.RawMessage `json:"credential"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	cer, ok := h.takePasskeyCeremony(body.CeremonyID)
	if !ok {
		h.recordLoginFail(key)
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "that sign-in has expired, try again"})
		return
	}
	wa, rpID, err := h.webAuthnFor(r)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	if rpID != cer.rpID {
		h.recordLoginFail(key)
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "that sign-in was started on a different address"})
		return
	}
	user, rows, err := h.passkeyUserFor(rpID)
	if err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	parsed, err := protocol.ParseCredentialRequestResponseBytes(body.Credential)
	if err != nil {
		h.recordLoginFail(key)
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": scrubError(err)})
		return
	}
	cred, err := wa.ValidateLogin(user, cer.session, parsed)
	if err != nil {
		h.recordLoginFail(key)
		log.Printf("api: passkey sign-in refused: %v", scrubError(err))
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "that passkey was not accepted"})
		return
	}
	// A counter that did not advance when the authenticator says it keeps one is
	// the documented signal of a cloned key. Many modern authenticators report 0
	// and never move, which is why this refuses only when BOTH sides are
	// non-zero: a fixed zero is "no counter", not "no progress".
	if cred.Authenticator.CloneWarning {
		h.recordLoginFail(key)
		log.Printf("api: passkey sign-in refused: the authenticator's counter went backwards, which is how a cloned key shows")
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    false,
			"error": "that passkey was refused: its counter went backwards, which is how a copied key looks. Remove it and register a new one",
		})
		return
	}

	for _, p := range rows {
		if string(p.CredentialID) == string(cred.ID) {
			if tErr := h.store.TouchPasskey(p.ID, cred.Authenticator.SignCount, time.Now().Unix()); tErr != nil {
				log.Printf("api: passkey: recording use: %v", tErr)
			}
			log.Printf("api: passkey %q signed in", p.Name) //nolint:gosec // G706: the name is %q-quoted
			break
		}
	}

	tok := secret.NewSessionToken(h.cfg.AppKey, hash, epoch, sessionTTL)
	http.SetCookie(w, h.newSessionCookie(tok, int(sessionTTL.Seconds())))
	writeJSON(w, http.StatusOK, okEnvelope(nil))
}

// handleDeletePasskey serves DELETE /api/auth/passkeys/{id}.
func (h *Handler) handleDeletePasskey(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "no passkey id"})
		return
	}
	if err := h.store.DeletePasskey(id); err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	writeJSON(w, http.StatusOK, okEnvelope(nil))
}

// handleRenamePasskey serves PATCH /api/auth/passkeys/{id}. Body {name}.
func (h *Handler) handleRenamePasskey(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	var body struct {
		Name string `json:"name"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": "a passkey needs a name"})
		return
	}
	if err := h.store.RenamePasskey(id, name); err != nil {
		writeJSON(w, http.StatusOK, failEnvelope(err))
		return
	}
	writeJSON(w, http.StatusOK, okEnvelope(nil))
}
