package dockercli

import (
	"os"
	"path/filepath"
	"testing"
)

const selfID = "2932ec97822868ced64d4c9c359e0574020c718fd896dd428b42f2bf6129f275"

func writeMountinfo(t *testing.T, content string) {
	t.Helper()
	p := filepath.Join(t.TempDir(), "mountinfo")
	if err := os.WriteFile(p, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	old := mountinfoPath
	mountinfoPath = p
	t.Cleanup(func() { mountinfoPath = old })
}

func TestOwnContainerRefReadsIDFromMountinfo(t *testing.T) {
	cases := map[string]string{
		"unraid": "6712 4871 259:3 /system/docker/containers/" + selfID + "/resolv.conf /etc/resolv.conf rw,noatime - xfs /dev/nvme0n1p1 rw\n" +
			"6713 4871 259:3 /system/docker/containers/" + selfID + "/hostname /etc/hostname rw,noatime - xfs /dev/nvme0n1p1 rw\n",
		"truenas": "812 790 0:61 /ix-apps/docker/containers/" + selfID + "/hostname /etc/hostname rw,relatime - zfs boot-pool/.ix-apps rw\n",
	}
	for name, content := range cases {
		t.Run(name, func(t *testing.T) {
			writeMountinfo(t, content)
			if got := ownContainerRef(); got != selfID {
				t.Errorf("ownContainerRef() = %q, want %q", got, selfID)
			}
		})
	}
}

func TestOwnContainerRefFallsBackToHostname(t *testing.T) {
	writeMountinfo(t, "22 1 8:1 / / rw,relatime - ext4 /dev/sda1 rw\n")
	host, err := os.Hostname()
	if err != nil {
		t.Fatal(err)
	}
	if got := ownContainerRef(); got != host {
		t.Errorf("ownContainerRef() = %q, want hostname %q", got, host)
	}
}
