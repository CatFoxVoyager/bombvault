package api

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/config"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// Named repositories share the offsite_targets table, which only works because
// every off-site query filters on its role. Otherwise replication would copy
// backups into a primary location and the off-site CRUD would offer it as a
// target.
func TestNamedRepoRoleIsInvisibleToTheOffsiteQueries(t *testing.T) {
	st := newTestStore(t)

	named, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Role: store.RoleRepo, Name: "Cold storage", Repo: "b2:bucket/cold", Enabled: true,
	})
	if err != nil {
		t.Fatalf("create named repo: %v", err)
	}
	// A real off-site target, so an empty result cannot pass for a filtered one.
	if _, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Domain: "containers", Name: "Offsite", Repo: "b2:bucket/offsite", Enabled: true,
	}); err != nil {
		t.Fatalf("create offsite target: %v", err)
	}

	all, err := st.ListOffsiteTargets()
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 1 || all[0].Name != "Offsite" {
		t.Fatalf("ListOffsiteTargets = %v, want only the replication destination", all)
	}
	forDomain, err := st.OffsiteTargetsForDomain("containers")
	if err != nil {
		t.Fatal(err)
	}
	if len(forDomain) != 1 || forDomain[0].Name != "Offsite" {
		t.Fatalf("OffsiteTargetsForDomain = %v, want only the replication destination", forDomain)
	}
	if _, found, _ := st.GetOffsiteTarget(named.ID); found {
		t.Fatal("a named repository must not be reachable through GetOffsiteTarget")
	}

	repos, err := st.ListNamedRepos()
	if err != nil {
		t.Fatal(err)
	}
	if len(repos) != 1 || repos[0].ID != named.ID {
		t.Fatalf("ListNamedRepos = %v, want only the named repository", repos)
	}
}

// An override that cannot be resolved is an error, never the domain
// repository. A fallback would look exactly like a working backup with the
// snapshot in the wrong place, and nobody would notice until a restore.
func TestItemRepoPathRefusesRatherThanFallingBack(t *testing.T) {
	dir := t.TempDir()
	st := newTestStore(t)
	svc := NewService(config.Config{
		AppKey:        strings.Repeat("a", 64),
		DataDir:       dir,
		HostMountRoot: dir,
	}, st, nil, nil, nil)

	settings, err := st.GetSettings()
	if err != nil {
		t.Fatal(err)
	}
	settings.ContainersPath = "backups/containers"
	if err := st.UpdateSettings(settings); err != nil {
		t.Fatal(err)
	}

	t.Run("no override takes the domain repository", func(t *testing.T) {
		got, err := svc.containerRepoPath(settings, store.Target{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.HasSuffix(got, "backups/containers") {
			t.Fatalf("repo = %q, want the domain repository", got)
		}
	})

	t.Run("an id that does not exist is an error, not the domain repository", func(t *testing.T) {
		_, err := svc.containerRepoPath(settings, store.Target{Repo: "ffffffffffffffffffffffffffffffff"})
		if err == nil {
			t.Fatal("a dangling override must fail loudly; falling back would look like a working backup")
		}
		if !strings.Contains(err.Error(), "no longer exists") {
			t.Fatalf("error = %v, want it to say the repository is gone", err)
		}
	})

	t.Run("a switched-off repository is an error too", func(t *testing.T) {
		off, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
			Role: store.RoleRepo, Name: "Paused", Repo: "backups/paused", Enabled: false,
		})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := svc.containerRepoPath(settings, store.Target{Repo: off.ID}); err == nil {
			t.Fatal("a switched-off repository must fail rather than divert the backup")
		}
	})

	t.Run("a live override resolves to its own location", func(t *testing.T) {
		on, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
			Role: store.RoleRepo, Name: "Cold", Repo: "backups/cold", Enabled: true,
		})
		if err != nil {
			t.Fatal(err)
		}
		got, err := svc.containerRepoPath(settings, store.Target{Repo: on.ID})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.HasSuffix(got, "backups/cold") {
			t.Fatalf("repo = %q, want the named repository's own location", got)
		}
	})
}

// A container pointed at a named repository keeps its snapshots there. An
// overview that read only the domain repository would report it as never
// backed up.
func TestDomainReposInUseCoversEveryItemsRepository(t *testing.T) {
	dir := t.TempDir()
	st := newTestStore(t)
	svc := NewService(config.Config{
		AppKey:        strings.Repeat("a", 64),
		DataDir:       dir,
		HostMountRoot: dir,
	}, st, nil, nil, nil)

	settings, err := st.GetSettings()
	if err != nil {
		t.Fatal(err)
	}
	settings.ContainersPath = "backups/containers"
	if err := st.UpdateSettings(settings); err != nil {
		t.Fatal(err)
	}

	used, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Role: store.RoleRepo, Name: "Cold", Repo: "backups/cold", Enabled: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	// Nothing points at this one, so the overview must not scan it.
	if _, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Role: store.RoleRepo, Name: "Unused", Repo: "backups/unused", Enabled: true,
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := st.UpsertTarget(store.Target{ContainerName: "plex"}); err != nil {
		t.Fatal(err)
	}
	if err := st.SetTargetRepo("plex", used.ID); err != nil {
		t.Fatal(err)
	}

	repos, skipped, err := svc.domainReposInUse(settings, "containers")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(skipped) != 0 {
		t.Fatalf("skipped = %v, want nothing skipped: both repositories are on and resolve", skipped)
	}
	if len(repos) != 2 {
		t.Fatalf("repos = %v, want the domain repository and the one in use", repos)
	}
	if !strings.HasSuffix(repos[0].Loc, "backups/containers") {
		t.Fatalf("repos[0] = %q, want the domain repository first", repos[0].Loc)
	}
	if !strings.HasSuffix(repos[1].Loc, "backups/cold") {
		t.Fatalf("repos[1] = %q, want the repository the container points at", repos[1].Loc)
	}
}

// A container or VM gets its stored row on its first backup, but its
// repository has to be chosen before that run puts the data somewhere else.
func TestRepoCanBeChosenBeforeTheFirstBackup(t *testing.T) {
	st := newTestStore(t)
	named, err := st.UpsertOffsiteTarget(store.OffsiteTarget{
		Role: store.RoleRepo, Name: "Cold", Repo: "backups/cold", Enabled: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	t.Run("container with no target row yet", func(t *testing.T) {
		if err := st.SetTargetRepo("never-backed-up", named.ID); err != nil {
			t.Fatalf("choosing a repository before the first backup must work: %v", err)
		}
		tg, err := st.GetTargetByContainer("never-backed-up")
		if err != nil {
			t.Fatalf("the row must exist afterwards: %v", err)
		}
		if tg.Repo != named.ID {
			t.Fatalf("stored repo = %q, want %q", tg.Repo, named.ID)
		}
	})

	t.Run("VM with no row yet", func(t *testing.T) {
		if err := st.SetVMRepo("fresh-vm", named.ID); err != nil {
			t.Fatalf("choosing a repository before the first backup must work: %v", err)
		}
		vm, err := st.GetVMTargetByName("fresh-vm")
		if err != nil {
			t.Fatalf("the row must exist afterwards: %v", err)
		}
		if vm.Repo != named.ID {
			t.Fatalf("stored repo = %q, want %q", vm.Repo, named.ID)
		}
	})
}

// The container list builds its view in two places: for containers Docker
// reports and for stored targets Docker no longer knows. Both must carry the
// item's repository, or the picker on a live container reads back the domain
// repository whatever was stored. This scans the source because reaching the
// first branch otherwise needs a fake Docker.
func TestContainerViewCarriesTheRepoOnBothBranches(t *testing.T) {
	raw, err := os.ReadFile("handlers.go")
	if err != nil {
		t.Fatalf("read handlers.go: %v", err)
	}
	src := string(raw)
	// Any run of spaces matches, because gofmt realigns struct literal values
	// when a longer field name is added.
	for _, want := range []*regexp.Regexp{
		regexp.MustCompile(`v\.Repo\s*=\s*t\.Repo`), // the live-container merge
		regexp.MustCompile(`Repo:\s+t\.Repo,`),      // the not-installed literal
	} {
		if !want.MatchString(src) {
			t.Errorf("the container view no longer carries the per-item repository on one of its two branches (%s).\n"+
				"The picker then reads back the domain repository for an item that is not on it, which is the\n"+
				"exact misreading the control exists to prevent.", want)
		}
	}
}

// Moving an item that already has backups splits its history: the old
// snapshots stay behind, unseen by the interface and never pruned. The server
// has to refuse, because an item rebuilt by Discover after losing /config has
// snapshots but no run rows, and the interface's lock stays open for it.
func TestRepoRefusedOnceAnItemHasBackups(t *testing.T) {
	raw, err := os.ReadFile("handlers.go")
	if err != nil {
		t.Fatalf("read handlers.go: %v", err)
	}
	src := string(raw)
	if !strings.Contains(src, "had, bErr := hasBackups()") {
		t.Error("applyItemRepo no longer refuses an item that already has backups")
	}
	for _, want := range []string{
		"h.svc.containerHasBackups(r.Context(), name)",
		"h.svc.vmHasBackups(r.Context(), name)",
	} {
		if !strings.Contains(src, want) {
			t.Errorf("one of the two domains no longer passes its has-backups check (%s).\n"+
				"Its doc comment claims the refusal either way, which is how the gap survived\n"+
				"three commits and two reviews.", want)
		}
	}
}
