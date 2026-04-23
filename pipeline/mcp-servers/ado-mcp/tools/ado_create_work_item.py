# MCP tool — creates a new ADO work item of a given type (User Story, Bug, Task) under a parent item

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

mcp = FastMCP("ado-create-work-item")


@mcp.tool()
def ado_create_work_item(item_type: str, fields: dict[str, Any]) -> dict[str, Any]:
    """Create a new ADO work item of the specified type under the configured project.

    Args:
        item_type: The ADO work item type to create.
                   Common values: "User Story", "Task", "Bug", "Feature", "Epic".
        fields: Mapping of ADO field reference names to initial values.
                Required at minimum:
                  "System.Title" — the work item title string
                Optional but common:
                  "System.Description"  — HTML description / acceptance criteria
                  "System.Tags"         — semicolon-separated tag string
                  "Microsoft.VSTS.Scheduling.StoryPoints" — Fibonacci story points (1/2/3/5/8)
                  "System.AreaPath"     — team area path
                  "System.IterationPath" — sprint / iteration path

    Returns:
        On success: {"success": True, "work_item": <newly created work item dict>}
        On failure: {"success": False, "error": "<error message>"}
    """
    try:
        client = ADOClient()
        created = client.create_work_item(item_type, fields)
        return {"success": True, "work_item": created}
    except ADOClientError as exc:
        return {"success": False, "error": str(exc)}
