package template

import (
	"encoding/xml"
	"os"
	"path/filepath"
	"testing"
)

// Unraid's dockerMan replaces any other access mode with plain "rw"
// (dynamix.docker.manager/include/Helpers.php), which drops mount propagation
// without a warning.
var unraidModes = map[string]bool{
	"rw": true, "rw,slave": true, "rw,shared": true,
	"ro": true, "ro,slave": true, "ro,shared": true,
}

type templatePath struct {
	Name string `xml:"Name,attr"`
	Type string `xml:"Type,attr"`
	Mode string `xml:"Mode,attr"`
}

func ownTemplatePaths(t *testing.T) []templatePath {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "templates", "my-BombVault.xml"))
	if err != nil {
		t.Fatal(err)
	}
	var tmpl struct {
		Configs []templatePath `xml:"Config"`
	}
	if err := xml.Unmarshal(data, &tmpl); err != nil {
		t.Fatal(err)
	}
	var paths []templatePath
	for _, c := range tmpl.Configs {
		if c.Type == "Path" {
			paths = append(paths, c)
		}
	}
	return paths
}

func TestOwnTemplateUsesModesUnraidAccepts(t *testing.T) {
	for _, p := range ownTemplatePaths(t) {
		if !unraidModes[p.Mode] {
			t.Errorf("%s: Unraid turns mode %q into plain rw", p.Name, p.Mode)
		}
	}
}

// A share or disk mounted after the container started is only visible under
// Host Data with slave propagation, and the late-mount check in
// internal/api/mountinfo.go depends on seeing it.
func TestOwnTemplateHostDataSeesLateMounts(t *testing.T) {
	for _, p := range ownTemplatePaths(t) {
		if p.Name == "Host Data" && p.Mode != "rw,slave" {
			t.Errorf("Host Data mode = %q, want rw,slave", p.Mode)
		}
	}
}
