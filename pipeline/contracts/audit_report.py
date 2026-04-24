"""Output contract of the Audit Agent.

Defines the structured audit report the Audit Agent produces after reviewing all
code changes on the feature branch. Consumed exclusively by the Supervisor Agent,
which uses composite_score and has_blocking_findings to determine the merge path.
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field


class FindingSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


_BLOCKING_SEVERITIES: frozenset[FindingSeverity] = frozenset(
    {FindingSeverity.high, FindingSeverity.critical}
)


class AuditFinding(BaseModel):
    model_config = ConfigDict(frozen=True)

    category: str = Field(
        description=(
            "Audit category this finding belongs to — one of: code_correctness, "
            "standards_compliance, test_coverage, security, spec_adherence, performance, documentation."
        )
    )
    description: str = Field(
        description="Human-readable explanation of the issue found."
    )
    severity: FindingSeverity = Field(
        description="Impact level of the finding. HIGH and CRITICAL findings always block the merge."
    )
    file_path: Optional[str] = Field(
        default=None,
        description="Repo-relative path of the source file where the issue was identified."
    )
    line_number: Optional[int] = Field(
        default=None,
        description="Line number within file_path where the issue appears."
    )


class CategoryScore(BaseModel):
    model_config = ConfigDict(frozen=True)

    score: float = Field(
        ge=0.0,
        description="Points awarded in this category."
    )
    max_score: float = Field(
        gt=0.0,
        description="Maximum points possible in this category (set by the audit rubric)."
    )
    findings: list[AuditFinding] = Field(
        description="Individual findings that influenced this category's score."
    )


class MergeRecommendation(str, Enum):
    approve = "approve"
    human_review = "human_review"
    reject = "reject"


class AuditCategories(BaseModel):
    model_config = ConfigDict(frozen=True)

    code_correctness: CategoryScore = Field(
        description="Does the code do what the spec says, with no bugs or build failures? Max 2.0 pts."
    )
    standards_compliance: CategoryScore = Field(
        description="Does the code follow all standards in CLAUDE.md Section 8? Max 1.5 pts."
    )
    test_coverage: CategoryScore = Field(
        description="Are tests sufficient, complete, meaningful, and above 70% line coverage? Max 2.0 pts."
    )
    security: CategoryScore = Field(
        description="Are there XSS, injection, hardcoded-secret, or data-exposure vulnerabilities? Max 2.0 pts."
    )
    spec_adherence: CategoryScore = Field(
        description="Does the implementation satisfy every acceptance criterion in the structured spec? Max 1.0 pts."
    )
    performance: CategoryScore = Field(
        description="Are there synchronous renders, N+1 queries, or unbounded list renders? Max 1.0 pts."
    )
    documentation: CategoryScore = Field(
        description="Are README, Swagger docs, and CHANGELOG entries complete? Max 0.5 pts."
    )


class AuditReport(BaseModel):
    model_config = ConfigDict(frozen=True)

    pipeline_run_id: str = Field(
        description="Unique ID of the pipeline run this report belongs to."
    )
    work_item_id: str = Field(
        description="ADO work item ID this report covers."
    )
    composite_score: float = Field(
        ge=0.0,
        le=10.0,
        description="Weighted composite score out of 10.0. >= 8.0 triggers auto-merge; 7.0–7.99 triggers human review.",
    )
    merge_recommendation: MergeRecommendation = Field(
        description="Final merge path derived from composite_score and blocking findings."
    )
    blocking_findings: list[AuditFinding] = Field(
        description=(
            "Findings that block the merge regardless of composite_score — "
            "any HIGH or CRITICAL security issue, build failure, or unmet acceptance criterion."
        )
    )
    categories: AuditCategories = Field(
        description="Per-category scores and their individual findings."
    )
    summary: str = Field(
        description="Human-readable narrative summarising the audit outcome and key findings."
    )

    @computed_field
    @property
    def has_blocking_findings(self) -> bool:
        """True when any finding in blocking_findings has severity HIGH or CRITICAL."""
        return any(f.severity in _BLOCKING_SEVERITIES for f in self.blocking_findings)


__all__: list[Any] = [
    "FindingSeverity",
    "AuditFinding",
    "CategoryScore",
    "MergeRecommendation",
    "AuditCategories",
    "AuditReport",
]
