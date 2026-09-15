// Selection encoding for the flat backupPaths set: a bare entry is an included
// root, an entry prefixed with "!" is an explicitly deselected sub-branch.
//
// Everything in this file is PURE (no receiver, no store access, no config) so
// the prefix semantics stay table-testable in isolation — the store treats
// entries as opaque strings and every reader decodes through SplitExclusion
// (01-CONTEXT.md encoding Q2). This file owns the meaning of "!"; the store's
// doc comment only points here, and internal/store never interprets entries.
//
// Paths are always Linux paths (container-translated before they get here), so
// plain strings.HasPrefix on "/"-joined forms is correct regardless of the
// build OS — the same POSIX-only reasoning as internal/paths (paths.go:31-32),
// and what makes the selection tables safe on the Windows dev box.

package api

import (
	"path"
	"sort"
	"strings"
)

// ExclusionPrefix marks a deselected sub-branch inside the flat backupPaths
// set: "!/c/appdata/plex/transcoding". One list, two entry classes — zero
// schema or wire change to the stored selection (SELECT-02; 01-CONTEXT.md
// encoding Q1). Absolute paths make the prefix unambiguous: no legitimate path
// starts with "!", so the first byte classifies the entry.
const ExclusionPrefix = "!"

// SplitExclusion splits one flat-set entry into its bare path and its class:
// "!/mnt/x" → ("/mnt/x", true); "/mnt/x" → ("/mnt/x", false). A bare "!" (no
// path) parses to ("", true) — rejecting that is the CALLER's job
// (service.SetBackupPaths), so this stays a pure parser with no error path.
func SplitExclusion(entry string) (bare string, excluded bool) {
	if strings.HasPrefix(entry, ExclusionPrefix) {
		return entry[len(ExclusionPrefix):], true
	}
	return entry, false
}

// isStrictDescendant reports whether child lies strictly below ancestor, on
// cleaned POSIX paths. Appending "/" to the ancestor is what makes the test
// strict — /c/plex never matches /c/plex2/x — the exact primitive of
// internal/paths.Resolve (paths.go:44-48).
func isStrictDescendant(child, ancestor string) bool {
	c, a := path.Clean(child), path.Clean(ancestor)
	if c == a {
		return false
	}
	return strings.HasPrefix(c, a+"/")
}

// PruneMaximal drops every path that is a strict descendant of another path in
// the list, preserving the first-occurrence order of the survivors. The caller
// runs it PER CLASS (includes and exclusions never prune each other): an
// included root and an excluded branch deliberately coexist — that pair IS the
// "mount kept, volatile subfolder deselected" selection (01-CONTEXT.md
// encoding Q4). Duplicates are not descendants of each other and survive here;
// NormalizeSelection dedupes.
func PruneMaximal(paths []string) []string {
	out := make([]string, 0, len(paths))
	for _, p := range paths {
		maximal := true
		for _, q := range paths {
			if isStrictDescendant(p, q) {
				maximal = false
				break
			}
		}
		if maximal {
			out = append(out, p)
		}
	}
	return out
}

// NormalizeSelection canonicalizes a mixed, already container-translated entry
// list into the stored form: split classes → dedupe → per-class maximal-root
// pruning → canonical order (includes sorted lexically, then exclusions sorted
// lexically, each re-prefixed). Equal selections therefore store byte-identical
// sets no matter what order the client sent, and normalizing an
// already-normalized list is the identity — readers and re-saves can never
// drift the stored form.
//
// An orphan exclusion (no included ancestor) is PRESERVED, not dropped: an
// exclusions-only list is the "item explicitly deselected" carrier that keeps
// it distinct from an empty list = auto-detection (01-CONTEXT.md encoding Q3).
func NormalizeSelection(entries []string) []string {
	// Never nil: an empty selection must persist as [] — the auto-detection
	// boundary in store.SetBackupPaths.
	out := make([]string, 0, len(entries))
	var includes, excludes []string
	for _, e := range entries {
		bare, excluded := SplitExclusion(e)
		if bare == "" {
			continue // a bare "!" carries no path; the setter rejects it, normalization just skips
		}
		bare = path.Clean(bare)
		if excluded {
			excludes = append(excludes, bare)
		} else {
			includes = append(includes, bare)
		}
	}
	includes = dedupe(includes)
	excludes = dedupe(excludes)
	// Resolve include-vs-exclusion contradictions BEFORE pruning, or pruning
	// resolves them silently and wrongly. PruneMaximal only ever compares within
	// one class, so an include lying below an exclusion that itself lies below
	// another include was dropped as "redundant" while the exclusion between
	// them survived - and the backup then carved that branch out of the argv.
	// The stored form no longer held the information, so nothing could heal it:
	// the folder was in no snapshot, and the UI had said Saved.
	//
	// The flat encoding cannot express "back up this branch EXCEPT that folder,
	// but keep this one inside it": a restic --exclude swallows everything below
	// it, with no way to punch a hole back through. So one of the two has to
	// go, and it is the exclusion - the same resolution the tree's own checkbox
	// performs when it is clicked on an excluded node (applyToggle deletes every
	// COVERING exclusion), so the two routes to the same intent agree. Choosing
	// the other way would mean answering "back up this folder" by not backing it
	// up, and for a backup tool capturing too much is the safer error.
	//
	// Only exclusions with an include strictly BELOW them are affected. An
	// orphan exclusion with no include under it keeps its storage role as the
	// explicitly-deselected carrier (encoding Q3), and when includes is empty
	// nothing can lie below anything, so that carrier is untouched by
	// construction.
	kept := make([]string, 0, len(excludes))
	for _, e := range excludes {
		contradicted := false
		for _, i := range includes {
			if isStrictDescendant(i, e) {
				contradicted = true
				break
			}
		}
		if !contradicted {
			kept = append(kept, e)
		}
	}
	excludes = kept
	includes = PruneMaximal(includes)
	excludes = PruneMaximal(excludes)
	sort.Strings(includes)
	sort.Strings(excludes)
	out = append(out, includes...)
	for _, p := range excludes {
		out = append(out, ExclusionPrefix+p)
	}
	return out
}

// includesOnly returns the bare (included) half of a stored flat selection —
// the list a backup is actually built from. Exclusion entries are dropped, not
// transformed: exclusions never become restic positionals (the unchanged half
// of the original L1/L14 lock — no exclusion ever becomes a positional target).
// That lock is a PRODUCT choice, not a restic limitation — restic excludes DO
// filter content within positional sources (TestPositionalExcludesKeepSourceDir
// proves it against real restic: the positional source survives in Paths while
// the excluded file is filtered from the snapshot). As of the 2026-09-09
// gap-closure decision (review finding WR-01), exclusion branches strictly
// below an included root ARE encoded as --exclude at backup time by
// excludedBranches; includesOnly itself is unchanged — positionals remain the
// includes, so snapshot Paths keep the stable maximal-root restore-selector
// shape. The accepted tradeoff: the derived patterns land in the snapshot's
// restic Excludes metadata (the exclusions editor's user-owned surface).
// Readers that need the whole picture call SplitExclusion themselves.
func includesOnly(entries []string) []string {
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		if bare, excluded := SplitExclusion(e); !excluded && bare != "" {
			out = append(out, bare)
		}
	}
	return out
}

// excludedBranches returns the bare paths of the EXCLUSION entries in a stored
// flat selection that are strict descendants of at least one INCLUDE entry in
// the same list — the branches a backup must carve out of its positional
// sources. It is the enforcement half of the stored selection (review finding
// WR-01, plan 01-05): the "!"-prefixed branch is what the UI advertises as
// excluded, and before the 2026-09-09 gap-closure user decision the backup
// engine compiled the selection to positionals only, so a mixed selection
// stored and advertised the exclusion while the snapshot silently contained
// the branch anyway — backing up what the user deselected. As of that decision
// these branches ARE encoded as restic --exclude patterns on the backup argv
// (service.Backup's BackupDeps literal is the only production caller).
//
// The returned paths land in the snapshot's restic Excludes metadata — the
// user-owned surface the exclusions editor previews — so snapshots of mixed
// selections carry machine-derived patterns the user did not write there. That
// tradeoff is accepted by the 2026-09-09 user decision in exchange for content
// correctness: a backup that silently includes the "excluded" branch is the
// worse failure.
//
// Two stored shapes are deliberately NOT emitted (pinned contract, see
// TestExcludedBranches):
//
//   - an exclusion EQUAL to an included root: isStrictDescendant is strict by
//     design, and an exact include+exclude pair is a contradictory selection
//     the normalization deliberately keeps as-is per class (01-CONTEXT.md
//     encoding Q4). Emitting an exclude equal to the positional source would
//     ask restic to filter its own source root; the Phase 2 tree UI makes the
//     pair unconstructable.
//   - an ORPHAN exclusion (no included ancestor): it cannot carve content out
//     of any positional (its root is not being backed up), so a pattern for it
//     would be pure noise in the snapshot's Excludes metadata. Orphan
//     exclusions keep their storage role as the explicit-none carrier instead
//     (01-CONTEXT.md encoding Q3).
//
// Survivors keep stored (input) order, so the derived argv tail is
// deterministic. Never nil: the caller appends the result unconditionally.
//
// Glob semantics: restic patterns ARE globs, and these patterns are DERIVED
// from a folder the user clicked - so they are escaped before they leave here
// (escapeGlobLiteral). The old reasoning, that a derived pattern simply carries
// the same glob semantics user-WRITTEN exclude patterns already have, held only
// for patterns somebody typed on purpose. Nobody types a folder name meaning it
// as a pattern, and measured against real restic a raw one goes wrong three
// different ways - see escapeGlobLiteral for what was measured.
func excludedBranches(entries []string) []string {
	out := make([]string, 0, len(entries))
	var includes []string
	for _, e := range entries {
		if bare, excluded := SplitExclusion(e); !excluded && bare != "" {
			includes = append(includes, bare)
		}
	}
	for _, e := range entries {
		bare, excluded := SplitExclusion(e)
		if !excluded || bare == "" {
			continue
		}
		for _, inc := range includes {
			if isStrictDescendant(bare, inc) {
				out = append(out, escapeGlobLiteral(bare))
				break
			}
		}
	}
	return out
}

// escapeGlobLiteral turns a real path into a restic --exclude pattern that
// matches THAT path and nothing else, by backslash-escaping the characters
// restic reads as glob syntax.
//
// It exists because these patterns are derived from a folder the user ticked
// off in the tree, not written by anyone as a pattern. Measured against the
// restic in the shipped image, an unescaped one goes wrong three ways, each
// worse than the last:
//
//   - it can miss its own folder. "Inception (2010) [1080p]" excluded by its
//     own name stayed IN the snapshot: "[1080p]" is a one-character class, so
//     the pattern cannot match the seven literal characters it came from. The
//     branch the UI and the stored "!" entry both call excluded is backed up on
//     every run.
//   - it can hit folders the user never deselected. Deselecting "Season [01]"
//     dropped the siblings "Season 0" and "Season 1" from the snapshot while
//     "Season [01]" itself stayed in it - the exact inverse of what was asked
//     for, and silent. "star*name" likewise took "starXname" with it, and
//     "q?mark" took "qYmark".
//   - it can break the backup outright. A name with an unmatched bracket
//     ("Movies [2024") is an invalid pattern, and restic refuses the whole run
//     with "Fatal: --exclude: invalid pattern(s) provided" - so the item stops
//     being backed up from the moment that checkbox is clicked.
//
// Escaping fixed all three in the same measurement: "\[1080p\]" excluded
// exactly its own folder, "star\*name" left "starXname" alone, "q\?mark" left
// "qYmark" alone. TestEscapeGlobLiteral pins the mapping and
// TestDerivedExcludePatternsAreLiteral in internal/restic pins the behaviour
// against the real engine.
//
// The backslash escapes itself. That one is reasoned rather than measured (the
// shell layers between here and the engine kept collapsing a doubled backslash
// before restic saw it), but leaving it alone is provably wrong: the pattern
// "back\slash" reads "\s" as an escaped "s" and does not match the folder
// "back\slash", which was measured. A backslash in a folder name on Unraid is
// rare enough that either way is a corner; escaping is the one that follows the
// rule the other four follow.
//
// Only for MACHINE-DERIVED patterns. The exclusions editor's own user-written
// patterns are globs on purpose and never pass through here.
func escapeGlobLiteral(p string) string {
	var b strings.Builder
	b.Grow(len(p))
	for _, r := range p {
		switch r {
		case '\\', '*', '?', '[', ']':
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}

// fileSetPositionals compiles a stored FILE SET selection into the restic
// positional source list (Phase 4 file-sets parity, D-05) — the single
// compile helper the files domain has, consumed only by service.BackupFileSet
// (manual, batch, and Backup Everything all funnel there).
//
//	nil selected (the NULL column, D-03)  ⇒ []string{src}   — the legacy argv,
//	                                        byte-identical to the pre-phase
//	                                        single-positional backup;
//	otherwise                             ⇒ the selection's maximal-root
//	                                        includes, re-anchored against src.
//
// The list the caller passes was persisted by the tree (plan 02's PATCH
// boundary normalizes before storing), but the compile never TRUSTS that: it
// re-runs the shared NormalizeSelection first — canonical order, dedupe, and
// the maximal-root prune all come from the one existing implementation, never
// a second files-domain pruning site — and then re-anchors every include
// against the FRESHLY resolved set root src (RESEARCH Pitfall 2 layer 2,
// threat T-04-01). Re-anchoring is load-bearing because the anchor the entries
// were validated against (set.Path) is user-mutable: a selection saved under
// root A, followed by a Path edit to root B, must not silently broaden the
// backup scope to folders under A. Containment is segment-aligned — equality
// or isStrictDescendant, so "/data/doc" never matches a root "/data/docs"
// (the raw-prefix trap).
//
// A list that filters to empty — every entry stale, or a zero-include set —
// falls back to []string{src}: an unanchored positional is never emitted
// (the write-side refusal of a tree-written empty selection is D-06, plan 02;
// this is the read-side defense that keeps a bad row from zeroing the argv).
//
// Deterministic: the same stored set always yields the same positional list in
// the same canonical (sorted) order, so snapshot Paths are reproducible across
// saves, reloads, and restarts. Pure: no receiver, no store access, no config.
func fileSetPositionals(selected []string, src string) []string {
	if selected == nil {
		return []string{src}
	}
	positionals := make([]string, 0, len(selected))
	for _, p := range includesOnly(NormalizeSelection(selected)) {
		if p == src || isStrictDescendant(p, src) {
			positionals = append(positionals, p)
		}
	}
	if len(positionals) == 0 {
		return []string{src}
	}
	return positionals
}

// mapRestorePaths intersects the stored selection (the positional truth
// recorded at backup time, tg.AppdataPaths) with the CHOSEN snapshot's
// recorded Paths, producing the restore selector list plus the stored paths
// that could not be mapped. RESTORE-01: the stored list must never be replayed
// verbatim as restore selectors — restic's `restore <id>:<path>` selector must
// come from the snapshot's Paths (restic.go RestoreSubtreeToArgs doc), so a
// selection reshaped since the snapshot was taken would miss and fail the
// restore mid-loop AFTER the container has been stopped and removed. Mapping
// resolves that here, synchronously, before anything destructive.
//
// The returned mapped list is in SNAPSHOT-path form. Deterministic two-pass
// semantics (01-RESEARCH R5):
//
//	pass 1 — every snapshot path q (in the snapshot's own Paths order) that
//	         equals or lies strictly below some stored path p is restored
//	         as-is: a snapshot path inside a stored root is exactly what the
//	         user backed up, and is a valid selector;
//	pass 2 — every stored path p not already covered by pass 1 is restored AS
//	         ITSELF, provided the snapshot recorded some ancestor of it. It used
//	         to fall back to that ancestor instead, which widened the restore to
//	         every sibling under it - see the long note at the pass itself; a
//	         stored path with no recorded ancestor lands in skipped.
//
// THE THIRD RETURN IS NOT OPTIONAL. Every pass-2 result also lands in narrowed,
// and the caller MUST check those against the snapshot's actual tree before
// using them. A recorded ANCESTOR proves only that p lies under a backed-up
// root, never that p is IN the snapshot: the branch may have been carved out by
// a --exclude at backup time (this very package derives those), or the folder
// may not have existed yet. Handing restic a selector that is not in the tree
// fails the restore, and that failure lands mid-loop AFTER the container has
// been stopped and removed - the exact failure mode this function exists to
// prevent (RESTORE-01). Pass-1 results need no check: they come from the
// snapshot's own recorded Paths.
//
// skipped is reported to the caller (scrubbed log + run-record note); a skip
// never aborts the restore — only an empty intersection does, and that check
// is the caller's (it needs the explicit nothing-to-restore error shape).
//
// Pure: no receiver, no store access, no cfg. Containers call it today;
// File Sets reuse it in Phase 4 (01-CONTEXT.md restore Q1/D-13). The
// strict-prefix primitive is isStrictDescendant — the same segment-aligned
// shape as internal/paths.Resolve (paths.go:44-48), so /a never matches /ab.
func mapRestorePaths(stored, snapshotPaths []string) (mapped, skipped, narrowed []string) {
	mapped = make([]string, 0, len(snapshotPaths))
	skipped = make([]string, 0, len(stored))
	narrowed = make([]string, 0, len(stored))
	covered := make(map[string]bool, len(stored)) // stored paths pass 1 already satisfied
	for _, q := range snapshotPaths {
		for _, p := range stored {
			if q == p || isStrictDescendant(q, p) {
				mapped = append(mapped, q)
				covered[p] = true
				break
			}
		}
	}
	for _, p := range stored {
		if covered[p] {
			continue
		}
		// p is not itself a recorded path. If the snapshot recorded an ANCESTOR
		// of it, p still lives inside that snapshot and can be restored - but
		// the thing to restore is p, NOT the ancestor.
		//
		// This used to map to the ancestor, and that was three of the review's
		// four data-loss findings in one line. Restoring /host/user/appdata
		// because the user selected /host/user/appdata/plex/Library hands back
		// every sibling under appdata as well: branches the user DESELECTED,
		// which therefore were never backed up, which means their live contents
		// get overwritten with whatever that old snapshot happens to hold. The
		// wider the recorded root, the worse it is, and the worst case is the
		// whole share.
		//
		// Narrowing is possible because restic's "<id>:<path>" selector
		// addresses any directory INSIDE a snapshot, not only the paths the
		// snapshot recorded. That is not an assumption: TestRestoreSubtree-
		// BelowRecordedPath in internal/restic pins it against real restic, and
		// it was proven by hand on Linux first (a snapshot recording only .../src
		// restored .../src/keep and left the deselected sibling behind).
		//
		// A path with no recorded ancestor is skipped exactly as before: there
		// is nothing in this snapshot it could come from.
		hasAncestor := false
		for _, q := range snapshotPaths {
			if isStrictDescendant(p, q) {
				hasAncestor = true
				break
			}
		}
		if !hasAncestor {
			skipped = append(skipped, p)
			continue
		}
		seen := false
		for _, m := range mapped {
			if m == p {
				seen = true
				break
			}
		}
		if !seen {
			mapped = append(mapped, p)
			narrowed = append(narrowed, p)
		}
	}
	return mapped, skipped, narrowed
}

// dedupe removes exact duplicates, preserving first-occurrence order.
func dedupe(xs []string) []string {
	seen := make(map[string]bool, len(xs))
	out := make([]string, 0, len(xs))
	for _, x := range xs {
		if !seen[x] {
			seen[x] = true
			out = append(out, x)
		}
	}
	return out
}
