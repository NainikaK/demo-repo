"""Frontend Agent.

Reads the LLD document, generates React/TypeScript code for all required frontend
changes, performs a self-review against coding standards, rewrites any violations,
and commits the result to a feature branch.

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
_VISUAL_MAX_TOKENS = 256
_MAX_SLUG_LENGTH = 30
_FRONTEND_ROOT = "demo-app/frontend"
_LOG_PREFIX = "[frontend_agent]"

_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "frontend.md"

_SELF_REVIEW_SYSTEM_PROMPT = """\
You are a senior React/TypeScript code reviewer. Check each provided file against \
these standards:
1. Functional components only — no class components
2. Props must have explicit TypeScript interfaces, never inline object types
3. No inline styles — Tailwind utility classes only
4. All interactive elements must have aria-label or visible label text
5. useEffect dependencies array must be complete and correct
6. No implicit any types
7. No unused imports or variables
8. No magic strings — use named constants
9. All user-facing strings must be externalized (not literal text inside JSX logic)
10. State shared across more than two components must use Context or a state manager

For each violation, describe it precisely: file, construct, standard violated.

Respond ONLY with a valid JSON object with no preamble or markdown fences:
{"clean": <bool>, "violations_found": [<string>], "violations_fixed": []}\
"""

_FIX_SYSTEM_PROMPT = """\
You are a senior React/TypeScript engineer. Fix every violation listed in \
violations_to_fix. Return only the files that needed changes, each with its \
complete corrected content.

Respond ONLY with a valid JSON object where keys are repo-relative file paths \
and values are the complete corrected file content. No preamble, no markdown fences.\
"""

_VISUAL_DESCRIPTION_PROMPT = """\
You are a technical writer. Given a feature title and the React component files \
written for it, write exactly one sentence describing what the UI change looks like \
and how a user interacts with it. Focus on what the user sees and does. \
Respond with the sentence only — no preamble.\
"""


def run(
    lld: LLDDocument,
    structured_spec: StructuredSpec,
    story_ids: list[int],
    work_item: dict[str, Any],
    anthropic_client: anthropic.Anthropic,
) -> ChangeSummary:
    """Generate, self-review, and commit all frontend code changes for the feature.

    Raises:
        RuntimeError: If Claude API calls fail, code generation produces invalid JSON,
            any file path violates the frontend boundary, or git operations fail.
    """
    work_item_id = structured_spec.work_item_id
    slug = _make_slug(structured_spec.title)

    print(f"{_LOG_PREFIX} creating feature branch work_item={work_item_id}")
    branch_name = git_utils.create_feature_branch(work_item_id, slug)

    print(f"{_LOG_PREFIX} reading existing frontend files")
    existing_files = _read_existing_files(lld)

    system_prompt = _load_system_prompt()
    user_message = _build_code_gen_message(lld, structured_spec, story_ids, existing_files)

    print(f"{_LOG_PREFIX} calling Claude to generate frontend code")
    file_map = _call_claude_for_code(system_prompt, user_message, anthropic_client)

    print(f"{_LOG_PREFIX} writing {len(file_map)} file(s)")
    files_created, files_modified = _validate_and_write(file_map, existing_files)

    print(f"{_LOG_PREFIX} running self-review")
    self_review, file_map = _run_self_review(file_map, anthropic_client)

    commit_message = f"[{work_item_id}] frontend: {structured_spec.title}"
    git_utils.commit_changes(list(file_map.keys()), commit_message)
    git_utils.push_branch(branch_name)

    visual_description = _get_visual_description(
        structured_spec.title, file_map, anthropic_client
    )
    print(f"{_LOG_PREFIX} complete branch={branch_name!r}")
    return ChangeSummary(
        agent_type=AgentType.frontend,
        work_item_id=work_item_id,
        files_modified=files_modified,
        files_created=files_created,
        self_review=self_review,
        dependencies_added=[],
        visual_description=visual_description,
        branch_name=branch_name,
    )


def _make_slug(title: str) -> str:
    """Convert a feature title to a kebab-case branch slug, max _MAX_SLUG_LENGTH chars."""
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"\s+", "-", slug.strip())
    return slug[:_MAX_SLUG_LENGTH].rstrip("-")


def _read_existing_files(lld: LLDDocument) -> dict[str, str]:
    """Read current content of every frontend file marked for modification in the LLD."""
    existing: dict[str, str] = {}
    for path in lld.files_to_modify:
        if not path.startswith(_FRONTEND_ROOT):
            continue
        try:
            existing[path] = git_utils.read_file(path)
        except FileNotFoundError:
            pass
    return existing


def _build_code_gen_message(
    lld: LLDDocument,
    spec: StructuredSpec,
    story_ids: list[int],
    existing_files: dict[str, str],
) -> str:
    """Assemble the Claude user message containing the LLD, spec, and existing file contents."""
    return json.dumps({
        "story_ids": story_ids,
        "acceptance_criteria": spec.acceptance_criteria,
        "frontend_lld": {
            "components_to_create": lld.frontend_changes.components_to_create,
            "components_to_modify": lld.frontend_changes.components_to_modify,
            "hooks": lld.frontend_changes.hooks,
            "state_changes": lld.frontend_changes.state_changes,
            "props_interfaces": lld.frontend_changes.props_interfaces,
            "files_to_create": [f for f in lld.files_to_create if f.startswith(_FRONTEND_ROOT)],
            "files_to_modify": [f for f in lld.files_to_modify if f.startswith(_FRONTEND_ROOT)],
            "new_dependencies": lld.new_dependencies.frontend,
        },
        "existing_files": existing_files,
    }, indent=2)


def _call_claude_json(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
    max_tokens: int,
    context: str,
) -> dict[str, Any]:
    """Run a Claude call and return the response parsed as a JSON object.

    Raises:
        RuntimeError: On API failure or if the response is not a JSON object.
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
            f"Frontend Agent: Claude API call failed ({context}) — {exc}"
        ) from exc

    raw_text = _strip_fences(response.content[0].text)
    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
        return parsed
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Frontend Agent: {context} response was not a valid JSON object. "
            f"Raw: {raw_text[:300]}"
        ) from exc


def _call_claude_for_code(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, str]:
    """Invoke Claude for code generation and return a {file_path: content} map."""
    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception as exc:
        raise RuntimeError(
            f"Frontend Agent: Claude API call failed (code generation) — {exc}"
        ) from exc

    raw_text = _strip_fences(response.content[0].text)
    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
        return {str(k): str(v) for k, v in parsed.items()}
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Frontend Agent: code generation response was not a valid JSON object. "
            f"Raw: {raw_text[:300]}"
        ) from exc


def _validate_and_write(
    file_map: dict[str, str],
    existing_files: dict[str, str],
) -> tuple[list[str], list[str]]:
    """Validate all paths are within the frontend boundary, then write each file.

    Returns:
        A tuple of (files_created, files_modified) repo-relative path lists.

    Raises:
        RuntimeError: If any path in file_map falls outside demo-app/frontend/.
    """
    created: list[str] = []
    modified: list[str] = []
    for path, content in file_map.items():
        if not path.startswith(_FRONTEND_ROOT):
            raise RuntimeError(
                f"Frontend Agent: rejected write outside frontend boundary: {path!r}"
            )
        git_utils.write_file(path, content)
        if path in existing_files:
            modified.append(path)
        else:
            created.append(path)
    return created, modified


def _run_self_review(
    file_map: dict[str, str],
    anthropic_client: anthropic.Anthropic,
) -> tuple[SelfReviewResult, dict[str, str]]:
    """Check all written files against coding standards and fix any violations found.

    Returns:
        A tuple of (SelfReviewResult, updated_file_map). The file map is updated
        in-place if fixes were applied.
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
            if path.startswith(_FRONTEND_ROOT):
                git_utils.write_file(path, content)
                updated_map[path] = content
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
    """Ask Claude to fix the listed violations and return corrected file contents."""
    fix_message = json.dumps({"violations_to_fix": violations, "current_files": file_map}, indent=2)
    return _call_claude_for_code(_FIX_SYSTEM_PROMPT, fix_message, anthropic_client)


def _get_visual_description(
    title: str,
    file_map: dict[str, str],
    anthropic_client: anthropic.Anthropic,
) -> str:
    """Return a one-sentence plain-English description of the UI change.

    Falls back to a generic description if the Claude call fails.
    """
    message = json.dumps(
        {"feature_title": title, "files_written": list(file_map.keys())}, indent=2
    )
    try:
        response = anthropic_client.messages.create(
            model=_MODEL,
            max_tokens=_VISUAL_MAX_TOKENS,
            system=_VISUAL_DESCRIPTION_PROMPT,
            messages=[{"role": "user", "content": message}],
        )
        return response.content[0].text.strip()
    except Exception as exc:
        print(f"{_LOG_PREFIX} warning: could not get visual description — {exc}")
        return f"Frontend changes implemented for: {title}"


def _strip_fences(text: str) -> str:
    """Remove markdown code fences and surrounding whitespace from a Claude response."""
    stripped = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    return re.sub(r"\s*```\s*$", "", stripped, flags=re.MULTILINE).strip()


def _load_system_prompt() -> str:
    """Read the frontend agent system prompt from the prompts directory."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Frontend Agent: could not read system prompt at {_PROMPT_PATH}: {exc}"
        ) from exc


__all__: list[Any] = ["run"]
