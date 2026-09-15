"""Read-only repository tools for the repo-ops crew.

Every tool shells out (argument list, never a shell) from the repository
root — resolved by walking up from this file to the directory holding
go.mod. There is deliberately NO write path: no commit, push or tag tool
exists here, because tagging is a human decision in this repository. The
single repo-mutating command in the set is `just notes <version>`, which
scaffolds the two EMPTY release-note files; drafting their content is the
release agent's whole job, and the human commits whatever it proposes.
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

from crewai.tools import tool

MAX_OUTPUT_CHARS = 400_000


def _find_repo_root() -> Path:
    """Walk up from this file to the directory holding go.mod — the repo root."""
    for candidate in Path(__file__).resolve().parents:
        if (candidate / "go.mod").is_file():
            return candidate
    raise RuntimeError("repo_tools: no go.mod found above the automation/ tree")


REPO_ROOT = _find_repo_root()

# The tool defaults to the upstream repository because PR review targets what
# will be MERGED, not the fork; set GH_REPO to review a fork's own PRs instead.
UPSTREAM_REPO = os.getenv("GH_REPO", "junkerderprovinz/bombvault")

_VERSION_RE = re.compile(r"^v\d+\.\d+\.\d+$")


def _run(cmd: list[str], timeout: int = 120) -> str:
    """Run a fixed argument list from the repo root; never a shell."""
    try:
        result = subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
    except FileNotFoundError:
        return f"[error] {cmd[0]} is not installed or not on PATH"
    except subprocess.TimeoutExpired:
        return f"[error] {cmd[0]} timed out after {timeout}s"
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    if result.returncode != 0:
        return f"[exit {result.returncode}] {err or out or 'no output'}"
    text = out or "(no output)"
    if len(text) > MAX_OUTPUT_CHARS:
        text = text[:MAX_OUTPUT_CHARS] + f"\n... (truncated at {MAX_OUTPUT_CHARS} chars)"
    return text


@tool("gh_pr_data")
def gh_pr_data(pr_number: int) -> str:
    """Fetches a pull request's metadata and full diff from the BombVault upstream repository (junkerderprovinz/bombvault; override with the GH_REPO environment variable). Returns title, author, description, base and head branches, then the unified diff."""

    meta = _run(
        [
            "gh",
            "pr",
            "view",
            str(pr_number),
            "--repo",
            UPSTREAM_REPO,
            "--json",
            "number,title,author,body,baseRefName,headRefName,"
            "additions,deletions,changedFiles,files",
        ]
    )
    diff = _run(["gh", "pr", "diff", str(pr_number), "--repo", UPSTREAM_REPO])
    return f"PR META:\n{meta}\n\nPR DIFF:\n{diff}"


@tool("go_test_coverage")
def go_test_coverage() -> str:
    """Runs `go test -cover ./...` from the repository root and returns per-package coverage percentages. POSIX-only tests skip on Windows; a skipped package is NOT a coverage gap."""
    return _run(["go", "test", "-cover", "./..."], timeout=600)


@tool("untested_packages")
def untested_packages() -> str:
    """Lists Go packages (directories containing .go files) that have no *_test.go file, one per line, relative to the repository root. Excludes web/ (the SPA embed stub), automation/ (this crew) and VCS/planning metadata directories."""

    excluded_tops = {".git", "automation", "web", ".planning", ".gsd"}
    packages: dict[Path, bool] = {}
    for go_file in REPO_ROOT.rglob("*.go"):
        rel = go_file.relative_to(REPO_ROOT)
        if rel.parts and rel.parts[0] in excluded_tops:
            continue
        packages.setdefault(go_file.parent, False)
        if go_file.name.endswith("_test.go"):
            packages[go_file.parent] = True
    untested = sorted(
        d.relative_to(REPO_ROOT).as_posix() for d, tested in packages.items() if not tested
    )
    if not untested:
        return "Every Go package has at least one test file."
    return "\n".join(untested)


@tool("release_commits")
def release_commits() -> str:
    """Returns the most recent git tag and the oneline log of commits made since that tag, ready for release-notes grouping."""
    tags = _run(["git", "tag", "--sort=-v:refname"]).splitlines()
    if not tags or tags[0].startswith("["):
        return f"No tags found: {tags[0] if tags else '(no output)'}"
    latest = tags[0]
    log = _run(["git", "log", f"{latest}..HEAD", "--oneline", "--no-decorate"])
    return f"Last tag: {latest}\n\nCommits since {latest}:\n{log}"


@tool("scaffold_release_notes")
def scaffold_release_notes(version: str) -> str:
    """Runs `just notes <version>` in the repository root, which scaffolds the two EMPTY release-note files (.github/release-notes/v<version>.md and internal/releasenotes/notes/v<version>.md — the embed-sync test requires both). version looks like v1.2.3 (the v-prefix is optional; the justfile recipe adds it itself)."""

    if not _VERSION_RE.match(version):
        return f"Invalid version {version!r}: expected vMAJOR.MINOR.PATCH, e.g. v1.2.3"
    # The justfile recipe writes v{{version}}.md — it expects the bare number.
    # Passing v1.2.3 verbatim scaffolds vv1.2.3.md (observed on this repo).
    return _run(["just", "notes", version[1:]])


@tool("read_repo_file")
def read_repo_file(path: str) -> str:
    """Reads a UTF-8 text file from within the repository (first 400 lines). Use it for the repository documentation (docs/), previous release notes under .github/release-notes/, and any repository file the PR diff references."""

    target = (REPO_ROOT / path).resolve()
    if not target.is_relative_to(REPO_ROOT):
        return f"Refused: {path!r} escapes the repository."
    try:
        text = target.read_text(encoding="utf-8")
    except OSError as exc:
        return f"Cannot read {path!r}: {exc}"
    lines = text.splitlines()
    head = lines[:400]
    more = f"\n... ({len(lines) - 400} more lines)" if len(lines) > 400 else ""
    return "\n".join(head) + more
