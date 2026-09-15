package restic

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
)

// TestRestoreSubtreeBelowRecordedPath pins the one restic behaviour the restore
// mapping needs and did not have proof of: a `<id>:<path>` selector addresses
// ANY directory inside the snapshot, not only the paths the snapshot RECORDED.
//
// WHY IT MATTERS, and it is the whole reason this file exists. mapRestorePaths'
// second pass used to answer "the user selected /a/b/c but the snapshot only
// records /a" by restoring /a - the longest ANCESTOR. That is a widening: it
// hands back every sibling under /a as well, overwriting live data in branches
// the user deliberately deselected and that were therefore never backed up.
// Three of the review's four data-loss findings are that one behaviour.
//
// The fix is only possible if restic can restore /a/b/c out of a snapshot whose
// Paths say /a. The neighbouring contract file's doc says "subtreePath must be
// one of the snapshot's own backed-up paths", which reads like a restic limit
// but is a caller-side safety rule (a recomputed path could miss after a
// HostMountRoot change). This test separates the two: it proves the ENGINE
// allows it, so the mapping can narrow instead of widen and the caller keeps
// deriving the path from data it already validated.
//
// Same shape as the other contract tests here: skipped where restic is absent,
// proven on CI against the pinned restic 0.17.
func TestRestoreSubtreeBelowRecordedPath(t *testing.T) {
	if _, err := exec.LookPath("restic"); err != nil {
		t.Skip("restic not on PATH")
	}
	// The selector is "<id>:<path>", so a Windows drive letter puts a second
	// colon in it and restic parses "C" as the id ("path C:: not found").
	// Nothing to do with the behaviour under test - the same reason
	// TestRoundtrip is red on the dev box and green on CI. Proven by hand
	// against restic 0.17.3 on the Linux box before this test was written:
	// a snapshot recording only .../src restored .../src/keep and left the
	// deselected sibling behind.
	if runtime.GOOS == "windows" {
		t.Skip("the <id>:<path> selector cannot carry a Windows drive letter")
	}
	tmp := t.TempDir()
	repo := filepath.Join(tmp, "repo")
	src := filepath.Join(tmp, "src")
	// Two branches under one root. Only "keep" is what a narrowed restore may
	// bring back; "other" is the stand-in for a deselected sibling that must
	// NOT reappear.
	keep := filepath.Join(src, "keep")
	other := filepath.Join(src, "other")
	for _, d := range []string{keep, other} {
		if err := os.MkdirAll(d, 0o755); err != nil { //nolint:gosec // G301: test temp dir
			t.Fatalf("mkdir %s: %v", d, err)
		}
	}
	if err := os.WriteFile(filepath.Join(keep, "wanted.txt"), []byte("wanted"), 0o644); err != nil { //nolint:gosec // G306: test file
		t.Fatalf("write wanted: %v", err)
	}
	if err := os.WriteFile(filepath.Join(other, "unwanted.txt"), []byte("unwanted"), 0o644); err != nil { //nolint:gosec // G306: test file
		t.Fatalf("write unwanted: %v", err)
	}

	ctx := context.Background()
	env := append(os.Environ(), "RESTIC_PASSWORD=contract")
	run := func(args ...string) (string, error) {
		cmd := exec.CommandContext(ctx, "restic", args...) //nolint:gosec // fixed args, test-local paths
		cmd.Env = env
		out, err := cmd.CombinedOutput()
		return string(out), err
	}

	if out, err := run("-r", repo, "init"); err != nil {
		t.Fatalf("init: %v\n%s", err, out)
	}
	// The SNAPSHOT RECORDS ONLY THE ROOT. That is the state the old second pass
	// could not narrow out of.
	if out, err := run("-r", repo, "backup", "--no-scan", src); err != nil {
		t.Fatalf("backup: %v\n%s", err, out)
	}

	target := filepath.Join(tmp, "restored")
	// The selector names a directory BELOW the recorded path.
	out, err := run("-r", repo, "restore", "latest:"+filepath.ToSlash(keep), "--target", target)
	if err != nil {
		t.Fatalf("restore of a subtree below the recorded path failed: %v\n%s", err, out)
	}

	// The wanted file came back...
	if _, err := os.Stat(filepath.Join(target, "wanted.txt")); err != nil {
		t.Fatalf("wanted.txt not restored (so the subtree selector did not work): %v\n%s", err, out)
	}
	// ...and the sibling did NOT. This half is the point: if restic had widened
	// to the recorded root, unwanted.txt would be here and the narrowing fix
	// would be unsafe.
	if _, err := os.Stat(filepath.Join(target, "unwanted.txt")); err == nil {
		t.Fatal("the deselected sibling was restored too: the selector widened to the recorded root")
	}
	if _, err := os.Stat(filepath.Join(target, "other")); err == nil {
		t.Fatal("the deselected sibling directory was restored too")
	}
}

// TestRestoreCommonAncestorOfRecordedRoots pins the other half of the restore
// mapping's assumption: a node ABOVE the recorded paths is addressable too, and
// restoring it yields exactly the recorded roots - nothing beside them.
//
// WHY IT MATTERS. A file set whose selection is two sub-folders records two
// paths in its snapshot. The to-folder restore used to hand restic Paths[0] and
// nothing else, so half the set never arrived while the run was recorded a
// success. The fix restores their deepest common ancestor in one call, which is
// only correct if that node holds the recorded roots AND NOTHING ELSE - if
// restic instead re-read the live directory, a never-backed-up sibling would
// come back as old data and the fix would be worse than the bug.
//
// It does not: a snapshot tree contains only what was backed up. This proves it
// on the real engine rather than reasoning about it. Measured by hand first
// against restic 0.17 in the shipped image.
func TestRestoreCommonAncestorOfRecordedRoots(t *testing.T) {
	if _, err := exec.LookPath("restic"); err != nil {
		t.Skip("restic not on PATH")
	}
	if runtime.GOOS == "windows" {
		t.Skip("the <id>:<path> selector cannot carry a Windows drive letter")
	}
	tmp := t.TempDir()
	repo := filepath.Join(tmp, "repo")
	docs := filepath.Join(tmp, "src", "docs")
	// Three siblings; only two are backed up. The third stands for a folder the
	// user deselected, which is therefore alive on disk and absent from the
	// snapshot.
	for _, d := range []string{"keep-a", "keep-b", "never-backed-up"} {
		if err := os.MkdirAll(filepath.Join(docs, d), 0o755); err != nil { //nolint:gosec // G301: test temp dir
			t.Fatalf("mkdir %s: %v", d, err)
		}
		if err := os.WriteFile(filepath.Join(docs, d, "f.txt"), []byte(d), 0o644); err != nil { //nolint:gosec // G306: test file
			t.Fatalf("write %s: %v", d, err)
		}
	}

	env := append(os.Environ(), "RESTIC_PASSWORD=contract")
	run := func(args ...string) (string, error) {
		cmd := exec.CommandContext(context.Background(), "restic", args...) //nolint:gosec // fixed args, test-local paths
		cmd.Env = env
		out, err := cmd.CombinedOutput()
		return string(out), err
	}
	if out, err := run("-r", repo, "init"); err != nil {
		t.Fatalf("init: %v\n%s", err, out)
	}
	// TWO recorded roots, the multi-positional shape fileSetPositionals produces.
	if out, err := run("-r", repo, "backup", "--no-scan",
		filepath.Join(docs, "keep-a"), filepath.Join(docs, "keep-b")); err != nil {
		t.Fatalf("backup: %v\n%s", err, out)
	}

	target := filepath.Join(tmp, "restored")
	// The selector names their common ancestor, which is NOT a recorded path.
	out, err := run("-r", repo, "restore", "latest:"+filepath.ToSlash(docs), "--target", target)
	if err != nil {
		t.Fatalf("restore of the common ancestor failed: %v\n%s", err, out)
	}

	for _, d := range []string{"keep-a", "keep-b"} {
		if _, err := os.Stat(filepath.Join(target, d, "f.txt")); err != nil {
			t.Fatalf("%s/f.txt not restored, so one recorded root was dropped: %v\n%s", d, err, out)
		}
	}
	// The point of the test: the ancestor did not drag in the live sibling.
	if _, err := os.Stat(filepath.Join(target, "never-backed-up")); err == nil {
		t.Fatal("a never-backed-up sibling came back: restoring the common ancestor widens, and the to-folder fix would be unsafe")
	}
}
