package api

import (
	"errors"
	"testing"
)

// "Not initialised yet", "the server refused you" and "the server never
// answered" are different answers, and restic's wrapper text does not
// distinguish them: it prefixes "unable to open config file" onto every failure
// to read the config.
//
// The rest-server messages are verbatim from restic 0.17.3 against a real
// rest-server started with --private-repos and an htpasswd file, the transport
// failures verbatim from the same restic against a name that does not resolve
// and a port with nothing listening.
func TestIsRepoUninitializedTellsRefusalFromEmptiness(t *testing.T) {
	for _, tc := range []struct {
		name string
		msg  string
		want bool
	}{
		{
			// The only genuine case: credentials accepted, no repository there.
			name: "right password, no repository yet",
			msg:  "Fatal: repository does not exist: unable to open config file: <config/> does not exist",
			want: true,
		},
		{
			// Wrong password. "Reachable, not initialized" would read as
			// "your destination is fine, just empty".
			name: "wrong password",
			msg:  "Fatal: unable to open config file: unexpected HTTP response (401): 401 Unauthorized",
			want: false,
		},
		{
			// Right password, but the URL's first path segment is not the
			// htpasswd user, which --private-repos refuses. Same misleading
			// result, and one of the two commonest setup mistakes.
			name: "private-repos path belongs to another user",
			msg:  "Fatal: unable to open config file: unexpected HTTP response (401): 401 Unauthorized",
			want: false,
		},
		{
			// The same shape from an S3-style backend.
			name: "forbidden",
			msg:  "unable to open config file: AccessDenied: 403 Forbidden",
			want: false,
		},
		{
			name: "name does not resolve",
			msg:  `restic cat failed: Fatal: unable to open config file: Head "http://:***@ljsnas02.invalid:8000[path]": dial tcp: lookup ljsnas02.invalid on 127.0.0.11:53: no such host`,
			want: false,
		},
		{
			name: "nothing listening",
			msg:  `restic cat failed: Fatal: unable to open config file: Head "http://:***@192.168.20.87:8999[path]": dial tcp 192.168.20.87:8999: connect: connection refused`,
			want: false,
		},
		{
			// restic reports a missing bucket in the loose form, and init
			// creates the bucket, so the destination is as good as empty.
			name: "bucket not created yet",
			msg:  "Fatal: unable to open config file: Stat: The specified bucket does not exist.",
			want: true,
		},
		{
			// A local repository that was never initialised: no transport, no
			// status code, still genuinely empty.
			name: "local path with no repository",
			msg:  "Fatal: unable to open config file: stat /mnt/user/backups/config: no such file or directory",
			want: true,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := isRepoUninitialized(errors.New(tc.msg)); got != tc.want {
				t.Errorf("isRepoUninitialized(%q) = %v, want %v", tc.msg, got, tc.want)
			}
		})
	}

	if isRepoUninitialized(nil) {
		t.Error("no error is not an uninitialised repository")
	}
}
