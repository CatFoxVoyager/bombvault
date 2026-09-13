package api

import (
	"os"
	"path/filepath"
	"testing"
)

// The one fix in the sixth round that MOVES files and DELETES a directory, with
// a test for the first time.
//
// migrateLegacyDefs renames every *.def out of the pre-v5.4.1 folder into a new
// one and removes the old folder. It is paired with writeDefToStorage, which
// picks the destination per ITEM: the domain's own defs dir, or the item's named
// repository (#204). The legacy folder holds the WHOLE domain's definitions, so
// running the migration into a named repository moves every other item's
// definition somewhere Discover does not look - and then deletes the source.
// One backup of one item was enough.
func TestTheLegacyMigrationOnlyFeedsTheDomainFolder(t *testing.T) {
	root := t.TempDir()
	legacy := filepath.Join(root, "bombvault-defs")
	domain := filepath.Join(root, "repo", "def")
	named := filepath.Join(root, "cold", "def")
	for _, d := range []string{legacy, domain, named} {
		if err := os.MkdirAll(d, 0o755); err != nil { //nolint:gosec // G301: test temp dir
			t.Fatal(err)
		}
	}
	// Two definitions from before the layout change: one for the item that is
	// about to back up, one for an item that is not.
	for _, n := range []string{"plex.def", "sonarr.def"} {
		if err := os.WriteFile(filepath.Join(legacy, n), []byte("x"), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	// Into a NAMED repository: nothing may move, and the legacy folder stays.
	migrateLegacyDefsIfDomain(named, domain, legacy)
	for _, n := range []string{"plex.def", "sonarr.def"} {
		if _, err := os.Stat(filepath.Join(legacy, n)); err != nil {
			t.Fatalf("%s left the legacy folder on a write to a named repository: %v\n"+
				"That folder holds the WHOLE domain, so moving it because one item lives\n"+
				"elsewhere hides every other item's definition from Discover.", n, err)
		}
		if _, err := os.Stat(filepath.Join(named, n)); err == nil {
			t.Errorf("%s was moved into the named repository", n)
		}
	}

	// Into the DOMAIN folder: both move, and the legacy folder goes.
	migrateLegacyDefsIfDomain(domain, domain, legacy)
	for _, n := range []string{"plex.def", "sonarr.def"} {
		if _, err := os.Stat(filepath.Join(domain, n)); err != nil {
			t.Errorf("%s did not reach the domain folder: %v", n, err)
		}
	}
	if _, err := os.Stat(legacy); err == nil {
		t.Error("the emptied legacy folder was left behind")
	}
}
