package api

import (
	"reflect"
	"testing"
)

// TestMapRestorePaths pins the RESTORE-01 mapping semantics (01-RESEARCH R5):
// the restore selector list is the stored selection intersected with the
// CHOSEN snapshot's recorded Paths — never the stored list replayed verbatim.
// Table-driven like selection_test.go, but white-box (package api): the helper
// is deliberately unexported like the rest of this file's primitives.
func TestMapRestorePaths(t *testing.T) {
	t.Run("descendant clause: a snapshot path strictly below a stored path restores as-is", func(t *testing.T) {
		gotMapped, gotSkipped, _ := mapRestorePaths([]string{"/a/b"}, []string{"/a/b/c"})
		wantMapped := []string{"/a/b/c"}
		if !reflect.DeepEqual(gotMapped, wantMapped) {
			t.Fatalf("mapped = %v, want %v", gotMapped, wantMapped)
		}
		if len(gotSkipped) != 0 {
			t.Fatalf("skipped = %v, want empty", gotSkipped)
		}
	})

	t.Run("a stored path below a recorded root restores ITSELF, not the root", func(t *testing.T) {
		// Used to assert /a/b here: the mapping answered "you selected /a/b/c
		// but the snapshot records /a and /a/b" by restoring the longest
		// ANCESTOR. That hands back every sibling under it, including branches
		// the user deselected and that were therefore never backed up, so their
		// live contents get overwritten with old snapshot data. Restic's
		// "<id>:<path>" selector reaches any directory inside a snapshot, not
		// only its recorded paths (TestRestoreSubtreeBelowRecordedPath in
		// internal/restic pins that against the real engine), so the answer is
		// the selected path itself.
		gotMapped, gotSkipped, _ := mapRestorePaths([]string{"/a/b/c"}, []string{"/a", "/a/b"})
		wantMapped := []string{"/a/b/c"}
		if !reflect.DeepEqual(gotMapped, wantMapped) {
			t.Fatalf("mapped = %v, want %v", gotMapped, wantMapped)
		}
		if len(gotSkipped) != 0 {
			t.Fatalf("skipped = %v, want empty", gotSkipped)
		}
	})

	t.Run("exact equality matches before any prefix logic", func(t *testing.T) {
		gotMapped, gotSkipped, _ := mapRestorePaths([]string{"/x"}, []string{"/x"})
		wantMapped := []string{"/x"}
		if !reflect.DeepEqual(gotMapped, wantMapped) {
			t.Fatalf("mapped = %v, want %v", gotMapped, wantMapped)
		}
		if len(gotSkipped) != 0 {
			t.Fatalf("skipped = %v, want empty", gotSkipped)
		}
	})

	t.Run("stored path absent from the snapshot is skipped, not mapped", func(t *testing.T) {
		gotMapped, gotSkipped, _ := mapRestorePaths([]string{"/gone"}, []string{"/other"})
		if len(gotMapped) != 0 {
			t.Fatalf("mapped = %v, want empty", gotMapped)
		}
		wantSkipped := []string{"/gone"}
		if !reflect.DeepEqual(gotSkipped, wantSkipped) {
			t.Fatalf("skipped = %v, want %v", gotSkipped, wantSkipped)
		}
	})

	t.Run("prefix test is segment-aligned: /a is not an ancestor of /ab", func(t *testing.T) {
		// The strict-prefix primitive appends "/" — a bare string-prefix match
		// would wrongly restore /a (covering /ab) here.
		gotMapped, gotSkipped, _ := mapRestorePaths([]string{"/ab"}, []string{"/a"})
		if len(gotMapped) != 0 {
			t.Fatalf("mapped = %v, want empty", gotMapped)
		}
		wantSkipped := []string{"/ab"}
		if !reflect.DeepEqual(gotSkipped, wantSkipped) {
			t.Fatalf("skipped = %v, want %v", gotSkipped, wantSkipped)
		}
	})

	t.Run("pass 1 keeps snapshot Paths order; unmapped stored paths skip in stored order", func(t *testing.T) {
		gotMapped, gotSkipped, _ := mapRestorePaths(
			[]string{"/sel", "/gone1", "/gone2"},
			[]string{"/zzz/under", "/sel/sub", "/aaa/under"},
		)
		// Pass 1: /sel/sub is the only snapshot path at-or-below a stored path.
		// Pass 2: nothing covers /gone1 / /gone2, and no snapshot path is their
		// ancestor — both skip, in STORED-list order (deterministic).
		wantMapped := []string{"/sel/sub"}
		if !reflect.DeepEqual(gotMapped, wantMapped) {
			t.Fatalf("mapped = %v, want %v", gotMapped, wantMapped)
		}
		wantSkipped := []string{"/gone1", "/gone2"}
		if !reflect.DeepEqual(gotSkipped, wantSkipped) {
			t.Fatalf("skipped = %v, want %v", gotSkipped, wantSkipped)
		}
	})

	t.Run("mixed: pass 1 covers one stored path, pass 2 maps the other to itself", func(t *testing.T) {
		gotMapped, gotSkipped, _ := mapRestorePaths(
			[]string{"/sel/deep", "/other"},
			[]string{"/other/kid", "/sel"},
		)
		// /other/kid is below stored /other (pass 1). /sel/deep has no recorded
		// path below it, but /sel is recorded ABOVE it, so pass 2 restores
		// /sel/deep itself - not /sel, which would drag in every other branch
		// under /sel.
		wantMapped := []string{"/other/kid", "/sel/deep"}
		if !reflect.DeepEqual(gotMapped, wantMapped) {
			t.Fatalf("mapped = %v, want %v", gotMapped, wantMapped)
		}
		if len(gotSkipped) != 0 {
			t.Fatalf("skipped = %v, want empty", gotSkipped)
		}
	})

	t.Run("two selected siblings restore as two paths, not as their shared parent", func(t *testing.T) {
		gotMapped, gotSkipped, _ := mapRestorePaths(
			[]string{"/sel/a", "/sel/b"},
			[]string{"/sel"},
		)
		// This is the data-loss shape in miniature, and it used to assert
		// [/sel]. The user picked a and b. If /sel also holds c - deselected,
		// never backed up, and alive on disk - restoring /sel overwrites c with
		// whatever the snapshot happens to hold for it. Each selected path is
		// restored on its own instead.
		wantMapped := []string{"/sel/a", "/sel/b"}
		if !reflect.DeepEqual(gotMapped, wantMapped) {
			t.Fatalf("mapped = %v, want %v", gotMapped, wantMapped)
		}
		if len(gotSkipped) != 0 {
			t.Fatalf("skipped = %v, want empty", gotSkipped)
		}
	})
}

// TestExcludedBranches pins the backup-argv enforcement semantics of
// excludedBranches (stored exclusions encoded as restic --exclude per the
// 2026-09-09 gap-closure decision), including the two deliberate
// non-emissions as pinned contract, not accident: an exclusion EQUAL to an
// included root (a contradictory pair that would ask restic to filter its own
// positional source) and an ORPHAN exclusion under no included root (nothing
// to carve content out of; pure noise in the snapshot's Excludes metadata).
func TestExcludedBranches(t *testing.T) {
	cases := []struct {
		name    string
		entries []string
		want    []string
	}{
		{"both branches qualify, stored order preserved", []string{"/c/a", "!/c/a/b", "!/c/a/z"}, []string{"/c/a/b", "/c/a/z"}},
		{"orphan exclusion under no include is dropped", []string{"/c/a", "!/c/a/b", "!/c/other"}, []string{"/c/a/b"}},
		{"exclusions-only: no include to qualify against", []string{"!/c/a"}, []string{}},
		{"equality is not a strict descendant", []string{"/c/a", "!/c/a"}, []string{}},
		{"includes only: nothing to enforce", []string{"/c/a"}, []string{}},
		{"empty list: non-nil empty", nil, []string{}},
		{"deep branch below one qualifier wins", []string{"/c/a", "!/c/a/b/c"}, []string{"/c/a/b/c"}},
	}
	for _, tc := range cases {
		if got := excludedBranches(tc.entries); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%s: excludedBranches(%v) = %v, want %v", tc.name, tc.entries, got, tc.want)
		}
	}
}
