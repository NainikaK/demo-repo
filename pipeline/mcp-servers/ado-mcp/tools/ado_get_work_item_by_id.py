# MCP tool — fetches a single ADO work item by its numeric ID

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

mcp = FastMCP("ado-get-work-item-by-id")


@mcp.tool()
def ado_get_work_item_by_id(item_id: int) -> dict[str, Any]:
    """Fetch a single ADO work item with all fields and relations expanded.

    Args:
        item_id: The numeric ADO work item ID.

    Returns:
        On success: {"success": True, "work_item": <work item dict>}
        On failure: {"success": False, "error": "<error message>"}
    """
    try:
        client = ADOClient()
        item = client.get_work_item_by_id(item_id)
        return {"success": True, "work_item": item}
    except ADOClientError as exc:
        return {"success": False, "error": str(exc)}
