"""Master pipeline run record.

Tracks the complete state of a single pipeline execution from work item ingestion
through to merge or failure. Written and updated exclusively by the Orchestrator.
All other agents receive a read-only copy for context but never mutate it directly.

PipelineRun and AgentRunRecord are intentionally mutable (frozen=False) because
the Orchestrator updates them in place as each phase completes.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from .audit_report import AuditReport
from .change_summary import ChangeSummary
from .lld_document import LLDDocument
from .structured_spec import ClarificationOutput
from .test_results import TestResults


class PipelineState(str, Enum):
    pending_clarification = "PENDING_CLARIFICATION"
    clarification_failed = "CLARIFICATION_FAILED"
    stories_created = "STORIES_CREATED"
    spec_in_progress = "SPEC_IN_PROGRESS"
    coding_in_progress = "CODING_IN_PROGRESS"
    testing_in_progress = "TESTING_IN_PROGRESS"
    audit_in_progress = "AUDIT_IN_PROGRESS"
    supervisor_review = "SUPERVISOR_REVIEW"
    auto_merged = "AUTO_MERGED"
    human_review_pending = "HUMAN_REVIEW_PENDING"
    pipeline_failed = "PIPELINE_FAILED"


class AgentRunRecord(BaseModel):
    model_config = ConfigDict(frozen=False)

    agent_name: str = Field(
        description="Name of the agent that executed (matches the filename, e.g. 'clarification_agent')."
    )
    started_at: datetime = Field(
        description="UTC timestamp when the Orchestrator invoked this agent."
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp when the agent finished. None while the agent is still running.",
    )
    success: bool = Field(
        description="True when the agent completed without raising an exception or timing out."
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error or timeout detail when success is False."
    )
    retry_count: int = Field(
        default=0,
        description="Number of prior failed attempts before this record (0 = first attempt, max 2).",
    )
    attempt_number: int = Field(
        default=1,
        description="Which attempt this record represents — 1 for first try, 2 or 3 for retries.",
    )
    checkpoint_saved: bool = Field(
        default=False,
        description="Whether a checkpoint was saved after this agent completed successfully.",
    )
    checkpoint_timestamp: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp when the checkpoint was saved.",
    )
    diagnosis: Optional[str] = Field(
        default=None,
        description="Root cause analysis produced by the diagnosis step on failure.",
    )
    retry_context: Optional[str] = Field(
        default=None,
        description="Additional context passed to the retry attempt based on diagnosis.",
    )


class PipelineRun(BaseModel):
    model_config = ConfigDict(frozen=False)

    run_id: str = Field(
        description="UUID uniquely identifying this pipeline run."
    )
    work_item_id: str = Field(
        description="ADO work item ID that triggered this pipeline run."
    )
    work_item_title: str = Field(
        description="Title of the ADO work item, captured at pipeline start."
    )
    state: PipelineState = Field(
        description="Current state of the pipeline. Updated by the Orchestrator at every phase transition."
    )
    started_at: datetime = Field(
        description="UTC timestamp when the Orchestrator first picked up the work item."
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp when the pipeline reached a terminal state (AUTO_MERGED or PIPELINE_FAILED).",
    )
    agent_runs: list[AgentRunRecord] = Field(
        default_factory=list,
        description="Ordered log of every agent invocation in this run, including retries.",
    )
    clarification_output: Optional[ClarificationOutput] = Field(
        default=None,
        description="Output of the Clarification Agent. Set after the clarification phase completes.",
    )
    story_ids: list[int] = Field(
        default_factory=list,
        description="ADO IDs of the User Stories created by the Story Writer Agent.",
    )
    lld_document: Optional[LLDDocument] = Field(
        default=None,
        description="Low Level Design document produced by the Spec Agent. Set after the spec phase completes.",
    )
    frontend_summary: Optional[ChangeSummary] = Field(
        default=None,
        description="Change summary produced by the Frontend Agent. Set after coding phase (frontend) completes.",
    )
    backend_summary: Optional[ChangeSummary] = Field(
        default=None,
        description="Change summary produced by the Backend Agent. Set after coding phase (backend) completes.",
    )
    test_results: Optional[TestResults] = Field(
        default=None,
        description="Test run results produced by the Test Agent. Set after the testing phase completes.",
    )
    audit_report: Optional[AuditReport] = Field(
        default=None,
        description="Audit report produced by the Audit Agent. Set after the audit phase completes.",
    )
    github_pr_url: Optional[str] = Field(
        default=None,
        description="URL of the GitHub PR opened by the Supervisor Agent. Set on merge or draft PR creation.",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Top-level error detail when the pipeline reaches PIPELINE_FAILED state.",
    )
    pipeline_retry_count: int = Field(
        default=0,
        description="Number of times the full pipeline has been retried from a checkpoint.",
    )
    last_checkpoint_phase: Optional[str] = Field(
        default=None,
        description="Name of the last successfully checkpointed agent phase — used for crash recovery.",
    )
    needs_attention: bool = Field(
        default=False,
        description="Set to True when human escalation is triggered after 3 failed attempts at any phase.",
    )
    escalation_report: Optional[str] = Field(
        default=None,
        description="Full diagnostic report posted to ADO when needs_attention is True.",
    )
    clarification_comment_count: int = Field(
        default=0,
        description=(
            "Total number of ADO comments on the work item at the moment clarification was paused. "
            "Used by the poll loop to detect new human comments that should trigger a re-run."
        ),
    )


__all__: list[Any] = ["PipelineState", "AgentRunRecord", "PipelineRun"]
