package api

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/restic"
)

// A read-only caller must never write to the repository it is reading, and the
// one place that could was a retry nobody looks at.
//
// listSnapshots self-heals a stale lock: on a lock error it runs `restic
// unlock` and lists again. That is right for our own repositories, where an
// interrupted run leaves a marker nobody else will clear, and it is what fixed
// "Failed to load backups" after a crash.
//
// It is wrong for somebody else's. Two surfaces read a FOREIGN repository and
// both promise read-only in their own words on screen: the foreign restore
// session (foreign.go) and the receiver dashboard (receiver.go). Both call this
// function. So on a lock error, BombVault deleted lock files in another
// instance's repository, and a lock error there usually means the far instance
// is backing up RIGHT NOW - the marker is not stale, it is in use.
//
// It stayed invisible because of the shape of the bug rather than its size: a
// lock error is rare, and when the repair works the read succeeds, so the
// symptom is an operation that looks correct.
//
// Mode.NoLock is the declaration "I never write to this repository", and both
// foreign.go and receiver.go already set it. Keying the self-heal off it makes
// the promise hold for every future read-only caller, including the pull, whose
// source is a foreign repository by definition.
type lockOnceEngine struct {
	ResticEngine
	calls   int
	unlocks []string
}

func (e *lockOnceEngine) Snapshots(_ context.Context, _ string, _ restic.Mode) ([]restic.Snapshot, error) {
	e.calls++
	if e.calls == 1 {
		return nil, errors.New("Fatal: unable to create lock in backend: repository is already locked by PID 4711")
	}
	return []restic.Snapshot{{ID: "abc"}}, nil
}

func (e *lockOnceEngine) Unlock(_ context.Context, repo string, _ bool, _ restic.Mode) error {
	e.unlocks = append(e.unlocks, repo)
	return nil
}

func TestListSnapshotsNeverUnlocksAReadOnlyRepository(t *testing.T) {
	t.Run("a read-only caller gets the lock error, and nothing is written", func(t *testing.T) {
		eng := &lockOnceEngine{}
		svc := &Service{engine: eng}

		_, err := svc.listSnapshots(context.Background(), "rest:http://far:8000/repo", restic.Mode{NoLock: true})

		if len(eng.unlocks) != 0 {
			t.Fatalf("a NoLock caller must not unlock anything, got %v.\n"+
				"That is a write into somebody else's repository, and the two callers that set\n"+
				"NoLock both tell the operator on screen that this box only reads.", eng.unlocks)
		}
		if err == nil || !strings.Contains(strings.ToLower(err.Error()), "already locked") {
			t.Fatalf("the lock error must reach the caller instead of being repaired away, got %v", err)
		}
		if eng.calls != 1 {
			t.Fatalf("a read-only listing must not retry either, got %d listings", eng.calls)
		}
	})

	t.Run("our own repository still self-heals", func(t *testing.T) {
		// The other half, and it has to be asserted in the same file: a guard
		// that only proves the new restriction would pass just as well if the
		// self-heal had been deleted outright, which would bring back the
		// failure it was written for.
		eng := &lockOnceEngine{}
		svc := &Service{engine: eng}

		snaps, err := svc.listSnapshots(context.Background(), "/mnt/user/backups/containers", restic.Mode{})

		if err != nil {
			t.Fatalf("a stale lock on our own repository must still be cleared and the listing retried: %v", err)
		}
		if len(eng.unlocks) != 1 {
			t.Fatalf("expected exactly one unlock, got %v", eng.unlocks)
		}
		if len(snaps) != 1 {
			t.Fatalf("the retry must return the listing, got %v", snaps)
		}
	})
}
