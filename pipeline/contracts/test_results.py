"""Output contract of the Test Agent.

Defines the test run results the Test Agent produces after executing the full
test suite. Consumed by the Audit Agent (to check coverage and failures) and
the Supervisor Agent (all_passed is a merge gate requirement).
"""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field


class TestStatus(str, Enum):
    passed = "passed"
    failed = "failed"
    skipped = "skipped"


class TestCase(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(
        description="Test name in MethodName_Scenario_ExpectedResult format."
    )
    status: TestStatus = Field(
        description="Outcome of this individual test run."
    )
    duration_ms: float = Field(
        ge=0.0,
        description="Test execution time in milliseconds."
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Failure detail when status is 'failed'. None for passing or skipped tests."
    )


class CoverageReport(BaseModel):
    model_config = ConfigDict(frozen=True)

    line_coverage_percent: float = Field(
        ge=0.0,
        le=100.0,
        description="Overall line coverage percentage across all changed files."
    )
    files_checked: list[str] = Field(
        description="All files included in the coverage measurement (repo-relative paths)."
    )
    below_threshold: list[str] = Field(
        description="Files whose individual line coverage is below the required 70% threshold."
    )


class TestResults(BaseModel):
    model_config = ConfigDict(frozen=True)

    work_item_id: str = Field(
        description="ADO work item ID these test results correspond to."
    )
    total_tests: int = Field(
        ge=0,
        description="Total number of tests discovered and executed."
    )
    passed: int = Field(
        ge=0,
        description="Number of tests that passed."
    )
    failed: int = Field(
        ge=0,
        description="Number of tests that failed."
    )
    skipped: int = Field(
        ge=0,
        description="Number of tests that were skipped."
    )
    correction_attempts: int = Field(
        default=0,
        ge=0,
        description="Number of self-correction attempts applied by the Test Agent during this run."
    )
    coverage: CoverageReport = Field(
        description="Line coverage report across all files changed by this pipeline run."
    )
    test_cases: list[TestCase] = Field(
        description="Individual test case results for every test in the suite."
    )

    @computed_field
    @property
    def all_passed(self) -> bool:
        """True when there are zero failing tests — a hard merge gate requirement."""
        return self.failed == 0


__all__: list[Any] = ["TestStatus", "TestCase", "CoverageReport", "TestResults"]
