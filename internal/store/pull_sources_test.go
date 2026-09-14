package store_test

import (
	"database/sql"
	"errors"
	"strings"
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/secret"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// TestPullSourceEmptyLocationRejected pins the empty-location guard on both
// Create and Update. A source with a blank location addresses nowhere and could
// never be opened, so it is refused at the store boundary and writes nothing.
func TestPullSourceEmptyLocationRejected(t *testing.T) {
	db := store.OpenMem(t)
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	r := store.New(db)

	for _, loc := range []string{"", "   "} {
		if _, err := r.CreatePullSource(store.PullSource{Name: "Bad", Repo: loc}); !errors.Is(err, store.ErrEmptyPullRepo) {
			t.Fatalf("CreatePullSource(repo=%q) err = %v, want ErrEmptyPullRepo", loc, err)
		}
	}
	if err := r.UpdatePullSource(store.PullSource{ID: "x", Repo: ""}); !errors.Is(err, store.ErrEmptyPullRepo) {
		t.Fatalf("UpdatePullSource(repo=\"\") err = %v, want ErrEmptyPullRepo", err)
	}
	all, err := r.ListPullSources()
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 0 {
		t.Fatalf("a rejected create must write nothing, got %d rows", len(all))
	}
}

// TestPullSourceCRUD exercises Create/Get/List/Update/Delete, and above all that
// the SOURCE instance's APP_KEY round-trips as ENCRYPTED bytes.
//
// That assertion is the point of the test rather than a detail of it. A pull
// source holds a key belonging to somebody else's machine: it is the one secret
// in this app that is not ours to leak. The store must persist ciphertext
// verbatim and never see the plaintext, and only a holder of this instance's own
// key can turn it back into the 64 hex characters that were typed in.
func TestPullSourceCRUD(t *testing.T) {
	db := store.OpenMem(t)
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	r := store.New(db)

	const appKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	const foreignKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
	enc, err := secret.Encrypt(appKey, []byte(foreignKey))
	if err != nil {
		t.Fatal(err)
	}

	made, err := r.CreatePullSource(store.PullSource{
		Name:          "Tower next door",
		Repo:          "rest:http://192.168.1.9:8000/containers",
		AppKeyEnc:     enc,
		Domain:        "containers",
		Cadence:       "daily 04:00",
		LimitDownload: 2048,
		Enabled:       true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if made.ID == "" || made.CreatedAt == 0 {
		t.Fatalf("Create must assign an id and stamp a creation time, got %+v", made)
	}

	got, ok, err := r.GetPullSource(made.ID)
	if err != nil || !ok {
		t.Fatalf("GetPullSource: ok=%v err=%v", ok, err)
	}
	if got.LastPullOK.Valid {
		t.Fatalf("a source that has never been pulled must report NULL, not a verdict: %+v", got.LastPullOK)
	}
	if strings.Contains(string(got.AppKeyEnc), foreignKey) {
		t.Fatal("the foreign APP_KEY is stored in the clear.\n" +
			"It belongs to another machine, so this is the one secret in the app that is not ours to lose.")
	}
	back, err := secret.Decrypt(appKey, got.AppKeyEnc)
	if err != nil || string(back) != foreignKey {
		t.Fatalf("the stored ciphertext must decrypt back to the key that was entered: %q err=%v", back, err)
	}

	// A verdict must not be able to clobber a concurrent edit, which is why it
	// has its own writer instead of a read-modify-write of the whole row.
	if err := r.UpdatePullSourceResult(made.ID, 1700000000, sql.NullBool{Bool: true, Valid: true}, "", 7); err != nil {
		t.Fatal(err)
	}
	got, _, err = r.GetPullSource(made.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !got.LastPullOK.Valid || !got.LastPullOK.Bool || got.SnapshotsPulled != 7 || got.LastPullAt != 1700000000 {
		t.Fatalf("the verdict did not land: %+v", got)
	}
	if got.Name != "Tower next door" || got.Cadence != "daily 04:00" || got.LimitDownload != 2048 {
		t.Fatalf("writing a verdict must leave the configuration alone: %+v", got)
	}

	got.Name = "Renamed"
	got.Enabled = false
	if err := r.UpdatePullSource(got); err != nil {
		t.Fatal(err)
	}
	all, err := r.ListPullSources()
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 1 || all[0].Name != "Renamed" || all[0].Enabled {
		t.Fatalf("update did not round-trip: %+v", all)
	}

	if err := r.DeletePullSource(made.ID); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := r.GetPullSource(made.ID); ok {
		t.Fatal("the row survived its own delete")
	}
	// Deleting something that is not there is how the receiver and off-site
	// tables behave, and a caller that retries a delete must not see an error.
	if err := r.DeletePullSource(made.ID); err != nil {
		t.Fatalf("deleting a missing row must be a no-op, got %v", err)
	}
}
