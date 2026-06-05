# 06 — Test Agent

**Source:** `pipeline/agents/test_agent.py`
**System prompt:** `pipeline/prompts/test.md`
**Contract output:** `TestResults` (`pipeline/contracts/test_results.py`)

## Purpose

Writes and runs tests for all changes introduced by the Frontend and Backend agents.
Self-corrects build errors and assertion failures before reporting results.

## Inputs

- `ChangeSummary` from the Frontend Agent
- `ChangeSummary` from the Backend Agent
- Current test suite

## Outputs

- Committed test files on the feature branch
- `TestResults` JSON (passed to Audit and Supervisor agents)
- `outputs/test-reports/TestReport_WI-{id}_{slug}.md` — full per-test breakdown (pass/fail/skipped per file)

## Test Rules (summary — full rules in `.claude/rules/testing-standards.md`)

| Rule | Requirement |
|---|---|
| Per-function | 1 happy path + 1 failure/edge case per new or modified function |
| Per-endpoint | 1 test per HTTP status code the endpoint can return |
| Per-component | 3 tests: render, interaction, edge case |
| Integration | Not generated — all tests use mocked dependencies, no real backend calls |
| Gherkin | 1 test per Gherkin scenario; name: `Scenario_<Title>_<Outcome>` |
| Coverage | ≥ 70% line coverage on changed files |

## Self-Correction — Pass 1: Build Errors

When `dotnet test` exits without a results file (compilation failure):
1. Parse compiler error lines from stderr: `file.cs(line,col): error CSxxxx: message`
2. Map each error to the affected test file
3. Ask Claude to fix only files under `demo-app/backend/tests/`
4. Re-run `dotnet test` to verify
5. Up to 3 retry cycles

Common errors corrected automatically:

| Error | Fix |
|---|---|
| CS0104 — ambiguous reference | Add `using` alias |
| CS7036 — missing constructor argument | Pass required parameters from source context |
| CS1061 — member not found | Update to the actual member name from source files |
| CS0246 — type not found | Add the required `using` statement |
| CS0029 / CS1503 — type mismatch | Align types with source file definitions |

## Self-Correction — Pass 2: Assertion Failures

After the build is clean:
1. Map failing xUnit test cases to `.cs` files by xUnit class name
2. Provide Claude with failing test content, error messages, and source files
3. Apply corrected version
4. Re-run to verify
5. Up to 3 retry cycles per file

## File Boundary

Only writes to:
- `demo-app/frontend/src/__tests__/`
- `demo-app/backend/tests/Unit/`
- `demo-app/backend/tests/Integration/`

Application source files are never modified, even if a test fails to compile because
of a source-level issue. In that case the pipeline fails and the Orchestrator reports it.
