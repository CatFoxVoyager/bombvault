package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

// ErrEmptyPullRepo is returned when a pull source has no repo location. A source
// with an empty location addresses nowhere and could never be opened, so it is
// rejected at the store boundary (mirrors ErrEmptyReceivedRepo).
var ErrEmptyPullRepo = errors.New("pull source location must not be empty")

// PullSource is another BombVault's repository that THIS box fetches snapshots
// out of, into its own repository, on its own schedule (#227). It is the mirror
// image of off-site replication: there this box pushes outward, here it pulls
// inward, and both run the same `restic copy` with the two ends swapped.
//
// IT IS SHAPED ON ReceivedRepo, NOT ON OffsiteTarget, and the reason is the one
// field an off-site target does not have: a FOREIGN APP_KEY. An off-site target
// is this instance's own repository under another address, so its restic
// password comes from our own key. A pull source belongs to somebody else, so
// its password is derived from THEIR key, which has to be stored encrypted at
// rest exactly as the receiver stores the sending side's.
//
// The difference against ReceivedRepo is the verb. A received repo is watched
// and never written to, by either side. A pull source is read and its snapshots
// are copied into a repository here, which makes this the only place in the app
// where a foreign repository is the SOURCE of data that lands on this disk.
type PullSource struct {
	ID   string
	Name string
	// Repo is the source instance's repository location (rest:, s3:, sftp:, b2:,
	// or a path under the host mount). `rclone:` is refused at the API boundary
	// for the same confused-deputy reason foreign.go refuses it: rclone reads its
	// remotes from OUR config file and would authenticate to a caller-chosen
	// endpoint with our secrets.
	Repo string
	// AppKeyEnc is the SOURCE instance's 64-hex APP_KEY, AES-256-GCM encrypted at
	// rest via internal/secret. The store only ever persists/returns the
	// ciphertext; only the engine decrypts it (with this instance's APP_KEY) to
	// derive the source repository's restic password. Never logged, never
	// returned in the clear, and deliberately excluded from the portable settings
	// export for the same reason received_repos is.
	AppKeyEnc []byte
	// CredsRef names a set in the encrypted cloud-credentials blob, so a remote
	// source carries ITS OWN backend credentials instead of borrowing this box's.
	CredsRef string
	// Domain is which of this box's repositories the pulled snapshots land in
	// (containers/vms/files/flash/config). Empty means every domain the source
	// holds, which is the ordinary case: somebody pulling a neighbour's box
	// usually wants all of it.
	Domain string
	// Cadence is the pull schedule (same grammar as the off-site schedules).
	// 'off' = never on a schedule, only when somebody presses the button.
	Cadence string
	// LimitDownload and LimitUpload cap restic's transfer bandwidth in KiB/s.
	// Download is the one that matters here; upload is kept for symmetry because
	// a copy still writes to the destination.
	LimitDownload int
	LimitUpload   int
	// LastPullAt is the Unix time of the last pull attempt (0 = never pulled).
	LastPullAt int64
	// LastPullOK is the last pull's verdict. Valid=false means never pulled yet
	// (the column is nullable).
	LastPullOK sql.NullBool
	// LastPullError is the last pull's scrubbed error ('' on success/never).
	LastPullError string
	// SnapshotsPulled is how many snapshots the last successful pull copied.
	SnapshotsPulled int
	Enabled         bool
	CreatedAt       int64
	SortOrder       int
}

const pullSourceCols = `id, name, repo, app_key_enc, creds_ref, domain, cadence,
	limit_download, limit_upload, last_pull_at, last_pull_ok, last_pull_error,
	snapshots_pulled, enabled, created_at, sort_order`

// CreatePullSource inserts a new pull source. An empty ID is assigned via
// newID(); CreatedAt is stamped now when 0. Returns the stored row. The repo
// location must not be empty.
func (r *Repo) CreatePullSource(ps PullSource) (PullSource, error) {
	if strings.TrimSpace(ps.Repo) == "" {
		return PullSource{}, ErrEmptyPullRepo
	}
	if ps.ID == "" {
		ps.ID = newID()
	}
	if ps.CreatedAt == 0 {
		ps.CreatedAt = time.Now().Unix()
	}
	if ps.AppKeyEnc == nil {
		ps.AppKeyEnc = []byte{} // NOT NULL blob: bind an empty blob, never SQL NULL
	}
	_, err := r.db.Exec(`
		INSERT INTO pull_sources (`+pullSourceCols+`)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ps.ID, ps.Name, ps.Repo, ps.AppKeyEnc, ps.CredsRef, ps.Domain, ps.Cadence,
		ps.LimitDownload, ps.LimitUpload, ps.LastPullAt, nullBool(ps.LastPullOK), ps.LastPullError,
		ps.SnapshotsPulled, boolInt(ps.Enabled), ps.CreatedAt, ps.SortOrder,
	)
	if err != nil {
		return PullSource{}, fmt.Errorf("CreatePullSource: %w", err)
	}
	return ps, nil
}

// UpdatePullSource updates the pull source identified by ps.ID in place. The repo
// location must not be empty. Updating a missing id affects no rows and is not an
// error (mirrors the offsite/receiver conventions).
func (r *Repo) UpdatePullSource(ps PullSource) error {
	if strings.TrimSpace(ps.Repo) == "" {
		return ErrEmptyPullRepo
	}
	if ps.AppKeyEnc == nil {
		ps.AppKeyEnc = []byte{} // NOT NULL blob: bind an empty blob, never SQL NULL
	}
	_, err := r.db.Exec(`
		UPDATE pull_sources SET
		  name             = ?,
		  repo             = ?,
		  app_key_enc      = ?,
		  creds_ref        = ?,
		  domain           = ?,
		  cadence          = ?,
		  limit_download   = ?,
		  limit_upload     = ?,
		  last_pull_at     = ?,
		  last_pull_ok     = ?,
		  last_pull_error  = ?,
		  snapshots_pulled = ?,
		  enabled          = ?,
		  sort_order       = ?
		WHERE id = ?`,
		ps.Name, ps.Repo, ps.AppKeyEnc, ps.CredsRef, ps.Domain, ps.Cadence,
		ps.LimitDownload, ps.LimitUpload, ps.LastPullAt, nullBool(ps.LastPullOK), ps.LastPullError,
		ps.SnapshotsPulled, boolInt(ps.Enabled), ps.SortOrder, ps.ID,
	)
	if err != nil {
		return fmt.Errorf("UpdatePullSource: %w", err)
	}
	return nil
}

// UpdatePullSourceResult writes ONLY the last-pull columns for the source with
// the given id, leaving name/repo/app_key_enc/settings untouched. A scheduled
// pull and the run-now endpoint use it to persist a verdict without a
// read-modify-write of the whole row, which could clobber a concurrent edit.
// Updating a missing id affects no rows and is not an error.
func (r *Repo) UpdatePullSourceResult(id string, at int64, ok sql.NullBool, pullErr string, snapshots int) error {
	_, err := r.db.Exec(`
		UPDATE pull_sources SET
		  last_pull_at     = ?,
		  last_pull_ok     = ?,
		  last_pull_error  = ?,
		  snapshots_pulled = ?
		WHERE id = ?`,
		at, nullBool(ok), pullErr, snapshots, id,
	)
	if err != nil {
		return fmt.Errorf("UpdatePullSourceResult: %w", err)
	}
	return nil
}

// ListPullSources returns all pull sources ordered by sort_order then created_at
// (a stable display order).
func (r *Repo) ListPullSources() ([]PullSource, error) {
	rows, err := r.db.Query(`SELECT ` + pullSourceCols + ` FROM pull_sources ORDER BY sort_order, created_at`)
	if err != nil {
		return nil, fmt.Errorf("ListPullSources: %w", err)
	}
	defer rows.Close() //nolint:errcheck // rows.Close on a completed query is always nil for SQLite

	var out []PullSource
	for rows.Next() {
		ps, err := scanPullSource(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, ps)
	}
	return out, rows.Err()
}

// GetPullSource returns the pull source with the given id. The bool is false
// (with a zero PullSource) when no such row exists.
func (r *Repo) GetPullSource(id string) (PullSource, bool, error) {
	row := r.db.QueryRow(`SELECT `+pullSourceCols+` FROM pull_sources WHERE id = ?`, id)
	ps, err := scanPullSource(row)
	if errors.Is(err, sql.ErrNoRows) {
		return PullSource{}, false, nil
	}
	if err != nil {
		return PullSource{}, false, err
	}
	return ps, true, nil
}

// DeletePullSource removes the pull source with the given id. It is a no-op (no
// error) if the row does not exist. It never touches either repository: the
// source is somebody else's, and whatever was already pulled belongs to this
// box's own repository and stays there.
func (r *Repo) DeletePullSource(id string) error {
	if _, err := r.db.Exec(`DELETE FROM pull_sources WHERE id = ?`, id); err != nil {
		return fmt.Errorf("DeletePullSource: %w", err)
	}
	return nil
}

func scanPullSource(s scanner) (PullSource, error) {
	var ps PullSource
	var enabled int
	err := s.Scan(
		&ps.ID, &ps.Name, &ps.Repo, &ps.AppKeyEnc, &ps.CredsRef, &ps.Domain, &ps.Cadence,
		&ps.LimitDownload, &ps.LimitUpload, &ps.LastPullAt, &ps.LastPullOK, &ps.LastPullError,
		&ps.SnapshotsPulled, &enabled, &ps.CreatedAt, &ps.SortOrder,
	)
	if err != nil {
		return PullSource{}, fmt.Errorf("scanPullSource: %w", err)
	}
	ps.Enabled = enabled != 0
	return ps, nil
}
