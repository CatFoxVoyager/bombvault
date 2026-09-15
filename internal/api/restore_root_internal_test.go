package api

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/config"
	"github.com/junkerderprovinz/bombvault/internal/model"
	"github.com/junkerderprovinz/bombvault/internal/restic"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// TestCommonAncestor pins the node a to-folder restore extracts. It used to be
// Paths[0], which silently dropped every other recorded root of a multi-root
// snapshot: the restore reported success with half the data missing.
func TestCommonAncestor(t *testing.T) {
	cases := []struct {
		name  string
		paths []string
		want  string
	}{
		{"no path at all", nil, ""},
		{
			// Byte-for-byte, not path.Cleaned: a recorded path is a restic
			// selector and has to reach the engine exactly as it was recorded.
			"a single root is handed back unchanged",
			[]string{"/host/olduser/data/docs/"},
			"/host/olduser/data/docs/",
		},
		{
			"two siblings share their parent",
			[]string{"/host/user/data/docs/keep-a", "/host/user/data/docs/keep-b"},
			"/host/user/data/docs",
		},
		{
			// The ancestor is one of the recorded paths itself, so no trimming
			// past it: restoring the deeper one alone would drop the other.
			"a root and something below it resolve to the root",
			[]string{"/host/user/data/docs", "/host/user/data/docs/keep-a"},
			"/host/user/data/docs",
		},
		{
			"three roots trim to the deepest shared node",
			[]string{"/srv/a/b/one", "/srv/a/b/two/deep", "/srv/a/b/three"},
			"/srv/a/b",
		},
		{
			// Segment-aligned, the same rule as isStrictDescendant: /host/user
			// must not be read as an ancestor of /host/user-old.
			"a name that merely starts with another is not below it",
			[]string{"/host/user/data", "/host/user-old/data"},
			"/host",
		},
		{
			// Nothing shared but "/": there is no single node to extract, so the
			// caller falls back to a whole-tree restore instead of emitting an
			// invalid "<id>:/" selector.
			"roots on different branches have no usable ancestor",
			[]string{"/host/user/data", "/mnt/disk2/other"},
			"",
		},
		{
			// The regression that a live test caught: rebuilding the path from
			// its segments prefixed the dev box's own snapshot paths with a "/"
			// they never had, and every containment check missed afterwards.
			"a path that does not start at / keeps its own head",
			[]string{`C:\tmp\Test001/data/docs/keep-a`, `C:\tmp\Test001/data/docs/keep-b`},
			`C:\tmp\Test001/data/docs`,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := commonAncestor(tc.paths); got != tc.want {
				t.Fatalf("commonAncestor(%v) = %q, want %q", tc.paths, got, tc.want)
			}
		})
	}
}

// TestSnapshotRestoreRoot pins the lookup around it: the right snapshot is
// matched by exact id or unambiguous prefix, and anything unmatched answers ""
// (the whole-tree fallback) rather than another snapshot's paths.
func TestSnapshotRestoreRoot(t *testing.T) {
	snaps := []restic.Snapshot{
		{ID: "aaaa1111", Paths: []string{"/host/user/data/docs/keep-a", "/host/user/data/docs/keep-b"}},
		{ID: "bbbb2222", Paths: []string{"/host/user/data/other"}},
		{ID: "cccc3333"},
	}
	for _, tc := range []struct{ id, want string }{
		{"aaaa1111", "/host/user/data/docs"},
		{"aaaa", "/host/user/data/docs"}, // prefix match, same as snapshotBelongs
		{"bbbb2222", "/host/user/data/other"},
		{"cccc3333", ""}, // recorded no path
		{"ffff9999", ""}, // no such snapshot
	} {
		if got := snapshotRestoreRoot(snaps, tc.id); got != tc.want {
			t.Fatalf("snapshotRestoreRoot(%q) = %q, want %q", tc.id, got, tc.want)
		}
	}
}

// TestEscapeGlobLiteral pins the mapping from a real folder name to a restic
// --exclude pattern that means exactly that folder. Each case is one of the
// failures measured against the real engine (see escapeGlobLiteral's doc).
func TestEscapeGlobLiteral(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		// Nothing to do: the overwhelmingly common case must pass through
		// byte-identical, or every existing selection changes shape.
		{"/host/user/appdata/plex/Cache", "/host/user/appdata/plex/Cache"},
		// A character class that cannot match the name it came from.
		{"/media/Movies/Inception (2010) [1080p]", `/media/Movies/Inception (2010) \[1080p\]`},
		// A class that matches the SIBLINGS instead: "Season 0", "Season 1".
		{"/media/Season [01]", `/media/Season \[01\]`},
		// An unmatched bracket: restic refuses the whole backup run.
		{"/media/Movies [2024", `/media/Movies \[2024`},
		{"/media/star*name", `/media/star\*name`},
		{"/media/q?mark", `/media/q\?mark`},
		{`/media/back\slash`, `/media/back\\slash`},
		{"", ""},
	} {
		if got := escapeGlobLiteral(tc.in); got != tc.want {
			t.Errorf("escapeGlobLiteral(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestExcludedBranchesEscapesDerivedPatterns is the same rule one layer up: the
// escaping has to happen where a stored path BECOMES a pattern, so every caller
// gets it. Both the container and the file-set compile read this helper.
func TestExcludedBranchesEscapesDerivedPatterns(t *testing.T) {
	got := excludedBranches([]string{
		"/media",
		"!/media/Season [01]",
		"!/media/plain",
	})
	want := []string{`/media/Season \[01\]`, "/media/plain"}
	if len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("excludedBranches = %v, want %v", got, want)
	}
}

// TestNormalizeSelectionResolvesIncludeUnderExclusion pins the contradiction
// that used to be resolved silently and in the wrong direction.
//
// PruneMaximal only ever compares within one class, so an include lying below
// an exclusion that itself lay below another include was dropped as redundant
// while the exclusion between them survived. The backup then carved that branch
// out of the argv, the folder landed in no snapshot, the UI said Saved, and the
// stored form no longer held the information, so no reload could heal it.
func TestNormalizeSelectionResolvesIncludeUnderExclusion(t *testing.T) {
	cases := []struct {
		name    string
		entries []string
		want    []string
	}{
		{
			// The reported shape. It used to store
			// [/c/plex !/c/plex/Cache] - the added folder gone, the
			// exclusion that swallows it still there.
			"an include below an exclusion drops the exclusion, not itself",
			[]string{"/c/plex", "/c/plex/Cache/Metadata", "!/c/plex/Cache"},
			[]string{"/c/plex"},
		},
		{
			// Nothing below it: the ordinary carve-out, untouched.
			"an exclusion with no include under it survives",
			[]string{"/c/plex", "!/c/plex/Cache"},
			[]string{"/c/plex", "!/c/plex/Cache"},
		},
		{
			// The explicitly-deselected carrier (encoding Q3). With no
			// includes at all nothing can lie below anything, so it is
			// untouched by construction - but pin it, because it is the one
			// shape that distinguishes "deselected" from "auto-detect".
			"an exclusions-only selection is left alone",
			[]string{"!/c/plex/Cache", "!/c/plex/Logs"},
			[]string{"!/c/plex/Cache", "!/c/plex/Logs"},
		},
		{
			// Only the contradicted exclusion goes; a sibling carve-out with
			// nothing under it stays.
			"only the contradicted exclusion is dropped",
			[]string{"/c/plex", "/c/plex/Cache/Metadata", "!/c/plex/Cache", "!/c/plex/Logs"},
			[]string{"/c/plex", "!/c/plex/Logs"},
		},
		{
			// Segment-aligned throughout: /c/plex/Cache must not be read as
			// an ancestor of /c/plex/CacheOld.
			"a name that merely starts with the exclusion is not below it",
			[]string{"/c/plex", "/c/plex/CacheOld", "!/c/plex/Cache"},
			[]string{"/c/plex", "!/c/plex/Cache"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := NormalizeSelection(tc.entries)
			if len(got) != len(tc.want) {
				t.Fatalf("NormalizeSelection(%v) = %v, want %v", tc.entries, got, tc.want)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Fatalf("NormalizeSelection(%v) = %v, want %v", tc.entries, got, tc.want)
				}
			}
			// Normalizing an already-normalized list stays the identity, the
			// property the whole stored form rests on.
			if again := NormalizeSelection(got); len(again) != len(got) {
				t.Fatalf("not idempotent: %v -> %v", got, again)
			}
		})
	}
}

// TestEffectiveBackupPathsWithSelectionIsOneRead pins that the backup's two
// halves come out of the SAME read of the target row: the includes that become
// the restic positionals, and the selection whose exclusion branches become the
// --exclude tail.
//
// They used to be read separately - once for the paths, once through
// UpsertTarget's re-read - with nothing serialising a PATCH landing between
// them. That pairs OLD positionals with NEW exclusions, which is not merely
// stale but a shape the user never chose: a derived --exclude biting a
// positional from the previous selection. The snapshot then records a path
// whose content was filtered out of it, the run is recorded success, and a
// later restore resolves that path to an empty directory and reports success.
//
// A true race test would need a seam to write the store between the two reads,
// and the window holds no injectable call. What is pinned here instead is the
// property that makes the race impossible: one call, both halves, mutually
// consistent.
func TestEffectiveBackupPathsWithSelectionIsOneRead(t *testing.T) {
	dir := t.TempDir()
	st := newTestStore(t)
	svc := NewService(config.Config{
		AppKey:        strings.Repeat("a", 64),
		DataDir:       dir,
		HostMountRoot: dir,
	}, st, nil, nil, nil)

	root := filepath.Join(dir, "appdata", "plex")
	if err := os.MkdirAll(filepath.Join(root, "config"), 0o750); err != nil {
		t.Fatal(err)
	}
	if _, err := st.UpsertTarget(store.Target{ContainerName: "plex"}); err != nil {
		t.Fatal(err)
	}
	stored := []string{root, "!" + root + "/transcoding"}
	if err := st.SetBackupPaths("plex", stored); err != nil {
		t.Fatal(err)
	}

	paths, selection := svc.effectiveBackupPathsWithSelection("plex", model.Inspect{})
	if len(paths) != 1 || paths[0] != root {
		t.Fatalf("paths = %v, want [%s]", paths, root)
	}
	// The selection comes back WHOLE, exclusions included: that is what the
	// --exclude tail is derived from, and deriving it from anything else is the
	// defect this pins.
	if len(selection) != len(stored) {
		t.Fatalf("selection = %v, want %v", selection, stored)
	}
	for i := range stored {
		if selection[i] != stored[i] {
			t.Fatalf("selection = %v, want %v", selection, stored)
		}
	}
	// And the two halves agree: the positionals ARE this selection's includes.
	inc := includesOnly(selection)
	if len(inc) != len(paths) || inc[0] != paths[0] {
		t.Fatalf("positionals %v do not match the selection's includes %v", paths, inc)
	}
}

// TestBackupExcludesComeFromTheSameReadAsThePositionals is the guard the first
// attempt at this fix did not have, and the reason it shipped inert.
//
// The helper effectiveBackupPathsWithSelection was written, and Backup called
// it, and then threw the selection away with "_ = selection" while the exclude
// tail kept reading tg.SelectedPaths - the later re-read the whole fix exists to
// avoid. Everything compiled, every test stayed green, and the comment three
// lines above the defect said the opposite of what the code did. The unit test
// that pinned the fix called the helper directly and never reached the call
// site, so it could not see any of it.
//
// A source scan, the same instrument and for the same reason as
// TestFilesCancelKeyMatchesTheProgressKey: the two lines sit a hundred apart in
// one long function, the invariant between them is which READ they share, and no
// behavioural test can reach it - producing the failure needs a write landing
// between two statements with nothing injectable in between.
func TestBackupExcludesComeFromTheSameReadAsThePositionals(t *testing.T) {
	raw, err := os.ReadFile("service.go")
	if err != nil {
		t.Fatalf("read service.go: %v", err)
	}
	src := string(raw)

	if !strings.Contains(src, "effective, selection := s.effectiveBackupPathsWithSelection(name, in)") {
		t.Error("Backup no longer takes both halves of the selection from one read.")
	}
	if !strings.Contains(src, "excludedBranches(selection)") {
		t.Error("the container backup's --exclude tail is no longer derived from the same read as its positionals")
	}
	// The shape that shipped inert.
	for _, forbidden := range []string{
		"excludedBranches(tg.SelectedPaths)",
		"_ = selection",
	} {
		if strings.Contains(src, forbidden) {
			t.Errorf("Backup is back to the two-read shape (%s).\n"+
				"tg comes from UpsertTarget's re-read, so a save landing between the two\n"+
				"reads pairs old positionals with new exclusions: a --exclude from one\n"+
				"selection biting a positional from another, recorded as a success.", forbidden)
		}
	}
}
