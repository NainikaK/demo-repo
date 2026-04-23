# MCP tool — updates one or more fields (state, description, story points) on an existing ADO work item

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

mcp = FastMCP("ado-update-work-item")


@mcp.tool()
def ado_update_work_item(item_id: int, fields: dict[str, Any]) -> dict[str, Any]:
    """Update one or more fields on an existing ADO work item.

    Fields are applied as a JSON Patch against the work item. Pass only the
    fields you want to change — all other fields are left untouched.

    Args:
        item_id: The numeric ADO work item ID to update.
        fields: Mapping of ADO field reference names to their new values.
                Common fields:
                  "System.State"        — e.g. "Active", "Needs Info", "Done"
                  "System.Title"        — work item title string
                  "System.Description"  — HTML description body
                  "Microsoft.VSTS.Scheduling.StoryPoints" — numeric story points

    Returns:
        On success: {"success": True, "work_item": <updated work item dict>}
        On failure: {"success": False, "error": "<error message>"}
    """
    try:
        client = ADOClient()
        updated = client.update_work_item(item_id, fields)
        return {"success": True, "work_item": updated}
    except ADOClientError as exc:
        return {"success": False, "error": str(exc)}
