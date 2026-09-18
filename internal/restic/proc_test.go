//go:build !windows

package restic

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
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
// SIGTERM, which restic handles as a clean abort without writing a snapshot,
// and not SIGKILL, which can leave a snapshot whose tree references a blob
// that never finished uploading (see configureProcGroup). SIGKILL cannot be
// caught, so a shell that traps TERM and writes a marker file tells the two
// apart: the marker exists only if the trap ran.
func TestConfigureProcGroup_SendsSIGTERMNotSIGKILL(t *testing.T) {
	shBin, err := exec.LookPath("sh")
	if err != nil {
		t.Skip("sh not found on PATH, skipping")
	}
	dir := t.TempDir()
	marker := filepath.Join(dir, "caught-term")
	ready := filepath.Join(dir, "trap-installed")

	ctx, cancel := context.WithCancel(context.Background())
	// The shell touches `ready` after installing the trap, and the test waits
	// for it before cancelling: cmd.Start only proves the fork succeeded, and a
	// TERM that arrives before the trap line hits the default disposition,
	// which looks the same as a failed fix.
	//
	// The wait is a loop of short sleeps. A shell runs a trap only once its
	// foreground command has finished, and the group kill reaches only the
	// processes that exist at that instant, so a TERM that lands between
	// `touch` and the fork of the next sleep leaves that sleep running. With
	// 50ms sleeps the trap runs within 50ms instead of after the whole wait.
	// The loop also keeps BusyBox ash from exec()-replacing the shell with its
	// final command, which would take the trap with it.
	script := "trap 'touch " + marker + "; exit 0' TERM; touch " + ready + "; while :; do sleep 0.05; done"
	cmd := exec.CommandContext(ctx, shBin, "-c", script) //nolint:gosec // G204: fixed script, no user input
	configureProcGroup(cmd)

	if err := cmd.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}
	waitUntil := time.Now().Add(2 * time.Second)
	for {
		if _, err := os.Stat(ready); err == nil {
			break
		}
		if time.Now().After(waitUntil) {
			t.Fatal("shell never reached the trap line (ready marker missing) within 2s")
		}
		time.Sleep(5 * time.Millisecond)
	}
	cancel()

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("cmd.Wait did not return within 5s of ctx cancel")
	}

	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("TERM trap did not run (marker file missing) - Cancel is not sending a catchable SIGTERM: %v", err)
	}
}
