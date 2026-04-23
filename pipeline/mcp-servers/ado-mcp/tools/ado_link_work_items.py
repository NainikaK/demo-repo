# MCP tool — creates a parent-child or related link between two ADO work items

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

mcp = FastMCP("ado-link-work-items")


@mcp.tool()
def ado_link_work_items(
    source_id: int,
    target_id: int,
    link_type: str,
) -> dict[str, Any]:
    """Create a relation link from one ADO work item to another.

    The link is added to the source work item's relations collection.
    Use the LINK_* constants from ado_client.py for the link_type argument
    to avoid magic strings:

        LINK_PARENT_TO_CHILD = "System.LinkTypes.Hierarchy-Forward"
        LINK_CHILD_TO_PARENT = "System.LinkTypes.Hierarchy-Reverse"
        LINK_RELATED          = "System.LinkTypes.Related"

    Args:
        source_id: The work item ID the link originates from.
        target_id: The work item ID to link to.
        link_type: The ADO relation type reference name string.
                   Should be one of the LINK_* constants listed above.

    Returns:
        On success: {"success": True, "work_item": <updated source work item dict>}
        On failure: {"success": False, "error": "<error message>"}
    """
    try:
        client = ADOClient()
        updated = client.link_work_items(source_id, target_id, link_type)
        return {"success": True, "work_item": updated}
    except ADOClientError as exc:
        return {"success": False, "error": str(exc)}
