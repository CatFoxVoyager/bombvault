# repo_ops — CrewAI automation crew for BombVault

A [CrewAI](https://docs.crewai.com) Flow in `automation/` with three modes,
each run by a single read-only agent against the repository:

| Mode | Agent | What it does |
|------|-------|--------------|
| `review` | `pr_reviewer` | Fetches an upstream PR (`gh_pr_data`) and reviews it against the house conventions — findings P0/P1/P2 with `file:line` references |
| `audit` | `test_auditor` | Runs `go test -cover ./...` and lists packages without tests, then reports the five most valuable tests to add |
| `release` | `release_preparer` | Groups commits since the last tag, scaffolds the two release-note files via `just notes`, drafts their content in the style of the previous notes |

Every report lands in `automation/output/<mode>.md` (gitignored) — output is
a **proposal for a human**, never a commit.

## Safety contract

- **Read-only repository access.** The toolset runs `gh`, `git`, `go` and
  `just` in read or test-only mode. There is no commit, push or tag tool —
  tagging is always a human decision in this repository. The single
  repo-mutating command is `just notes <version>`, which scaffolds two EMPTY
  files; the agent only drafts their content.
- **No credentials in the repository.** The LLM endpoint is read from the
  process environment: LiteLLM (the engine underneath CrewAI's `LLM` class)
  consumes `OPENAI_API_KEY` and `OPENAI_BASE_URL` natively. No `.env` is
  required and none should be committed.

## Setup

```bash
cd automation
crewai install        # or: uv sync (creates .venv from pyproject.toml)
```

Python >=3.10, <3.14 (uv manages its own interpreter; `uv tool install crewai`
provides the CLI).

## Usage

```bash
cd automation

# Smoke-test endpoint connectivity + model name (one trivial LLM call)
uv run repo_ops --check-llm

# Review upstream PR #42 (override repo with GH_REPO=<owner>/<name>)
uv run repo_ops --mode review --pr 42

# Map Go test coverage and report the riskiest gaps
uv run repo_ops --mode audit

# Draft release notes for a version (scaffolds via `just notes`, fills both
# copies — .github/release-notes/ and internal/releasenotes/notes/)
uv run repo_ops --mode release --version v1.2.3

# Or via the CrewAI CLI (defaults to mode audit)
crewai run
```

### Model selection

Resolution order (in `src/repo_ops/llm.py`): `CREW_MODEL`, then `MODEL`,
then the built-in default `openai/glm-5.3-flash` — names in LiteLLM's
`provider/model` format.

## Layout

```
automation/
├── pyproject.toml              # uv project (dep: crewai; scripts: repo_ops)
├── AGENTS.md                   # CrewAI API reference (scaffolded, keep updated)
└── src/repo_ops/
    ├── main.py                 # RepoOpsFlow: @start validate → @router mode → @listen branches
    ├── agents.py               # mode → agent + task brief + toolset mapping
    ├── llm.py                  # make_llm() + --check-llm smoke test
    ├── tools/repo_tools.py     # @tool read-only repo tools (gh/git/go/just)
    └── config/
        ├── agents.yaml         # role / goal / backstory per agent
        └── tasks.yaml          # description / expected_output per mode
```

The Flow follows CrewAI's production pattern: a Pydantic state
(`RepoOpsState`), a `@start` input validation, a `@router` on mode, one
`@listen` branch per mode running `Agent.kickoff()`, and a converging
`@listen(or_(...))` that writes `output/<mode>.md`.
