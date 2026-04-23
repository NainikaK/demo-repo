"""ADO MCP Server.

Registers all six Azure DevOps tools on a single FastMCP server instance and
serves them to Claude via the stdio transport. Claude (the Orchestrator Agent)
launches this file as a subprocess; the process communicates over stdin/stdout
using the MCP protocol.

Usage (direct):
    python server.py

Usage (as MCP server in Claude config):
    {"command": "python", "args": ["/path/to/server.py"]}

All stdout is reserved for the MCP protocol. Startup and diagnostic messages
are written to stderr so they do not corrupt the wire format.
"""

import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

# The ado-mcp directory contains a hyphen, making it an invalid Python package
# identifier. Adding it to sys.path explicitly ensures `from tools.<module>`
# imports resolve correctly regardless of the working directory at launch time.
_ADO_MCP_DIR = Path(__file__).resolve().parent
if str(_ADO_MCP_DIR) not in sys.path:
    sys.path.insert(0, str(_ADO_MCP_DIR))

from tools.ado_add_comment import ado_add_comment  # noqa: E402
from tools.ado_create_work_item import ado_create_work_item  # noqa: E402
from tools.ado_get_work_item_by_id import ado_get_work_item_by_id  # noqa: E402
from tools.ado_get_work_items import ado_get_work_items  # noqa: E402
from tools.ado_link_work_items import ado_link_work_items  # noqa: E402
from tools.ado_update_work_item import ado_update_work_item  # noqa: E402

_SERVER_NAME = "ado-mcp"

# Single source of truth for tool registration — order is preserved in startup output.
_TOOL_FUNCTIONS: tuple[Callable[..., Any], ...] = (
    ado_get_work_items,
    ado_get_work_item_by_id,
    ado_update_work_item,
    ado_create_work_item,
    ado_add_comment,
    ado_link_work_items,
)

mcp = FastMCP(_SERVER_NAME)

for _fn in _TOOL_FUNCTIONS:
    mcp.add_tool(_fn)


def get_registered_tools() -> list[str]:
    """Return the names of all tools registered on this server.

    Derives names directly from the registration tuple so the result is always
    in sync with what was actually passed to mcp.add_tool().

    Returns:
        Tool function names in registration order.
    """
    return [fn.__name__ for fn in _TOOL_FUNCTIONS]


def _log_startup() -> None:
    """Print a startup confirmation to stderr listing every registered tool.

    Writes to stderr because stdout is reserved for the MCP stdio protocol.
    """
    tool_names = get_registered_tools()
    print(
        f"[{_SERVER_NAME}] server starting — {len(tool_names)} tools registered:",
        file=sys.stderr,
    )
    for name in tool_names:
        print(f"  • {name}", file=sys.stderr)


if __name__ == "__main__":
    _log_startup()
    mcp.run(transport="stdio")
