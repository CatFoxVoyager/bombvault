package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// The MCP tests exercise the server itself, so the test binary runs with it
// switched on whatever the shipped value is.
func TestMain(m *testing.M) {
	mcpShipped = true
	os.Exit(m.Run())
}

// ShipMCP sets the switch for one test and restores it afterwards. The test
// must not run in parallel: every router built while it runs reads the switch.
func ShipMCP(t *testing.T, on bool) {
	t.Helper()
	prev := mcpShipped
	mcpShipped = on
	t.Cleanup(func() { mcpShipped = prev })
}

// Switched off, the endpoint and every key route answer 404 even with a
// working key in the store, and /metrics carries no MCP series.
func TestSwitchedOffMCPServerAnswersNothing(t *testing.T) {
	ShipMCP(t, false)

	h, router, repo, _ := newMCPGateHandler(t)
	key, id := seedMCPKey(t, h, repo, "Laptop")
	settings, err := repo.GetSettings()
	if err != nil {
		t.Fatal(err)
	}
	settings.MetricsEnabled = true
	if err := repo.UpdateSettings(settings); err != nil {
		t.Fatal(err)
	}

	if w := mcpInternalPost(router, key, mcpInternalInitialize, ""); w.Code != http.StatusNotFound {
		t.Fatalf("POST /mcp with a valid key: status = %d, want 404", w.Code)
	}
	for _, rt := range [][2]string{
		{http.MethodGet, "/api/mcp/keys"},
		{http.MethodPost, "/api/mcp/keys"},
		{http.MethodPatch, "/api/mcp/keys/" + id},
		{http.MethodPost, "/api/mcp/keys/" + id + "/rotate"},
		{http.MethodPost, "/api/mcp/keys/" + id + "/revoke"},
		{http.MethodDelete, "/api/mcp/keys/" + id},
		{http.MethodGet, "/api/mcp/keys/" + id + "/activity"},
		{http.MethodGet, "/api/mcp/certificate"},
		{http.MethodPost, "/api/mcp/certificate/names"},
	} {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(rt[0], rt[1], strings.NewReader("{}")))
		if w.Code != http.StatusNotFound {
			t.Errorf("%s %s: status = %d, want 404", rt[0], rt[1], w.Code)
		}
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("metrics: status = %d", w.Code)
	}
	if strings.Contains(w.Body.String(), "mcp") {
		t.Errorf("/metrics carries MCP series:\n%s", w.Body.String())
	}
}
