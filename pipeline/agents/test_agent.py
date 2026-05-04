"""Test Agent.

Reads the frontend and backend change summaries, generates tests covering all
changed code, runs both test suites, and produces a TestResults report.

Exceptions propagate so the Orchestrator's retry loop can catch them.
"""

import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
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
_CORRECTION_MAX_ATTEMPTS = 5
_FRONTEND_TEST_DIR = "demo-app/frontend/src/__tests__"
_BACKEND_TEST_ROOT = "demo-app/backend/tests"
_BRANCH_PREFIX = "feature"
_MAX_SLUG_LENGTH = 30
_LOG_PREFIX = "[test_agent]"
_TEST_RUNNER_TIMEOUT = 300

_VALID_TEST_ROOTS: tuple[str, ...] = (_FRONTEND_TEST_DIR, _BACKEND_TEST_ROOT)
_TEST_FILE_EXTENSIONS: frozenset[str] = frozenset({".ts", ".tsx", ".cs"})
_PROMPT_PATH = _PIPELINE_DIR / "prompts" / "test.md"
_MAX_FILE_CORRECTIONS = 3  # delete a test file after this many correction attempts

# Matches a top-level describe( call at the very start of a line (column 0).
# Indented/nested describe blocks are not matched because they start with spaces.
_TOP_LEVEL_DESCRIBE_RE = re.compile(r'^describe\([\'"]([^\'"]+)[\'"]', re.MULTILINE)

_TS_CODE_MARKERS: tuple[str, ...] = (
    "import ", "describe(", "it(", "test(", "export ", "const ", "function ", "vi.",
)
_CS_CODE_MARKERS: tuple[str, ...] = (
    "using ", "namespace ", "class ", "[Fact]", "public ", "private ", "protected ",
)

_JSON_RECOVERY_SYSTEM = """\
You are a JSON extractor. The input contains a JSON object somewhere inside it. \
Extract the JSON object and return it verbatim. \
Respond with ONLY the JSON object — no preamble, no explanation, no markdown fences.\
"""


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

    repo_root = git_utils.get_repo_root()
    frontend_test_dir = repo_root / _FRONTEND_TEST_DIR

    print(f"{_LOG_PREFIX} stripping foreign describe blocks from existing test files")
    isolation_cleaned = _clean_frontend_test_isolation(repo_root)
    if isolation_cleaned:
        print(f"{_LOG_PREFIX} cleaned {len(isolation_cleaned)} file(s) of foreign describe blocks")

    # Only delete tests for source files touched by this feature — not unrelated tests.
    changed_stems = {
        Path(p).stem
        for p in frontend_summary.files_created + frontend_summary.files_modified
    }

    deleted_test_files: list[str] = []
    if frontend_test_dir.exists():
        for test_file in sorted(frontend_test_dir.rglob("*")):
            if not test_file.is_file():
                continue
            if not (test_file.name.endswith(".test.tsx") or test_file.name.endswith(".test.ts")):
                continue
            test_stem = test_file.name.replace(".test.tsx", "").replace(".test.ts", "")
            if test_stem not in changed_stems:
                continue
            rel = str(test_file.relative_to(repo_root))
            test_file.unlink()
            deleted_test_files.append(rel)
            print(f"{_LOG_PREFIX} deleted stale frontend test: {test_file.name}")

    # Mirror the same logic for backend: delete stale unit test files whose source was touched.
    # This prevents build errors when a constructor signature changes (e.g. a new injected dep).
    backend_changed_stems = {
        Path(p).stem
        for p in backend_summary.files_created + backend_summary.files_modified
    }
    backend_unit_dir = repo_root / _BACKEND_TEST_ROOT / "Unit"
    if backend_unit_dir.exists() and backend_changed_stems:
        for test_file in sorted(backend_unit_dir.rglob("*.cs")):
            if not test_file.is_file():
                continue
            if any(source_stem in test_file.stem for source_stem in backend_changed_stems):
                rel = str(test_file.relative_to(repo_root))
                test_file.unlink()
                deleted_test_files.append(rel)
                print(f"{_LOG_PREFIX} deleted stale backend test: {test_file.name}")

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

    # Stage deletions + new files together so the working tree stays clean
    files_to_commit = isolation_cleaned + deleted_test_files + written_files
    if files_to_commit:
        commit_message = f"[{work_item_id}] tests: {structured_spec.title}"
        git_utils.commit_changes(files_to_commit, commit_message)
        git_utils.push_branch(branch_name)

    print(f"{_LOG_PREFIX} running frontend test suite")
    frontend_cases = _run_frontend_tests()
    frontend_cases = _correct_frontend_tests(frontend_cases, frontend_summary, anthropic_client, branch_name)

    print(f"{_LOG_PREFIX} running backend test suite")
    backend_cases = _run_backend_tests(backend_summary)
    backend_cases = _correct_backend_tests(backend_cases, backend_summary, anthropic_client, branch_name)

    results = _aggregate_results(work_item_id, frontend_cases, backend_cases, written_files)
    print(
        f"{_LOG_PREFIX} complete "
        f"total={results.total_tests} passed={results.passed} failed={results.failed}"
    )
    return results


_FRONTEND_SINGLE_FILE_CORRECTION_PROMPT = """\
You are a senior QA engineer. A single frontend test file is failing. \
Read the test file content and source files carefully. \
Fix ONLY the test file to match the actual source code — do not modify source files. \
Common issues to check first:
- Wrong import names: verify every import against the actual exports in source_files.
- Constants that are functions: if source_files shows \
  `export const FOO = (id: string) => ...` then FOO is a function, not a string. \
  Mock it with vi.mock('../utils/constants', () => ({ FOO: vi.fn((id) => `/api/v1/items/${id}`) })).
- State type mismatch: if a hook exports `completing: boolean`, tests must not treat it as a Set.
- Wrong expected error message: for HOOK test files (useX.test.ts), you MUST trace \
  the exact error string the hook assigns to state — look at the catch block in source_files. \
  If the hook does `setFetchError(err instanceof Error ? err.message : 'Unknown error')` and \
  you mock fetch to return `{ ok: false, status: 500 }`, the hook throws \
  `new Error('Request failed with status 500')` so fetchError will be \
  `'Request failed with status 500'` — NOT any string from utils/strings.ts. \
  Only use a string from utils/strings.ts if the hook itself imports and returns that constant.
- Never add hook state assertions inside a COMPONENT test file (*.test.tsx): \
  do not use `result.current.X` or `renderHook` in a component test. \
  Component tests (CommentPanel.test.tsx etc.) must only use DOM queries \
  (getByText, getByRole, getByTestId, getByLabelText). \
  If a hook-level assertion appears in a component test, remove it entirely.
- String case: match the EXACT capitalisation of strings from source_files \
  (e.g., if source_files shows `LABEL_X = 'Add a New Task'` then the test must use \
  `'Add a New Task'` not `'Add a new task'`).
- Wrong component under test: the test file name tells you what to test — \
  Header.test.tsx must test the Header component, TaskForm.test.tsx must test TaskForm, etc. \
  Never replace a test for one component with tests for a different component.
- Single describe block per file: each test file must contain exactly one top-level \
  describe() block, and its name must start with the file stem. \
  For example, Header.test.tsx must have exactly one top-level describe('Header', ...) block. \
  Never add a second top-level describe() for a different component inside the same file.
- Verify filter/search counts against your own test data: before writing toHaveLength(N) \
  after a filter or search operation, trace the filter against every item in your makeTasks() \
  fixture and count the REAL matches. If 3 out of 3 titles contain the letter 'r', \
  assert toHaveLength(3), not toHaveLength(2). A wrong count assertion is a test failure \
  that cannot be fixed without knowing your intent — get it right the first time.
- Unstable mock function references causing useEffect re-firing: if a vi.mock factory \
  creates vi.fn() inline like `useX: () => ({ fetchData: vi.fn() })`, each call to useX() \
  returns a NEW vi.fn() reference. When a component's useEffect depends on that function \
  (e.g. `[activeTask, fetchData]`), every render changes the reference and re-fires the \
  effect, resetting state. FIX: use vi.hoisted() so the same function instance is returned \
  on every render: \
  `const m = vi.hoisted(() => ({ fetchData: vi.fn() })); \
   vi.mock('../hooks/useX', () => ({ useX: () => ({ fetchData: m.fetchData }) }));`
- DOM selector not found (getByTestId / getByRole / getByText): verify the selector exists \
  in source_files. If a test uses getByTestId('x') but data-testid="x" does not appear \
  anywhere in source_files, rewrite the assertion to use a selector that actually exists \
  (getByRole, getByText, getByLabelText, etc.).
- localStorage with useState lazy initializer: if a hook reads localStorage inside a \
  `useState` lazy initializer (`useState(readFromStorage)`), you MUST use \
  `vi.stubGlobal('localStorage', makeLocalStorageMock({ key: 'value' }))` \
  — do NOT use `vi.spyOn(Storage.prototype, 'getItem')`. \
  In JSDOM, prototype spies do not intercept calls made during React's lazy initialization \
  phase because JSDOM resolves getItem on the instance, not the prototype. \
  `vi.stubGlobal` replaces the entire object before the hook initialises. \
  Always restore with `vi.unstubAllGlobals()` in afterEach (not `vi.restoreAllMocks()`). \
  Pattern: \
  `function makeLocalStorageMock(initial = {}) { const store = {...initial}; return { \
   getItem: vi.fn((k) => store[k] ?? null), \
   setItem: vi.fn((k, v) => { store[k] = v; }), \
   removeItem: vi.fn((k) => { delete store[k]; }) }; }` \
  Then in each test: `vi.stubGlobal('localStorage', makeLocalStorageMock({ storageKey: 'value' }));`
- Use vi.fn() / vi.mock() / vi.stubGlobal() — never jest.*
YOUR RESPONSE MUST START WITH { AND END WITH }.
Do not write any explanation before or after.
Do not use markdown code fences.
Do not write "Here is" or any preamble.
The ONLY thing you output is this exact JSON structure:
{"corrected_content": "COMPLETE FILE CONTENT HERE"}
Where COMPLETE FILE CONTENT HERE is the full corrected TypeScript file with all imports and exports.\
"""

_BACKEND_SINGLE_FILE_CORRECTION_PROMPT = """\
You are a senior QA engineer. A single backend C# test file is failing. \
Read the test file content and source files carefully. \
Fix ONLY the test file to match the actual source code — do not modify source files. \
Common issues: wrong constructor arguments, wrong method names, \
wrong expected values, missing using statements.
YOUR RESPONSE MUST START WITH { AND END WITH }.
Do not write any explanation before or after.
Do not use markdown code fences.
Do not write "Here is" or any preamble.
The ONLY thing you output is this exact JSON structure:
{"corrected_content": "COMPLETE FILE CONTENT HERE"}
Where COMPLETE FILE CONTENT HERE is the full corrected C# file with all using statements.\
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


def _read_frontend_context_files() -> dict[str, str]:
    """Read all .ts/.tsx files from the key frontend source directories."""
    repo_root = git_utils.get_repo_root()
    result: dict[str, str] = {}
    for dir_rel in _FRONTEND_CONTEXT_DIRS:
        dir_path = repo_root / dir_rel
        if not dir_path.exists():
            continue
        for entry in sorted(dir_path.rglob("*")):
            if entry.is_file() and entry.suffix in {".ts", ".tsx"}:
                rel = str(entry.relative_to(repo_root))
                try:
                    result[rel] = entry.read_text(encoding="utf-8")
                except OSError:
                    pass
    return result


def _map_frontend_failures_to_files(
    failed: list[TestCase],
    test_dir: Path,
    repo_root: Path,
) -> dict[str, list[TestCase]]:
    """Map failing frontend cases to test files.

    Handles vitest's ``fullName`` format: "DescribeName it-name text" (space-separated)
    — NOT the Jest " > " format.

    Primary: describe-block name → <DescribeName>.test.tsx / .test.ts.
    The describe name directly identifies the file, so this is the most reliable
    mapping and eliminates false-positive matches on common words in other files.

    Fallback: search the FULL it-name (everything after the describe name) as a
    literal substring across all test files.  Using the complete it-name, rather
    than just its last word, prevents single common words ("change", "null", etc.)
    that appear in comments or unrelated tests from triggering a wrong match.
    """
    test_files: dict[str, str] = {}
    for f in sorted(test_dir.rglob("*")):
        if f.is_file() and f.suffix in {".ts", ".tsx"}:
            rel = str(f.relative_to(repo_root))
            try:
                test_files[rel] = f.read_text(encoding="utf-8")
            except OSError:
                pass

    file_to_cases: dict[str, list[TestCase]] = {}
    for case in failed:
        # Vitest fullName: "DescribeName it-name text" — first word is the describe name
        stripped = case.name.strip()
        if " " in stripped:
            describe_name = stripped.split(" ", 1)[0]
            it_name = stripped.split(" ", 1)[1]   # full it-name, not just last word
        else:
            describe_name = stripped
            it_name = stripped

        matched = False
        # Primary: describe-name → <DescribeName>.test.tsx or .test.ts
        for ext in (".test.tsx", ".test.ts"):
            rel = str((test_dir / f"{describe_name}{ext}").relative_to(repo_root))
            if rel in test_files:
                file_to_cases.setdefault(rel, []).append(case)
                matched = True
                break

        if not matched:
            # Fallback: full it-name substring search across all test files
            for rel, content in test_files.items():
                if it_name and it_name in content:
                    file_to_cases.setdefault(rel, []).append(case)
                    break
    return file_to_cases


def _map_backend_failures_to_files(
    failed: list[TestCase],
    test_root: Path,
    repo_root: Path,
) -> dict[str, list[TestCase]]:
    """Map failing backend cases to .cs files.

    Handles two case types:
    - Build errors: parses absolute .cs paths from the compiler output in error_message.
    - Assertion failures: maps by xUnit class name with method-name fallback.
    """
    cs_files: dict[str, str] = {}
    for f in sorted(test_root.rglob("*.cs")):
        if f.is_file():
            rel = str(f.relative_to(repo_root))
            try:
                cs_files[rel] = f.read_text(encoding="utf-8")
            except OSError:
                pass

    file_to_cases: dict[str, list[TestCase]] = {}

    # First pass: build errors contain the absolute path of the broken file in stderr.
    _BUILD_ERROR_NAMES = {"dotnet_build_or_runtime_error", "backend_suite_runner_error"}
    for case in failed:
        if case.name not in _BUILD_ERROR_NAMES:
            continue
        error_text = case.error_message or ""
        for path_match in re.finditer(r"(/[^\s(]+\.cs)\(\d+,\d+\):", error_text):
            abs_path_str = path_match.group(1)
            try:
                rel = str(Path(abs_path_str).relative_to(repo_root))
                if rel.startswith(_BACKEND_TEST_ROOT):
                    file_to_cases.setdefault(rel, []).append(case)
            except ValueError:
                pass

    # Second pass: normal assertion failures mapped by class name / method name.
    for case in failed:
        if case.name in _BUILD_ERROR_NAMES:
            continue
        name_parts = case.name.rsplit(".", 2)
        class_candidate = name_parts[-2] if len(name_parts) >= 2 else ""
        matched = False
        if class_candidate:
            for rel in cs_files:
                if Path(rel).stem == class_candidate:
                    file_to_cases.setdefault(rel, []).append(case)
                    matched = True
                    break
        if not matched:
            method_name = case.name.rsplit(".", 1)[-1].split("(")[0]
            for rel, content in cs_files.items():
                if method_name in content:
                    file_to_cases.setdefault(rel, []).append(case)
                    break
    return file_to_cases


_FRONTEND_UTILITY_FILES = [
    "demo-app/frontend/src/utils/constants.ts",
    "demo-app/frontend/src/utils/strings.ts",
    "demo-app/frontend/src/types/index.ts",
]

_FRONTEND_SOURCE_SUBDIRS: tuple[str, ...] = ("components", "pages", "hooks", "context")

_FRONTEND_CONTEXT_DIRS: tuple[str, ...] = (
    "demo-app/frontend/src/components",
    "demo-app/frontend/src/hooks",
    "demo-app/frontend/src/context",
    "demo-app/frontend/src/types",
)
_MAX_SOURCE_FILES = 40


def _infer_component_source(test_rel_path: str) -> str | None:
    """Return the repo-relative source path for the component a test file exercises.

    e.g. demo-app/frontend/src/__tests__/Header.test.tsx
    →    demo-app/frontend/src/components/Header.tsx
    Returns None when no matching source file is found.
    """
    stem = Path(test_rel_path).stem  # 'Header.test'
    if not stem.endswith(".test"):
        return None
    component_name = stem[:-5]  # 'Header'
    for subdir in _FRONTEND_SOURCE_SUBDIRS:
        for ext in (".tsx", ".ts"):  # hooks are .ts, components are .tsx
            candidate = f"demo-app/frontend/src/{subdir}/{component_name}{ext}"
            try:
                git_utils.read_file(candidate)
                return candidate
            except (FileNotFoundError, RuntimeError):
                pass
    return None


def _correct_frontend_tests(
    cases: list[TestCase],
    frontend_summary: ChangeSummary,
    anthropic_client: anthropic.Anthropic,
    branch_name: str,
) -> list[TestCase]:
    """Fix failing frontend tests one file at a time, up to _CORRECTION_MAX_ATTEMPTS rounds."""
    best = cases
    source_files = _read_files_from_paths(
        frontend_summary.files_modified + frontend_summary.files_created + _FRONTEND_UTILITY_FILES
    )
    # Include the full frontend context so corrections have the same codebase view as generation
    for path, content in _read_frontend_context_files().items():
        if path not in source_files:
            source_files[path] = content

    # Track per-file how many times we have attempted a correction and how many times
    # consecutive corrections produced no content change.
    # A file that has been corrected _MAX_FILE_CORRECTIONS times and still fails is deleted
    # so the remaining budget is available for other failing files.
    stuck_counts: dict[str, int] = {}
    correction_counts: dict[str, int] = {}

    for attempt in range(1, _CORRECTION_MAX_ATTEMPTS + 1):
        failed = [c for c in best if c.status == TestStatus.failed]
        if not failed:
            break
        print(f"{_LOG_PREFIX} self-correction frontend attempt={attempt} failing={len(failed)}")

        repo_root = git_utils.get_repo_root()
        test_dir = repo_root / _FRONTEND_TEST_DIR
        if not test_dir.exists():
            break

        file_failures = _map_frontend_failures_to_files(failed, test_dir, repo_root)
        if not file_failures:
            print(f"{_LOG_PREFIX} could not map frontend failures to files — skipping")
            break

        any_fixed = False
        for rel_path, file_cases in file_failures.items():
            abs_path = repo_root / rel_path

            # Delete files that have already been corrected too many times — they are
            # unrecoverable for this run and burning the budget prevents other files from
            # being fixed.
            if correction_counts.get(rel_path, 0) >= _MAX_FILE_CORRECTIONS:
                print(f"{_LOG_PREFIX} deleting exhausted test (>{_MAX_FILE_CORRECTIONS} corrections): {Path(rel_path).name}")
                if abs_path.exists():
                    abs_path.unlink()
                    git_utils.commit_changes([rel_path], f"[auto-fix] delete exhausted test: {rel_path}")
                    any_fixed = True
                continue

            try:
                current_content = abs_path.read_text(encoding="utf-8")
            except OSError:
                continue

            # Include the component/hook the test exercises so Claude has its exact implementation.
            per_file_source = dict(source_files)
            component_path = _infer_component_source(rel_path)
            if component_path and component_path not in per_file_source:
                try:
                    per_file_source[component_path] = git_utils.read_file(component_path)
                except (FileNotFoundError, RuntimeError):
                    pass

            retry_hint = (
                f"IMPORTANT: This is correction attempt {attempt}. "
                "Your previous fix was applied but the test still fails with the same error. "
                "The current test_file_content already reflects your previous correction. "
                "Try a completely different approach — check imports, mocks, expected values, "
                "and whether the test matches the ACTUAL behavior shown in source_files."
            ) if attempt > 1 else ""

            msg = json.dumps({
                "test_file_path": rel_path,
                "correction_attempt": attempt,
                "retry_hint": retry_hint,
                "failing_tests": [{"name": c.name, "error": c.error_message or ""} for c in file_cases],
                "test_file_content": current_content,
                "source_files": per_file_source,
            }, indent=2)

            print(f"{_LOG_PREFIX} correcting {rel_path} ({len(file_cases)} failure(s))")
            try:
                response = anthropic_client.messages.create(
                    model=_MODEL,
                    max_tokens=_MAX_TOKENS,
                    system=_FRONTEND_SINGLE_FILE_CORRECTION_PROMPT,
                    messages=[{"role": "user", "content": msg}],
                )
            except Exception as exc:
                print(f"{_LOG_PREFIX} warning: correction call failed for {rel_path} — {exc}")
                continue

            corrected = _extract_corrected_content(response.content[0].text, rel_path)
            if corrected is None:
                print(f"{_LOG_PREFIX} warning: correction for {rel_path} returned no parseable code — skipping")
                continue

            if rel_path.endswith(".test.tsx") or rel_path.endswith(".test.ts"):
                file_stem = Path(rel_path).stem.replace(".test", "")
                corrected = _strip_foreign_describe_blocks(corrected, file_stem)

            if corrected.strip() == current_content.strip():
                stuck_counts[rel_path] = stuck_counts.get(rel_path, 0) + 1
                if stuck_counts[rel_path] >= 2:
                    print(f"{_LOG_PREFIX} deleting stuck test (correction produces no change): {Path(rel_path).name}")
                    abs_path.unlink()
                    git_utils.commit_changes([rel_path], f"[auto-fix] delete stuck test: {rel_path}")
                    any_fixed = True
                continue

            stuck_counts[rel_path] = 0
            correction_counts[rel_path] = correction_counts.get(rel_path, 0) + 1
            git_utils.write_file(rel_path, corrected)
            git_utils.commit_changes([rel_path], f"[auto-fix] correct test: {rel_path}")
            any_fixed = True

        if not any_fixed:
            break

        git_utils.push_branch(branch_name)
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
    branch_name: str,
) -> list[TestCase]:
    """Fix failing backend tests one file at a time, up to _CORRECTION_MAX_ATTEMPTS rounds."""
    best = cases
    source_files = _read_files_from_paths(
        backend_summary.files_modified + backend_summary.files_created
    )

    stuck_counts: dict[str, int] = {}

    for attempt in range(1, _CORRECTION_MAX_ATTEMPTS + 1):
        failed = [c for c in best if c.status == TestStatus.failed]
        if not failed:
            break
        print(f"{_LOG_PREFIX} self-correction backend attempt={attempt} failing={len(failed)}")

        repo_root = git_utils.get_repo_root()
        test_root = repo_root / _BACKEND_TEST_ROOT
        if not test_root.exists():
            break

        file_failures = _map_backend_failures_to_files(failed, test_root, repo_root)
        if not file_failures:
            print(f"{_LOG_PREFIX} could not map backend failures to files — skipping")
            break

        any_fixed = False
        for rel_path, file_cases in file_failures.items():
            abs_path = repo_root / rel_path
            try:
                current_content = abs_path.read_text(encoding="utf-8")
            except OSError:
                continue

            retry_hint = (
                f"IMPORTANT: This is correction attempt {attempt}. "
                "Your previous fix was applied but the test still fails with the same error. "
                "The current test_file_content already reflects your previous correction. "
                "Try a completely different approach — check constructor arguments, method signatures, "
                "using statements, and whether expected values match the ACTUAL source shown in source_files."
            ) if attempt > 1 else ""

            msg = json.dumps({
                "test_file_path": rel_path,
                "correction_attempt": attempt,
                "retry_hint": retry_hint,
                "failing_tests": [{"name": c.name, "error": c.error_message or ""} for c in file_cases],
                "test_file_content": current_content,
                "source_files": source_files,
            }, indent=2)

            print(f"{_LOG_PREFIX} correcting {rel_path} ({len(file_cases)} failure(s))")
            try:
                response = anthropic_client.messages.create(
                    model=_MODEL,
                    max_tokens=_MAX_TOKENS,
                    system=_BACKEND_SINGLE_FILE_CORRECTION_PROMPT,
                    messages=[{"role": "user", "content": msg}],
                )
            except Exception as exc:
                print(f"{_LOG_PREFIX} warning: correction call failed for {rel_path} — {exc}")
                continue

            corrected = _extract_corrected_content(response.content[0].text, rel_path)
            if corrected is None:
                print(f"{_LOG_PREFIX} warning: correction for {rel_path} returned no parseable code — skipping")
                continue

            if corrected.strip() == current_content.strip():
                stuck_counts[rel_path] = stuck_counts.get(rel_path, 0) + 1
                if stuck_counts[rel_path] >= 2:
                    print(f"{_LOG_PREFIX} deleting stuck test (correction produces no change): {Path(rel_path).name}")
                    abs_path.unlink()
                    git_utils.commit_changes([rel_path], f"[auto-fix] delete stuck test: {rel_path}")
                    any_fixed = True
                continue

            stuck_counts[rel_path] = 0
            git_utils.write_file(rel_path, corrected)
            git_utils.commit_changes([rel_path], f"[auto-fix] correct test: {rel_path}")
            any_fixed = True

        if not any_fixed:
            break

        git_utils.push_branch(branch_name)
        new_cases = _run_backend_tests(backend_summary)
        new_failed = sum(1 for c in new_cases if c.status == TestStatus.failed)
        if new_failed < len(failed):
            best = new_cases
        if new_failed == 0:
            break

    return best


def _find_describe_block_end(content: str, start: int) -> int:
    """Return the index just after the closing }); of a describe block.

    Counts curly braces while skipping string literals so nested objects and
    template literals don't confuse the depth counter.
    """
    depth = 0
    i = start
    in_string = False
    string_char = ""
    while i < len(content):
        ch = content[i]
        if in_string:
            if ch == "\\" and string_char != "`":
                i += 2
                continue
            if ch == string_char:
                in_string = False
        else:
            if ch in ('"', "'", "`"):
                in_string = True
                string_char = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    # Consume the trailing ); and the newline so we don't leave a blank line
                    i += 1
                    while i < len(content) and content[i] in (" ", "\t", ")", ";"):
                        i += 1
                    if i < len(content) and content[i] == "\n":
                        i += 1
                    return i
        i += 1
    return len(content)


def _strip_foreign_describe_blocks(content: str, file_stem: str) -> str:
    """Remove top-level describe blocks whose name does not belong in this file.

    A block belongs if its name starts with the file stem (case-insensitive).
    Only top-level describe calls (at column 0) are considered; nested describes
    (which are indented) are ignored by the regex anchor.

    Never removes the last remaining describe block — a single-block file whose
    one block is foreign is a different class of problem (the whole file has the
    wrong content) and is logged as a warning instead.

    Applied to every frontend .test.tsx/.test.ts file at three points:
      1. On pipeline start — clean contamination from previous runs.
      2. After Claude writes new test files — before they are committed.
      3. After each correction — before the correction is committed.
    """
    norm_stem = file_stem.lower()
    changed = True
    result = content
    while changed:
        changed = False
        all_blocks = list(_TOP_LEVEL_DESCRIBE_RE.finditer(result))
        if len(all_blocks) <= 1:
            if all_blocks and not all_blocks[0].group(1).lower().startswith(norm_stem):
                print(
                    f"{_LOG_PREFIX} warning: {file_stem} test file contains only a "
                    f"foreign describe block '{all_blocks[0].group(1)}' — "
                    "skipping strip (entire file may need replacement)"
                )
            break
        for m in all_blocks:
            block_name = m.group(1).lower()
            if not block_name.startswith(norm_stem):
                start = m.start()
                end = _find_describe_block_end(result, start)
                prefix = result[:start].rstrip("\n")
                suffix = result[end:].lstrip("\n")
                result = prefix + ("\n\n" if prefix else "") + suffix
                changed = True
                print(
                    f"{_LOG_PREFIX} removed foreign describe block "
                    f"'{m.group(1)}' from {file_stem} test file"
                )
                break  # restart scan on modified string
    return result.strip() + "\n"


def _clean_frontend_test_isolation(repo_root: Path) -> list[str]:
    """Scan all frontend .test.tsx/.test.ts files and strip foreign describe blocks.

    Runs at pipeline start so contamination from previous correction loops is
    removed before new test generation begins.  Returns repo-relative paths of
    every file that was modified.
    """
    test_dir = repo_root / _FRONTEND_TEST_DIR
    if not test_dir.exists():
        return []
    cleaned: list[str] = []
    for test_file in sorted(test_dir.glob("*.test.tsx")) + sorted(test_dir.glob("*.test.ts")):
        file_stem = test_file.stem.replace(".test", "")
        try:
            original = test_file.read_text(encoding="utf-8")
        except OSError:
            continue
        fixed = _strip_foreign_describe_blocks(original, file_stem)
        if fixed.strip() != original.strip():
            rel = str(test_file.relative_to(repo_root))
            git_utils.write_file(rel, fixed)
            cleaned.append(rel)
    return cleaned


def _is_plausible_code(content: str, file_path: str) -> bool:
    """Return True only if content looks like source code for the given file type.

    Rejects short strings and non-code text (e.g. assertion messages Claude accidentally
    returns as {"corrected_content": "expected 'X' to be 'Y'"}).
    """
    stripped = content.strip()
    if len(stripped) < 80:
        return False
    suffix = Path(file_path).suffix.lower()
    if suffix in (".ts", ".tsx"):
        return any(m in stripped for m in _TS_CODE_MARKERS)
    if suffix == ".cs":
        return any(m in stripped for m in _CS_CODE_MARKERS)
    return True


def _extract_corrected_content(raw_text: str, context: str) -> str | None:
    """Extract the corrected file content from a Claude correction response.

    Tries three strategies in order:
    1. Parse as JSON {"corrected_content": "..."} with leading/trailing prose tolerance.
    2. Extract code from any markdown code fence (any language tag or no tag).
    3. Find the first contiguous code-like block starting with import/using/export/comment.
    Returns None if no strategy yields content longer than 100 characters that passes
    the _is_plausible_code check.
    """
    text = _strip_fences(raw_text)
    decoder = json.JSONDecoder()
    for start in (0, text.find("{")):
        if start == -1:
            continue
        try:
            parsed, _ = decoder.raw_decode(text[start:].lstrip())
            if isinstance(parsed, dict) and "corrected_content" in parsed:
                content = parsed["corrected_content"]
                if isinstance(content, str) and content.strip():
                    if _is_plausible_code(content, context):
                        return content
                    print(
                        f"{_LOG_PREFIX} warning: corrected_content for {context} "
                        "failed plausibility check — not code"
                    )
        except json.JSONDecodeError:
            pass
    # Fallback 2: extract code from any markdown code fence in the original response
    fence_match = re.search(
        r"```(?:[a-zA-Z]*)?\s*\n([\s\S]+?)\n```",
        raw_text,
        re.IGNORECASE,
    )
    if fence_match:
        code = fence_match.group(1).strip()
        if code and _is_plausible_code(code, context):
            return code
    # Fallback 3: find the first contiguous code-like block
    code_match = re.search(
        r"((?:import |using |export |\/\/|\/\*)[\s\S]+)",
        raw_text,
    )
    if code_match:
        candidate = code_match.group(1).strip()
        if len(candidate) > 100 and _is_plausible_code(candidate, context):
            return candidate
    print(f"{_LOG_PREFIX} warning: could not parse corrected_content JSON for {context}")
    return None


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
    all_changed_paths = (
        frontend_summary.files_created
        + frontend_summary.files_modified
        + backend_summary.files_created
        + backend_summary.files_modified
    )
    source_files = _read_files_from_paths(all_changed_paths)
    if len(source_files) < _MAX_SOURCE_FILES:
        for path, content in _read_frontend_context_files().items():
            if path not in source_files and len(source_files) < _MAX_SOURCE_FILES:
                source_files[path] = content
    return json.dumps({
        "important": (
            "Generate tests based ONLY on the actual source_files content provided. "
            "Do not assume any behavior not visible in the source code. "
            "Every import, every prop name, every string must exactly match what appears in source_files."
        ),
        "acceptance_criteria": spec.acceptance_criteria,
        "suggested_user_stories": spec.suggested_user_stories,
        "source_files": source_files,
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
            f"Test Agent: recovery call failed ({context}) — {exc}"
        ) from exc
    result = _try_parse_json_object(response.content[0].text)
    if result is None:
        raise RuntimeError(
            f"Test Agent: {context} response was not a valid JSON object even after recovery. "
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
            f"Test Agent: Claude API call failed ({context}) — {exc}"
        ) from exc

    raw_text = response.content[0].text
    parsed = _try_parse_json_object(raw_text)
    if parsed is None:
        print(f"{_LOG_PREFIX} {context} returned prose — running recovery extraction")
        parsed = _recover_json(raw_text, anthropic_client, context)
    return parsed


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

    source_files: dict[str, str] = payload.get("source_files") or {}
    frontend_src = {k: v for k, v in source_files.items() if "frontend" in k and "__tests__" not in k}
    backend_src = {k: v for k, v in source_files.items() if "backend/src" in k}

    frontend_msg = json.dumps({
        "acceptance_criteria": payload.get("acceptance_criteria") or [],
        "frontend_changes": payload.get("frontend_changes") or {},
        "source_files": frontend_src,
        "existing_tests": frontend_existing,
        "note": "Generate ONLY frontend test files under demo-app/frontend/src/__tests__/",
    }, indent=2)
    backend_msg = json.dumps({
        "acceptance_criteria": payload.get("acceptance_criteria") or [],
        "backend_changes": payload.get("backend_changes") or {},
        "backend_endpoints": payload.get("backend_endpoints") or [],
        "source_files": backend_src,
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
        if path.startswith(_FRONTEND_TEST_DIR) and (path.endswith(".test.tsx") or path.endswith(".test.ts")):
            file_stem = Path(path).stem.replace(".test", "")
            content = _strip_foreign_describe_blocks(content, file_stem)
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
    results_dir = backend_dir / "TestResults"
    results_file = results_dir / "test-results.trx"
    # Delete stale results so a build failure cannot silently return old passing results
    if results_file.exists():
        results_file.unlink()
    try:
        proc = subprocess.run(
            [
                "dotnet", "test",
                "--logger", "trx;LogFileName=test-results.trx",
                "--results-directory", str(results_dir),
            ],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=_TEST_RUNNER_TIMEOUT,
        )
        if not results_file.exists():
            # Build or runtime failure — surface stderr as a failed test case
            err = (proc.stderr or proc.stdout or "no output")[:2000]
            print(f"{_LOG_PREFIX} dotnet test produced no results file — stderr: {err}")
            return [TestCase(
                name="dotnet_build_or_runtime_error",
                status=TestStatus.failed,
                duration_ms=0.0,
                error_message=err,
            )]
        return _parse_trx_output(results_file)
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


def _parse_trx_output(results_file: Path) -> list[TestCase]:
    """Parse a dotnet test TRX results file (XML) into TestCase objects."""
    try:
        tree = ET.parse(results_file)
    except ET.ParseError as exc:
        return [TestCase(name="trx_parse_error", status=TestStatus.failed,
                         duration_ms=0.0, error_message=str(exc))]

    ns = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
    cases: list[TestCase] = []
    for result in tree.findall(".//t:UnitTestResult", ns):
        name = result.get("testName", "unknown")
        outcome = (result.get("outcome") or "Failed").lower()
        if outcome == "passed":
            status = TestStatus.passed
        elif outcome in {"skipped", "notexecuted"}:
            status = TestStatus.skipped
        else:
            status = TestStatus.failed
        duration_str = result.get("duration", "0")
        error_msg: str | None = None
        if status == TestStatus.failed:
            msg_el = result.find(".//t:ErrorInfo/t:Message", ns)
            stack_el = result.find(".//t:ErrorInfo/t:StackTrace", ns)
            parts = []
            if msg_el is not None and msg_el.text:
                parts.append(msg_el.text.strip())
            if stack_el is not None and stack_el.text:
                parts.append(stack_el.text.strip())
            error_msg = "\n".join(parts) or None
        cases.append(TestCase(
            name=name,
            status=status,
            duration_ms=_parse_duration_ms(duration_str),
            error_message=error_msg,
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
