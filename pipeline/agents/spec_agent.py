"""Spec Agent.

Translates user stories and the structured spec into a Low Level Design (LLD)
document that serves as the primary implementation blueprint for the Frontend
and Backend agents.

Exceptions propagate so the Orchestrator's retry loop can catch them.
"""

import json
import sys
from pathlib import Path
from typing import Any

import anthropic

_AGENT_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _AGENT_DIR.parent
_ADO_MCP_DIR = _PIPELINE_DIR / "mcp-servers" / "ado-mcp"
_REPO_ROOT = _PIPELINE_DIR.parent
_DEMO_APP_DIR = _REPO_ROOT / "demo-app"

for _dir in (_PIPELINE_DIR, _ADO_MCP_DIR):
    if str(_dir) not in sys.path:
        sys.path.insert(0, str(_dir))

from ado_client import ADOClient, ADOClientError  # noqa: E402
from contracts.lld_document import (  # noqa: E402
    BackendChanges,
    EndpointDefinition,
    FrontendChanges,
    LLDDocument,
    NewDependencies,
)
from contracts.structured_spec import StructuredSpec  # noqa: E402

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 4096
_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "spec.md"
_LOG_PREFIX = "[spec_agent]"

_CODE_EXTENSIONS: frozenset[str] = frozenset({".tsx", ".ts", ".cs"})
_SKIP_DIRS: frozenset[str] = frozenset({"node_modules", "bin", "obj", "dist", ".git"})
_MAX_CONTENT_LINES: int = 50


def run(
    structured_spec: StructuredSpec,
    story_ids: list[int],
    work_item: dict[str, Any],
    anthropic_client: anthropic.Anthropic,
    ado_client: ADOClient,
) -> LLDDocument:
    """Produce an LLD document from the structured spec and ADO user stories.

    Raises:
        RuntimeError: If the Claude API call fails, the response cannot be parsed,
            or the LLDDocument cannot be constructed from the response.
    """
    work_item_id = structured_spec.work_item_id
    print(f"{_LOG_PREFIX} fetching {len(story_ids)} user stories from ADO")
    stories = _fetch_stories(story_ids, ado_client)

    print(f"{_LOG_PREFIX} reading demo-app codebase")
    codebase = _read_codebase(_DEMO_APP_DIR)

    system_prompt = _load_system_prompt()
    user_message = _build_user_message(structured_spec, stories, codebase)

    print(f"{_LOG_PREFIX} calling Claude to produce LLD")
    raw = _call_claude(system_prompt, user_message, anthropic_client)

    lld = _build_lld_document(raw, work_item_id)
    _post_lld_comment(_build_ado_comment(lld), work_item_id, ado_client)

    print(
        f"{_LOG_PREFIX} LLD complete "
        f"files_to_create={len(lld.files_to_create)} "
        f"files_to_modify={len(lld.files_to_modify)}"
    )
    return lld


def _fetch_stories(
    story_ids: list[int],
    ado_client: ADOClient,
) -> list[dict[str, Any]]:
    """Fetch full work item details for each story ID from ADO.

    Skips individual stories that cannot be fetched rather than aborting the batch.
    """
    stories: list[dict[str, Any]] = []
    for story_id in story_ids:
        try:
            item = ado_client.get_work_item_by_id(story_id)
        except ADOClientError as exc:
            print(f"{_LOG_PREFIX} warning: could not fetch story {story_id} — {exc}")
            continue
        fields = item.get("fields", {})
        stories.append({
            "id": story_id,
            "title": fields.get("System.Title", ""),
            "description": fields.get("System.Description", ""),
            "story_points": fields.get("Microsoft.VSTS.Scheduling.StoryPoints"),
        })
    return stories


def _read_codebase(demo_app_dir: Path) -> list[dict[str, str]]:
    """Walk the demo-app directory and return relevant source file snippets."""
    results: list[dict[str, str]] = []
    _collect_files(demo_app_dir, demo_app_dir.parent, results)
    return results


def _collect_files(
    directory: Path,
    repo_root: Path,
    results: list[dict[str, str]],
) -> None:
    """Recursively collect code files, skipping build artifact directories."""
    for entry in sorted(directory.iterdir()):
        if entry.is_dir():
            if entry.name not in _SKIP_DIRS:
                _collect_files(entry, repo_root, results)
        elif entry.suffix in _CODE_EXTENSIONS:
            rel = str(entry.relative_to(repo_root))
            results.append({"path": rel, "content": _read_file_head(entry)})


def _read_file_head(path: Path) -> str:
    """Return up to _MAX_CONTENT_LINES lines from a source file."""
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        return "\n".join(lines[:_MAX_CONTENT_LINES])
    except OSError:
        return "(unreadable)"


def _build_user_message(
    spec: StructuredSpec,
    stories: list[dict[str, Any]],
    codebase: list[dict[str, str]],
) -> str:
    """Assemble the Claude user message containing spec, stories, and codebase."""
    return json.dumps({
        "structured_spec": {
            "work_item_id": spec.work_item_id,
            "title": spec.title,
            "summary": spec.summary,
            "confidence_score": spec.confidence_score,
            "affected_areas": [a.value for a in spec.affected_areas],
            "acceptance_criteria": spec.acceptance_criteria,
            "out_of_scope": spec.out_of_scope,
            "gaps": spec.gaps,
        },
        "user_stories": stories,
        "existing_codebase": codebase,
    }, indent=2)


def _call_claude(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, Any]:
    """Invoke Claude and return the parsed LLD JSON object.

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
        raise RuntimeError(f"Spec Agent: Claude API call failed — {exc}") from exc

    raw_text = response.content[0].text.strip()
    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
        return parsed
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Spec Agent: response was not a valid JSON object. "
            f"Raw response: {raw_text[:300]}"
        ) from exc


def _normalize_endpoint(ep: dict[str, Any]) -> dict[str, Any]:
    """Coerce request_body and response_body to dict regardless of what Claude returns."""
    ep = dict(ep)
    for field in ("request_body", "response_body"):
        val = ep.get(field)
        if isinstance(val, dict):
            pass
        elif isinstance(val, str):
            ep[field] = {"description": val}
        elif val is None:
            ep[field] = {}
        else:
            ep[field] = {}
    return ep


def _build_lld_document(raw: dict[str, Any], work_item_id: str) -> LLDDocument:
    """Construct a validated LLDDocument from the raw Claude response dict.

    Raises:
        RuntimeError: If any required field is missing or malformed.
    """
    fe = raw.get("frontend_changes") or {}
    be = raw.get("backend_changes") or {}
    deps = raw.get("new_dependencies") or {}
    try:
        return LLDDocument(
            work_item_id=work_item_id,
            frontend_changes=FrontendChanges(
                components_to_create=fe.get("components_to_create") or [],
                components_to_modify=fe.get("components_to_modify") or [],
                hooks=fe.get("hooks") or [],
                state_changes=fe.get("state_changes") or [],
                props_interfaces=fe.get("props_interfaces") or [],
            ),
            backend_changes=BackendChanges(
                endpoints=[EndpointDefinition(**_normalize_endpoint(ep)) for ep in be.get("endpoints") or []],
                services=be.get("services") or [],
                data_models=be.get("data_models") or [],
                dto_changes=be.get("dto_changes") or [],
            ),
            files_to_create=raw.get("files_to_create") or [],
            files_to_modify=raw.get("files_to_modify") or [],
            new_dependencies=NewDependencies(
                frontend=deps.get("frontend") or [],
                backend=deps.get("backend") or [],
            ),
        )
    except Exception as exc:
        raise RuntimeError(
            f"Spec Agent: failed to construct LLDDocument — {exc}"
        ) from exc


def _build_ado_comment(lld: LLDDocument) -> str:
    """Format the LLD as a human-readable ADO comment."""
    fe = lld.frontend_changes
    be = lld.backend_changes
    endpoint_lines = [f"  {ep.method} {ep.path}" for ep in be.endpoints] or ["  (none)"]
    lines = [
        "[AI Pipeline] Low Level Design produced.",
        "",
        "## Frontend Changes",
        f"Components to create: {', '.join(fe.components_to_create) or 'none'}",
        f"Components to modify: {', '.join(fe.components_to_modify) or 'none'}",
        f"Hooks: {', '.join(fe.hooks) or 'none'}",
        f"State changes: {', '.join(fe.state_changes) or 'none'}",
        "",
        "## Backend Endpoints",
        *endpoint_lines,
        f"Services: {', '.join(be.services) or 'none'}",
        "",
        "## Files to Create",
        *([f"  + {f}" for f in lld.files_to_create] or ["  (none)"]),
        "## Files to Modify",
        *([f"  ~ {f}" for f in lld.files_to_modify] or ["  (none)"]),
        "",
        "## New Dependencies",
    ]
    if lld.new_dependencies.frontend:
        lines.append(f"Frontend (npm): {', '.join(lld.new_dependencies.frontend)}")
    if lld.new_dependencies.backend:
        lines.append(f"Backend (NuGet): {', '.join(lld.new_dependencies.backend)}")
    if not lld.new_dependencies.frontend and not lld.new_dependencies.backend:
        lines.append("None")
    return "\n".join(lines)


def _post_lld_comment(comment: str, work_item_id: str, ado_client: ADOClient) -> None:
    """Post the LLD summary comment to the ADO work item. Logs warnings, never raises."""
    try:
        ado_client.add_comment(int(work_item_id), comment)
    except ADOClientError as exc:
        print(f"{_LOG_PREFIX} warning: could not post LLD comment to {work_item_id} — {exc}")


def _load_system_prompt() -> str:
    """Read the spec agent system prompt from the prompts directory."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Spec Agent: could not read system prompt at {_PROMPT_PATH}: {exc}"
        ) from exc


__all__: list[Any] = ["run"]
