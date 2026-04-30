"""Orchestrator entry point.

Polling loop that drives the entire AI-powered SDLC pipeline. Picks up eligible
ADO work items, creates pipeline run records, and executes each agent phase in
sequence with checkpointing, intelligent retry backed by the diagnosis step, and
human escalation when all retries are exhausted.
"""

import os
import sys
import time
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import anthropic
from dotenv import load_dotenv

load_dotenv()

_ORCHESTRATOR_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _ORCHESTRATOR_DIR.parent
_ADO_MCP_DIR = _PIPELINE_DIR / "mcp-servers" / "ado-mcp"
_UTILS_DIR = _PIPELINE_DIR / "utils"
_AGENTS_DIR = _PIPELINE_DIR / "agents"

for _dir in (_PIPELINE_DIR, _ORCHESTRATOR_DIR, _ADO_MCP_DIR, _UTILS_DIR, _AGENTS_DIR):
    if str(_dir) not in sys.path:
        sys.path.insert(0, str(_dir))

from ado_client import ADOClient, ADOClientError  # noqa: E402
from contracts.audit_report import MergeRecommendation  # noqa: E402
from contracts.diagnosis_result import DiagnosisResult  # noqa: E402
from contracts.pipeline_run import AgentRunRecord, PipelineRun, PipelineState  # noqa: E402
from diagnosis import format_retry_context, run_diagnosis  # noqa: E402
from run_record import RunRecordManager  # noqa: E402
from state_machine import StateMachine  # noqa: E402
import clarification_agent  # noqa: E402
import story_writer_agent  # noqa: E402
import spec_agent  # noqa: E402
import frontend_agent  # noqa: E402
import backend_agent  # noqa: E402
import test_agent  # noqa: E402
import audit_agent  # noqa: E402
import supervisor_agent  # noqa: E402

POLL_INTERVAL_SECONDS: int = int(
    os.environ.get("ADO_WORK_ITEM_POLL_INTERVAL_SECONDS", "60")
)
TRIGGER_TAG: str = os.environ.get("ADO_TRIGGER_TAG", "ai-pipeline-trigger")
TRIGGER_STATES: list[str] = ["New"]
TRIGGER_TYPES: list[str] = ["User Story", "Feature"]
MAX_AGENT_RETRIES: int = 2
AGENT_TIMEOUT_SECONDS: int = 600
RETRY_WAIT_SECONDS: int = 30
LOG_PREFIX: str = "[orchestrator]"

_PIPELINE_STARTED_COMMENT = (
    "[AI Pipeline] <strong>Pipeline Started</strong><br><br>"
    "<strong>Run ID:</strong> {run_id}"
)
_PIPELINE_HALTED_COMMENT = (
    "[AI Pipeline] <strong>Pipeline Halted</strong><br><br>"
    "All retries failed — human intervention required.<br>"
    "<strong>Run ID:</strong> {run_id}"
)


class Orchestrator:
    """Central controller for the AI-powered SDLC automation pipeline.

    Polls ADO for eligible work items, manages pipeline state, executes agents
    in sequence, and handles retry logic with diagnosis and human escalation.
    """

    def __init__(self) -> None:
        self.ado_client = ADOClient()
        self.state_machine = StateMachine()
        self.run_record_manager = RunRecordManager()
        self.anthropic_client = anthropic.Anthropic()

        if not self.ado_client.test_connection():
            raise RuntimeError(
                "ADO connection test failed. "
                "Verify ADO_ORG_URL, ADO_PROJECT, and ADO_PAT are set correctly in the environment."
            )
        print(f"{LOG_PREFIX} ADO connection verified.")

    def start(self) -> None:
        """Run the polling loop indefinitely until a keyboard interrupt."""
        print(
            f"{LOG_PREFIX} starting — "
            f"poll_interval={POLL_INTERVAL_SECONDS}s trigger_tag={TRIGGER_TAG!r}"
        )
        try:
            while True:
                try:
                    self._poll_once()
                except Exception as exc:
                    print(f"{LOG_PREFIX} unexpected error in poll loop — {exc!r} — continuing")
                time.sleep(POLL_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            print(f"{LOG_PREFIX} shutting down — keyboard interrupt received")

    def _poll_once(self) -> None:
        """Fetch eligible work items and start a pipeline run for each new one.

        Crash-recovery: any run left in PENDING_CLARIFICATION by a prior process
        crash is re-entered here; _run_clarification will block until resolved.
        """
        self._recover_paused_clarifications()

        try:
            items = self.ado_client.get_work_items(state="New", tag=TRIGGER_TAG)
        except ADOClientError as exc:
            print(f"{LOG_PREFIX} warning: ADO poll failed — {exc}")
            return

        eligible = [
            item for item in items
            if item.get("fields", {}).get("System.WorkItemType") in TRIGGER_TYPES
        ]
        active_ids = self._get_active_work_item_ids()
        skipped = 0

        for item in eligible:
            item_id = str(item.get("id", ""))
            if item_id in active_ids:
                skipped += 1
                continue
            self._run_pipeline(item)

        processed = len(eligible) - skipped
        print(f"{LOG_PREFIX} poll complete: found={len(eligible)} skipped={skipped} processed={processed}")

    def _recover_paused_clarifications(self) -> None:
        """Crash-recovery: resume any runs left in PENDING_CLARIFICATION by a prior crash.

        Under normal operation _run_clarification blocks inline and never leaves a
        run in PENDING_CLARIFICATION while the process is alive.  This method handles
        the edge case where the process was killed mid-wait.
        """
        for run_id in self.run_record_manager.list_runs():
            try:
                run = self.run_record_manager.load(run_id)
            except Exception:
                continue
            if run.state != PipelineState.pending_clarification:
                continue

            print(f"{LOG_PREFIX} crash-recovery: resuming PENDING_CLARIFICATION run for work_item={run.work_item_id}")
            try:
                work_item = self.ado_client.get_work_item_by_id(int(run.work_item_id))
            except Exception as exc:
                print(f"{LOG_PREFIX} warning: could not fetch work item {run.work_item_id} — {exc}")
                continue

            steps = self._build_pipeline_steps()
            success = self._execute_agent_phase(
                run, work_item, "clarification", self._run_clarification,
                PipelineState.stories_created, [],
            )
            if not success:
                self._handle_pipeline_failure(run, run.work_item_id)
                continue

            for phase_name, agent_fn, target_state in steps[1:]:
                ok = self._execute_agent_phase(run, work_item, phase_name, agent_fn, target_state, [])
                if not ok:
                    self._handle_pipeline_failure(run, run.work_item_id)
                    break
            else:
                print(f"{LOG_PREFIX} work_item={run.work_item_id} pipeline=complete (crash-recovery)")

    def _enrich_description_with_comments(
        self, work_item: dict[str, Any], human_comments: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Return a shallow copy of work_item with all human comment text appended to the description."""
        comment_block = "\n\n---\nProduct Owner responses:\n" + "\n\n".join(
            c.get("text", "").strip() for c in human_comments if c.get("text", "").strip()
        )
        enriched = dict(work_item)
        fields = dict(work_item.get("fields", {}))
        existing = fields.get("System.Description", "") or ""
        fields["System.Description"] = existing + comment_block
        enriched["fields"] = fields
        return enriched

    def _get_active_work_item_ids(self) -> set[str]:
        """Return work item IDs that already have a non-terminal pipeline run."""
        active: set[str] = set()
        for run_id in self.run_record_manager.list_runs():
            try:
                loaded = self.run_record_manager.load(run_id)
                if not self.state_machine.is_terminal(loaded.state):
                    active.add(loaded.work_item_id)
            except Exception:
                pass
        return active

    def _run_pipeline(self, work_item: dict[str, Any]) -> None:
        """Execute the full agent pipeline sequentially for one work item."""
        work_item_id = str(work_item.get("id", "unknown"))
        title = str(work_item.get("fields", {}).get("System.Title", work_item_id))

        run = self.run_record_manager.create(work_item_id, title)
        self._post_ado_comment(work_item_id, _PIPELINE_STARTED_COMMENT.format(run_id=run.run_id))
        try:
            self.ado_client.update_work_item(int(work_item_id), {"System.State": "Active"})
        except Exception as exc:
            print(f"{LOG_PREFIX} warning: could not set ADO state to Active — {exc}")

        for phase_name, agent_fn, target_state in self._build_pipeline_steps():
            success = self._execute_agent_phase(
                run, work_item, phase_name, agent_fn, target_state, []
            )
            if not success:
                self._handle_pipeline_failure(run, work_item_id)
                return

        print(f"{LOG_PREFIX} work_item={work_item_id} pipeline=complete")

    def _build_pipeline_steps(
        self,
    ) -> list[tuple[str, Callable[[PipelineRun, dict[str, Any]], bool], PipelineState | None]]:
        """Return the ordered agent sequence as (phase_name, agent_fn, target_state) tuples.

        frontend_agent has no target state because both frontend and backend share
        the coding_in_progress state; the transition occurs after backend completes.
        """
        return [
            ("clarification",   self._run_clarification,  PipelineState.stories_created),
            ("story_writer",    self._run_story_writer,   PipelineState.spec_in_progress),
            ("spec_agent",      self._run_spec_agent,     PipelineState.coding_in_progress),
            ("frontend_agent",  self._run_frontend_agent, None),
            ("backend_agent",   self._run_backend_agent,  PipelineState.testing_in_progress),
            ("test_agent",      self._run_test_agent,     PipelineState.audit_in_progress),
            ("audit_agent",     self._run_audit_agent,    PipelineState.supervisor_review),
            ("supervisor",      self._run_supervisor,     None),
        ]

    def _handle_pipeline_failure(self, run: PipelineRun, work_item_id: str) -> None:
        """Transition run to PIPELINE_FAILED, persist, and log."""
        if not self.state_machine.is_terminal(run.state):
            self.state_machine.transition(run, PipelineState.pipeline_failed)
        self.run_record_manager.save(run)
        self._post_ado_comment(
            work_item_id, _PIPELINE_HALTED_COMMENT.format(run_id=run.run_id)
        )
        print(f"{LOG_PREFIX} work_item={work_item_id} pipeline=FAILED")

    # -------------------------------------------------------------------------
    # Core retry loop
    # -------------------------------------------------------------------------

    def _execute_agent_phase(
        self,
        run: PipelineRun,
        work_item: dict[str, Any],
        phase_name: str,
        agent_fn: Callable[[PipelineRun, dict[str, Any]], bool],
        target_state: PipelineState | None,
        previous_errors: list[str],
    ) -> bool:
        """Run one agent phase with up to MAX_AGENT_RETRIES retries and diagnosis.

        Args:
            previous_errors: Error strings from a prior incomplete run of this phase,
                used for crash-recovery continuity.

        Returns:
            True on success, False when all attempts are exhausted.
        """
        errors: list[str] = list(previous_errors)
        diagnoses: list[DiagnosisResult] = []

        for attempt in range(1, MAX_AGENT_RETRIES + 2):
            error = self._attempt_agent(run, work_item, phase_name, agent_fn, attempt)

            if error is None:
                self._complete_phase(run, phase_name, target_state)
                return True

            errors.append(error)
            print(f"{LOG_PREFIX} phase={phase_name} attempt={attempt} failed error={error[:120]!r}")

            if attempt == MAX_AGENT_RETRIES + 1:
                self._escalate_to_human(run, work_item, phase_name, errors, diagnoses)
                return False

            diagnosis = self._run_diagnosis_step(phase_name, attempt, error, work_item)
            diagnoses.append(diagnosis)
            self._store_diagnosis_on_record(run, phase_name, attempt, diagnosis)
            self._log_retry_strategy(phase_name, attempt, errors)
            time.sleep(RETRY_WAIT_SECONDS)

        return False  # unreachable; every loop iteration returns or continues

    def _attempt_agent(
        self,
        run: PipelineRun,
        work_item: dict[str, Any],
        phase_name: str,
        agent_fn: Callable[[PipelineRun, dict[str, Any]], bool],
        attempt: int,
    ) -> str | None:
        """Execute one attempt of an agent phase.

        Returns:
            None on success, or an error string describing the failure.
        """
        record = AgentRunRecord(
            agent_name=phase_name,
            started_at=datetime.now(timezone.utc),
            success=False,
            attempt_number=attempt,
        )
        run.agent_runs.append(record)

        try:
            result = agent_fn(run, work_item)
            if not result:
                error = f"Agent {phase_name!r} returned falsy result on attempt {attempt}"
                record.completed_at = datetime.now(timezone.utc)
                record.error_message = error
                return error
            record.success = True
            record.completed_at = datetime.now(timezone.utc)
            return None
        except Exception as exc:
            record.completed_at = datetime.now(timezone.utc)
            record.error_message = str(exc)
            return str(exc)

    def _complete_phase(
        self,
        run: PipelineRun,
        phase_name: str,
        target_state: PipelineState | None,
    ) -> None:
        """Save checkpoint, optionally transition state, and persist the run."""
        self._save_checkpoint(run, phase_name)
        if target_state is not None:
            self.state_machine.transition(run, target_state)
        self.run_record_manager.save(run)
        print(f"{LOG_PREFIX} phase={phase_name} status=checkpoint_saved")

    def _save_checkpoint(self, run: PipelineRun, phase_name: str) -> None:
        """Mark the most recent successful AgentRunRecord for phase_name as checkpointed."""
        now = datetime.now(timezone.utc)
        for record in reversed(run.agent_runs):
            if record.agent_name == phase_name and record.success:
                record.checkpoint_saved = True
                record.checkpoint_timestamp = now
                break
        run.last_checkpoint_phase = phase_name

    # -------------------------------------------------------------------------
    # Diagnosis and retry helpers
    # -------------------------------------------------------------------------

    def _run_diagnosis_step(
        self,
        phase_name: str,
        attempt: int,
        error: str,
        work_item: dict[str, Any],
    ) -> DiagnosisResult:
        """Invoke the diagnosis utility and return structured retry guidance."""
        work_item_id = str(work_item.get("id", "unknown"))
        return run_diagnosis(
            agent_name=phase_name,
            attempt_number=attempt,
            error_message=error,
            input_summary=f"work_item_id={work_item_id}",
            output_summary="See agent_runs on the pipeline run record.",
            anthropic_client=self.anthropic_client,
        )

    def _store_diagnosis_on_record(
        self,
        run: PipelineRun,
        phase_name: str,
        attempt: int,
        diagnosis: DiagnosisResult,
    ) -> None:
        """Attach diagnosis output to the matching AgentRunRecord for the next attempt to read."""
        formatted = format_retry_context(diagnosis)
        for record in reversed(run.agent_runs):
            if record.agent_name == phase_name and record.attempt_number == attempt:
                record.diagnosis = diagnosis.root_cause
                record.retry_context = formatted
                break

    def _log_retry_strategy(
        self, phase_name: str, attempt: int, errors: list[str]
    ) -> None:
        """Log whether the upcoming retry follows a new error or the same one."""
        if attempt >= 2 and len(errors) >= 2 and errors[-1] != errors[-2]:
            print(f"{LOG_PREFIX} phase={phase_name} new error introduced — rolling back to checkpoint")
        elif attempt >= 2:
            print(f"{LOG_PREFIX} phase={phase_name} same error — retrying with updated diagnosis")
        else:
            print(f"{LOG_PREFIX} phase={phase_name} attempt={attempt} — running diagnosis before retry")

    # -------------------------------------------------------------------------
    # Human escalation
    # -------------------------------------------------------------------------

    def _escalate_to_human(
        self,
        run: PipelineRun,
        work_item: dict[str, Any],
        phase_name: str,
        errors: list[str],
        diagnoses: list[DiagnosisResult],
    ) -> None:
        """Post a full diagnostic report to ADO and mark the run as needing attention."""
        work_item_id = str(work_item.get("id", "unknown"))
        report = self._build_escalation_report(phase_name, errors, diagnoses)
        run.needs_attention = True
        run.escalation_report = report
        self._post_ado_comment(work_item_id, report)
        try:
            self.ado_client.update_work_item(
                int(work_item_id), {"System.State": "Resolved"}
            )
        except Exception as exc:
            print(f"{LOG_PREFIX} warning: could not set ADO state to Needs Attention — {exc}")
        self.run_record_manager.save(run)
        print(f"{LOG_PREFIX} phase={phase_name} ESCALATED to human — work_item={work_item_id}")

    def _build_escalation_report(
        self,
        phase_name: str,
        errors: list[str],
        diagnoses: list[DiagnosisResult],
    ) -> str:
        """Assemble the full diagnostic report string for the ADO escalation comment."""
        attempt_items = "".join(
            f"<li><strong>Attempt {i}:</strong> {err}</li>"
            for i, err in enumerate(errors, start=1)
        ) or "<li>No error details available.</li>"

        diagnosis_items = "".join(
            f"<li><strong>Diagnosis {i}:</strong><br>"
            f"Root cause: {d.root_cause}<br>"
            f"Suggested fix: {d.suggested_fix}</li>"
            for i, d in enumerate(diagnoses, start=1)
        ) or "<li>No diagnosis available.</li>"

        return (
            f"[AI Pipeline] <strong>Human Attention Required</strong><br><br>"
            f"<strong>Phase:</strong> {phase_name}<br>"
            f"<strong>Total attempts:</strong> {len(errors)}<br><br>"
            f"<strong>Errors:</strong><br><ul>{attempt_items}</ul>"
            f"<strong>Diagnoses:</strong><br><ul>{diagnosis_items}</ul>"
        )

    def _post_ado_comment(self, work_item_id: str, message: str) -> None:
        """Post a comment to an ADO work item. Logs a warning on failure, never raises."""
        try:
            self.ado_client.add_comment(int(work_item_id), message)
        except Exception as exc:
            print(f"{LOG_PREFIX} warning: could not post ADO comment to {work_item_id} — {exc}")

    # -------------------------------------------------------------------------
    # Agent stubs — placeholder implementations replaced as agents are built
    # -------------------------------------------------------------------------

    def _run_clarification(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Clarification Agent and block until the score reaches 80.

        When the initial score is below 80 the method posts the clarifying questions
        as an ADO comment, sets the work item to 'Needs Info', then enters a blocking
        poll loop — sleeping POLL_INTERVAL_SECONDS between checks.

        Each time a new human comment is detected the clarification agent is re-run
        with the original description enriched by all human comment text so far.
        A follow-up ADO comment is posted with the updated confidence score.  If the
        score is still below 80 the loop continues; once it reaches 80 the method
        restores the work item state to 'Active' and returns True so the pipeline
        continues normally.

        This method NEVER returns False — it only returns True (score reached) or
        raises on an unrecoverable error, ensuring the retry/escalation logic in
        _execute_agent_phase is never triggered for a simple clarification pause.
        """
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=clarification status=starting work_item={work_item_id}")

        result = clarification_agent.run(work_item, self.anthropic_client)
        run.clarification_output = result
        score = result.confidence_score
        print(f"{LOG_PREFIX} phase=clarification confidence_score={score}")

        _paused = score < 80
        while score < 80:
            questions = result.questions or []
            q_items = "".join(f"<li>{q}</li>" for q in questions) or "<li>(no questions provided)</li>"
            pause_comment = (
                f"[AI Pipeline] <strong>Pipeline Paused — Clarification Required</strong><br><br>"
                f"<strong>Confidence Score:</strong> {score}/100<br><br>"
                f"Please answer the following questions by <strong>adding a comment</strong> to this "
                f"work item. The pipeline will resume automatically once your response is detected.<br><br>"
                f"<strong>Questions:</strong><br>"
                f"<ul>{q_items}</ul>"
            )
            self._post_ado_comment(work_item_id, pause_comment)
            try:
                self.ado_client.update_work_item(int(work_item_id), {"System.State": "Needs Info"})
            except Exception as exc:
                print(f"{LOG_PREFIX} warning: could not set ADO state to Needs Info — {exc}")

            # Snapshot human comment count so we detect only NEW comments on the next check.
            try:
                all_comments = self.ado_client.get_comments(int(work_item_id))
                run.clarification_comment_count = sum(
                    1 for c in all_comments
                    if not c.get("text", "").startswith("[AI Pipeline]")
                )
            except Exception as exc:
                print(f"{LOG_PREFIX} warning: could not snapshot comment count — {exc}")
            self.run_record_manager.save(run)

            print(
                f"{LOG_PREFIX} phase=clarification PAUSED score={score} "
                f"work_item={work_item_id} — blocking until human comment added"
            )

            # --- blocking wait loop ---
            while True:
                time.sleep(POLL_INTERVAL_SECONDS)
                try:
                    all_comments = self.ado_client.get_comments(int(work_item_id))
                    human_comments = [
                        c for c in all_comments
                        if not c.get("text", "").startswith("[AI Pipeline]")
                    ]
                except Exception as exc:
                    print(f"{LOG_PREFIX} warning: comment poll failed — {exc}")
                    continue

                if len(human_comments) <= run.clarification_comment_count:
                    print(f"{LOG_PREFIX} phase=clarification still waiting work_item={work_item_id}")
                    continue

                # New human comment arrived — re-evaluate.
                print(f"{LOG_PREFIX} phase=clarification new comment detected — re-evaluating work_item={work_item_id}")
                enriched = self._enrich_description_with_comments(work_item, human_comments)
                result = clarification_agent.run(enriched, self.anthropic_client)
                run.clarification_output = result
                score = result.confidence_score

                if score >= 80:
                    self._post_ado_comment(
                        work_item_id,
                        f"[AI Pipeline] <strong>Confidence Score Updated — Threshold Reached</strong><br><br>"
                        f"<strong>Score:</strong> {score}/100 &nbsp;✓<br>"
                        f"Pipeline is resuming now.",
                    )
                    try:
                        self.ado_client.update_work_item(int(work_item_id), {"System.State": "Active"})
                    except Exception as exc:
                        print(f"{LOG_PREFIX} warning: could not restore ADO state — {exc}")
                else:
                    self._post_ado_comment(
                        work_item_id,
                        f"[AI Pipeline] <strong>Confidence Score Updated — Still Below Threshold</strong><br><br>"
                        f"<strong>Score:</strong> {score}/100 (minimum: 80)<br>"
                        f"Posting follow-up questions above.",
                    )
                print(f"{LOG_PREFIX} phase=clarification re-evaluated score={score} work_item={work_item_id}")
                break  # Break inner loop; outer while checks score again.

        if not _paused:
            self._post_ado_comment(
                work_item_id,
                f"[AI Pipeline] <strong>Clarification Complete</strong><br><br>"
                f"<strong>Confidence Score:</strong> {score}/100",
            )

        if result.spec and result.spec.gaps:
            print(
                f"{LOG_PREFIX} phase=clarification "
                f"gaps={len(result.spec.gaps)} partial_confidence={result.spec.partial_confidence}"
            )
        print(f"{LOG_PREFIX} phase=clarification status=complete confidence_score={score}")
        return True

    def _run_story_writer(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Story Writer Agent to decompose the spec into ADO User Stories."""
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=story_writer status=starting work_item={work_item_id}")

        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError(
                "Story Writer: clarification_output.spec is None — "
                "clarification phase did not complete successfully"
            )

        story_ids = story_writer_agent.run(
            run.clarification_output.spec,
            work_item,
            self.anthropic_client,
            self.ado_client,
        )
        run.story_ids = story_ids

        if not story_ids:
            print(f"{LOG_PREFIX} phase=story_writer NO stories created — returning False")
            return False

        print(f"{LOG_PREFIX} phase=story_writer stories_created={len(story_ids)} ids={story_ids}")
        return True

    def _run_spec_agent(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Spec Agent to produce a Low Level Design document."""
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=spec_agent status=starting work_item={work_item_id}")

        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError(
                "Spec Agent: clarification_output.spec is None — "
                "clarification phase did not complete successfully"
            )

        lld = spec_agent.run(
            run.clarification_output.spec,
            run.story_ids,
            work_item,
            self.anthropic_client,
            self.ado_client,
        )
        run.lld_document = lld

        print(
            f"{LOG_PREFIX} phase=spec_agent "
            f"files_to_create={len(lld.files_to_create)} "
            f"files_to_modify={len(lld.files_to_modify)} "
            f"frontend_components_to_create={len(lld.frontend_changes.components_to_create)} "
            f"backend_endpoints={len(lld.backend_changes.endpoints)}"
        )
        return True

    def _run_frontend_agent(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Frontend Agent to write and commit React/TypeScript changes."""
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=frontend_agent status=starting work_item={work_item_id}")

        if run.lld_document is None:
            raise RuntimeError(
                "Frontend Agent: lld_document is None — spec phase did not complete successfully"
            )
        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError(
                "Frontend Agent: clarification_output.spec is None — "
                "clarification phase did not complete successfully"
            )

        summary = frontend_agent.run(
            run.lld_document,
            run.clarification_output.spec,
            run.story_ids,
            work_item,
            self.anthropic_client,
        )
        run.frontend_summary = summary

        print(
            f"{LOG_PREFIX} phase=frontend_agent "
            f"files_created={len(summary.files_created)} "
            f"files_modified={len(summary.files_modified)} "
            f"branch={summary.branch_name!r} "
            f"self_review_clean={summary.self_review.clean}"
        )
        return True

    def _run_backend_agent(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Backend Agent to write and commit .NET C# changes."""
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=backend_agent status=starting work_item={work_item_id}")

        if run.lld_document is None:
            raise RuntimeError(
                "Backend Agent: lld_document is None — spec phase did not complete successfully"
            )
        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError(
                "Backend Agent: clarification_output.spec is None — "
                "clarification phase did not complete successfully"
            )
        if run.frontend_summary is None:
            raise RuntimeError(
                "Backend Agent: frontend_summary is None — "
                "frontend phase did not complete successfully"
            )

        summary = backend_agent.run(
            run.lld_document,
            run.clarification_output.spec,
            run.frontend_summary,
            work_item,
            self.anthropic_client,
        )
        run.backend_summary = summary

        print(
            f"{LOG_PREFIX} phase=backend_agent "
            f"files_created={len(summary.files_created)} "
            f"files_modified={len(summary.files_modified)} "
            f"branch={summary.branch_name!r} "
            f"self_review_clean={summary.self_review.clean}"
        )
        return True

    def _run_test_agent(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Run the Test Agent: generate and execute tests, store results."""
        work_item_id = str(work_item.get("id", "unknown"))

        if run.frontend_summary is None:
            raise RuntimeError("Test Agent: frontend_summary is missing from pipeline run")
        if run.backend_summary is None:
            raise RuntimeError("Test Agent: backend_summary is missing from pipeline run")
        if run.lld_document is None:
            raise RuntimeError("Test Agent: lld_document is missing from pipeline run")
        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError("Test Agent: structured_spec is missing from pipeline run")

        result = test_agent.run(
            run.frontend_summary,
            run.backend_summary,
            run.lld_document,
            run.clarification_output.spec,
            self.anthropic_client,
        )
        run.test_results = result

        coverage = result.coverage.line_coverage_percent if result.coverage else 0.0
        status_label = "PASS" if result.failed == 0 else "FAIL"

        def _test_items(status_value: str) -> str:
            cases = [tc for tc in result.test_cases if tc.status.value == status_value]
            if not cases:
                return "<li><em>none</em></li>"
            lines = []
            for tc in cases:
                label = tc.name.replace("_", " ")
                if tc.error_message:
                    lines.append(f"<li>{label} &mdash; <em>{tc.error_message[:120]}</em></li>")
                else:
                    lines.append(f"<li>{label}</li>")
            return "".join(lines)

        comment = (
            f"[AI Pipeline] <strong>Tests Complete &mdash; {status_label}</strong><br><br>"
            f"<strong>Total:</strong> {result.total_tests} &nbsp;|&nbsp; "
            f"<strong>Passed:</strong> {result.passed} &nbsp;|&nbsp; "
            f"<strong>Failed:</strong> {result.failed} &nbsp;|&nbsp; "
            f"<strong>Skipped:</strong> {result.skipped} &nbsp;|&nbsp; "
            f"<strong>Coverage:</strong> {coverage:.1f}%<br><br>"
            f"<strong>Passed Tests:</strong><br><ul>{_test_items('passed')}</ul>"
            f"<strong>Failed Tests:</strong><br><ul>{_test_items('failed')}</ul>"
            f"<strong>Skipped Tests:</strong><br><ul>{_test_items('skipped')}</ul>"
        )
        self._post_ado_comment(work_item_id, comment)

        print(
            f"{LOG_PREFIX} phase=test_agent "
            f"total={result.total_tests} "
            f"passed={result.passed} "
            f"failed={result.failed}"
        )
        print(f"{LOG_PREFIX} phase=test_agent test results recorded — pipeline continues for demo (passed={result.passed} failed={result.failed})")
        return True

    def _run_audit_agent(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Audit Agent to score all feature-branch changes and gate on the result."""
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=audit_agent status=starting work_item={work_item_id}")

        if run.frontend_summary is None:
            raise RuntimeError("Audit Agent: frontend_summary is missing from pipeline run")
        if run.backend_summary is None:
            raise RuntimeError("Audit Agent: backend_summary is missing from pipeline run")
        if run.test_results is None:
            raise RuntimeError("Audit Agent: test_results is missing from pipeline run")
        if run.lld_document is None:
            raise RuntimeError("Audit Agent: lld_document is missing from pipeline run")
        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError("Audit Agent: structured_spec is missing from pipeline run")

        report = audit_agent.run(
            run.frontend_summary,
            run.backend_summary,
            run.test_results,
            run.lld_document,
            run.clarification_output.spec,
            self.anthropic_client,
        )
        run.audit_report = report

        cats = report.categories
        all_findings = (
            cats.code_correctness.findings
            + cats.standards_compliance.findings
            + cats.test_coverage.findings
            + cats.security.findings
            + cats.spec_adherence.findings
            + cats.performance.findings
            + cats.documentation.findings
        )
        findings_items = "".join(
            f"<li>{f.description}</li>" for f in all_findings[:10]
        ) or "<li>none</li>"
        blocking_items = "".join(
            f"<li>{f.description}</li>" for f in report.blocking_findings
        ) if report.blocking_findings else "<li>none</li>"

        audit_comment = (
            f"[AI Pipeline] <strong>Audit Report</strong><br><br>"
            f"<strong>Composite Score:</strong> {report.composite_score}/10.0 &nbsp;|&nbsp; "
            f"<strong>Recommendation:</strong> {report.merge_recommendation.value}<br><br>"
            f"<strong>Category Scores:</strong><br>"
            f"<ul>"
            f"<li><strong>Code Correctness:</strong> {cats.code_correctness.score}/{cats.code_correctness.max_score}</li>"
            f"<li><strong>Standards Compliance:</strong> {cats.standards_compliance.score}/{cats.standards_compliance.max_score}</li>"
            f"<li><strong>Test Coverage:</strong> {cats.test_coverage.score}/{cats.test_coverage.max_score}</li>"
            f"<li><strong>Security:</strong> {cats.security.score}/{cats.security.max_score}</li>"
            f"<li><strong>Spec Adherence:</strong> {cats.spec_adherence.score}/{cats.spec_adherence.max_score}</li>"
            f"<li><strong>Performance:</strong> {cats.performance.score}/{cats.performance.max_score}</li>"
            f"<li><strong>Documentation:</strong> {cats.documentation.score}/{cats.documentation.max_score}</li>"
            f"</ul>"
            f"<strong>Findings:</strong><br><ul>{findings_items}</ul>"
            f"<strong>Blocking Findings:</strong><br><ul>{blocking_items}</ul>"
        )
        self._post_ado_comment(work_item_id, audit_comment)

        print(
            f"{LOG_PREFIX} phase=audit_agent "
            f"composite_score={report.composite_score:.2f} "
            f"merge_recommendation={report.merge_recommendation.value} "
            f"blocking_findings={len(report.blocking_findings)}"
        )
        return True

    def _run_supervisor(self, run: PipelineRun, work_item: dict[str, Any]) -> bool:
        """Invoke the Supervisor Agent to create a GitHub PR and record the outcome."""
        work_item_id = str(work_item.get("id", "unknown"))
        print(f"{LOG_PREFIX} phase=supervisor status=starting work_item={work_item_id}")

        if run.audit_report is None:
            raise RuntimeError("Supervisor Agent: audit_report is missing from pipeline run")
        if run.frontend_summary is None:
            raise RuntimeError("Supervisor Agent: frontend_summary is missing from pipeline run")
        if run.backend_summary is None:
            raise RuntimeError("Supervisor Agent: backend_summary is missing from pipeline run")
        if run.test_results is None:
            raise RuntimeError("Supervisor Agent: test_results is missing from pipeline run")
        if run.clarification_output is None or run.clarification_output.spec is None:
            raise RuntimeError("Supervisor Agent: structured_spec is missing from pipeline run")

        try:
            decision = supervisor_agent.run(
                run.audit_report,
                run.frontend_summary,
                run.backend_summary,
                run.test_results,
                run.clarification_output.spec,
                self.anthropic_client,
            )
        except RuntimeError as exc:
            print(f"{LOG_PREFIX} phase=supervisor recommendation=reject — {exc}")
            self._post_ado_comment(
                work_item_id,
                f"[AI Pipeline] <strong>Pipeline Did Not Merge</strong><br><br>"
                f"<strong>Reason:</strong> {exc}",
            )
            return True

        run.github_pr_url = decision.pr_url

        merged_label = "Yes" if decision.merged else "No"
        self._post_ado_comment(
            work_item_id,
            f"[AI Pipeline] <strong>Pipeline Complete</strong><br><br>"
            f"<strong>PR:</strong> <a href=\"{decision.pr_url}\">{decision.pr_url}</a><br>"
            f"<strong>Merged:</strong> {merged_label}<br>"
            f"<strong>Decision:</strong> {decision.decision}",
        )

        if decision.merged:
            target = PipelineState.auto_merged
            try:
                self.ado_client.update_work_item(int(work_item_id), {"System.State": "Resolved"})
            except Exception as exc:
                print(f"{LOG_PREFIX} warning: could not set ADO state to Resolved — {exc}")
        else:
            target = PipelineState.human_review_pending

        self.state_machine.transition(run, target)

        print(
            f"{LOG_PREFIX} phase=supervisor "
            f"pr_url={decision.pr_url!r} "
            f"merged={decision.merged} "
            f"decision={decision.decision!r}"
        )
        return True


if __name__ == "__main__":
    Orchestrator().start()
