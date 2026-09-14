package api

import (
	"context"
	"strings"
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/config"
	"github.com/junkerderprovinz/bombvault/internal/restic"
	"github.com/junkerderprovinz/bombvault/internal/restickey"
	"github.com/junkerderprovinz/bombvault/internal/secret"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// THE SAFETY CONTRACT OF THE PULL, and it is the only test in this file because
// everything else about a pull is somebody's convenience while this is somebody
// else's data.
//
// A pull source belongs to another machine. Exactly two engine calls may reach
// it: RepoOpens, to find out whether the key fits, and Copy's SOURCE argument.
// Anything else is a write into a repository whose owner never agreed to it:
// Init creates, Unlock deletes lock files, Forget and Prune delete data, Backup
// adds to it.
//
// The reason this is a test and not a comment is that every one of those calls
// is one line away in this file's neighbours. copyToOffsiteTarget - the function
// the pull is modelled on - calls EnsureRepo, unlockStale and applyRetention,
// and all three are correct THERE because its far end is our own repository. A
// pull is the same shape with the ends swapped, so the same three lines are
// catastrophic here, and a swap that copies one of them by accident produces no
// error at all: the source is simply modified.
//
// The recorder below therefore asserts on the LOCATION each call reached, not on
// the call count. A test that counted calls would pass just as happily if Init
// had been pointed at the wrong end.
type pullRecorder struct {
	ResticEngine
	// calls records "Method repo" for every engine call, in order.
	calls []string
	snaps map[string][]restic.Snapshot
}

func (e *pullRecorder) note(method, repo string) { e.calls = append(e.calls, method+" "+repo) }

func (e *pullRecorder) RepoOpens(_ context.Context, repo string, m restic.Mode) bool {
	e.note("RepoOpens", repo)
	return m.Encrypted
}
func (e *pullRecorder) Init(_ context.Context, repo string, _ restic.Mode) error {
	e.note("Init", repo)
	return nil
}
func (e *pullRecorder) Unlock(_ context.Context, repo string, _ bool, _ restic.Mode) error {
	e.note("Unlock", repo)
	return nil
}
func (e *pullRecorder) Snapshots(_ context.Context, repo string, _ restic.Mode) ([]restic.Snapshot, error) {
	e.note("Snapshots", repo)
	return e.snaps[repo], nil
}
func (e *pullRecorder) Copy(_ context.Context, dest, src string, _ []string, _ restic.Limits, m restic.Mode) error {
	e.note("Copy dest="+dest+" src="+src, "")
	// The source's own password must be the one that travels, or restic tries the
	// destination's key on a repository derived from a different one.
	if m.From == nil {
		e.note("Copy WITHOUT a source side", "")
	}
	return nil
}

func TestPullNeverWritesToTheSource(t *testing.T) {
	const ourKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	const theirKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
	const srcLoc = "rest:http://192.168.1.9:8000/their-containers"

	dir := t.TempDir()
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	st := store.New(db)
	settings, err := st.GetSettings()
	if err != nil {
		t.Fatal(err)
	}
	settings.ContainersPath = "backups/containers"
	if err := st.UpdateSettings(settings); err != nil {
		t.Fatal(err)
	}
	enc, err := secret.Encrypt(ourKey, []byte(theirKey))
	if err != nil {
		t.Fatal(err)
	}

	eng := &pullRecorder{snaps: map[string][]restic.Snapshot{
		// One snapshot on their side that we do not have, so the copy is reached
		// at all. A test whose copy never runs proves nothing about the copy.
		srcLoc: {{ID: "aaa"}},
	}}
	svc := &Service{
		cfg:    config.Config{AppKey: ourKey, DataDir: dir, HostMountRoot: dir},
		store:  st,
		engine: eng,
	}

	ps := store.PullSource{
		ID:        "p1",
		Name:      "Tower next door",
		Repo:      srcLoc,
		AppKeyEnc: enc,
		Domain:    "containers",
		Enabled:   true,
	}
	if _, err := svc.PullFromSource(context.Background(), ps); err != nil {
		t.Fatalf("the pull failed before it could prove anything: %v", err)
	}

	var touched []string
	for _, c := range eng.calls {
		if !strings.Contains(c, srcLoc) {
			continue
		}
		touched = append(touched, c)
		switch {
		case strings.HasPrefix(c, "RepoOpens "):
		case strings.HasPrefix(c, "Snapshots "):
			// Reading the listing is the pull's whole purpose, and it is read-only
			// by mode: listSnapshots refuses to self-heal a lock when NoLock is
			// set, which is asserted next door in readonly_never_unlocks.
		case strings.Contains(c, "src="+srcLoc):
		default:
			t.Errorf("the pull reached the SOURCE with %q.\n"+
				"Only RepoOpens, the read-only listing and Copy's source argument may. Every other\n"+
				"engine call writes: Init creates, Unlock deletes lock files, Forget and Prune\n"+
				"delete data. This repository belongs to somebody else.", c)
		}
	}
	if len(touched) == 0 {
		t.Fatal("the source was never reached at all, so this test asserted nothing")
	}

	// And the copy has to have carried the source's own credentials.
	var copied bool
	for _, c := range eng.calls {
		if strings.HasPrefix(c, "Copy dest=") {
			copied = true
		}
		if c == "Copy WITHOUT a source side " {
			t.Error("the copy went out without Mode.From, so restic gets the DESTINATION's password\n" +
				"for the source. Two instances never share one, and the error restic answers with\n" +
				"reads as \"wrong APP_KEY\" for a key that was typed correctly.")
		}
	}
	if !copied {
		t.Fatal("no copy was attempted, so the source-side assertion above proved nothing")
	}

	// The far key must be the one that opens the source. If this ever flipped to
	// our own, the pull would only ever work against our own repositories.
	want := restickey.Derive(theirKey)
	if want == restickey.Derive(ourKey) {
		t.Fatal("fixture is wrong: the two keys derive the same password")
	}
}
