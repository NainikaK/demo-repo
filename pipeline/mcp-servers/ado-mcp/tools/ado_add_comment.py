# MCP tool — posts a comment to an ADO work item (used for clarification questions, status updates, and failure reports)

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

mcp = FastMCP("ado-add-comment")


@mcp.tool()
def ado_add_comment(item_id: int, comment_text: str) -> dict[str, Any]:
    """Post a comment to an ADO work item.

    Used by the pipeline to communicate back to stakeholders — for example,
    posting clarification questions, timeout notices, audit failure summaries,
    or rollback notifications directly on the work item.

    Args:
        item_id: The numeric ADO work item ID to comment on.
        comment_text: The comment body. Accepts plain text or HTML.

    Returns:
        On success: {"success": True, "comment": <created comment dict>}
        On failure: {"success": False, "error": "<error message>"}
    """
    try:
        client = ADOClient()
        comment = client.add_comment(item_id, comment_text)
        return {"success": True, "comment": comment}
    except ADOClientError as exc:
        return {"success": False, "error": str(exc)}
