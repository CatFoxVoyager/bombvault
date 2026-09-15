package api_test

import (
	"context"
	"strings"
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/api"
	"github.com/junkerderprovinz/bombvault/internal/config"
	"github.com/junkerderprovinz/bombvault/internal/model"
	"github.com/junkerderprovinz/bombvault/internal/restic"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// TestRestoreSelectionChange is the RESTORE-01 tracer: restoring an OLDER
// snapshot after the user reshaped their selection must COMPLETE, handing the
// engine the mapped SNAPSHOT-path form (longest-prefix mapping against the
// chosen snapshot's recorded Paths) — not the stored list replayed verbatim,
// which misses the snapshot and used to fail the restore mid-loop AFTER the
// container had been stopped and removed (the exact bug RESTORE-01 fixes).
func TestRestoreSelectionChange(t *testing.T) {
	dir := t.TempDir()
	// Container paths are Linux-absolute under the host mount root; the restore
	// uses fakes (no real FS access to these paths), so a fixed Linux root is fine
	// (same reasoning as TestRestoreUsesStoredDefinitionWhenContainerDeleted).
	cfg := config.Config{
		AppKey:            strings.Repeat("a", 64),
		DataDir:           dir,
		HostMountRoot:     "/host/user",
		FlashTemplatesDir: dir + "/flash",
	}
	st := newMemStore(t)
	s := mustSettings(t, st)
	s.EncryptionEnabled = false
	// A remote-style repo: the snapshot listing reaches the fake engine directly
	// (a local repo would need an on-disk marker under the fixed Linux root).
	s.ContainersPath = "rest:http://127.0.0.1/containers"
	if err := st.UpdateSettings(s); err != nil {
		t.Fatal(err)
	}

	// The user narrowed the selection after this snapshot was taken: the stored
	// positional truth (AppdataPaths, recorded by the latest backup) is the NEW
	// narrow shape, while the seeded snapshot carries the OLD wide Paths.
	defBytes, err := marshalDefinition(model.Inspect{
		Name:   "/plex",
		Config: model.Config{Image: "plex:latest"},
	}, "<xml/>")
	if err != nil {
		t.Fatalf("marshal definition: %v", err)
	}
	if _, err := st.UpsertTarget(store.Target{
		ContainerName: "plex",
		AppdataPaths:  []string{"/host/user/user/appdata/plex/config"},
		Definition:    string(defBytes),
	}); err != nil {
		t.Fatalf("seed target: %v", err)
	}

	eng := &fakeResticEngine{
		snaps: []restic.Snapshot{{
			ID:    "aaaa1111",
			Tags:  []string{"container:plex", "p1"},
			Paths: []string{"/host/user/user/appdata/plex"},
		}},
		// What the snapshot actually CONTAINS. A recorded root says the backup
		// covered /plex; only the listing says whether /plex/config is really
		// in there, and a narrowed selector is checked against it before the
		// container is torn down.
		lsEntries: []restic.FileEntry{
			{Path: "/host/user/user/appdata/plex", Type: "dir"},
			{Path: "/host/user/user/appdata/plex/config", Type: "dir"},
		},
	}
	d := &fakeServiceDocker{}
	svc := api.NewService(cfg, st, d, fakeVirsh{}, eng)

	if err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false); err != nil {
		t.Fatalf("restore of an older snapshot after the selection changed must complete: %v", err)
	}

	// The engine is handed the STORED path, even though the snapshot recorded
	// only its parent. This used to assert ".../plex" - the recorded ancestor -
	// on the belief that a "<id>:<path>" selector has to name one of the
	// snapshot's own Paths. It does not: TestRestoreSubtreeBelowRecordedPath in
	// internal/restic proves against real restic that the selector reaches any
	// directory inside the snapshot. And the wide form was not merely
	// unnecessary, it was destructive: the user had narrowed the selection to
	// plex/config, so everything else under plex was deliberately left out of
	// the backup - and restoring ".../plex" writes the old snapshot's contents
	// over exactly those live, never-backed-up folders.
	want := "aaaa1111:/host/user/user/appdata/plex/config"
	if len(eng.restored) != 1 || !strings.HasSuffix(eng.restored[0], want) {
		t.Fatalf("restored = %v, want exactly one call ending in %q", eng.restored, want)
	}
	// The run completed end-to-end: the container was recreated.
	if d.createdIn.Config.Image == "" {
		t.Fatal("CreateAndStart was not called")
	}
	if d.createdIn.Config.Image != "plex:latest" {
		t.Fatalf("recreated with wrong image %q, want plex:latest", d.createdIn.Config.Image)
	}
}

// restoreScaffold seeds a plex target with the given stored positional truth
// and a remote-style repo whose snapshot listing comes from the fake engine —
// the shared setup of the RESTORE-01 integration cases below. Stored paths are
// Linux-absolute under the host mount root; fakes do no real FS access, so a
// fixed Linux root is fine (same reasoning as TestRestoreSelectionChange).
func restoreScaffold(t *testing.T, storedPaths []string, snaps []restic.Snapshot, lsEntries ...restic.FileEntry) (*store.Repo, *fakeServiceDocker, *fakeResticEngine, *api.Service) {
	t.Helper()
	dir := t.TempDir()
	cfg := config.Config{
		AppKey:            strings.Repeat("a", 64),
		DataDir:           dir,
		HostMountRoot:     "/host/user",
		FlashTemplatesDir: dir + "/flash",
	}
	st := newMemStore(t)
	s := mustSettings(t, st)
	s.EncryptionEnabled = false
	// A remote-style repo: the snapshot listing reaches the fake engine directly
	// (a local repo would need an on-disk marker under the fixed Linux root).
	s.ContainersPath = "rest:http://127.0.0.1/containers"
	if err := st.UpdateSettings(s); err != nil {
		t.Fatal(err)
	}
	defBytes, err := marshalDefinition(model.Inspect{
		Name:   "/plex",
		Config: model.Config{Image: "plex:latest"},
	}, "<xml/>")
	if err != nil {
		t.Fatalf("marshal definition: %v", err)
	}
	if _, err := st.UpsertTarget(store.Target{
		ContainerName: "plex",
		AppdataPaths:  storedPaths,
		Definition:    string(defBytes),
	}); err != nil {
		t.Fatalf("seed target: %v", err)
	}
	eng := &fakeResticEngine{snaps: snaps, lsEntries: lsEntries}
	d := &fakeServiceDocker{}
	svc := api.NewService(cfg, st, d, fakeVirsh{}, eng)
	return st, d, eng, svc
}

// restoreRunRow returns the single restore run row from the store, failing the
// test unless exactly one exists.
func restoreRunRow(t *testing.T, st *store.Repo) store.Run {
	t.Helper()
	runs, err := st.ListRuns(25)
	if err != nil {
		t.Fatalf("list runs: %v", err)
	}
	var row *store.Run
	for i := range runs {
		if runs[i].Kind == "restore" {
			if row != nil {
				t.Fatalf("expected one restore run row, got at least two: %v", runs)
			}
			row = &runs[i]
		}
	}
	if row == nil {
		t.Fatalf("no restore run row recorded; runs = %v", runs)
	}
	return *row
}

// TestRestoreSelectionChangePerPathSkip is RESTORE-01 case (a), D-14: one
// stored path has no mapping in the chosen snapshot — here a second bind the
// user added AFTER the snapshot was taken, so the snapshot holds no data for
// it at all (no ancestor, no descendant). The restore must still COMPLETE (a
// per-path skip never aborts the run), the mapped paths restore normally, and
// the run record carries the skip as a bounded note with the path scrubbed to
// [path] (T-01-11: nothing raw crosses into the persisted run row the SPA
// renders).
func TestRestoreSelectionChangePerPathSkip(t *testing.T) {
	st, d, eng, svc := restoreScaffold(t,
		[]string{
			"/host/user/user/appdata/plex/config",
			"/host/user/mnt/disk2/appdata/jellyfin/config", // added after the snapshot: no data for it
		},
		[]restic.Snapshot{{
			ID:    "aaaa1111",
			Tags:  []string{"container:plex", "p1"},
			Paths: []string{"/host/user/user/appdata/plex"},
		}},
		restic.FileEntry{Path: "/host/user/user/appdata/plex", Type: "dir"},
		restic.FileEntry{Path: "/host/user/user/appdata/plex/config", Type: "dir"})

	if err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false); err != nil {
		t.Fatalf("restore with one unmapped stored path must complete (per-path skip, never a global abort): %v", err)
	}

	// The selected path restores as itself (the snapshot recorded its parent,
	// which is enough to reach it); the orphan is skipped. Used to assert the
	// parent ".../plex" - see TestRestoreSelectionChange for why that was the
	// data-loss shape.
	want := "aaaa1111:/host/user/user/appdata/plex/config"
	if len(eng.restored) != 1 || !strings.HasSuffix(eng.restored[0], want) {
		t.Fatalf("restored = %v, want exactly one call ending in %q", eng.restored, want)
	}
	if d.createdIn.Config.Image == "" {
		t.Fatal("CreateAndStart was not called")
	}

	// The success run record says so: count + scrubbed paths, no raw path text.
	row := restoreRunRow(t, st)
	if row.Status != "success" {
		t.Fatalf("run status = %q, want success", row.Status)
	}
	if !strings.Contains(row.Error, "1 stored path") {
		t.Fatalf("run error note = %q, want it to report the skipped-path count", row.Error)
	}
	if n := strings.Count(row.Error, "[path]"); n != 1 {
		t.Fatalf("run error note = %q, want exactly 1 scrubbed [path] token, got %d", row.Error, n)
	}
	if strings.Contains(row.Error, "/host/") || strings.Contains(row.Error, "jellyfin") {
		t.Fatalf("run error note = %q leaks a raw path — must be scrubbed to [path] first", row.Error)
	}
}

// TestRestoreSelectionChangeSkipOrder is RESTORE-01 case (b): multiple orphan
// stored paths (two more binds added on other pools since the snapshot) are
// all recorded and none aborts the run. The stored-list ORDER of the skips is
// pinned pre-scrub in TestMapRestorePaths; here the scrubbed run-row note is
// order-insensitive BY DESIGN (every absolute path scrubs to the same [path]
// token — T-01-11), so what this integration case pins is multi-skip
// non-abort plus the exact bounded note shape.
func TestRestoreSelectionChangeSkipOrder(t *testing.T) {
	st, d, eng, svc := restoreScaffold(t,
		[]string{
			"/host/user/user/appdata/plex/config",
			"/host/user/mnt/disk2/appdata/extra",
			"/host/user/mnt/disk3/appdata/more",
		},
		[]restic.Snapshot{{
			ID:    "aaaa1111",
			Tags:  []string{"container:plex", "p1"},
			Paths: []string{"/host/user/user/appdata/plex"},
		}},
		restic.FileEntry{Path: "/host/user/user/appdata/plex", Type: "dir"},
		restic.FileEntry{Path: "/host/user/user/appdata/plex/config", Type: "dir"})

	if err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false); err != nil {
		t.Fatalf("restore with multiple unmapped stored paths must complete: %v", err)
	}

	// One restore for the one mapped path, as itself; both orphans are skipped.
	want := "aaaa1111:/host/user/user/appdata/plex/config"
	if len(eng.restored) != 1 || !strings.HasSuffix(eng.restored[0], want) {
		t.Fatalf("restored = %v, want exactly one call ending in %q", eng.restored, want)
	}
	if d.createdIn.Config.Image == "" {
		t.Fatal("CreateAndStart was not called")
	}

	row := restoreRunRow(t, st)
	if row.Status != "success" {
		t.Fatalf("run status = %q, want success", row.Status)
	}
	if !strings.Contains(row.Error, "2 stored path") {
		t.Fatalf("run error note = %q, want it to report both skips", row.Error)
	}
	if n := strings.Count(row.Error, "[path]"); n != 2 {
		t.Fatalf("run error note = %q, want exactly 2 scrubbed [path] tokens, got %d", row.Error, n)
	}
}

// TestRestoreEmptyIntersection is RESTORE-01 case (c), D-15 — the whole safety
// property: when NO stored path maps onto the chosen snapshot, the restore
// aborts in the synchronous prepare phase with the explicit nothing-to-restore
// error, and the Docker call log proves it happened BEFORE the destructive
// teardown — no stop, no remove, nothing recreated.
func TestRestoreEmptyIntersection(t *testing.T) {
	_, d, eng, svc := restoreScaffold(t,
		[]string{"/host/user/user/appdata/plex/config"},
		[]restic.Snapshot{{
			ID:    "aaaa1111",
			Tags:  []string{"container:plex", "p1"},
			Paths: []string{"/mnt/other/appdata/entirely-different"},
		}})

	err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false)
	if err == nil {
		t.Fatal("restore with an empty intersection must abort, not run")
	}
	if !strings.Contains(err.Error(), "nothing to restore") {
		t.Fatalf("error = %v, want the explicit nothing-to-restore shape", err)
	}
	// The destructive teardown never fired: the failure was resolved in prepare,
	// not mid-restore after the container was already gone (the exact bug
	// RESTORE-01 fixes).
	for _, c := range d.calls {
		if strings.HasPrefix(c, "stop:") || strings.HasPrefix(c, "remove:") {
			t.Fatalf("empty intersection must abort BEFORE teardown, but docker calls include %q (all: %v)", c, d.calls)
		}
	}
	if len(eng.restored) != 0 {
		t.Fatalf("no restic restore may run for an empty intersection, got %v", eng.restored)
	}
	if d.createdIn.Config.Image != "" {
		t.Fatal("container must not be recreated for an aborted restore")
	}
}

// TestRestoreSelectionChangeExplicitSnapshotID is RESTORE-01 case (d): a
// restore BY EXPLICIT SNAPSHOT ID maps against THAT snapshot's recorded Paths,
// not the newest snapshot's and not the first in the listing.
//
// The two snapshots have to DISAGREE about the outcome or the test proves
// nothing. They used to disagree on the path shape (wide ancestor vs exact
// match), which stopped being a difference once the mapping narrowed - both
// snapshots now answer ".../plex/config" for that one stored path, so the
// assertion would have passed no matter which snapshot was consulted. The
// second stored folder restores that: the older snapshot recorded the parent
// and so can reach BOTH, while the newer one recorded only config and has
// nothing for transcode. Two restores means the older snapshot was used; one
// would mean the newer.
func TestRestoreSelectionChangeExplicitSnapshotID(t *testing.T) {
	_, _, eng, svc := restoreScaffold(t,
		[]string{
			"/host/user/user/appdata/plex/config",
			"/host/user/user/appdata/plex/transcode",
		},
		[]restic.Snapshot{
			{
				ID:    "bbbb2222",
				Tags:  []string{"container:plex", "p1"},
				Paths: []string{"/host/user/user/appdata/plex/config"},
			},
			{
				ID:    "aaaa1111",
				Tags:  []string{"container:plex", "p1"},
				Paths: []string{"/host/user/user/appdata/plex"},
			},
		},
		restic.FileEntry{Path: "/host/user/user/appdata/plex", Type: "dir"},
		restic.FileEntry{Path: "/host/user/user/appdata/plex/config", Type: "dir"},
		restic.FileEntry{Path: "/host/user/user/appdata/plex/transcode", Type: "dir"})

	if err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false); err != nil {
		t.Fatalf("restore of the explicit older snapshot: %v", err)
	}

	want := []string{
		"aaaa1111:/host/user/user/appdata/plex/config",
		"aaaa1111:/host/user/user/appdata/plex/transcode",
	}
	if len(eng.restored) != len(want) {
		t.Fatalf("restored = %v, want %d calls (one per stored path, mapped against the explicitly chosen snapshot)", eng.restored, len(want))
	}
	for i, w := range want {
		if !strings.HasSuffix(eng.restored[i], w) {
			t.Fatalf("restored[%d] = %q, want a call ending in %q", i, eng.restored[i], w)
		}
	}
}

// TestRestoreNarrowedPathMissingFromSnapshot pins the failure the narrowing
// introduced and the verification round caught.
//
// Pass 2 answers "you selected /plex/config and the snapshot recorded /plex" by
// restoring /plex/config itself. A recorded ANCESTOR only proves the path lies
// under a backed-up root though, never that it is IN the snapshot: the branch
// may have been carved out by a --exclude when that backup ran (this codebase
// derives exactly such excludes from the selection), or the folder may not have
// existed yet. The selector then misses, and on this route the miss lands after
// the container has been stopped and removed - which is the precise failure
// mapRestorePaths exists to prevent.
//
// So a narrowed path is checked against the snapshot's real tree in the
// synchronous prepare phase. A path that is not in it becomes an ordinary
// per-path skip, never a widening back to the ancestor: widening is what caused
// the data loss in the first place.
func TestRestoreNarrowedPathMissingFromSnapshot(t *testing.T) {
	t.Run("absent narrowed path is skipped and the run still completes", func(t *testing.T) {
		st, d, eng, svc := restoreScaffold(t,
			[]string{
				"/host/user/user/appdata/plex/config",
				"/host/user/user/appdata/plex/transcode", // carved out when this snapshot ran
			},
			[]restic.Snapshot{{
				ID:    "aaaa1111",
				Tags:  []string{"container:plex", "p1"},
				Paths: []string{"/host/user/user/appdata/plex"},
			}},
			// transcode is deliberately NOT in the listing: the recorded root
			// has a hole where the exclusion was.
			restic.FileEntry{Path: "/host/user/user/appdata/plex", Type: "dir"},
			restic.FileEntry{Path: "/host/user/user/appdata/plex/config", Type: "dir"})

		if err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false); err != nil {
			t.Fatalf("a narrowed path missing from the snapshot must be skipped, not fatal: %v", err)
		}
		waitForBackupDone(t, svc)

		want := "aaaa1111:/host/user/user/appdata/plex/config"
		if len(eng.restored) != 1 || !strings.HasSuffix(eng.restored[0], want) {
			t.Fatalf("restored = %v, want exactly one call ending in %q (transcode is not in this snapshot)", eng.restored, want)
		}
		if d.createdIn.Config.Image == "" {
			t.Fatal("the container must still be recreated")
		}
		row := restoreRunRow(t, st)
		if row.Status != "success" {
			t.Fatalf("run status = %q, want success", row.Status)
		}
		if !strings.Contains(row.Error, "1 stored path") {
			t.Fatalf("run error note = %q, want it to report the one skip", row.Error)
		}
	})

	t.Run("every narrowed path absent aborts BEFORE the container is torn down", func(t *testing.T) {
		_, d, eng, svc := restoreScaffold(t,
			[]string{"/host/user/user/appdata/plex/transcode"},
			[]restic.Snapshot{{
				ID:    "aaaa1111",
				Tags:  []string{"container:plex", "p1"},
				Paths: []string{"/host/user/user/appdata/plex"},
			}},
			restic.FileEntry{Path: "/host/user/user/appdata/plex", Type: "dir"},
			restic.FileEntry{Path: "/host/user/user/appdata/plex/config", Type: "dir"})

		err := svc.Restore(context.Background(), "plex", "aaaa1111", true, "", false)
		if err == nil {
			t.Fatal("nothing left to restore must abort, not run")
		}
		if !strings.Contains(err.Error(), "nothing to restore") {
			t.Fatalf("error = %v, want the explicit nothing-to-restore shape", err)
		}
		// The whole point: the refusal is synchronous, so the container is still
		// there. Before the check, restic was handed a selector that is not in
		// the snapshot and failed AFTER this teardown.
		for _, c := range d.calls {
			if strings.HasPrefix(c, "stop:") || strings.HasPrefix(c, "remove:") {
				t.Fatalf("must abort before teardown, but docker calls include %q (all: %v)", c, d.calls)
			}
		}
		if len(eng.restored) != 0 {
			t.Fatalf("no restic restore may run, got %v", eng.restored)
		}
	})
}
