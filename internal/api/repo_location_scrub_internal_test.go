package api

import (
	"errors"
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// Issue #206: a failure message about a repository has to say WHICH repository.
//
// manilx reported "Fatal: create repository at s3:http:[path]:8333[path]
// failed" - his S3 host was rebooting, he accepted the failure, and objected to
// the message. The path scrubber had eaten the address: "//192.168.1.50" first,
// then "/bucket". With named repositories (#204) an install has several, so the
// answer to "which one" stopped being cosmetic.
//
// This table is the same one internal/restic and internal/backup carry.
// The three copies of this scrubber are deliberately asked the SAME questions:
// the whole risk of three copies is that they drift, and nothing else catches it.
// ---------------------------------------------------------------------------

// repoScrubCases is the shared table. keep is what must SURVIVE the scrub, gone
// is what must NOT appear in the output.
var repoScrubCases = []struct {
	name string
	in   string
	keep []string
	gone []string
}{
	{
		// The reported case, verbatim in shape.
		name: "the reported case keeps its whole address",
		in:   "Fatal: create repository at s3:http://192.168.1.50:8333/bucket failed",
		keep: []string{"s3:http://192.168.1.50:8333/bucket", "create repository"},
		gone: []string{"[path]"},
	},
	{
		name: "a password in the location still goes, the host stays",
		in:   "unable to open repository at rest:https://backupuser:Tr0ub4dor&3@storage.example.com:8000/containers",
		keep: []string{"storage.example.com:8000/containers", "[redacted]@"},
		gone: []string{"Tr0ub4dor", "backupuser"},
	},
	{
		// The one the exemption could have made WORSE. The generic credential
		// regex stops at "/", so before this change the path scrubber chewed the
		// back half of such a password into path noise and left the front half
		// exposed. Exempting the location without a structural userinfo scrubber
		// would have left the whole thing standing.
		name: "a password containing a slash goes whole",
		in:   "rest:https://backupuser:wJalrXUtnFEMI/K7MDENG@host:8000/repo is unreachable",
		keep: []string{"host:8000/repo", "[redacted]@"},
		gone: []string{"wJalrXUtnFEMI", "K7MDENG", "backupuser"},
	},
	{
		name: "the sftp form keeps its scheme",
		in:   "sftp:backupuser@nas.local:/srv/restic refused the connection",
		keep: []string{"sftp:", "nas.local", "[redacted]@"},
		gone: []string{"backupuser"},
	},
	{
		// The exemption is for REMOTE locations only. A local repository is a
		// filesystem path on this box, indistinguishable from the appdata and
		// mount paths the scrubber exists to keep out of surfaced errors.
		name: "a local path is still scrubbed",
		in:   "unable to open repository at /mnt/user/appdata/bombvault/containers",
		keep: []string{"[path]"},
		gone: []string{"/mnt/user", "appdata"},
	},
	{
		name: "a remote location and a local path in one sentence",
		in:   "b2:mybucket/prefix unreachable, see /mnt/user/logs/bombvault.log",
		keep: []string{"b2:mybucket/prefix", "[path]"},
		gone: []string{"/mnt/user/logs"},
	},
	{
		// Userinfo OUTSIDE a repo location is still the generic regex's job.
		name: "credentials outside a location still go",
		in:   "the proxy at admin:hunter2@proxy.local refused",
		keep: []string{"[redacted]@proxy.local"},
		gone: []string{"hunter2", "admin:"},
	},
	{
		// The word boundary earns its keep here: without it the "rest" inside
		// "latest" would start a location and exempt the path behind it.
		name: "a scheme name inside another word is not a location",
		in:   "pulling latest:/mnt/user/appdata/thing failed",
		keep: []string{"[path]"},
		gone: []string{"/mnt/user/appdata"},
	},
}

func TestScrubSecretsKeepsRemoteRepoLocations(t *testing.T) {
	for _, c := range repoScrubCases {
		t.Run(c.name, func(t *testing.T) {
			got := scrubSecrets(c.in)
			for _, want := range c.keep {
				if !strings.Contains(got, want) {
					t.Errorf("scrubSecrets(%q)\n  = %q\n  lost %q, which the operator needs to act on it", c.in, got, want)
				}
			}
			for _, bad := range c.gone {
				if strings.Contains(got, bad) {
					t.Errorf("scrubSecrets(%q)\n  = %q\n  still carries %q", c.in, got, bad)
				}
			}
		})
	}
}

// TestScrubErrorNamesTheRepository is the end-to-end half for this package: a
// message reaches the HTTP surface through scrubError, which is the path an
// operator actually reads issue #206's sentence on.
func TestScrubErrorNamesTheRepository(t *testing.T) {
	got := scrubError(errors.New("Fatal: create repository at s3:http://192.168.1.50:8333/bucket failed"))
	if !strings.Contains(got, "s3:http://192.168.1.50:8333/bucket") {
		t.Fatalf("scrubError = %q, want the repository named in full.\n"+
			"An operator with several repositories cannot tell which one failed from\n"+
			"\"s3:http:[path]:8333[path]\", which is the whole of issue #206.", got)
	}
}
