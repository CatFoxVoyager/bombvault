package api

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

// The mtime shortcut in makeRepoReadable, and the exact edge of what it can see.
//
// The pass used to stat every entry after every backup. Measured against a real
// 123 GB repository that was 592 ms, against a median backup run of 2 seconds
// ([5437]). It now stats the directories and skips the FILES of any directory
// that has not changed since the last clean pass.
//
// That is a trade, and a trade has a losing side. These tests pin BOTH sides,
// because the losing side is the part a later reader will otherwise mistake for
// a bug and "fix" by deleting the shortcut:
//
//	wins   a file restic just wrote is relaxed, because writing it changed its
//	       directory's mtime. This is the only case that happens in practice.
//	loses  a file something else chmod'd restrictive, without touching the
//	       directory, is NOT seen on the next pass. Nothing in BombVault does
//	       that, and the stamp expiry bounds it to a day.
//
// Every time below is SET with Chtimes rather than waited for. The first draft
// of this file leaned on wall-clock ordering and failed for a reason worth
// keeping written down: tmpfs stamps a directory at the timer tick, so two
// writes 1.5 ms apart produced a directory mtime identical to the nanosecond,
// and the "new file" case looked broken when it was not. That measurement is
// also why the production stamp is backdated by stampBackdate.
func TestMakeRepoReadableScopesToChangedDirectories(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits are not modelled on windows")
	}

	newRepo := func(t *testing.T) (repo, stampDir, dirA, dirB string) {
		t.Helper()
		repo = t.TempDir()
		stampDir = t.TempDir()
		dirA = filepath.Join(repo, "data", "aa")
		dirB = filepath.Join(repo, "data", "bb")
		for _, d := range []string{dirA, dirB} {
			if err := os.MkdirAll(d, 0o700); err != nil {
				t.Fatal(err)
			}
		}
		return repo, stampDir, dirA, dirB
	}

	write := func(t *testing.T, dir, name string) string {
		t.Helper()
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte("pack"), 0o600); err != nil {
			t.Fatal(err)
		}
		return p
	}

	perm := func(t *testing.T, p string) os.FileMode {
		t.Helper()
		fi, err := os.Stat(p)
		if err != nil {
			t.Fatal(err)
		}
		return fi.Mode().Perm()
	}

	// setMtime pins a path's mtime so the comparison under test is decided by
	// the values this test chose, not by how fast the machine ran.
	setMtime := func(t *testing.T, p string, at time.Time) {
		t.Helper()
		if err := os.Chtimes(p, at, at); err != nil {
			t.Fatal(err)
		}
	}

	t.Run("a file written after the last pass is still relaxed", func(t *testing.T) {
		repo, stampDir, dirA, dirB := newRepo(t)
		write(t, dirA, "first")
		makeRepoReadable(repo, stampDir)

		// Put the last pass an hour back, then write what restic would write.
		// dirB's mtime is now clearly after the stamp, which is the basis of the
		// shortcut and the case it must never miss.
		setMtime(t, permStampPath(stampDir, repo), time.Now().Add(-time.Hour))
		fresh := write(t, dirB, "second")
		makeRepoReadable(repo, stampDir)

		if got := perm(t, fresh); got&0o044 != 0o044 {
			t.Errorf("a pack written after the last pass has perm %o and was not relaxed.\n"+
				"This is the case the pass exists for: adding a file updates its directory's\n"+
				"mtime, so the next pass must stat the files in that directory.", got)
		}
	})

	t.Run("a new file in a DEEPER directory is relaxed, because mtime does not propagate", func(t *testing.T) {
		// The defect the first implementation shipped with. Writing data/bb/x
		// updates bb and leaves data alone, so a pass that skipped `data`
		// wholesale for looking old skipped bb with it and relaxed nothing ever
		// again. Directories must always be descended into.
		repo, stampDir, dirA, dirB := newRepo(t)
		write(t, dirA, "first")
		makeRepoReadable(repo, stampDir)

		hour := time.Now().Add(-time.Hour)
		setMtime(t, permStampPath(stampDir, repo), hour)
		deep := write(t, dirB, "second")
		// Every directory ABOVE the new file looks untouched, which is exactly
		// what a real repository looks like: data/ changes only when a new
		// two-character prefix appears. Set AFTER the write, because the write
		// itself moves the parent's mtime forward.
		setMtime(t, filepath.Join(repo, "data"), hour.Add(-time.Hour))
		setMtime(t, repo, hour.Add(-time.Hour))

		makeRepoReadable(repo, stampDir)

		if got := perm(t, deep); got&0o044 != 0o044 {
			t.Errorf("perm %o: the pass never reached data/bb because data/ looked unchanged.\n"+
				"A directory's mtime says nothing about its subdirectories, so every directory\n"+
				"must be descended into and only its FILES may be skipped.", got)
		}
	})

	t.Run("an unchanged directory is skipped, which is the trade", func(t *testing.T) {
		repo, stampDir, dirA, _ := newRepo(t)
		p := write(t, dirA, "pack")
		makeRepoReadable(repo, stampDir)
		if got := perm(t, p); got&0o044 != 0o044 {
			t.Fatalf("the first pass must relax everything, perm %o", got)
		}

		// chmod does NOT change the parent directory's mtime, so the next pass
		// cannot tell this happened. Asserting it stays 0600 states the trade
		// honestly rather than pretending the shortcut is free.
		if err := os.Chmod(p, 0o600); err != nil {
			t.Fatal(err)
		}
		setMtime(t, dirA, time.Now().Add(-time.Hour))
		makeRepoReadable(repo, stampDir)
		if got := perm(t, p); got&0o044 == 0o044 {
			t.Error("the second pass relaxed a file in an UNCHANGED directory.\n" +
				"That means the mtime shortcut is not in effect and the pass is paying for\n" +
				"an lstat per entry again - the 592 ms this was measured to remove.")
		}
	})

	t.Run("an expired stamp forces a full pass", func(t *testing.T) {
		repo, stampDir, dirA, _ := newRepo(t)
		p := write(t, dirA, "pack")
		makeRepoReadable(repo, stampDir)
		if err := os.Chmod(p, 0o600); err != nil {
			t.Fatal(err)
		}
		setMtime(t, dirA, time.Now().Add(-time.Hour))

		// Age the stamp past fullSweepAfter. This is the safety net for exactly
		// the case the previous subtest just showed the shortcut cannot see.
		old := time.Now().Add(-fullSweepAfter - time.Hour)
		setMtime(t, permStampPath(stampDir, repo), old)

		makeRepoReadable(repo, stampDir)
		if got := perm(t, p); got&0o044 != 0o044 {
			t.Errorf("perm %o: a stamp older than fullSweepAfter must be ignored, so the "+
				"pass repairs what the mtime shortcut cannot see", got)
		}
	})

	t.Run("a clean pass stamps and a failed one does not", func(t *testing.T) {
		repo, stampDir, dirA, _ := newRepo(t)
		write(t, dirA, "pack")
		makeRepoReadable(repo, stampDir)
		if _, err := os.Stat(permStampPath(stampDir, repo)); err != nil {
			t.Fatalf("a clean pass must leave a stamp, got %v", err)
		}

		// A repository that is not there at all: the pass cannot read it, so it
		// saw an error and must not claim to have covered anything. Without this,
		// one bad pass would mark every directory it never reached as done.
		missing := filepath.Join(t.TempDir(), "gone")
		makeRepoReadable(missing, stampDir)
		if _, err := os.Stat(permStampPath(stampDir, missing)); err == nil {
			t.Error("a pass that hit an error still wrote a stamp.\n" +
				"The next pass would then skip directories this one never looked at.")
		}
	})

	t.Run("two repositories do not share a stamp", func(t *testing.T) {
		// One stamp for all would let a pass over repository A mark repository B
		// as covered, and B would then never be relaxed again.
		one, stampDir, dirA, _ := newRepo(t)
		two := t.TempDir()
		if err := os.MkdirAll(filepath.Join(two, "data", "aa"), 0o700); err != nil {
			t.Fatal(err)
		}
		write(t, dirA, "pack")
		second := filepath.Join(two, "data", "aa", "pack")
		if err := os.WriteFile(second, []byte("pack"), 0o600); err != nil {
			t.Fatal(err)
		}

		makeRepoReadable(one, stampDir)
		makeRepoReadable(two, stampDir)

		if permStampPath(stampDir, one) == permStampPath(stampDir, two) {
			t.Fatal("two repositories resolved to the same stamp file")
		}
		if got := perm(t, second); got&0o044 != 0o044 {
			t.Errorf("perm %o: the second repository was never relaxed, so a pass over the "+
				"first one had marked it as done", got)
		}
	})
}
