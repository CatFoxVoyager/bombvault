package api

import (
	"errors"
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// The append-only refusal says which card the toggle is on, and that routing had
// no test at all.
//
// One sentence used to answer for three different toggles, so an operator refused
// over an off-site destination or a remote primary was sent to the Repositories
// card, whose list does not contain their repository. The split fixed that and
// added a fourth sentence for "the flag could not be read". Eight call sites
// depend on the mapping and nothing pinned it, which is the shape of gap that
// gets quoted as coverage later.
// ---------------------------------------------------------------------------

// TestEveryAppendOnlyFlagGetsItsOwnSentence pins the mapping itself: each flag
// resolves to a DISTINCT refusal, and none of them resolves to nil.
func TestEveryAppendOnlyFlagGetsItsOwnSentence(t *testing.T) {
	cases := []struct {
		flag appendOnlyFlag
		want error
		card string
	}{
		{appendOnlyNamedRepo, errOffsiteAppendOnly, "Settings, Repositories"},
		{appendOnlyPrimaryRemote, errAppendOnlyPrimaryRemote, "Remote safety settings"},
		{appendOnlyUnreadable, errAppendOnlyUnknown, "could not be read"},
	}
	seen := map[string]appendOnlyFlag{}
	for _, c := range cases {
		got := appendOnlyRefusal(c.flag)
		if !errors.Is(got, c.want) {
			t.Errorf("appendOnlyRefusal(%v) = %v, want %v", c.flag, got, c.want)
			continue
		}
		msg := got.Error()
		if !strings.Contains(msg, c.card) {
			t.Errorf("the refusal for %v does not name where to act: %q, want it to mention %q.\n"+
				"Sending somebody to a card their repository is not listed on costs a whole diagnosis.", c.flag, msg, c.card)
		}
		if prev, dup := seen[msg]; dup {
			t.Errorf("%v and %v produce the SAME sentence: %q.\n"+
				"The split exists precisely because one sentence cannot answer for three toggles.", prev, c.flag, msg)
		}
		seen[msg] = c.flag
	}

	// appendOnlyNone is a programming error rather than a state, and must still
	// refuse rather than return nil - a nil here would let a forget through.
	if appendOnlyRefusal(appendOnlyNone) == nil {
		t.Error("appendOnlyRefusal(appendOnlyNone) returned nil.\n" +
			"Every call site treats a non-nil answer as the refusal; nil would open the gate.")
	}
}

// TestNoAppendOnlyRefusalCarriesASlash pins the constraint every one of these
// sentences lives under: scrubError's path regex redacts any slash-led token, so
// a remedy containing a path arrives at the operator as "[path]".
func TestNoAppendOnlyRefusalCarriesASlash(t *testing.T) {
	for _, err := range []error{errOffsiteAppendOnly, errAppendOnlyOffsiteTarget, errAppendOnlyPrimaryRemote, errAppendOnlyUnknown} {
		if strings.Contains(err.Error(), "/") {
			t.Errorf("this refusal carries a slash and will be redacted on the way out: %q", err.Error())
		}
	}
}

// TestTheOffsiteDestinationRefusalIsItsOwnSentence covers the fourth, which the
// flag mapping above cannot reach: it is returned directly at the two off-site
// call sites rather than through appendOnlyRefusal.
func TestTheOffsiteDestinationRefusalIsItsOwnSentence(t *testing.T) {
	msg := errAppendOnlyOffsiteTarget.Error()
	if !strings.Contains(msg, "Off-site") {
		t.Errorf("the off-site destination refusal does not name the off-site card: %q", msg)
	}
	for _, other := range []error{errOffsiteAppendOnly, errAppendOnlyPrimaryRemote, errAppendOnlyUnknown} {
		if other.Error() == msg {
			t.Errorf("the off-site refusal is identical to another one: %q", msg)
		}
	}
}
