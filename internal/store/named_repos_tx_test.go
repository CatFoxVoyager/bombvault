package store_test

import (
	"testing"

	"github.com/junkerderprovinz/bombvault/internal/store"
)

func namedRepoStore(t *testing.T) *store.Repo {
	t.Helper()
	db := store.OpenMem(t)
	if err := store.Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	return store.New(db)
}

func aNamedRepo(t *testing.T, r *store.Repo, name, loc string) store.OffsiteTarget {
	t.Helper()
	row, err := r.UpsertOffsiteTarget(store.OffsiteTarget{
		Role: store.RoleRepo, Name: name, Repo: loc, Enabled: true,
	})
	if err != nil {
		t.Fatalf("UpsertOffsiteTarget: %v", err)
	}
	return row
}

// TestDeleteNamedRepoIfUnusedRefusesWhileInUse expects a refusal, because
// without the repository the item's next backup would silently go to its domain
// repository and look like a working one.
func TestDeleteNamedRepoIfUnusedRefusesWhileInUse(t *testing.T) {
	r := namedRepoStore(t)
	repo := aNamedRepo(t, r, "Cold", "backups/cold")
	if _, err := r.UpsertTarget(store.Target{ContainerName: "plex"}); err != nil {
		t.Fatal(err)
	}
	if err := r.SetTargetRepo("plex", repo.ID); err != nil {
		t.Fatal(err)
	}

	n, err := r.DeleteNamedRepoIfUnused(repo.ID)
	if err != nil {
		t.Fatalf("DeleteNamedRepoIfUnused: %v", err)
	}
	if n != 1 {
		t.Fatalf("in-use count = %d, want 1", n)
	}
	if _, err := r.GetNamedRepo(repo.ID); err != nil {
		t.Fatalf("a refused delete must leave the row in place, got %v", err)
	}
}

func TestDeleteNamedRepoIfUnusedDeletesWhenUnused(t *testing.T) {
	r := namedRepoStore(t)
	repo := aNamedRepo(t, r, "Cold", "backups/cold")

	n, err := r.DeleteNamedRepoIfUnused(repo.ID)
	if err != nil {
		t.Fatalf("DeleteNamedRepoIfUnused: %v", err)
	}
	if n != 0 {
		t.Fatalf("in-use count = %d, want 0", n)
	}
	if _, err := r.GetNamedRepo(repo.ID); err == nil {
		t.Fatal("the row must be gone once nothing points at it")
	}
}

// TestSetNamedRepoLocationIfUnusedRefusesWhileInUse expects the move to be
// refused: existing snapshots stay where they are, so a live item's next backup
// would succeed into an empty repository.
func TestSetNamedRepoLocationIfUnusedRefusesWhileInUse(t *testing.T) {
	r := namedRepoStore(t)
	repo := aNamedRepo(t, r, "Cold", "backups/cold")
	if _, err := r.UpsertVMTarget(store.VMTarget{Name: "win11"}); err != nil {
		t.Fatal(err)
	}
	if err := r.SetVMRepo("win11", repo.ID); err != nil {
		t.Fatal(err)
	}

	n, err := r.SetNamedRepoLocationIfUnused(repo.ID, "backups/elsewhere")
	if err != nil {
		t.Fatalf("SetNamedRepoLocationIfUnused: %v", err)
	}
	if n != 1 {
		t.Fatalf("in-use count = %d, want 1", n)
	}
	back, err := r.GetNamedRepo(repo.ID)
	if err != nil {
		t.Fatal(err)
	}
	if back.Repo != "backups/cold" {
		t.Fatalf("a refused move must leave the location alone, got %q", back.Repo)
	}
}

func TestSetNamedRepoLocationIfUnusedWritesWhenUnused(t *testing.T) {
	r := namedRepoStore(t)
	repo := aNamedRepo(t, r, "Cold", "backups/cold")

	n, err := r.SetNamedRepoLocationIfUnused(repo.ID, "backups/elsewhere")
	if err != nil {
		t.Fatalf("SetNamedRepoLocationIfUnused: %v", err)
	}
	if n != 0 {
		t.Fatalf("in-use count = %d, want 0", n)
	}
	back, err := r.GetNamedRepo(repo.ID)
	if err != nil {
		t.Fatal(err)
	}
	if back.Repo != "backups/elsewhere" {
		t.Fatalf("location = %q, want the move written", back.Repo)
	}
}

// TestGuardedWritesCountEveryDomain covers all three tables the in-use query
// sums; a domain missing from it would let that domain's items lose their
// repository.
func TestGuardedWritesCountEveryDomain(t *testing.T) {
	for _, tc := range []struct {
		domain string
		point  func(*store.Repo, string) error
	}{
		{"containers", func(r *store.Repo, id string) error {
			if _, err := r.UpsertTarget(store.Target{ContainerName: "plex"}); err != nil {
				return err
			}
			return r.SetTargetRepo("plex", id)
		}},
		{"vms", func(r *store.Repo, id string) error {
			if _, err := r.UpsertVMTarget(store.VMTarget{Name: "win11"}); err != nil {
				return err
			}
			return r.SetVMRepo("win11", id)
		}},
		{"files", func(r *store.Repo, id string) error {
			set, err := r.CreateFileSet(store.FileSet{Name: "docs", Path: "user/docs", Enabled: true})
			if err != nil {
				return err
			}
			return r.SetFileSetRepo(set.ID, id)
		}},
	} {
		t.Run(tc.domain, func(t *testing.T) {
			r := namedRepoStore(t)
			repo := aNamedRepo(t, r, "Cold", "backups/cold")
			if err := tc.point(r, repo.ID); err != nil {
				t.Fatal(err)
			}
			n, err := r.DeleteNamedRepoIfUnused(repo.ID)
			if err != nil {
				t.Fatal(err)
			}
			if n != 1 {
				t.Fatalf("a %s item pointing at the repository must block the delete, count = %d", tc.domain, n)
			}
		})
	}
}

// TestCreateFileSetStoresRepository checks that the repository is part of the
// INSERT, so there is no window in which the new set sits on the domain
// repository.
func TestCreateFileSetStoresRepository(t *testing.T) {
	r := namedRepoStore(t)
	repo := aNamedRepo(t, r, "Cold", "backups/cold")

	set, err := r.CreateFileSet(store.FileSet{Name: "docs", Path: "user/docs", Enabled: true, Repo: repo.ID})
	if err != nil {
		t.Fatalf("CreateFileSet: %v", err)
	}
	back, err := r.GetFileSet(set.ID)
	if err != nil {
		t.Fatal(err)
	}
	if back.Repo != repo.ID {
		t.Fatalf("repo = %q, want the chosen repository stored by the insert itself", back.Repo)
	}
}
