"""Backend Agent.

Reads the LLD document, generates .NET C# code for all required backend
changes, validates API contracts against the frontend change summary, performs
a self-review against coding standards, and commits to the existing feature branch.

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

from contracts.change_summary import AgentType, ChangeSummary, SelfReviewResult  # noqa: E402
from contracts.lld_document import LLDDocument  # noqa: E402
from contracts.structured_spec import StructuredSpec  # noqa: E402
import git_utils  # noqa: E402

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 8192
_REVIEW_MAX_TOKENS = 1024
_VALIDATION_MAX_TOKENS = 1024
_MAX_SLUG_LENGTH = 30
_BACKEND_ROOT = "demo-app/backend"
_BRANCH_PREFIX = "feature"
_LOG_PREFIX = "[backend_agent]"

_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "backend.md"

_JSON_RECOVERY_SYSTEM = """\
You are a JSON extractor. The input contains a JSON object somewhere inside it. \
Extract the JSON object and return it verbatim. \
Respond with ONLY the JSON object — no preamble, no explanation, no markdown fences.\
"""

_SELF_REVIEW_SYSTEM_PROMPT = """\
You are a senior .NET C# code reviewer. Check each provided file against these standards:
1. Controllers must be thin — business logic lives in Services, not Controllers
2. Services must be injected via interfaces (Dependency Injection) — never instantiated directly
3. All public methods must have XML doc comments (/// <summary>)
4. Use async/await throughout — no .Result or .Wait() blocking calls
5. Entities must not be returned from API endpoints — use DTOs
6. HTTP status codes must be semantically correct (200, 201, 400, 404, 409, 500)
7. Never swallow exceptions — log and re-throw or return a structured error response
8. All new endpoints must be under a versioned path prefix (minimum /api/v1/)
9. No unused using directives or private fields
10. No magic strings or numbers — use named constants

For each violation, describe it precisely: file, construct, standard violated.

Respond ONLY with a valid JSON object with no preamble or markdown fences:
{"clean": <bool>, "violations_found": [<string>], "violations_fixed": []}\
"""

_FIX_SYSTEM_PROMPT = """\
You are a senior .NET C# engineer. Fix every violation listed in violations_to_fix. \
Return only the files that needed changes, each with complete corrected content.

Respond ONLY with a valid JSON object where keys are repo-relative file paths \
and values are the complete corrected file content. No preamble, no markdown fences.\
"""

_CONTRACT_VALIDATION_PROMPT = """\
You are an API contract validator. You will receive the expected endpoint \
specifications from the Low Level Design, a summary of what the frontend agent \
implemented, and the backend source files that were just written.

Verify that every endpoint in the LLD is correctly implemented: HTTP method, \
URL path (must be under /api/v1/), request body shape, and response body shape. \
Check that the implementation would satisfy what the frontend files expect.

Respond ONLY with a valid JSON object with no preamble or markdown fences:
{"valid": <bool>, "mismatches": [<string describing each mismatch>]}\
"""


def run(
    lld: LLDDocument,
    structured_spec: StructuredSpec,
    frontend_summary: ChangeSummary,
    work_item: dict[str, Any],
    anthropic_client: anthropic.Anthropic,
) -> ChangeSummary:
    """Generate, validate, self-review, and commit all backend code changes for the feature.

    Raises:
        RuntimeError: If Claude API calls fail, code generation produces invalid JSON,
            any file path violates the backend boundary, or git operations fail.
    """
    work_item_id = structured_spec.work_item_id
    branch_name = f"{_BRANCH_PREFIX}/{work_item_id}-{_make_slug(structured_spec.title)}"

    print(f"{_LOG_PREFIX} checking out feature branch {branch_name!r}")
    git_utils.checkout_branch(branch_name)

    print(f"{_LOG_PREFIX} reading existing backend files")
    existing_files = _read_existing_files(lld)

    backend_files_to_create = [f for f in lld.files_to_create if f.startswith(_BACKEND_ROOT)]
    backend_files_to_modify = [f for f in lld.files_to_modify if f.startswith(_BACKEND_ROOT)]
    nothing_to_do = (
        not lld.backend_changes.endpoints
        and not backend_files_to_create
        and not backend_files_to_modify
    )
    if nothing_to_do:
        print(f"{_LOG_PREFIX} no backend changes required by LLD — skipping code generation")
        return ChangeSummary(
            agent_type=AgentType.backend,
            work_item_id=work_item_id,
            files_modified=[],
            files_created=[],
            self_review=SelfReviewResult(violations_found=[], violations_fixed=[], clean=True),
            dependencies_added=[],
            api_contract_validation="No backend changes required.",
            branch_name=branch_name,
        )

    system_prompt = _load_system_prompt()
    user_message = _build_code_gen_message(lld, structured_spec, frontend_summary, existing_files)

    print(f"{_LOG_PREFIX} calling Claude to generate backend code")
    file_map = _call_claude_for_code(system_prompt, user_message, anthropic_client)

    print(f"{_LOG_PREFIX} writing {len(file_map)} file(s)")
    files_created, files_modified = _validate_and_write(file_map, existing_files)

    print(f"{_LOG_PREFIX} validating API contracts")
    contract_validation = _validate_api_contracts(lld, frontend_summary, file_map, anthropic_client)

    print(f"{_LOG_PREFIX} running self-review")
    self_review, file_map = _run_self_review(file_map, anthropic_client)

    commit_message = f"[{work_item_id}] backend: {structured_spec.title}"
    git_utils.commit_changes(list(file_map.keys()), commit_message)
    git_utils.push_branch(branch_name)

    print(f"{_LOG_PREFIX} complete branch={branch_name!r}")
    return ChangeSummary(
        agent_type=AgentType.backend,
        work_item_id=work_item_id,
        files_modified=files_modified,
        files_created=files_created,
        self_review=self_review,
        dependencies_added=[],
        api_contract_validation=contract_validation,
        branch_name=branch_name,
    )


def _make_slug(title: str) -> str:
    """Convert a feature title to a kebab-case branch slug, max _MAX_SLUG_LENGTH chars."""
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"\s+", "-", slug.strip())
    return slug[:_MAX_SLUG_LENGTH].rstrip("-")


def _read_existing_files(lld: LLDDocument) -> dict[str, str]:
    """Read current content of every backend file marked for modification in the LLD."""
    existing: dict[str, str] = {}
    for path in lld.files_to_modify:
        if not path.startswith(_BACKEND_ROOT):
            continue
        try:
            existing[path] = git_utils.read_file(path)
        except FileNotFoundError:
            pass
    return existing


def _build_code_gen_message(
    lld: LLDDocument,
    spec: StructuredSpec,
    frontend_summary: ChangeSummary,
    existing_files: dict[str, str],
) -> str:
    """Assemble the Claude user message with the LLD, spec, frontend summary, and existing files."""
    return json.dumps({
        "acceptance_criteria": spec.acceptance_criteria,
        "frontend_changes_summary": {
            "files_created": frontend_summary.files_created,
            "files_modified": frontend_summary.files_modified,
            "visual_description": frontend_summary.visual_description,
        },
        "backend_lld": {
            "endpoints": [
                {
                    "method": ep.method,
                    "path": ep.path,
                    "request_body": ep.request_body,
                    "response_body": ep.response_body,
                }
                for ep in lld.backend_changes.endpoints
            ],
            "services": lld.backend_changes.services,
            "data_models": lld.backend_changes.data_models,
            "dto_changes": lld.backend_changes.dto_changes,
            "files_to_create": [f for f in lld.files_to_create if f.startswith(_BACKEND_ROOT)],
            "files_to_modify": [f for f in lld.files_to_modify if f.startswith(_BACKEND_ROOT)],
            "new_dependencies": lld.new_dependencies.backend,
        },
        "existing_files": existing_files,
    }, indent=2)


def _strip_fences(text: str) -> str:
    """Remove markdown code fences and surrounding whitespace from a Claude response."""
    stripped = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    return re.sub(r"\s*```\s*$", "", stripped, flags=re.MULTILINE).strip()


def _try_parse_json_object(raw_text: str) -> dict[str, Any] | None:
    """Try to extract a JSON object from *raw_text*; return None if none can be found.

    Uses ``JSONDecoder.raw_decode`` which stops at the closing ``}`` and ignores
    any trailing prose. Falls back to scanning forward to the first ``{`` in case
    the response opens with prose.
    """
    text = _strip_fences(raw_text)
    decoder = json.JSONDecoder()
    for start in (0, text.find("{")):
        if start == -1:
            continue
        try:
            parsed, _ = decoder.raw_decode(text[start:].lstrip())
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return None


def _recover_json(
    prose: str,
    anthropic_client: anthropic.Anthropic,
    context: str,
) -> dict[str, Any]:
    """Ask Claude to extract the JSON object from a prose response.

    Used when the primary call returns prose instead of JSON.

    Raises:
        RuntimeError: If the recovery call fails or still cannot produce JSON.
    """
    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=_JSON_RECOVERY_SYSTEM,
            messages=[{"role": "user", "content": prose[:50_000]}],
        )
    except Exception as exc:
        raise RuntimeError(
            f"Backend Agent: recovery call failed ({context}) — {exc}"
        ) from exc
    result = _try_parse_json_object(response.content[0].text)
    if result is None:
        raise RuntimeError(
            f"Backend Agent: {context} response was not a valid JSON object even after recovery. "
            f"Raw: {response.content[0].text[:300]}"
        )
    return result


def _call_claude_json(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
    max_tokens: int,
    context: str,
) -> dict[str, Any]:
    """Run a Claude call and return the response parsed as a JSON object.

    If the response contains prose before or after the JSON, the JSON is extracted
    automatically. If no JSON object can be found, a recovery call is made.

    Raises:
        RuntimeError: On API failure or if even the recovery call cannot produce JSON.
    """
    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception as exc:
        raise RuntimeError(
            f"Backend Agent: Claude API call failed ({context}) — {exc}"
        ) from exc

    raw_text = response.content[0].text
    parsed = _try_parse_json_object(raw_text)
    if parsed is None:
        print(f"{_LOG_PREFIX} {context} returned prose — running recovery extraction")
        parsed = _recover_json(raw_text, anthropic_client, context)
    return parsed


def _call_claude_for_code(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, str]:
    """Invoke Claude for code generation and return a {file_path: content} map."""
    raw = _call_claude_json(system_prompt, user_message, anthropic_client, _MAX_TOKENS, "code generation")
    return {str(k): str(v) for k, v in raw.items()}


def _validate_and_write(
    file_map: dict[str, str],
    existing_files: dict[str, str],
) -> tuple[list[str], list[str]]:
    """Validate all paths are within the backend boundary, then write each file.

    Returns:
        A tuple of (files_created, files_modified) repo-relative path lists.

    Raises:
        RuntimeError: If any path in file_map falls outside demo-app/backend/.
    """
    created: list[str] = []
    modified: list[str] = []
    for path, content in file_map.items():
        if not path.startswith(_BACKEND_ROOT):
            raise RuntimeError(
                f"Backend Agent: rejected write outside backend boundary: {path!r}"
            )
        git_utils.write_file(path, content)
        if path in existing_files:
            modified.append(path)
        else:
            created.append(path)
    return created, modified


def _validate_api_contracts(
    lld: LLDDocument,
    frontend_summary: ChangeSummary,
    file_map: dict[str, str],
    anthropic_client: anthropic.Anthropic,
) -> str:
    """Check that written backend files implement the LLD endpoints correctly.

    Non-fatal — mismatches are logged and returned as a string for the Audit Agent,
    but do not block the commit.
    """
    message = json.dumps({
        "expected_endpoints": [
            {
                "method": ep.method,
                "path": ep.path,
                "request_body": ep.request_body,
                "response_body": ep.response_body,
            }
            for ep in lld.backend_changes.endpoints
        ],
        "frontend_files_modified": frontend_summary.files_modified,
        "frontend_files_created": frontend_summary.files_created,
        "backend_files_written": file_map,
    }, indent=2)

    try:
        raw = _call_claude_json(
            _CONTRACT_VALIDATION_PROMPT, message, anthropic_client,
            _VALIDATION_MAX_TOKENS, "contract validation",
        )
    except RuntimeError as exc:
        print(f"{_LOG_PREFIX} warning: contract validation failed — {exc}")
        return f"Contract validation could not complete: {exc}"

    mismatches: list[str] = raw.get("mismatches") or []
    if mismatches:
        print(f"{_LOG_PREFIX} contract validation: {len(mismatches)} mismatch(es) found")
        for m in mismatches:
            print(f"{_LOG_PREFIX}   - {m}")
        return f"MISMATCHES ({len(mismatches)}): " + "; ".join(mismatches)

    print(f"{_LOG_PREFIX} contract validation: all contracts match")
    return "All API contracts validated successfully."


def _run_self_review(
    file_map: dict[str, str],
    anthropic_client: anthropic.Anthropic,
) -> tuple[SelfReviewResult, dict[str, str]]:
    """Check all written files against backend coding standards and fix any violations.

    Returns:
        A tuple of (SelfReviewResult, updated_file_map).
    """
    review_message = json.dumps({"files_to_review": file_map}, indent=2)
    raw = _call_claude_json(
        _SELF_REVIEW_SYSTEM_PROMPT, review_message, anthropic_client,
        _REVIEW_MAX_TOKENS, "self-review",
    )
    violations_found: list[str] = raw.get("violations_found") or []
    violations_fixed: list[str] = []
    updated_map = dict(file_map)

    if violations_found:
        print(f"{_LOG_PREFIX} self-review: {len(violations_found)} violation(s) — applying fixes")
        fixed = _apply_fixes(updated_map, violations_found, anthropic_client)
        for path, content in fixed.items():
            if path.startswith(_BACKEND_ROOT):
                git_utils.write_file(path, content)
                updated_map[path] = content
        if fixed:
            violations_fixed = list(violations_found)

    clean = (not violations_found) or (len(violations_fixed) == len(violations_found))
    print(f"{_LOG_PREFIX} self-review complete clean={clean}")
    return SelfReviewResult(
        violations_found=violations_found,
        violations_fixed=violations_fixed,
        clean=clean,
    ), updated_map


def _apply_fixes(
    file_map: dict[str, str],
    violations: list[str],
    anthropic_client: anthropic.Anthropic,
) -> dict[str, str]:
    """Ask Claude to fix the listed violations and return corrected file contents.

    Returns an empty dict on failure so the caller can proceed with original files.
    C# source code embedded in JSON values frequently causes parse failures; a failed
    fix call is non-fatal — violations remain recorded in the self-review result for
    the Audit Agent to flag.
    """
    fix_message = json.dumps({"violations_to_fix": violations, "current_files": file_map}, indent=2)
    try:
        return _call_claude_for_code(_FIX_SYSTEM_PROMPT, fix_message, anthropic_client)
    except RuntimeError as exc:
        print(f"{_LOG_PREFIX} warning: self-review fix call failed — violations logged but unfixed: {exc}")
        return {}


def _load_system_prompt() -> str:
    """Read the backend agent system prompt from the prompts directory."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Backend Agent: could not read system prompt at {_PROMPT_PATH}: {exc}"
        ) from exc


__all__: list[Any] = ["run"]
