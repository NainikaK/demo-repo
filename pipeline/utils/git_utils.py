"""Git utility helpers.

Wraps all git operations needed by the Frontend and Backend agents — branch
creation, file I/O, staging, committing, pushing, diffing, and rollback.

All functions raise RuntimeError on failure so the Orchestrator's retry loop
can catch and diagnose them.
"""

import os
import subprocess
from pathlib import Path
from typing import Any

_LOG_PREFIX = "[git_utils]"
_MAIN_BRANCH = "main"
_BRANCH_PREFIX = "feature"
_ORIGIN = "origin"

_UTILS_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _UTILS_DIR.parent
_REPO_ROOT = _PIPELINE_DIR.parent
_DEMO_APP_DIR = _REPO_ROOT / "demo-app"


def get_repo_root() -> Path:
    """Return the absolute path to the repository root.

    Walks up from this file's directory until a .git directory is found.

    Raises:
        RuntimeError: If no .git directory is found anywhere in the hierarchy.
    """
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    raise RuntimeError(
        f"git_utils: could not locate a .git directory starting from {Path(__file__).resolve()}"
    )


def create_feature_branch(work_item_id: str, slug: str) -> str:
    """Create and check out a new feature branch from the latest main.

    Args:
        work_item_id: ADO work item ID used in the branch name.
        slug: Kebab-case short description of the feature.

    Returns:
        The new branch name.

    Raises:
        RuntimeError: If any git command fails.
    """
    branch_name = f"{_BRANCH_PREFIX}/{work_item_id}-{slug}"
    repo_root = get_repo_root()
    # Discard any uncommitted changes so checkout main never fails on a dirty tree
    try:
        run_git(["checkout", "--", "."], cwd=repo_root)
    except RuntimeError:
        pass
    try:
        run_git(["clean", "-fd"], cwd=repo_root)
    except RuntimeError:
        pass
    run_git(["checkout", _MAIN_BRANCH], cwd=repo_root)
    existing = run_git(["branch", "--list", branch_name], cwd=repo_root).strip()
    if existing:
        run_git(["checkout", branch_name], cwd=repo_root)
        print(f"{_LOG_PREFIX} resumed existing branch {branch_name!r}")
    else:
        run_git(["checkout", "-b", branch_name], cwd=repo_root)
        print(f"{_LOG_PREFIX} created branch {branch_name!r}")
    return branch_name


def write_file(repo_relative_path: str, content: str) -> None:
    """Write content to a file relative to the repo root.

    Creates all missing parent directories before writing.

    Args:
        repo_relative_path: Path to the file relative to the repo root.
        content: Text content to write (UTF-8).

    Raises:
        RuntimeError: If the write operation fails.
    """
    target = get_repo_root() / repo_relative_path
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"git_utils: failed to write file {repo_relative_path!r} — {exc}"
        ) from exc


def read_file(repo_relative_path: str) -> str:
    """Read and return the content of a file relative to the repo root.

    Args:
        repo_relative_path: Path to the file relative to the repo root.

    Returns:
        File content as a UTF-8 string.

    Raises:
        FileNotFoundError: If the file does not exist.
        RuntimeError: If the read operation fails for another reason.
    """
    target = get_repo_root() / repo_relative_path
    if not target.exists():
        raise FileNotFoundError(
            f"git_utils: file not found at {repo_relative_path!r}"
        )
    try:
        return target.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"git_utils: failed to read file {repo_relative_path!r} — {exc}"
        ) from exc


def commit_changes(files: list[str], message: str) -> str:
    """Stage the given files and create a commit.

    Args:
        files: Repo-relative paths of files to stage. Must be non-empty.
        message: Commit message.

    Returns:
        The full SHA of the new commit.

    Raises:
        RuntimeError: If the files list is empty, there is nothing to commit,
            or any git command fails.
    """
    if not files:
        raise RuntimeError("git_utils: commit_changes called with an empty file list")
    repo_root = get_repo_root()
    run_git(["add", "--", *files], cwd=repo_root)
    run_git(["commit", "-m", message], cwd=repo_root)
    sha = run_git(["rev-parse", "HEAD"], cwd=repo_root).strip()
    print(f"{_LOG_PREFIX} committed {len(files)} file(s) sha={sha[:8]}")
    return sha


def push_branch(branch_name: str) -> None:
    """Push the given branch to origin.

    Args:
        branch_name: Name of the local branch to push.

    Raises:
        RuntimeError: If the push fails.
    """
    repo_root = get_repo_root()
    run_git(["push", _ORIGIN, branch_name], cwd=repo_root)
    print(f"{_LOG_PREFIX} pushed branch {branch_name!r} to {_ORIGIN}")


def get_current_branch() -> str:
    """Return the name of the currently checked-out branch.

    Raises:
        RuntimeError: If the git command fails.
    """
    return run_git(["rev-parse", "--abbrev-ref", "HEAD"], cwd=get_repo_root()).strip()


def checkout_branch(branch_name: str) -> None:
    """Check out an existing branch.

    Args:
        branch_name: Name of the branch to check out.

    Raises:
        RuntimeError: If the checkout fails (e.g. branch does not exist).
    """
    run_git(["checkout", branch_name], cwd=get_repo_root())
    print(f"{_LOG_PREFIX} checked out branch {branch_name!r}")


def get_file_diff(branch_name: str) -> str:
    """Return the full unified diff of branch_name against main.

    Used by the Audit Agent to review all changes introduced on the feature branch.

    Args:
        branch_name: The feature branch to diff.

    Returns:
        Unified diff string. Empty string if there are no differences.

    Raises:
        RuntimeError: If the git diff command fails.
    """
    return run_git(
        ["diff", f"{_MAIN_BRANCH}...{branch_name}"],
        cwd=get_repo_root(),
    )


def rebase_onto_main(branch_name: str) -> None:
    """Rebase a feature branch onto the latest origin/main and force-push it.

    Fetches the latest main from origin first so the rebase target is current.
    Aborts the rebase automatically if conflicts prevent it from completing, then
    raises a descriptive RuntimeError so the caller can surface the problem.

    Args:
        branch_name: The feature branch to rebase.

    Raises:
        RuntimeError: If the fetch, rebase, or force-push fails.
    """
    repo_root = get_repo_root()
    run_git(["fetch", _ORIGIN, _MAIN_BRANCH], cwd=repo_root)
    run_git(["checkout", branch_name], cwd=repo_root)
    try:
        run_git(["rebase", f"{_ORIGIN}/{_MAIN_BRANCH}"], cwd=repo_root)
    except RuntimeError as exc:
        try:
            run_git(["rebase", "--abort"], cwd=repo_root)
        except RuntimeError:
            pass
        raise RuntimeError(
            f"git_utils: rebase of {branch_name!r} onto {_MAIN_BRANCH} failed — "
            f"manual conflict resolution required. {exc}"
        ) from exc
    run_git(["push", "--force-with-lease", _ORIGIN, branch_name], cwd=repo_root)
    print(f"{_LOG_PREFIX} rebased {branch_name!r} onto {_ORIGIN}/{_MAIN_BRANCH} and force-pushed")


def revert_to_main() -> None:
    """Check out main and discard all uncommitted changes.

    Used by the checkpoint rollback mechanism when a retry introduces new errors
    and the feature branch must be returned to its last clean checkpoint state.

    Raises:
        RuntimeError: If any git command fails.
    """
    repo_root = get_repo_root()
    run_git(["checkout", _MAIN_BRANCH], cwd=repo_root)
    run_git(["reset", "--hard", f"{_ORIGIN}/{_MAIN_BRANCH}"], cwd=repo_root)
    run_git(["clean", "-fd"], cwd=repo_root)
    print(f"{_LOG_PREFIX} reverted to {_MAIN_BRANCH} — all local changes discarded")


def run_git(args: list[str], cwd: Path | None = None) -> str:
    """Run a git command and return its stdout.

    Args:
        args: Git sub-command and arguments (e.g. ["checkout", "-b", "feature/x"]).
        cwd: Working directory for the command. Defaults to the repo root.

    Returns:
        Captured stdout as a string.

    Raises:
        RuntimeError: If the process exits with a non-zero code, with full
            context including the command, exit code, stdout, and stderr.
    """
    effective_cwd = cwd or get_repo_root()
    command = ["git", *args]
    result = subprocess.run(
        command,
        cwd=effective_cwd,
        capture_output=True,
        text=True,
        env={**os.environ},
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"git_utils: command {command!r} failed in {effective_cwd}\n"
            f"  exit code: {result.returncode}\n"
            f"  stdout: {result.stdout.strip()}\n"
            f"  stderr: {result.stderr.strip()}"
        )
    return result.stdout


__all__: list[Any] = [
    "get_repo_root",
    "create_feature_branch",
    "write_file",
    "read_file",
    "commit_changes",
    "push_branch",
    "get_current_branch",
    "checkout_branch",
    "get_file_diff",
    "rebase_onto_main",
    "revert_to_main",
    "run_git",
]
