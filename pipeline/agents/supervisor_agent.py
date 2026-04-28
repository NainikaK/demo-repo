"""Supervisor Agent.

Generates a PR description with Claude, creates a GitHub PR, and either
auto-merges it (approve) or leaves it as a draft (human_review). Raises
RuntimeError for reject recommendations so the Orchestrator can handle escalation.

Exceptions propagate so the Orchestrator's retry loop can catch them.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

import anthropic
from github import Github
from pydantic import BaseModel, ConfigDict, Field

_AGENT_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _AGENT_DIR.parent
_UTILS_DIR = _PIPELINE_DIR / "utils"

for _dir in (_PIPELINE_DIR, _UTILS_DIR):
    if str(_dir) not in sys.path:
        sys.path.insert(0, str(_dir))

from contracts.audit_report import AuditReport, MergeRecommendation  # noqa: E402
from contracts.change_summary import ChangeSummary  # noqa: E402
from contracts.structured_spec import StructuredSpec  # noqa: E402
from contracts.test_results import TestResults  # noqa: E402

_MODEL = "claude-sonnet-4-6"
_GITHUB_REPO: str = os.environ.get("GITHUB_REPO", "")
_BASE_BRANCH = "main"
_LOG_PREFIX = "[supervisor_agent]"
_PR_DESCRIPTION_MAX_TOKENS = 512
_PR_TITLE_TEMPLATE = "[WI-{work_item_id}] {title}"

_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "supervisor.md"


class SupervisorDecision(BaseModel):
    model_config = ConfigDict(frozen=True)

    pr_url: str = Field(description="GitHub URL of the created PR.")
    pr_number: int = Field(description="GitHub PR number.")
    merged: bool = Field(description="True when the PR was auto-merged via squash.")
    merge_method: str = Field(description="'squash' for auto-merge, 'draft' for human-review PRs.")
    decision: str = Field(description="'approve', 'human_review', or 'reject'.")


def run(
    audit_report: AuditReport,
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    test_results: TestResults,
    structured_spec: StructuredSpec,
    anthropic_client: anthropic.Anthropic,
) -> SupervisorDecision:
    """Create a GitHub PR based on the audit recommendation and return a SupervisorDecision.

    Raises:
        RuntimeError: When merge_recommendation is reject, or if GitHub or Claude API calls fail.
    """
    if audit_report.merge_recommendation == MergeRecommendation.reject:
        raise RuntimeError(
            f"Supervisor Agent: audit recommendation is REJECT "
            f"(composite={audit_report.composite_score:.2f}, "
            f"blocking={len(audit_report.blocking_findings)}) — no PR will be created."
        )

    work_item_id = structured_spec.work_item_id
    branch_name = frontend_summary.branch_name
    pr_title = _PR_TITLE_TEMPLATE.format(work_item_id=work_item_id, title=structured_spec.title)

    print(f"{_LOG_PREFIX} generating PR description work_item={work_item_id}")
    pr_description = _generate_pr_description(
        audit_report, frontend_summary, backend_summary, test_results, structured_spec, anthropic_client
    )

    is_draft = audit_report.merge_recommendation == MergeRecommendation.human_review
    print(f"{_LOG_PREFIX} creating GitHub PR branch={branch_name!r} draft={is_draft}")
    pr = _create_github_pr(pr_title, pr_description, branch_name, draft=is_draft)

    if audit_report.merge_recommendation == MergeRecommendation.approve:
        print(f"{_LOG_PREFIX} auto-merging PR #{pr.number}")
        pr.merge(merge_method="squash", commit_title=pr.title, commit_message=pr_description)
        print(f"{_LOG_PREFIX} merged PR #{pr.number} url={pr.html_url}")
        return SupervisorDecision(
            pr_url=pr.html_url,
            pr_number=pr.number,
            merged=True,
            merge_method="squash",
            decision="approve",
        )

    print(f"{_LOG_PREFIX} draft PR #{pr.number} created for human review url={pr.html_url}")
    return SupervisorDecision(
        pr_url=pr.html_url,
        pr_number=pr.number,
        merged=False,
        merge_method="draft",
        decision="human_review",
    )


def _build_pr_payload(
    audit_report: AuditReport,
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    test_results: TestResults,
    spec: StructuredSpec,
) -> str:
    """Serialize all PR-relevant data as JSON for the Claude user message."""
    cats = audit_report.categories
    return json.dumps({
        "feature_title": spec.title,
        "feature_summary": spec.summary,
        "acceptance_criteria": spec.acceptance_criteria,
        "frontend_files": frontend_summary.files_created + frontend_summary.files_modified,
        "backend_files": backend_summary.files_created + backend_summary.files_modified,
        "test_results": {
            "passed": test_results.passed,
            "failed": test_results.failed,
            "skipped": test_results.skipped,
            "total": test_results.total_tests,
        },
        "audit": {
            "composite_score": audit_report.composite_score,
            "merge_recommendation": audit_report.merge_recommendation.value,
            "summary": audit_report.summary,
            "category_scores": {
                "code_correctness": f"{cats.code_correctness.score}/{cats.code_correctness.max_score}",
                "standards_compliance": f"{cats.standards_compliance.score}/{cats.standards_compliance.max_score}",
                "test_coverage": f"{cats.test_coverage.score}/{cats.test_coverage.max_score}",
                "security": f"{cats.security.score}/{cats.security.max_score}",
                "spec_adherence": f"{cats.spec_adherence.score}/{cats.spec_adherence.max_score}",
                "performance": f"{cats.performance.score}/{cats.performance.max_score}",
                "documentation": f"{cats.documentation.score}/{cats.documentation.max_score}",
            },
            "blocking_findings": len(audit_report.blocking_findings),
        },
    }, indent=2)


def _generate_pr_description(
    audit_report: AuditReport,
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    test_results: TestResults,
    spec: StructuredSpec,
    anthropic_client: anthropic.Anthropic,
) -> str:
    """Ask Claude to write a markdown PR description and return it."""
    system_prompt = _load_system_prompt()
    payload = _build_pr_payload(audit_report, frontend_summary, backend_summary, test_results, spec)
    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=_PR_DESCRIPTION_MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": payload}],
        )
        return response.content[0].text.strip()
    except Exception as exc:
        raise RuntimeError(
            f"Supervisor Agent: Claude API call failed (PR description) — {exc}"
        ) from exc


def _create_github_pr(title: str, body: str, branch_name: str, *, draft: bool) -> Any:
    """Authenticate to GitHub, create a PR, and return the PyGithub PR object.

    Raises:
        RuntimeError: If GITHUB_PAT or GITHUB_REPO are unset, or the API call fails.
    """
    github_pat = os.environ.get("GITHUB_PAT")
    if not github_pat:
        raise RuntimeError("Supervisor Agent: GITHUB_PAT environment variable is not set.")
    if not _GITHUB_REPO:
        raise RuntimeError("Supervisor Agent: GITHUB_REPO environment variable is not set.")
    try:
        repo = Github(github_pat).get_repo(_GITHUB_REPO)
        return repo.create_pull(
            title=title,
            body=body,
            head=branch_name,
            base=_BASE_BRANCH,
            draft=draft,
        )
    except Exception as exc:
        raise RuntimeError(f"Supervisor Agent: GitHub PR creation failed — {exc}") from exc


def _load_system_prompt() -> str:
    """Read the supervisor agent system prompt from the prompts directory."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Supervisor Agent: could not read system prompt at {_PROMPT_PATH}: {exc}"
        ) from exc


__all__: list[Any] = ["SupervisorDecision", "run"]
