"""Agent construction and per-mode dispatch for the repo-ops crew.

The Flow (main.py) owns orchestration; this module owns the mapping from a
mode to its agent (agents.yaml), its task brief (tasks.yaml) and its
toolset. Each branch runs a single agent via Agent.kickoff() — no Crew is
needed, because no mode requires multi-agent collaboration.

Task descriptions use single-brace placeholders ({pr_number}, {version})
that are interpolated here via str.format — so YAML text must never carry
literal braces outside those placeholders.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from crewai import Agent

from repo_ops.llm import make_llm
from repo_ops.tools import repo_tools

_CONFIG_DIR = Path(__file__).resolve().parent / "config"

# mode -> (agents.yaml key, tasks.yaml key, tools the agent may call)
MODE_AGENTS: dict[str, tuple[str, str, list[Any]]] = {
    "review": (
        "pr_reviewer",
        "review_task",
        [repo_tools.gh_pr_data, repo_tools.read_repo_file],
    ),
    "audit": (
        "test_auditor",
        "audit_task",
        [repo_tools.go_test_coverage, repo_tools.untested_packages, repo_tools.read_repo_file],
    ),
    "release": (
        "release_preparer",
        "release_task",
        [repo_tools.release_commits, repo_tools.scaffold_release_notes, repo_tools.read_repo_file],
    ),
}


def _load_yaml(name: str) -> dict[str, Any]:
    return yaml.safe_load((_CONFIG_DIR / name).read_text(encoding="utf-8"))


def run_mode(mode: str, **inputs: Any) -> str:
    """Kick off the mode's agent with its YAML brief and return the report."""
    agent_key, task_key, tools = MODE_AGENTS[mode]
    agents = _load_yaml("agents.yaml")
    tasks = _load_yaml("tasks.yaml")
    agent = Agent(
        config=agents[agent_key],
        tools=tools,
        llm=make_llm(),
        verbose=True,
    )
    brief = tasks[task_key]["description"].format(**inputs)
    expected = tasks[task_key]["expected_output"]
    result = agent.kickoff(f"{brief}\n\nExpected output:\n{expected}")
    return result.raw
