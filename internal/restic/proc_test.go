//go:build !windows

package restic

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"testing"
	"time"
)

// TestConfigureProcGroup_KillsOnCancel is a best-effort regression check for
// #92/#97: cancelling ctx must reap the child (and its process group) promptly
// instead of leaving cmd.Wait blocked. It relies on the "sleep" binary being on
// PATH, which holds for the Linux CI runners this package ships on; it skips
// itself elsewhere rather than flaking CI.
func TestConfigureProcGroup_KillsOnCancel(t *testing.T) {
	sleepBin, err := exec.LookPath("sleep")
	if err != nil {
		t.Skip("sleep binary not found on PATH, skipping")
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, sleepBin, "30") //nolint:gosec // G204: sleepBin is the fixed "sleep" binary resolved via exec.LookPath, no user input
	configureProcGroup(cmd)

	if err := cmd.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}

	cancel()

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	select {
	case <-done:
		// Expected: killed promptly instead of running the full 30s sleep.
	case <-time.After(5 * time.Second):
		t.Fatal("cmd.Wait did not return within 5s of ctx cancel; child not reaped")
	}
}

// TestConfigureProcGroup_SendsSIGTERMNotSIGKILL checks that Cancel sends
// SIGTERM to the whole process group. restic handles SIGTERM as a clean abort
// without writing a snapshot; SIGKILL can leave a snapshot whose tree
// references a blob that never finished uploading (see configureProcGroup),
// and a signal to the leader alone leaves an rclone child running. A shell
// and a child shell each trap TERM and write a marker, so SIGKILL leaves no
// marker at all and a leader-only signal leaves the child's missing.
func TestConfigureProcGroup_SendsSIGTERMNotSIGKILL(t *testing.T) {
	shBin, err := exec.LookPath("sh")
	if err != nil {
		t.Skip("sh not found on PATH, skipping")
	}
	dir := t.TempDir()
	leaderMarker := filepath.Join(dir, "leader-caught-term")
	childMarker := filepath.Join(dir, "child-caught-term")
	ready := filepath.Join(dir, "traps-installed")

	ctx, cancel := context.WithCancel(context.Background())
	// The child touches `ready` once both traps are installed, and the test
	// waits for it before cancelling: cmd.Start only proves the fork
	// succeeded, and a TERM that arrives before a trap line hits the default
	// disposition, which looks the same as a failed fix.
	//
	// Both shells wait in loops of short sleeps. A shell runs a trap only once
	// its foreground command has finished, and the group kill reaches only the
	// processes that exist at that instant, so a TERM that lands just before a
	// shell forks its next sleep leaves that sleep running. With 50ms sleeps
	// the trap runs about 50ms later instead of after the whole wait.
	child := "trap 'touch " + childMarker + "; exit 0' TERM; touch " + ready + "; while :; do sleep 0.05; done"
	script := "trap 'touch " + leaderMarker + "; exit 0' TERM; " + shBin + " -c \"" + child + "\" & while :; do sleep 0.05; done"
	cmd := exec.CommandContext(ctx, shBin, "-c", script) //nolint:gosec // G204: fixed script, no user input
	configureProcGroup(cmd)

	if err := cmd.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}
	// The loops never end on their own, so whatever a failed run leaves
	// behind goes with the test.
	t.Cleanup(func() { _ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) })

	waitFor := func(path, what string, limit time.Duration) {
		t.Helper()
		deadline := time.Now().Add(limit)
		for {
			if _, err := os.Stat(path); err == nil {
				return
			}
			if time.Now().After(deadline) {
				t.Fatalf("%s (%s missing after %v)", what, filepath.Base(path), limit)
			}
			time.Sleep(5 * time.Millisecond)
		}
	}
	waitFor(ready, "the shells never installed their traps", 2*time.Second)
	cancel()

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("cmd.Wait did not return within 5s of ctx cancel")
	}

	if _, err := os.Stat(leaderMarker); err != nil {
		t.Fatalf("TERM trap did not run in the leader - Cancel is not sending a catchable SIGTERM: %v", err)
	}
	waitFor(childMarker, "TERM trap did not run in the child - Cancel is not signalling the whole process group", 2*time.Second)
}
