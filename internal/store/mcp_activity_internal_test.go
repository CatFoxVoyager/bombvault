package store

import (
	"slices"
	"testing"
)

// A key's log written before the split keeps its starts and cancels that went
// through, and the gate's own refusals, under the larger cap; every other call
// counts as routine.
func TestUpgradeSortsAKeysLogIntoActionsAndTheRest(t *testing.T) {
	db := OpenMem(t)
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	for _, stmt := range []string{
		`DROP INDEX idx_mcp_key_events_routine`,
		`ALTER TABLE mcp_key_events DROP COLUMN routine`,
		`DELETE FROM schema_migrations WHERE version > ?`,
	} {
		if _, err := db.Exec(stmt, mcpActivityMigration); err != nil {
			t.Fatalf("%s: %v", stmt, err)
		}
	}
	for _, row := range [][3]string{
		{"get_activity", "ok", ""},
		{"start_backup", "ok", ""},
		{"cancel_backup", "ok", "run1"},
		{"get_status", "failed", ""},
		{"start_backup", "cooldown", ""},
		{"", "rate_limited", ""},
	} {
		if _, err := db.Exec(`INSERT INTO mcp_key_events (key_id, at, tool, outcome, run_id) VALUES ('k1', 2000, ?, ?, ?)`,
			row[0], row[1], row[2]); err != nil {
			t.Fatal(err)
		}
	}

	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}

	rows, err := db.Query(`SELECT tool, outcome FROM mcp_key_events WHERE routine = 1 ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close() //nolint:errcheck // rows.Close on a completed query is always nil for SQLite
	var routine []string
	for rows.Next() {
		var tool, outcome string
		if err := rows.Scan(&tool, &outcome); err != nil {
			t.Fatal(err)
		}
		routine = append(routine, tool+" "+outcome)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	want := []string{"get_activity ok", "get_status failed", "start_backup cooldown"}
	if !slices.Equal(routine, want) {
		t.Fatalf("routine rows = %v, want %v", routine, want)
	}
}
