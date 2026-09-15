// Package web embeds the built React SPA (web/dist) into the Go binary.
//
// The embed must live in the package whose directory contains dist/, because
// Go's //go:embed cannot reference parent directories ("..") — so the embed
// directive lives here at the web/ root and internal/api consumes the fs.FS.
//
// The repo tracks ONE file under dist/, an empty .gitkeep, and it is there for
// this directive alone: `all:dist` needs the directory to exist or the package
// does not compile, and `all:` is the part that makes an otherwise-empty one
// acceptable. Everything else under dist/ is build output and is ignored.
//
// The real bundle comes from the Dockerfile's first stage in a shipped image,
// and from `npm --prefix web run build` locally. Without either, the server
// answers 500 "SPA index not found", which is the honest result: until this
// changed, a tracked index.html from some past Vite run was embedded instead,
// naming two chunks that were not in the repo, so a fresh clone served a white
// page with two 404s and nothing said why.
//
// Note that the Go jobs in lint.yml never build the frontend at all, so they
// compile against exactly the empty-dist case. That is deliberate: it is the
// case a fresh clone is in.
package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// DistFS returns the embedded web/dist directory rooted at its top level
// (so "index.html" resolves directly), or panics if the embed is malformed.
func DistFS() fs.FS {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		// Unreachable: "dist" is embedded at build time.
		panic("web: embedded dist subtree missing: " + err.Error())
	}
	return sub
}
