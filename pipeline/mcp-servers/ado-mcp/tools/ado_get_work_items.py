# MCP tool — fetches ADO work items filtered by state, type, project, and trigger tag

import sys
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

# ado_client.py lives in the parent ado-mcp directory, which is not a Python package
# (directory name contains hyphens), so we add it to sys.path explicitly.
_ADO_MCP_DIR = Path(__file__).resolve().parent.parent
if str(_ADO_MCP_DIR) not in sys.path:
    sys.path.insert(0, str(_ADO_MCP_DIR))

from ado_client import ADOClient, ADOClientError  # noqa: E402

mcp = FastMCP("ado-get-work-items")


@mcp.tool()
def ado_get_work_items(
    state: str | None = None,
    item_type: str | None = None,
    tag: str | None = None,
) -> dict[str, Any]:
    """Fetch ADO work items using WIQL with optional filters.

    All parameters are optional. Omitting a parameter leaves that axis
    unconstrained. Multiple parameters are combined with AND.

    Args:
        state: Filter by work item state (e.g. "New", "Active", "Needs Info").
        item_type: Filter by work item type (e.g. "User Story", "Feature", "Task").
        tag: Filter by tag value using a CONTAINS match (e.g. "ai-pipeline").

    Returns:
        On success: {"success": True, "work_items": [<work item dicts>]}
        On failure: {"success": False, "error": "<error message>"}
    """
    try:
        client = ADOClient()
        items = client.get_work_items(state=state, item_type=item_type, tag=tag)
        return {"success": True, "work_items": items}
    except ADOClientError as exc:
        return {"success": False, "error": str(exc)}
