#!/usr/bin/env python
"""RepoOpsFlow — CrewAI automation for the BombVault repository.

Three modes, routed from CLI inputs:

  review  — review an upstream pull request against house conventions
  audit   — map Go test coverage and report the riskiest gaps
  release — draft release notes for a version since the last tag

Agents are read-only: their tools run gh/git/go/just in read or test-only
mode, and every report lands in output/<mode>.md (gitignored). Nothing in
this crew commits, pushes or tags — preparation is as far as it goes.

Usage:
  uv run repo_ops --mode review --pr 42
  uv run repo_ops --mode audit
  uv run repo_ops --mode release --version v1.2.3
  uv run repo_ops --check-llm
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from crewai.flow.flow import Flow, listen, or_, router, start
from pydantic import BaseModel

from repo_ops.agents import MODE_AGENTS, run_mode
from repo_ops.llm import check_llm, model_name

# automation/output/ — reports are proposals for the human, never committed.
OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


class RepoOpsState(BaseModel):
    mode: str = "audit"
    pr_number: int | None = None
    version: str = ""
    report: str = ""
    output_path: str = ""


class RepoOpsFlow(Flow[RepoOpsState]):
    """Validates inputs, routes on mode, runs one agent, writes the report."""

    @start()
    def validate_inputs(self) -> None:
        mode = self.state.mode
        if mode not in MODE_AGENTS:
            raise SystemExit(
                f"[repo_ops] unknown mode {mode!r} (expected one of {sorted(MODE_AGENTS)})"
            )
        if mode == "review" and not self.state.pr_number:
            raise SystemExit("[repo_ops] mode 'review' requires --pr <number>")
        if mode == "release" and not self.state.version:
            raise SystemExit("[repo_ops] mode 'release' requires --version vX.Y.Z")
        print(
            f"[repo_ops] mode={mode}"
            + (f" pr={self.state.pr_number}" if self.state.pr_number else "")
            + (f" version={self.state.version}" if self.state.version else "")
        )

    @router(validate_inputs)
    def route_mode(self) -> str:
        return self.state.mode

    # Handlers are named handle_* because the @listen labels below share the
    # router's trigger namespace — same-name handlers re-trigger themselves.
    @listen("review")
    def handle_review(self) -> None:
        self.state.report = run_mode("review", pr_number=self.state.pr_number)

    @listen("audit")
    def handle_audit(self) -> None:
        self.state.report = run_mode("audit")

    @listen("release")
    def handle_release(self) -> None:
        self.state.report = run_mode("release", version=self.state.version)

    @listen(or_(handle_review, handle_audit, handle_release))
    def write_report(self) -> None:
        OUTPUT_DIR.mkdir(exist_ok=True)
        path = OUTPUT_DIR / f"{self.state.mode}.md"
        path.write_text(self.state.report, encoding="utf-8")
        self.state.output_path = str(path)
        print(f"[repo_ops] report written to {path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="repo_ops",
        description="CrewAI repo-ops crew for BombVault (review / audit / release)",
    )
    parser.add_argument(
        "--mode",
        choices=sorted(MODE_AGENTS),
        default="audit",
        help="which run to perform (default: audit)",
    )
    parser.add_argument("--pr", type=int, default=None, help="pull request number (mode review)")
    parser.add_argument(
        "--version", default="", help="version to prepare, vMAJOR.MINOR.PATCH (mode release)"
    )
    parser.add_argument(
        "--check-llm", action="store_true", help="smoke-test the LLM endpoint and exit"
    )
    args = parser.parse_args()

    if args.check_llm:
        print(f"[repo_ops] model: {model_name()}")
        print(check_llm())
        return

    flow = RepoOpsFlow()
    flow.kickoff(
        inputs={"mode": args.mode, "pr_number": args.pr, "version": args.version}
    )


def kickoff() -> None:
    """Entry point for `crewai run` (defaults: mode audit)."""
    main()


def plot() -> None:
    RepoOpsFlow().plot()


if __name__ == "__main__":
    sys.exit(main())
