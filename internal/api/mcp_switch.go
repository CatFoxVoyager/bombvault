package api

import "net/http"

// mcpShipped puts the MCP server in front of users: the /mcp endpoint, the key
// and certificate routes, the /metrics series and the MCP lines of the support
// bundle and the recovery kit. Switched off, /mcp answers 404 exactly as it
// does while no key exists, and the tables stay in place. It is a variable so
// the tests can run the server either way.
var mcpShipped = false

// mountMCP registers the endpoint and the routes that manage its keys. The
// endpoint sits outside /api like /metrics, is allow-listed in authGate and
// gated inside serveMCP on its own keys: no key means 404, never open. The key
// routes hand a key out once and never again, so they stay session-protected
// like every other /api route.
func (h *Handler) mountMCP(mux *http.ServeMux) {
	if h.mcp == nil {
		h.mcp = newMCPState()
	}
	h.mcp.http = h.buildMCPHTTP()
	mux.HandleFunc(mcpEndpointPath, h.serveMCP)

	mux.HandleFunc("GET /api/mcp/keys", h.handleListMCPKeys)
	mux.HandleFunc("POST /api/mcp/keys", h.handleCreateMCPKey)
	mux.HandleFunc("PATCH /api/mcp/keys/{id}", h.handleUpdateMCPKey)
	mux.HandleFunc("POST /api/mcp/keys/{id}/rotate", h.handleRotateMCPKey)
	mux.HandleFunc("POST /api/mcp/keys/{id}/revoke", h.handleRevokeMCPKey)
	mux.HandleFunc("DELETE /api/mcp/keys/{id}", h.handlePurgeMCPKey)
	mux.HandleFunc("GET /api/mcp/keys/{id}/activity", h.handleMCPKeyActivity)
	mux.HandleFunc("GET /api/mcp/certificate", h.handleMCPCertificate)
	mux.HandleFunc("POST /api/mcp/certificate/names", h.handleAddMCPCertificateName)
}
