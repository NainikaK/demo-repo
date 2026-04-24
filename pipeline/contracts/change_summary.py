"""Output contract of the Frontend Agent and Backend Agent.

Defines the change summary each code agent produces after committing its work
to the feature branch. Consumed by the Test Agent (to know what was changed),
the Audit Agent (to verify self-review and contracts), and the Supervisor Agent
(for PR body generation).
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class AgentType(str, Enum):
    frontend = "frontend"
    backend = "backend"


class DependencyJustification(BaseModel):
    model_config = ConfigDict(frozen=True)

    package_name: str = Field(
        description="Name of the new package (npm package name or NuGet package ID)."
    )
    reason: str = Field(
        description="Why this package is needed and what specific problem it solves."
    )
    alternatives_considered: list[str] = Field(
        description="At least two alternative packages that were evaluated and why they were rejected."
    )
    selection_rationale: str = Field(
        description="Specific reason this package was chosen over the considered alternatives."
    )


class SelfReviewResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    violations_found: list[str] = Field(
        description="Coding standard violations identified during the line-by-line self-review."
    )
    violations_fixed: list[str] = Field(
        description="Violations that were corrected before the commit proceeded."
    )
    clean: bool = Field(
        description="True when no violations remained after review (violations_found is empty or all were fixed)."
    )


class ChangeSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent_type: AgentType = Field(
        description="Whether this summary was produced by the Frontend Agent or Backend Agent."
    )
    work_item_id: str = Field(
        description="ADO work item ID this change implements."
    )
    files_modified: list[str] = Field(
        description="Existing files changed in this commit (repo-relative paths)."
    )
    files_created: list[str] = Field(
        description="New files added in this commit (repo-relative paths)."
    )
    self_review: SelfReviewResult = Field(
        description="Outcome of the agent's self-review against coding standards before committing."
    )
    dependencies_added: list[DependencyJustification] = Field(
        description="New packages added in this commit, each with full justification."
    )
    visual_description: Optional[str] = Field(
        default=None,
        description=(
            "Frontend only. Plain-English description of the UI change and how a user interacts with it. "
            "Attached to the ADO work item as a comment."
        ),
    )
    api_contract_validation: Optional[str] = Field(
        default=None,
        description=(
            "Backend only. Result of verifying every new/modified endpoint against the Frontend Agent's "
            "change summary — confirming method, path, and body shapes match exactly."
        ),
    )
    branch_name: str = Field(
        description="Feature branch name where these changes were committed (e.g. feature/4821-dark-mode)."
    )


__all__: list[Any] = [
    "AgentType",
    "DependencyJustification",
    "SelfReviewResult",
    "ChangeSummary",
]
