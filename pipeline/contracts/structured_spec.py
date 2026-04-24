"""Output contract of the Clarification Agent.

Defines the typed structures the Clarification Agent produces after evaluating
whether a raw ADO work item is specific enough to enter the pipeline. The
ClarificationOutput is the first handoff in the pipeline and gates everything
downstream.
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class AffectedArea(str, Enum):
    frontend = "frontend"
    backend = "backend"
    both = "both"


class StructuredSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    work_item_id: str = Field(
        description="ADO work item ID this spec was derived from."
    )
    title: str = Field(
        description="Short feature title extracted from the work item."
    )
    summary: str = Field(
        description="Plain-English summary of what the feature should do."
    )
    confidence_score: int = Field(
        ge=0,
        le=100,
        description=(
            "Confidence score 0–100 reflecting how actionable the requirement is. "
            "Scoring starts at 100 and deducts for missing clarity."
        ),
    )
    partial_confidence: bool = Field(
        description=(
            "True when confidence_score is 50–79. Signals to downstream agents "
            "that this spec was produced with incomplete information."
        )
    )
    gaps: list[str] = Field(
        description="Information that was missing from the work item or had to be assumed."
    )
    affected_areas: list[AffectedArea] = Field(
        description="Which parts of the system this feature touches (frontend, backend, or both)."
    )
    acceptance_criteria: list[str] = Field(
        description="Verifiable conditions that must all be true for the feature to be complete."
    )
    out_of_scope: list[str] = Field(
        description="Behaviours or features explicitly excluded from this work item."
    )
    suggested_user_stories: list[str] = Field(
        description="Draft user stories in 'As a … I want … so that …' format, produced for the Story Writer."
    )


class ClarificationOutput(BaseModel):
    model_config = ConfigDict(frozen=True)

    confidence_score: int = Field(
        ge=0,
        le=100,
        description="Overall confidence that the requirement is actionable (mirrors StructuredSpec.confidence_score).",
    )
    spec: Optional[StructuredSpec] = Field(
        default=None,
        description="Structured spec produced when confidence_score >= 50. None when the pipeline halts.",
    )
    questions: Optional[list[str]] = Field(
        default=None,
        description=(
            "Clarifying questions to post to the Product Owner. "
            "Always present when confidence_score < 100; required when confidence_score < 50."
        ),
    )


__all__: list[Any] = ["AffectedArea", "StructuredSpec", "ClarificationOutput"]
