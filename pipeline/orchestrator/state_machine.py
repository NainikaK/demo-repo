"""Pipeline state machine.

Owns all legal state transitions for a pipeline run and enforces them at the
boundary where the Orchestrator attempts to advance the run forward. Nothing
outside this module may change PipelineRun.state directly.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))

from contracts.pipeline_run import PipelineRun, PipelineState  # noqa: E402


_TERMINAL_STATES: frozenset[PipelineState] = frozenset(
    {PipelineState.auto_merged, PipelineState.human_review_pending, PipelineState.pipeline_failed}
)

# Maps every state to the set of states it may legally transition into.
# Terminal states map to empty sets — no outbound transitions are allowed.
VALID_TRANSITIONS: dict[PipelineState, list[PipelineState]] = {
    PipelineState.pending_clarification: [
        PipelineState.clarification_failed,
        PipelineState.stories_created,
    ],
    PipelineState.clarification_failed: [
        PipelineState.pending_clarification,   # retry after Product Owner updates item
        PipelineState.pipeline_failed,
    ],
    PipelineState.stories_created: [
        PipelineState.spec_in_progress,
        PipelineState.pipeline_failed,
    ],
    PipelineState.spec_in_progress: [
        PipelineState.coding_in_progress,
        PipelineState.pipeline_failed,
    ],
    PipelineState.coding_in_progress: [
        PipelineState.testing_in_progress,
        PipelineState.pipeline_failed,
    ],
    PipelineState.testing_in_progress: [
        PipelineState.audit_in_progress,
        PipelineState.pipeline_failed,
    ],
    PipelineState.audit_in_progress: [
        PipelineState.supervisor_review,
        PipelineState.pipeline_failed,
    ],
    PipelineState.supervisor_review: [
        PipelineState.auto_merged,
        PipelineState.human_review_pending,
        PipelineState.pipeline_failed,
    ],
    PipelineState.auto_merged: [],
    PipelineState.human_review_pending: [],
    PipelineState.pipeline_failed: [],
}


class InvalidTransitionError(Exception):
    """Raised when a requested state transition is not in VALID_TRANSITIONS."""


class StateMachine:
    """Validates and applies state transitions on a PipelineRun.

    All state changes must go through this class. Attempting an illegal
    transition raises InvalidTransitionError before any mutation occurs.
    """

    def transition(self, run: PipelineRun, new_state: PipelineState) -> PipelineRun:
        """Advance run to new_state after validating the transition is legal.

        Prints a structured status notification to the terminal and returns
        the mutated run. The run is modified in place and also returned for
        call-chaining convenience.

        Args:
            run: The current pipeline run record.
            new_state: The state to advance to.

        Returns:
            The same run object with state updated to new_state.

        Raises:
            InvalidTransitionError: If the transition from run.state to new_state
                is not listed in VALID_TRANSITIONS.
        """
        if not self.can_transition(run.state, new_state):
            raise InvalidTransitionError(
                f"Illegal transition: {run.state.value} → {new_state.value}. "
                f"Valid targets from {run.state.value}: "
                f"{[s.value for s in VALID_TRANSITIONS[run.state]]}"
            )

        run.state = new_state
        self._emit_status(run)
        return run

    def is_terminal(self, state: PipelineState) -> bool:
        """Return True if state is a terminal state (no further transitions possible).

        Args:
            state: The state to check.

        Returns:
            True for auto_merged and pipeline_failed; False for all others.
        """
        return state in _TERMINAL_STATES

    def can_transition(self, current: PipelineState, new: PipelineState) -> bool:
        """Return True if transitioning from current to new is a legal move.

        Args:
            current: The state the run is currently in.
            new: The proposed next state.

        Returns:
            True when new appears in VALID_TRANSITIONS[current].
        """
        return new in VALID_TRANSITIONS.get(current, [])

    def _emit_status(self, run: PipelineRun) -> None:
        """Print a structured status notification to the terminal.

        Writes to stdout so operators following the pipeline can see live
        state transitions without parsing log files.

        Args:
            run: The run after its state has been updated.
        """
        now = datetime.now(timezone.utc).isoformat()
        completed = sum(1 for ar in run.agent_runs if ar.success)
        total_agents = len(run.agent_runs)
        print(
            f"[pipeline] phase={run.state.value}"
            f" run_id={run.run_id}"
            f" work_item={run.work_item_id}"
            f" progress={completed}/{total_agents}_agents_complete"
            f" timestamp={now}"
        )


__all__: list[Any] = ["InvalidTransitionError", "VALID_TRANSITIONS", "StateMachine"]
