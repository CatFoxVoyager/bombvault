"""LLM construction for the repo-ops crew.

The OpenAI-compatible endpoint is entirely environment-provided: LiteLLM
(the engine under crewai's LLM class) reads OPENAI_API_KEY and
OPENAI_BASE_URL natively, so nothing here duplicates or stores credentials.
The model name follows LiteLLM's provider/model format and resolves in
order: CREW_MODEL (explicit override), MODEL (already present in the
Windows user environment on this machine), then the built-in default.
"""

from __future__ import annotations

import os

from crewai import LLM

DEFAULT_MODEL = "openai/glm-5.3-flash"


def model_name() -> str:
    return os.getenv("CREW_MODEL") or os.getenv("MODEL") or DEFAULT_MODEL


def make_llm() -> LLM:
    return LLM(model=model_name())


def check_llm() -> str:
    """One trivial call — smoke-tests endpoint connectivity and model name."""
    llm = make_llm()
    return llm.call(
        messages=[{"role": "user", "content": "Reply with the single word: ready"}]
    )
