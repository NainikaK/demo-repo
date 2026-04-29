"""Test Agent.

Reads the frontend and backend change summaries, generates tests covering all
changed code, runs both test suites, and produces a TestResults report.

Exceptions propagate so the Orchestrator's retry loop can catch them.
"""

import json
import re
import subprocess
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

from contracts.change_summary import ChangeSummary  # noqa: E402
from contracts.lld_document import LLDDocument  # noqa: E402
from contracts.structured_spec import StructuredSpec  # noqa: E402
from contracts.test_results import (  # noqa: E402
    CoverageReport,
    TestCase,
    TestResults,
    TestStatus,
)
import git_utils  # noqa: E402

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 16000
_SPLIT_MAX_TOKENS = 16000
_CORRECTION_MAX_ATTEMPTS = 3
_FRONTEND_TEST_DIR = "demo-app/frontend/src/__tests__"
_BACKEND_TEST_DIR = "demo-app/backend/tests/Unit"
_BACKEND_TEST_ROOT = "demo-app/backend/tests"
_BRANCH_PREFIX = "feature"
_MAX_SLUG_LENGTH = 30
_LOG_PREFIX = "[test_agent]"
_TEST_RUNNER_TIMEOUT = 300

_VALID_TEST_ROOTS: tuple[str, ...] = (_FRONTEND_TEST_DIR, _BACKEND_TEST_ROOT)
_TEST_FILE_EXTENSIONS: frozenset[str] = frozenset({".ts", ".tsx", ".cs"})
_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "test.md"


def run(
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    lld: LLDDocument,
    structured_spec: StructuredSpec,
    anthropic_client: anthropic.Anthropic,
) -> TestResults:
    """Generate tests, run both suites, and return a TestResults report.

    Raises:
        RuntimeError: If Claude API calls fail, code generation produces invalid JSON,
            or git operations fail. Test runner failures are recorded but not raised.
    """
    work_item_id = structured_spec.work_item_id
    branch_name = f"{_BRANCH_PREFIX}/{work_item_id}-{_make_slug(structured_spec.title)}"

    print(f"{_LOG_PREFIX} checking out feature branch {branch_name!r}")
    git_utils.checkout_branch(branch_name)

    frontend_test_dir = git_utils.get_repo_root() / _FRONTEND_TEST_DIR
    if frontend_test_dir.exists():
        for test_file in sorted(frontend_test_dir.rglob("*")):
            if test_file.is_file() and (
                test_file.name.endswith(".test.tsx") or test_file.name.endswith(".test.ts")
            ):
                test_file.unlink()
                print(f"{_LOG_PREFIX} deleted stale frontend test: {test_file.name}")

    print(f"{_LOG_PREFIX} reading existing test files")
    existing_tests = _read_existing_tests()

    system_prompt = _load_system_prompt()
    user_message = _build_test_gen_message(
        frontend_summary, backend_summary, lld, structured_spec, existing_tests
    )

    print(f"{_LOG_PREFIX} calling Claude to generate tests")
    file_map = _call_claude_for_tests(system_prompt, user_message, anthropic_client)

    print(f"{_LOG_PREFIX} writing {len(file_map)} test file(s)")
    written_files = _validate_and_write_tests(file_map)

    if written_files:
        commit_message = f"[{work_item_id}] tests: {structured_spec.title}"
        git_utils.commit_changes(written_files, commit_message)
        git_utils.push_branch(branch_name)

    print(f"{_LOG_PREFIX} running frontend test suite")
    frontend_cases = _run_frontend_tests()
    frontend_cases = _correct_frontend_tests(frontend_cases, frontend_summary, anthropic_client)

    print(f"{_LOG_PREFIX} running backend test suite")
    backend_cases = _run_backend_tests(backend_summary)
    backend_cases = _correct_backend_tests(backend_cases, backend_summary, anthropic_client)

    results = _aggregate_results(work_item_id, frontend_cases, backend_cases, written_files)
    print(
        f"{_LOG_PREFIX} complete "
        f"total={results.total_tests} passed={results.passed} failed={results.failed}"
    )
    return results


_CORRECTION_SYSTEM_PROMPT = """\
You are a senior QA engineer. The following frontend tests are failing. Read the \
test files and source files carefully. Fix ONLY the test files to match the actual \
source code — do not change source files. Common issues: wrong import style \
(default vs named), wrong property names, wrong mock setup, wrong expected values. \
Return a JSON object of {filepath: corrected_content} for only the files that need \
changes.\
"""

_BACKEND_CORRECTION_SYSTEM_PROMPT = """\
You are a senior QA engineer. The following backend tests are failing. Read the \
test files and source files carefully. Fix ONLY the test files to match the actual \
source code — do not change source files. Common issues: wrong constructor \
arguments, wrong method names, wrong expected values, missing mocks. \
Return a JSON object of {filepath: corrected_content} for only the files that need \
changes.\
"""


def _read_files_from_paths(paths: list[str]) -> dict[str, str]:
    """Read repo-relative file paths into a {path: content} map, skipping unreadable files."""
    result: dict[str, str] = {}
    for path in paths:
        try:
            result[path] = git_utils.read_file(path)
        except (FileNotFoundError, RuntimeError):
            pass
    return result


def _correct_frontend_tests(
    cases: list[TestCase],
    frontend_summary: ChangeSummary,
    anthropic_client: anthropic.Anthropic,
) -> list[TestCase]:
    """Attempt up to _CORRECTION_MAX_ATTEMPTS to fix failing frontend tests via Claude."""
    best = cases
    for attempt in range(1, _CORRECTION_MAX_ATTEMPTS + 1):
        failed = [c for c in best if c.status == TestStatus.failed]
        if not failed:
            break
        print(f"{_LOG_PREFIX} self-correction frontend attempt={attempt} failing={len(failed)}")

        repo_root = git_utils.get_repo_root()
        test_dir = repo_root / _FRONTEND_TEST_DIR
        test_files: dict[str, str] = {}
        if test_dir.exists():
            for f in sorted(test_dir.rglob("*")):
                if f.is_file() and f.suffix in {".ts", ".tsx"}:
                    rel = str(f.relative_to(repo_root))
                    try:
                        test_files[rel] = f.read_text(encoding="utf-8")
                    except OSError:
                        pass

        source_files = _read_files_from_paths(
            frontend_summary.files_modified + frontend_summary.files_created
        )
        correction_message = json.dumps({
            "failing_tests": [{"name": c.name, "error": c.error_message or ""} for c in failed],
            "test_files": test_files,
            "source_files": source_files,
        }, indent=2)

        try:
            response = anthropic_client.messages.create(
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                system=_CORRECTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": correction_message}],
            )
        except Exception as exc:
            print(f"{_LOG_PREFIX} warning: frontend correction API call failed (attempt {attempt}) — {exc}")
            break

        raw_text = _strip_fences(response.content[0].text)
        if not raw_text.startswith("{"):
            try:
                raw_text = raw_text[raw_text.index("{"):]
            except ValueError:
                pass
        try:
            fixed_map: dict[str, str] = {str(k): str(v) for k, v in json.loads(raw_text).items()}
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"{_LOG_PREFIX} warning: frontend correction response not valid JSON (attempt {attempt}) — {exc}")
            break

        for path, content in fixed_map.items():
            if path.startswith(_FRONTEND_TEST_DIR):
                git_utils.write_file(path, content)

        new_cases = _run_frontend_tests()
        new_failed = sum(1 for c in new_cases if c.status == TestStatus.failed)
        if new_failed < len(failed):
            best = new_cases
        if new_failed == 0:
            break

    return best


def _correct_backend_tests(
    cases: list[TestCase],
    backend_summary: ChangeSummary,
    anthropic_client: anthropic.Anthropic,
) -> list[TestCase]:
    """Attempt up to _CORRECTION_MAX_ATTEMPTS to fix failing backend tests via Claude."""
    best = cases
    for attempt in range(1, _CORRECTION_MAX_ATTEMPTS + 1):
        failed = [c for c in best if c.status == TestStatus.failed]
        if not failed:
            break
        print(f"{_LOG_PREFIX} self-correction backend attempt={attempt} failing={len(failed)}")

        repo_root = git_utils.get_repo_root()
        test_root = repo_root / _BACKEND_TEST_ROOT
        test_files: dict[str, str] = {}
        if test_root.exists():
            for f in sorted(test_root.rglob("*")):
                if f.is_file() and f.suffix == ".cs":
                    rel = str(f.relative_to(repo_root))
                    try:
                        test_files[rel] = f.read_text(encoding="utf-8")
                    except OSError:
                        pass

        source_files = _read_files_from_paths(
            backend_summary.files_modified + backend_summary.files_created
        )
        correction_message = json.dumps({
            "failing_tests": [{"name": c.name, "error": c.error_message or ""} for c in failed],
            "test_files": test_files,
            "source_files": source_files,
        }, indent=2)

        try:
            response = anthropic_client.messages.create(
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                system=_BACKEND_CORRECTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": correction_message}],
            )
        except Exception as exc:
            print(f"{_LOG_PREFIX} warning: backend correction API call failed (attempt {attempt}) — {exc}")
            break

        raw_text = _strip_fences(response.content[0].text)
        if not raw_text.startswith("{"):
            try:
                raw_text = raw_text[raw_text.index("{"):]
            except ValueError:
                pass
        try:
            fixed_map = {str(k): str(v) for k, v in json.loads(raw_text).items()}
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"{_LOG_PREFIX} warning: backend correction response not valid JSON (attempt {attempt}) — {exc}")
            break

        for path, content in fixed_map.items():
            if path.startswith(_BACKEND_TEST_ROOT):
                git_utils.write_file(path, content)

        new_cases = _run_backend_tests(backend_summary)
        new_failed = sum(1 for c in new_cases if c.status == TestStatus.failed)
        if new_failed < len(failed):
            best = new_cases
        if new_failed == 0:
            break

    return best


def _make_slug(title: str) -> str:
    """Convert a feature title to a kebab-case branch slug, max _MAX_SLUG_LENGTH chars."""
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"\s+", "-", slug.strip())
    return slug[:_MAX_SLUG_LENGTH].rstrip("-")


def _read_existing_tests() -> dict[str, str]:
    """Read all existing test files from both frontend and backend test directories."""
    repo_root = git_utils.get_repo_root()
    existing: dict[str, str] = {}
    for test_dir_rel in (_FRONTEND_TEST_DIR, _BACKEND_TEST_ROOT):
        test_dir = repo_root / test_dir_rel
        if not test_dir.exists():
            continue
        for file_path in sorted(test_dir.rglob("*")):
            if file_path.is_file() and file_path.suffix in _TEST_FILE_EXTENSIONS:
                rel = str(file_path.relative_to(repo_root))
                try:
                    existing[rel] = file_path.read_text(encoding="utf-8")
                except OSError:
                    pass
    return existing


def _build_test_gen_message(
    frontend_summary: ChangeSummary,
    backend_summary: ChangeSummary,
    lld: LLDDocument,
    spec: StructuredSpec,
    existing_tests: dict[str, str],
) -> str:
    """Assemble the Claude user message for test generation."""
    return json.dumps({
        "acceptance_criteria": spec.acceptance_criteria,
        "suggested_user_stories": spec.suggested_user_stories,
        "frontend_changes": {
            "files_created": frontend_summary.files_created,
            "files_modified": frontend_summary.files_modified,
            "visual_description": frontend_summary.visual_description,
            "components_to_create": lld.frontend_changes.components_to_create,
            "components_to_modify": lld.frontend_changes.components_to_modify,
        },
        "backend_changes": {
            "files_created": backend_summary.files_created,
            "files_modified": backend_summary.files_modified,
        },
        "backend_endpoints": [
            {
                "method": ep.method,
                "path": ep.path,
                "request_body": ep.request_body,
                "response_body": ep.response_body,
            }
            for ep in lld.backend_changes.endpoints
        ],
        "existing_tests": existing_tests,
    }, indent=2)


def _strip_fences(text: str) -> str:
    """Remove markdown code fences and surrounding whitespace from a Claude response."""
    stripped = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    return re.sub(r"\s*```\s*$", "", stripped, flags=re.MULTILINE).strip()


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
            f"Test Agent: Claude API call failed ({context}) — {exc}"
        ) from exc

    raw_text = _strip_fences(response.content[0].text)
    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
        return parsed
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(
            f"Test Agent: {context} response was not a valid JSON object. "
            f"Raw: {raw_text[:300]}"
        ) from exc


def _call_claude_for_tests(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, str]:
    """Invoke Claude for test generation and return a {file_path: content} map.

    On JSON parse failure, falls back to two separate calls — one for frontend
    tests only, one for backend tests only — then merges the results.
    """
    try:
        raw = _call_claude_json(system_prompt, user_message, anthropic_client, _MAX_TOKENS, "test generation")
        return {str(k): str(v) for k, v in raw.items()}
    except RuntimeError:
        print(f"{_LOG_PREFIX} test generation parse failed — falling back to split frontend/backend calls")
        return _call_claude_split(system_prompt, user_message, anthropic_client)


def _call_claude_split(
    system_prompt: str,
    user_message: str,
    anthropic_client: anthropic.Anthropic,
) -> dict[str, str]:
    """Fallback: call Claude separately for frontend and backend tests and merge."""
    try:
        payload = json.loads(user_message)
    except (json.JSONDecodeError, ValueError):
        payload = {}

    existing_tests: dict[str, str] = payload.get("existing_tests") or {}
    frontend_existing = {k: v for k, v in existing_tests.items() if k.startswith(_FRONTEND_TEST_DIR)}
    backend_existing = {k: v for k, v in existing_tests.items() if k.startswith(_BACKEND_TEST_ROOT)}

    frontend_msg = json.dumps({
        "acceptance_criteria": payload.get("acceptance_criteria") or [],
        "frontend_changes": payload.get("frontend_changes") or {},
        "existing_tests": frontend_existing,
        "note": "Generate ONLY frontend test files under demo-app/frontend/src/__tests__/",
    }, indent=2)
    backend_msg = json.dumps({
        "acceptance_criteria": payload.get("acceptance_criteria") or [],
        "backend_changes": payload.get("backend_changes") or {},
        "backend_endpoints": payload.get("backend_endpoints") or [],
        "existing_tests": backend_existing,
        "note": "Generate ONLY backend test files under demo-app/backend/tests/",
    }, indent=2)

    merged: dict[str, str] = {}
    for label, msg in (("frontend split", frontend_msg), ("backend split", backend_msg)):
        try:
            raw = _call_claude_json(system_prompt, msg, anthropic_client, _SPLIT_MAX_TOKENS, label)
            merged.update({str(k): str(v) for k, v in raw.items()})
        except RuntimeError as exc:
            print(f"{_LOG_PREFIX} warning: {label} call failed — {exc}")
    return merged


def _validate_and_write_tests(file_map: dict[str, str]) -> list[str]:
    """Validate all paths are within test directories, then write each file.

    Paths outside the test directories are logged and skipped rather than raising,
    to avoid aborting the whole test generation over one bad path.
    """
    written: list[str] = []
    for path, content in file_map.items():
        if not any(path.startswith(root) for root in _VALID_TEST_ROOTS):
            print(f"{_LOG_PREFIX} warning: rejected test path outside test directories: {path!r}")
            continue
        git_utils.write_file(path, content)
        written.append(path)
    return written


def _run_frontend_tests() -> list[TestCase]:
    """Run the Vitest suite and return parsed test cases.

    Returns a single error TestCase on runner failure rather than raising.
    """
    frontend_dir = git_utils.get_repo_root() / "demo-app" / "frontend"
    try:
        result = subprocess.run(
            ["npx", "vitest", "run", "--reporter=json"],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=_TEST_RUNNER_TIMEOUT,
        )
        return _parse_vitest_output(result.stdout or result.stderr)
    except Exception as exc:
        print(f"{_LOG_PREFIX} warning: frontend test runner failed — {exc}")
        return [TestCase(
            name="frontend_suite_runner_error",
            status=TestStatus.failed,
            duration_ms=0.0,
            error_message=str(exc),
        )]


def _run_backend_tests(backend_summary: ChangeSummary) -> list[TestCase]:
    """Run the dotnet test suite and return parsed test cases.

    Returns an empty list when there are no backend changes. Returns a single
    error TestCase on runner failure rather than raising.
    """
    if not backend_summary.files_created and not backend_summary.files_modified:
        print(f"{_LOG_PREFIX} no backend changes — skipping backend test suite")
        return []
    backend_dir = git_utils.get_repo_root() / "demo-app" / "backend"
    results_file = backend_dir / "TestResults" / "test-results.json"
    try:
        subprocess.run(
            ["dotnet", "test", "--logger", "json;LogFileName=test-results.json"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=_TEST_RUNNER_TIMEOUT,
        )
        return _parse_dotnet_output(results_file)
    except Exception as exc:
        print(f"{_LOG_PREFIX} warning: backend test runner failed — {exc}")
        return [TestCase(
            name="backend_suite_runner_error",
            status=TestStatus.failed,
            duration_ms=0.0,
            error_message=str(exc),
        )]


def _parse_vitest_output(raw: str) -> list[TestCase]:
    """Parse Vitest --reporter=json stdout into TestCase objects."""
    text = _strip_fences(raw)
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return [TestCase(name="vitest_parse_error", status=TestStatus.failed,
                             duration_ms=0.0, error_message=f"Unparseable output: {text[:200]}")]
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError as exc:
            return [TestCase(name="vitest_parse_error", status=TestStatus.failed,
                             duration_ms=0.0, error_message=str(exc))]

    cases: list[TestCase] = []
    for suite in data.get("testResults") or []:
        for assertion in suite.get("assertionResults") or []:
            status_str = assertion.get("status", "failed")
            if status_str == "passed":
                status = TestStatus.passed
            elif status_str in {"pending", "todo"}:
                status = TestStatus.skipped
            else:
                status = TestStatus.failed
            failures = assertion.get("failureMessages") or []
            cases.append(TestCase(
                name=assertion.get("fullName", "unknown"),
                status=status,
                duration_ms=float(assertion.get("duration") or 0.0),
                error_message=("; ".join(failures) if failures else None),
            ))
    return cases


def _parse_dotnet_output(results_file: Path) -> list[TestCase]:
    """Parse the dotnet test JSON results file into TestCase objects."""
    if not results_file.exists():
        return [TestCase(
            name="dotnet_results_missing",
            status=TestStatus.failed,
            duration_ms=0.0,
            error_message=f"Results file not found at {results_file}",
        )]
    try:
        data = json.loads(results_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return [TestCase(name="dotnet_parse_error", status=TestStatus.failed,
                         duration_ms=0.0, error_message=str(exc))]

    cases: list[TestCase] = []
    raw_results = data.get("testResults") or data.get("TestResults") or []
    for result in raw_results:
        name = (result.get("displayName") or result.get("testName")
                or (result.get("TestCase") or {}).get("FullyQualifiedName") or "unknown")
        outcome = (result.get("resultState") or result.get("outcome")
                   or result.get("Outcome") or "Failed").lower()
        if outcome in {"passed", "pass"}:
            status = TestStatus.passed
        elif outcome in {"skipped", "notexecuted"}:
            status = TestStatus.skipped
        else:
            status = TestStatus.failed
        error = result.get("errorMessage") or result.get("ErrorMessage")
        cases.append(TestCase(
            name=name,
            status=status,
            duration_ms=_parse_duration_ms(result.get("duration") or result.get("Duration") or "0"),
            error_message=error,
        ))
    return cases


def _parse_duration_ms(duration_str: str) -> float:
    """Parse a duration string ('00:00:00.012' or '12.5') to milliseconds."""
    try:
        return float(duration_str) * 1000.0
    except (ValueError, TypeError):
        pass
    parts = str(duration_str).split(":")
    try:
        if len(parts) == 3:
            return (int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])) * 1000.0
    except (ValueError, IndexError):
        pass
    return 0.0


def _aggregate_results(
    work_item_id: str,
    frontend_cases: list[TestCase],
    backend_cases: list[TestCase],
    written_files: list[str],
) -> TestResults:
    """Combine frontend and backend test cases into a single TestResults record."""
    all_cases = frontend_cases + backend_cases
    total = len(all_cases)
    passed = sum(1 for c in all_cases if c.status == TestStatus.passed)
    failed = sum(1 for c in all_cases if c.status == TestStatus.failed)
    skipped = sum(1 for c in all_cases if c.status == TestStatus.skipped)
    return TestResults(
        work_item_id=work_item_id,
        total_tests=total,
        passed=passed,
        failed=failed,
        skipped=skipped,
        coverage=CoverageReport(
            line_coverage_percent=0.0,
            files_checked=written_files,
            below_threshold=[],
        ),
        test_cases=all_cases,
    )


def _load_system_prompt() -> str:
    """Read the test agent system prompt from the prompts directory."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Test Agent: could not read system prompt at {_PROMPT_PATH}: {exc}"
        ) from exc


__all__: list[Any] = ["run"]
