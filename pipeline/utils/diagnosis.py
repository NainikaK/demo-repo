"""Diagnosis step utility.

A focused Claude API call — not a full agent — invoked by the Orchestrator
immediately after any agent failure. Its only job is to analyse the error,
identify the root cause, and produce retry context that makes the next attempt
informed rather than identical to the one that just failed.

This module must never raise. Every failure path returns a DiagnosisResult
with diagnosis_succeeded=False so the Orchestrator can always proceed.
"""

import json
import sys
from pathlib import Path
from typing import Any

import anthropic

_PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))

from contracts.diagnosis_result import DiagnosisResult  # noqa: E402

_DIAGNOSIS_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 1024
_DIAGNOSIS_TIMEOUT_SECONDS = 30

_SYSTEM_PROMPT = """\
You are a pipeline failure analyst. Your only job is to examine a failed agent run \
and identify exactly what went wrong and how the next attempt should approach it differently.

You will receive:
- The name of the agent that failed
- Which attempt number this was
- The error message or exception
- A summary of what the agent received as input
- A summary of what the agent produced before failing

Respond ONLY with valid JSON in this exact format — no preamble, no explanation, \
no markdown fences, just the raw JSON object:
{
  "root_cause": "one sentence describing what went wrong",
  "suggested_fix": "one sentence describing how to address it",
  "retry_context": "specific additional context or instruction to pass to the retry attempt"
}"""

_FALLBACK_ROOT_CAUSE = "Diagnosis failed — the diagnosis call itself encountered an error."
_FALLBACK_SUGGESTED_FIX = "Retry with the same input; no specific fix could be determined."
_FALLBACK_RETRY_CONTEXT = "No additional context available. Proceeding with blind retry."

_RETRY_CONTEXT_TEMPLATE = (
    "RETRY CONTEXT (attempt {next_attempt}): Previous attempt failed. "
    "Root cause: {root_cause} "
    "Suggested fix: {suggested_fix} "
    "Additional context: {retry_context}"
)


def run_diagnosis(
    agent_name: str,
    attempt_number: int,
    error_message: str,
    input_summary: str,
    output_summary: str,
    anthropic_client: anthropic.Anthropic,
) -> DiagnosisResult:
    """Analyse a failed agent run and return structured retry guidance.

    Calls the Claude API with a focused prompt containing the failure context.
    Parses the JSON response into a DiagnosisResult. If the API call fails or
    the response is not valid JSON, returns a DiagnosisResult with
    diagnosis_succeeded=False and generic fallback values.

    This function never raises — all exceptions are caught internally.

    Args:
        agent_name: Name of the agent that failed (e.g. 'frontend_agent').
        attempt_number: Which attempt failed — 1 or 2.
        error_message: The exception message or timeout description from the failure.
        input_summary: Short summary of what the agent received as input.
        output_summary: Short summary of what the agent produced before failing.
        anthropic_client: An initialised Anthropic client instance.

    Returns:
        DiagnosisResult with populated fields on success, or with
        diagnosis_succeeded=False and fallback values if diagnosis itself failed.
    """
    user_message = _build_user_message(
        agent_name=agent_name,
        attempt_number=attempt_number,
        error_message=error_message,
        input_summary=input_summary,
        output_summary=output_summary,
    )

    try:
        response = anthropic_client.messages.create(
            model=_DIAGNOSIS_MODEL,
            max_tokens=_MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
            timeout=_DIAGNOSIS_TIMEOUT_SECONDS,
        )
        raw_text = response.content[0].text.strip()
        parsed = json.loads(raw_text)
        return DiagnosisResult(
            agent_name=agent_name,
            attempt_number=attempt_number,
            root_cause=parsed["root_cause"],
            suggested_fix=parsed["suggested_fix"],
            retry_context=parsed["retry_context"],
            diagnosis_succeeded=True,
        )
    except Exception:
        return _failed_diagnosis(agent_name=agent_name, attempt_number=attempt_number)


def format_retry_context(diagnosis: DiagnosisResult) -> str:
    """Format a DiagnosisResult into a string suitable for prepending to an agent's retry input.

    The returned string is designed to be prepended to whatever input the agent
    normally receives, giving it explicit awareness of why the previous attempt
    failed and what to do differently.

    Args:
        diagnosis: The DiagnosisResult produced by run_diagnosis.

    Returns:
        A formatted string containing the attempt number, root cause, suggested
        fix, and additional retry context.
    """
    return _RETRY_CONTEXT_TEMPLATE.format(
        next_attempt=diagnosis.attempt_number + 1,
        root_cause=diagnosis.root_cause,
        suggested_fix=diagnosis.suggested_fix,
        retry_context=diagnosis.retry_context,
    )


def _build_user_message(
    agent_name: str,
    attempt_number: int,
    error_message: str,
    input_summary: str,
    output_summary: str,
) -> str:
    """Assemble the user-turn message sent to the diagnosis model.

    Args:
        agent_name: Name of the failed agent.
        attempt_number: Which attempt failed.
        error_message: The error or exception text.
        input_summary: Summary of the agent's input.
        output_summary: Summary of the agent's output before failure.

    Returns:
        A formatted string containing all failure context.
    """
    return (
        f"Agent: {agent_name}\n"
        f"Attempt: {attempt_number}\n"
        f"Error: {error_message}\n"
        f"Input summary: {input_summary}\n"
        f"Output summary: {output_summary}"
    )


def _failed_diagnosis(agent_name: str, attempt_number: int) -> DiagnosisResult:
    """Return a fallback DiagnosisResult when the diagnosis call itself fails.

    Args:
        agent_name: Name of the agent that was being diagnosed.
        attempt_number: Which attempt was being diagnosed.

    Returns:
        DiagnosisResult with diagnosis_succeeded=False and generic fallback values.
    """
    return DiagnosisResult(
        agent_name=agent_name,
        attempt_number=attempt_number,
        root_cause=_FALLBACK_ROOT_CAUSE,
        suggested_fix=_FALLBACK_SUGGESTED_FIX,
        retry_context=_FALLBACK_RETRY_CONTEXT,
        diagnosis_succeeded=False,
    )


__all__: list[Any] = ["run_diagnosis", "format_retry_context"]
