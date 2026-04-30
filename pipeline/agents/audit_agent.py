"""Audit Agent.

Reviews all code changes on the feature branch, scores them against a weighted
rubric, identifies blocking findings, and produces a structured AuditReport that
the Supervisor Agent uses to determine the merge path.

Exceptions propagate so the Orchestrator's retry loop can catch them.
"""

import json
import re
import sys
from pathlib import Path
from typing import Any

import anthropic

_AGENT_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _AGENT_DIR.parent
_UTILS_DIR = _PIPELINE_DIR / "utils"

for _dir in (_PIPELINE_DIR, _UTILS_DIR):
    if str(_dir) not in sys.path:
        sys.path.insert(0, str(_dir))

from contracts.audit_report import (  # noqa: E402
    AuditCategories,
    AuditFinding,
    AuditReport,
    CategoryScore,
    FindingSeverity,
    MergeRecommendation,
)
from contracts.change_summary import ChangeSummary  # noqa: E402
from contracts.lld_document import LLDDocument  # noqa: E402
from contracts.structured_spec import StructuredSpec  # noqa: E402
from contracts.test_results import TestResults  # noqa: E402
import git_utils  # noqa: E402

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 4096
_AUTO_MERGE_THRESHOLD = 8.0
_HUMAN_REVIEW_THRESHOLD = 7.0
_LOG_PREFIX = "[audit_agent]"

_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "audit.md"

_CATEGORY_MAX_SCORES: dict[str, float] = {
    "code_correctness": 2.0,
    "standards_compliance": 1.5,
    "test_coverage": 2.0,
    "security": 2.0,
    "spec_adherence": 1.0,
    "performance": 1.0,
    "documentation": 0.5,
}

_BLOCKING_SEVERITIES: frozenset[FindingSeverity] = frozenset(
    {FindingSeverity.high, FindingSeverity.critical}
)

_SIMPLIFIED_AUDIT_MAX_TOKENS = 8192
_SIMPLIFIED_AUDIT_SYSTEM_PROMPT = """\
You are a senior code auditor. The full audit response was too long to parse. \
Return ONLY a compact JSON object with scores (0–10 each) and a short summary. \
No findings list needed. Schema exactly:
{"categories": {"code_correctness": {"score": 0, "findings": []}, \
"standards_compliance": {"score": 0, "findings": []}, \
"test_coverage": {"score": 0, "findings": []}, \
"security": {"score": 0, "findings": []}, \
"spec_adherence": {"score": 0, "findings": []}, \
"performance": {"score": 0, "findings": []}, \
"documentation": {"score": 0, "findings": []}}, "summary": "string"}\
"""


def run(
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    test_results: TestResults,
    lld: LLDDocument,
    structured_spec: StructuredSpec,
    anthropic_client: anthropic.Anthropic,
) -> AuditReport:
    """Score all feature-branch changes against the audit rubric and return a report.

    Raises:
        RuntimeError: If git operations fail, the Claude API call fails, or the
            response cannot be parsed as a valid JSON object.
    """
    work_item_id = structured_spec.work_item_id
    branch_name = frontend_summary.branch_name

    print(f"{_LOG_PREFIX} checking out branch {branch_name!r}")
    git_utils.checkout_branch(branch_name)

    source_files = _read_changed_files(frontend_summary, backend_summary)
    system_prompt = _load_system_prompt()
    user_message = _build_audit_message(
        source_files, frontend_summary, backend_summary, test_results, lld, structured_spec
    )

    print(f"{_LOG_PREFIX} calling Claude to score changes work_item={work_item_id}")
    raw = _call_claude(system_prompt, user_message, anthropic_client)

    categories, composite = _parse_scores(raw)
    blocking_findings = _collect_blocking_findings(categories, test_results)
    merge_recommendation = _determine_recommendation(composite, blocking_findings)
    summary = str(raw.get("summary") or "Audit complete.")

    print(
        f"{_LOG_PREFIX} complete composite={composite:.2f} "
        f"blocking={len(blocking_findings)} recommendation={merge_recommendation.value}"
    )
    return AuditReport(
        pipeline_run_id=work_item_id,
        work_item_id=work_item_id,
        composite_score=composite,
        merge_recommendation=merge_recommendation,
        blocking_findings=blocking_findings,
        categories=categories,
        summary=summary,
    )


def _read_changed_files(
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
) -> dict[str, str]:
    """Read every file created or modified by the frontend and backend agents."""
    all_paths = (
        frontend_summary.files_created
        + frontend_summary.files_modified
        + backend_summary.files_created
        + backend_summary.files_modified
    )
    files: dict[str, str] = {}
    for path in all_paths:
        try:
            files[path] = git_utils.read_file(path)
        except (FileNotFoundError, RuntimeError) as exc:
            print(f"{_LOG_PREFIX} warning: could not read {path!r} — {exc}")
    return files


def _build_audit_message(
    source_files: dict[str, str],
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    test_results: TestResults,
    lld: LLDDocument,
    spec: StructuredSpec,
) -> str:
    """Assemble the Claude user message containing all review inputs."""
    return json.dumps({
        "acceptance_criteria": spec.acceptance_criteria,
        "out_of_scope": spec.out_of_scope,
        "lld": {
            "files_to_create": lld.files_to_create,
            "files_to_modify": lld.files_to_modify,
            "frontend_components_to_create": lld.frontend_changes.components_to_create,
            "backend_endpoints": [
                {"method": ep.method, "path": ep.path}
                for ep in lld.backend_changes.endpoints
            ],
        },
        "test_results": {
            "total": test_results.total_tests,
            "passed": test_results.passed,
            "failed": test_results.failed,
            "skipped": test_results.skipped,
            "coverage_percent": test_results.coverage.line_coverage_percent,
            "below_threshold_files": test_results.coverage.below_threshold,
            "test_cases": [
                {"name": c.name, "status": c.status.value, "error": c.error_message}
                for c in test_results.test_cases
            ],
        },
        "self_review": {
            "frontend": {
                "clean": frontend_summary.self_review.clean,
                "violations_found": frontend_summary.self_review.violations_found,
                "violations_fixed": frontend_summary.self_review.violations_fixed,
            },
            "backend": {
                "clean": backend_summary.self_review.clean,
                "violations_found": backend_summary.self_review.violations_found,
                "violations_fixed": backend_summary.self_review.violations_fixed,
            },
        },
        "source_files": source_files,
    }, indent=2)


def _call_claude(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, Any]:
    """Run a Claude call and return the response parsed as a JSON object.

    Raises:
        RuntimeError: On API failure or if the response is not a JSON object.
    """
    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception as exc:
        raise RuntimeError(f"Audit Agent: Claude API call failed — {exc}") from exc

    raw_text = _strip_fences(response.content[0].text)
    decoder = json.JSONDecoder()
    for start_idx in (0, raw_text.find("{")):
        if start_idx == -1:
            continue
        try:
            parsed, _ = decoder.raw_decode(raw_text[start_idx:].lstrip())
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    print(f"{_LOG_PREFIX} audit response parse failed — retrying with simplified scores-only prompt")
    return _call_claude_simplified(user_message, anthropic_client)


def _call_claude_simplified(
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, Any]:
    """Simplified fallback: ask only for scores with no findings or source files.

    Raises:
        RuntimeError: If the API call fails or the response is still not valid JSON.
    """
    try:
        payload = json.loads(user_message)
        payload.pop("source_files", None)
        simplified_msg = json.dumps(payload, indent=2)
    except (json.JSONDecodeError, ValueError):
        simplified_msg = user_message

    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=_SIMPLIFIED_AUDIT_MAX_TOKENS,
            system=_SIMPLIFIED_AUDIT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": simplified_msg}],
        )
    except Exception as exc:
        raise RuntimeError(f"Audit Agent: simplified fallback API call failed — {exc}") from exc

    raw_text = _strip_fences(response.content[0].text)
    if not raw_text.startswith("{"):
        try:
            raw_text = raw_text[raw_text.index("{"):]
        except ValueError:
            pass
    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
        return parsed
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Audit Agent: simplified fallback response was not valid JSON. Raw: {raw_text[:300]}"
        ) from exc


def _parse_scores(raw: dict[str, Any]) -> tuple[AuditCategories, float]:
    """Convert Claude's 0–10 category scores to actual points. Returns (categories, composite)."""
    cats_raw = raw.get("categories") or {}

    def _build_category(key: str) -> CategoryScore:
        data = cats_raw.get(key) or {}
        raw_score = max(0.0, min(10.0, float(data.get("score") or 0)))
        max_s = _CATEGORY_MAX_SCORES[key]
        actual = round(raw_score * max_s / 10.0, 3)
        return CategoryScore(
            score=actual,
            max_score=max_s,
            findings=_parse_findings(data.get("findings") or [], key),
        )

    categories = AuditCategories(
        code_correctness=_build_category("code_correctness"),
        standards_compliance=_build_category("standards_compliance"),
        test_coverage=_build_category("test_coverage"),
        security=_build_category("security"),
        spec_adherence=_build_category("spec_adherence"),
        performance=_build_category("performance"),
        documentation=_build_category("documentation"),
    )
    composite = min(10.0, round(
        sum(getattr(categories, k).score for k in _CATEGORY_MAX_SCORES), 2
    ))
    return categories, composite


def _parse_findings(raw_list: list[Any], default_category: str) -> list[AuditFinding]:
    """Parse a list of raw finding dicts from Claude into AuditFinding objects."""
    findings: list[AuditFinding] = []
    for f in raw_list:
        if not isinstance(f, dict):
            continue
        severity_str = str(f.get("severity") or "low").lower()
        try:
            severity = FindingSeverity(severity_str)
        except ValueError:
            severity = FindingSeverity.low
        line_num = f.get("line_number")
        findings.append(AuditFinding(
            category=str(f.get("category") or default_category),
            description=str(f.get("description") or ""),
            severity=severity,
            file_path=f.get("file_path") or None,
            line_number=int(line_num) if line_num is not None else None,
        ))
    return findings


def _collect_blocking_findings(
    categories: AuditCategories,
    test_results: TestResults,
) -> list[AuditFinding]:
    """Collect findings that unconditionally block the merge regardless of composite score."""
    blocking: list[AuditFinding] = []

    blocking.extend(
        f for f in categories.security.findings if f.severity in _BLOCKING_SEVERITIES
    )

    if test_results.failed > 0:
        blocking.append(AuditFinding(
            category="test_coverage",
            description=f"{test_results.failed} test(s) failed — all tests must pass before merge.",
            severity=FindingSeverity.high,
            file_path=None,
            line_number=None,
        ))

    if categories.spec_adherence.score == 0.0:
        blocking.append(AuditFinding(
            category="spec_adherence",
            description="Spec adherence score is zero — one or more acceptance criteria are unmet.",
            severity=FindingSeverity.critical,
            file_path=None,
            line_number=None,
        ))

    return blocking


def _determine_recommendation(
    composite: float,
    blocking_findings: list[AuditFinding],
) -> MergeRecommendation:
    """Map composite score and blocking findings to a MergeRecommendation."""
    if blocking_findings:
        return MergeRecommendation.reject
    if composite >= _AUTO_MERGE_THRESHOLD:
        return MergeRecommendation.approve
    if composite >= _HUMAN_REVIEW_THRESHOLD:
        return MergeRecommendation.human_review
    return MergeRecommendation.reject


def _strip_fences(text: str) -> str:
    """Remove markdown code fences and surrounding whitespace from a Claude response."""
    stripped = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    return re.sub(r"\s*```\s*$", "", stripped, flags=re.MULTILINE).strip()


def _load_system_prompt() -> str:
    """Read the audit agent system prompt from the prompts directory."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Audit Agent: could not read system prompt at {_PROMPT_PATH}: {exc}"
        ) from exc


__all__: list[Any] = ["run"]
