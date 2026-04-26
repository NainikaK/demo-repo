"""Output contract of the diagnosis step.

The diagnosis step is a lightweight Claude API call (not a full agent) that runs
when an agent fails. It analyses the error message, agent name, and input/output
summaries to produce a structured explanation of what went wrong and how the retry
should approach the problem differently.

This model is produced by pipeline/utils/diagnosis.py and consumed by the
Orchestrator when constructing the retry attempt's additional context.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DiagnosisResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent_name: str = Field(
        description="Name of the agent that failed and was diagnosed (e.g. 'frontend_agent')."
    )
    attempt_number: int = Field(
        description="Which attempt failed and triggered this diagnosis — 1 or 2."
    )
    root_cause: str = Field(
        description="Plain-English explanation of what went wrong in the failed agent run."
    )
    suggested_fix: str = Field(
        description="Concrete recommendation for how the retry should address the root cause."
    )
    retry_context: str = Field(
        description=(
            "Additional context string passed directly to the retry attempt as supplementary input. "
            "Summarises the diagnosis in a form the agent's prompt can consume."
        )
    )
    diagnosis_succeeded: bool = Field(
        default=True,
        description=(
            "False when the diagnosis call itself failed (e.g. API error or timeout). "
            "When False, root_cause, suggested_fix, and retry_context contain placeholder values "
            "and the Orchestrator proceeds with a blind retry."
        ),
    )


__all__: list[Any] = ["DiagnosisResult"]
