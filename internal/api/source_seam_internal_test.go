package api

import (
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/store"
)

// Call sites use these helpers instead of comparing against the literal
// "offsite", so "offsite:<id>" works everywhere.
func TestOffsiteSourceParsing(t *testing.T) {
	cases := []struct {
		source    string
		isOffsite bool
		id        string
	}{
		{"", false, ""},
		{"local", false, ""},
		{"offsite", true, ""},
		{"offsite:abc123", true, "abc123"},
		{"offsite:", true, ""},
		{"offsiteX", false, ""}, // no colon: not the prefixed form
		{"offsite:deadbeef", true, "deadbeef"},
	}
	for _, c := range cases {
		if got := isOffsiteSource(c.source); got != c.isOffsite {
			t.Errorf("isOffsiteSource(%q) = %v, want %v", c.source, got, c.isOffsite)
		}
		if got := offsiteTargetIDFromSource(c.source); got != c.id {
			t.Errorf("offsiteTargetIDFromSource(%q) = %q, want %q", c.source, got, c.id)
		}
	}

	// validOffsiteTargetID accepts a lowercase hex token like store.newID makes
	// and rejects empty, over-long and non-hex input.
	idOK := []string{"a", "deadbeef", "0123456789abcdef0123456789abcdef"}
	idBad := []string{"", "ABC123", "xyz", "dead-beef", "g", string(make([]byte, 65))}
	for _, id := range idOK {
		if !validOffsiteTargetID(id) {
			t.Errorf("validOffsiteTargetID(%q) = false, want true", id)
		}
	}
	for _, id := range idBad {
		if validOffsiteTargetID(id) {
			t.Errorf("validOffsiteTargetID(%q) = true, want false", id)
		}
	}
}

// A malformed off-site id falls back to bare "offsite", the primary target.
func TestNormalizeSource(t *testing.T) {
	cases := []struct{ raw, want string }{
		{"", "local"},
		{"local", "local"},
		{"whatever", "local"},
		{"offsite", "offsite"},
		{"offsite:0123456789abcdef0123456789abcdef", "offsite:0123456789abcdef0123456789abcdef"},
		{"offsite:", "offsite"},
		{"offsite:BAD!!", "offsite"},
		{"offsite:../etc", "offsite"},
		{"offsite:deadbeef", "offsite:deadbeef"},
	}
	for _, c := range cases {
		if got := normalizeSource(c.raw); got != c.want {
			t.Errorf("normalizeSource(%q) = %q, want %q", c.raw, got, c.want)
		}
	}
}

// newSourceSeamStore returns a migrated in-memory store.
func newSourceSeamStore(t *testing.T) *store.Repo {
	t.Helper()
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open mem store: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := store.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return store.New(db)
}

// Without target rows the resolver builds a target from the settings, so an
// install that was never backfilled still resolves.
func TestOffsiteTargetForSource(t *testing.T) {
	st := newSourceSeamStore(t)
	s := &Service{store: st}

	// No rows, only the legacy settings column.
	settingsOnly := store.Settings{ContainersOffsite: "s3:legacy", ContainersOffsiteImmutable: true}
	got, ok := s.offsiteTargetForSource(settingsOnly, "containers", "offsite")
	if !ok {
		t.Fatal("offsiteTargetForSource(no rows, settings set) should resolve via the settings fallback")
	}
	if got.Repo != "s3:legacy" || !got.Immutable {
		t.Fatalf("settings-fallback target = %+v, want repo s3:legacy immutable=true", got)
	}
	if _, ok := s.offsiteTargetForSource(settingsOnly, "containers", "local"); ok {
		t.Fatal("offsiteTargetForSource(local) should be false")
	}
	if _, ok := s.offsiteTargetForSource(store.Settings{}, "vms", "offsite"); ok {
		t.Fatal("offsiteTargetForSource with nothing configured should be false")
	}

	primary, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Primary", Repo: "s3:primary", Enabled: true, SortOrder: 0, Immutable: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	second, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Second", Repo: "s3:second", Enabled: true, SortOrder: 1, Immutable: false,
	})
	if err != nil {
		t.Fatal(err)
	}

	// Bare "offsite" is the first enabled target.
	if got, ok := s.offsiteTargetForSource(store.Settings{}, "containers", "offsite"); !ok || got.ID != primary.ID {
		t.Fatalf("bare offsite = %+v (ok=%v), want primary id %s", got, ok, primary.ID)
	}
	if got, ok := s.offsiteTargetForSource(store.Settings{}, "containers", "offsite:"+primary.ID); !ok || got.Repo != "s3:primary" {
		t.Fatalf("offsite:<primary> = %+v (ok=%v), want repo s3:primary", got, ok)
	}
	if got, ok := s.offsiteTargetForSource(store.Settings{}, "containers", "offsite:"+second.ID); !ok || got.Repo != "s3:second" {
		t.Fatalf("offsite:<second> = %+v (ok=%v), want repo s3:second", got, ok)
	}
	// An unknown id falls back to the primary, so a restore is never stranded.
	if got, ok := s.offsiteTargetForSource(store.Settings{}, "containers", "offsite:ffffffffffffffffffffffffffffffff"); !ok || got.ID != primary.ID {
		t.Fatalf("offsite:<unknown> = %+v (ok=%v), want primary id %s", got, ok, primary.ID)
	}
}

// On a backfilled single-target install, bare "offsite" resolves to the same
// repo as the legacy settings column, and "offsite:<id>" to that target's repo.
func TestRepoForOffsiteMatchesLegacyColumn(t *testing.T) {
	st := newSourceSeamStore(t)
	s := &Service{store: st}

	// The backfill leaves one enabled target whose Repo equals the legacy column.
	primary, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Primary", Repo: "s3:offsite-primary", Enabled: true, SortOrder: 0,
	})
	if err != nil {
		t.Fatal(err)
	}
	settings := store.Settings{ContainersOffsite: "s3:offsite-primary"}

	// A remote repo passes through resolveRepo unchanged.
	bare, err := s.repoFor(settings, "containers", "offsite")
	if err != nil {
		t.Fatalf("repoFor(offsite): %v", err)
	}
	if bare != "s3:offsite-primary" {
		t.Fatalf("repoFor(offsite) = %q, want s3:offsite-primary", bare)
	}

	// An install without target rows resolves to the same repo.
	stLegacy := newSourceSeamStore(t)
	sLegacy := &Service{store: stLegacy}
	legacy, err := sLegacy.repoFor(settings, "containers", "offsite")
	if err != nil {
		t.Fatalf("repoFor(offsite, legacy no rows): %v", err)
	}
	if legacy != bare {
		t.Fatalf("legacy repoFor(offsite) = %q, backfilled = %q; must be identical", legacy, bare)
	}

	byID, err := s.repoFor(settings, "containers", "offsite:"+primary.ID)
	if err != nil {
		t.Fatalf("repoFor(offsite:<primary>): %v", err)
	}
	if byID != "s3:offsite-primary" {
		t.Fatalf("repoFor(offsite:<primary>) = %q, want s3:offsite-primary", byID)
	}

	// A second target's id resolves to its own repo, while bare "offsite" stays
	// on the primary.
	second, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Second", Repo: "s3:offsite-second", Enabled: true, SortOrder: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	secondRepo, err := s.repoFor(settings, "containers", "offsite:"+second.ID)
	if err != nil {
		t.Fatalf("repoFor(offsite:<second>): %v", err)
	}
	if secondRepo != "s3:offsite-second" {
		t.Fatalf("repoFor(offsite:<second>) = %q, want s3:offsite-second", secondRepo)
	}
	stillPrimary, err := s.repoFor(settings, "containers", "offsite")
	if err != nil {
		t.Fatalf("repoFor(offsite) after 2nd target: %v", err)
	}
	if stillPrimary != "s3:offsite-primary" {
		t.Fatalf("repoFor(offsite) after adding a 2nd target = %q, want the primary s3:offsite-primary", stillPrimary)
	}

	if _, err := s.repoFor(store.Settings{}, "vms", "offsite"); err == nil {
		t.Fatal("repoFor(offsite) with nothing configured should error")
	}
	// A local source takes the local path, even when that path is a remote.
	if got, err := s.repoFor(store.Settings{VMsPath: "s3:vms-local"}, "vms", "local"); err != nil || got != "s3:vms-local" {
		t.Fatalf("repoFor(local) = %q, err=%v; want s3:vms-local", got, err)
	}
}

// Delete and prune are refused per immutable target. Bare "offsite" uses the
// primary target's flag.
func TestOffsiteSourceImmutableGate(t *testing.T) {
	st := newSourceSeamStore(t)
	s := &Service{store: st}

	// The primary is immutable, the second target is not.
	primary, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Primary", Repo: "s3:p", Enabled: true, SortOrder: 0, Immutable: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	second, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Second", Repo: "s3:s", Enabled: true, SortOrder: 1, Immutable: false,
	})
	if err != nil {
		t.Fatal(err)
	}

	if !s.offsiteSourceImmutable(store.Settings{}, "containers", "offsite") {
		t.Fatal("bare offsite should be immutable (primary target is immutable)")
	}
	if !s.offsiteSourceImmutable(store.Settings{}, "containers", "offsite:"+primary.ID) {
		t.Fatal("offsite:<primary> should be immutable")
	}
	if s.offsiteSourceImmutable(store.Settings{}, "containers", "offsite:"+second.ID) {
		t.Fatal("offsite:<second> should NOT be immutable")
	}

	// Without target rows the legacy per-domain settings flag decides.
	legacy := &Service{store: newSourceSeamStore(t)}
	if !legacy.offsiteSourceImmutable(store.Settings{ContainersOffsite: "s3:x", ContainersOffsiteImmutable: true}, "containers", "offsite") {
		t.Fatal("settings-fallback offsite should honor ContainersOffsiteImmutable=true")
	}
	if legacy.offsiteSourceImmutable(store.Settings{ContainersOffsite: "s3:x", ContainersOffsiteImmutable: false}, "containers", "offsite") {
		t.Fatal("settings-fallback offsite should be mutable when ContainersOffsiteImmutable=false")
	}
}
