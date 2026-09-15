package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Passkey is one registered WebAuthn credential (#passkeys): a private key held
// by the operator's phone, laptop or security key, of which this box stores only
// the public half.
//
// WHY THE RELYING-PARTY ID IS A COLUMN. A passkey is bound to the domain it was
// created for, and the browser will not even offer one whose RP ID does not
// match the page. So the SAME box reached two ways holds two different sets:
// register through bombvault.example.com and the credential simply does not
// exist at https://192.168.20.63:3443. Storing the RP ID means the interface can
// say which address a key belongs to instead of showing a list that silently
// does nothing, and the login ceremony can offer only the keys that can actually
// answer for the address in the browser's bar.
//
// The credential id and the public key are NOT secrets: the public key verifies
// a signature and the credential id names which key made it. Nothing here can
// authenticate anybody on its own, which is the whole point of the scheme, so
// unlike the fleet token these columns are stored in the clear.
type Passkey struct {
	ID   string
	Name string
	// CredentialID is the authenticator's own handle for the key, raw bytes.
	// Unique: it is what a login answer is looked up by.
	CredentialID []byte
	// PublicKey is the COSE-encoded public half.
	PublicKey []byte
	// AAGUID identifies the authenticator MODEL (a YubiKey 5, iCloud Keychain,
	// Windows Hello). Stored so the list can say what a key IS rather than only
	// what it was named.
	AAGUID []byte
	// SignCount is the authenticator's own counter, updated on every successful
	// login. A counter that goes BACKWARDS is the documented signal of a cloned
	// authenticator; many modern ones report 0 always and are exempt.
	SignCount uint32
	// Transports is the comma-joined hint list the authenticator reported
	// ("internal", "usb", "hybrid"), passed back at login so the browser knows
	// which prompt to raise.
	Transports string
	// RPID is the domain this credential is bound to. See the type comment.
	RPID string
	// BackedUp reports whether the authenticator says the key is synced to a
	// cloud keychain. A key that is NOT backed up dies with the device, which is
	// worth telling somebody who has only one.
	BackedUp   bool
	CreatedAt  int64
	LastUsedAt int64
}

// The column list, not a credential: gosec's G101 matches on the words rather
// than on what they are. Nothing secret is stored in this table at all, which is
// the point of public-key authentication.
const passkeyCols = `id, name, credential_id, public_key, aaguid, sign_count, transports, rp_id, backed_up, created_at, last_used_at` //nolint:gosec // G101: a SQL column list, and none of these columns holds a secret

type rowScanner interface{ Scan(dest ...any) error }

func scanPasskey(s rowScanner) (Passkey, error) {
	var p Passkey
	err := s.Scan(&p.ID, &p.Name, &p.CredentialID, &p.PublicKey, &p.AAGUID,
		&p.SignCount, &p.Transports, &p.RPID, &p.BackedUp, &p.CreatedAt, &p.LastUsedAt)
	if err != nil {
		return Passkey{}, err
	}
	return p, nil
}

// ListPasskeys returns every registered credential, newest last.
func (r *Repo) ListPasskeys() ([]Passkey, error) {
	rows, err := r.db.Query(`SELECT ` + passkeyCols + ` FROM passkeys ORDER BY created_at`)
	if err != nil {
		return nil, fmt.Errorf("ListPasskeys: %w", err)
	}
	defer rows.Close() //nolint:errcheck // rows.Close on a completed query is always nil for SQLite

	var out []Passkey
	for rows.Next() {
		p, sErr := scanPasskey(rows)
		if sErr != nil {
			return nil, fmt.Errorf("ListPasskeys: %w", sErr)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// PasskeysForRP returns the credentials bound to one relying-party id, which is
// the only set a login at that address can use. See the Passkey type comment.
func (r *Repo) PasskeysForRP(rpID string) ([]Passkey, error) {
	all, err := r.ListPasskeys()
	if err != nil {
		return nil, err
	}
	out := make([]Passkey, 0, len(all))
	for _, p := range all {
		if p.RPID == rpID {
			out = append(out, p)
		}
	}
	return out, nil
}

// PasskeyByCredentialID finds the credential an authenticator's answer names.
// The bool is false (with a zero Passkey) when no such credential is registered.
func (r *Repo) PasskeyByCredentialID(credID []byte) (Passkey, bool, error) {
	row := r.db.QueryRow(`SELECT `+passkeyCols+` FROM passkeys WHERE credential_id = ?`, credID)
	p, err := scanPasskey(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Passkey{}, false, nil
	}
	if err != nil {
		return Passkey{}, false, fmt.Errorf("PasskeyByCredentialID: %w", err)
	}
	return p, true, nil
}

// ErrPasskeyExists is returned when the same authenticator is registered twice.
// It is not an error condition so much as an answer: the key is already here.
var ErrPasskeyExists = errors.New("this passkey is already registered")

// AddPasskey stores a freshly registered credential and returns it with its id
// and timestamp filled in.
func (r *Repo) AddPasskey(p Passkey) (Passkey, error) {
	if len(p.CredentialID) == 0 || len(p.PublicKey) == 0 {
		return Passkey{}, errors.New("AddPasskey: a credential needs an id and a public key")
	}
	if p.ID == "" {
		p.ID = newID()
	}
	if p.CreatedAt == 0 {
		p.CreatedAt = time.Now().Unix()
	}
	// A nil slice reaches SQLite as NULL, which the column refuses. An
	// authenticator that reports no AAGUID (some security keys do not) is a
	// normal case, not an error, so it is stored as empty rather than made every
	// caller's problem to remember.
	if p.AAGUID == nil {
		p.AAGUID = []byte{}
	}
	_, err := r.db.Exec(`INSERT INTO passkeys (`+passkeyCols+`)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.Name, p.CredentialID, p.PublicKey, p.AAGUID,
		p.SignCount, p.Transports, p.RPID, p.BackedUp, p.CreatedAt, p.LastUsedAt)
	if err != nil {
		// The UNIQUE index on credential_id is the guard: registering the same
		// authenticator twice would leave two rows answering for one key, and the
		// sign-counter check would then compare against whichever was found first.
		if existing, ok, gErr := r.PasskeyByCredentialID(p.CredentialID); gErr == nil && ok {
			_ = existing
			return Passkey{}, ErrPasskeyExists
		}
		return Passkey{}, fmt.Errorf("AddPasskey: %w", err)
	}
	return p, nil
}

// TouchPasskey records a successful login: the authenticator's new sign counter
// and when it was last used.
func (r *Repo) TouchPasskey(id string, signCount uint32, at int64) error {
	if _, err := r.db.Exec(`UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE id = ?`, signCount, at, id); err != nil {
		return fmt.Errorf("TouchPasskey: %w", err)
	}
	return nil
}

// RenamePasskey changes a credential's label. The name is the operator's own
// text and means nothing to the protocol.
func (r *Repo) RenamePasskey(id, name string) error {
	res, err := r.db.Exec(`UPDATE passkeys SET name = ? WHERE id = ?`, name, id)
	if err != nil {
		return fmt.Errorf("RenamePasskey: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("RenamePasskey: no passkey %q", id)
	}
	return nil
}

// DeletePasskey removes a credential. Deleting one that is not there is not an
// error: the caller wanted it gone and it is gone.
func (r *Repo) DeletePasskey(id string) error {
	if _, err := r.db.Exec(`DELETE FROM passkeys WHERE id = ?`, id); err != nil {
		return fmt.Errorf("DeletePasskey: %w", err)
	}
	return nil
}
