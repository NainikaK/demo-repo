# Azure DevOps REST API client — handles authentication and wraps all ADO API calls used by the MCP tools

import base64
import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

# ADO REST API version used across all endpoints
_API_VERSION = "7.1"

# The comments endpoint requires a preview API version
_API_VERSION_COMMENTS = "7.1-preview"

# API path segments — one constant per endpoint group
_ENDPOINT_PROJECTS = "_apis/projects"
_ENDPOINT_WIQL = "_apis/wit/wiql"
_ENDPOINT_WORK_ITEMS = "_apis/wit/workitems"
_SEGMENT_COMMENTS = "comments"

# Content-type required by ADO for all work item mutation requests
_CONTENT_TYPE_JSON_PATCH = "application/json-patch+json"

# Default timeout in seconds for all HTTP calls
_REQUEST_TIMEOUT = 30

# ADO relation type reference names — use these constants in link_work_items calls
LINK_PARENT_TO_CHILD = "System.LinkTypes.Hierarchy-Forward"
LINK_CHILD_TO_PARENT = "System.LinkTypes.Hierarchy-Reverse"
LINK_RELATED = "System.LinkTypes.Related"


class ADOClientError(Exception):
    """Raised when an Azure DevOps API call fails or credentials are invalid."""


class ADOClient:
    """Thin HTTP client wrapping the Azure DevOps REST API.

    Credentials are loaded from environment variables on instantiation.
    Call test_connection() to verify credentials before starting the pipeline.
    """

    def __init__(self) -> None:
        """Load credentials from environment and initialise the auth header.

        Raises:
            ADOClientError: If ADO_ORG_URL, ADO_PROJECT, or ADO_PAT is missing.
        """
        org_url = os.environ.get("ADO_ORG_URL", "").rstrip("/")
        project = os.environ.get("ADO_PROJECT", "")
        pat = os.environ.get("ADO_PAT", "")

        if not all([org_url, project, pat]):
            raise ADOClientError(
                "ADO_ORG_URL, ADO_PROJECT, and ADO_PAT must all be set in the environment."
            )

        self._org_base = org_url
        self._project = project
        self._project_base = f"{org_url}/{project}"

        # ADO Basic auth: base64-encode ":PAT" — empty username, colon, then the PAT
        token = base64.b64encode(f":{pat}".encode()).decode()
        self._auth_headers: dict[str, str] = {"Authorization": f"Basic {token}"}

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    def test_connection(self) -> bool:
        """Verify credentials by fetching project details from ADO.

        Returns:
            True if credentials are valid and the project is reachable, False otherwise.
        """
        url = self._at_org(_ENDPOINT_PROJECTS, self._project)
        try:
            response = requests.get(
                url,
                headers=self._auth_headers,
                params=self._params(),
                timeout=_REQUEST_TIMEOUT,
            )
            return response.ok
        except requests.RequestException:
            return False

    def get_work_items(
        self,
        state: str | None = None,
        item_type: str | None = None,
        tag: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query work items using WIQL and return them with full field data.

        Runs a WIQL query to find matching IDs, then bulk-fetches full details.
        All filters are combined with AND. Omitting a filter leaves that axis unconstrained.

        Args:
            state: Filter by work item state (e.g. "New", "Active", "Resolved", "Closed").
            item_type: Filter by work item type (e.g. "User Story", "Feature").
            tag: Filter by tag (e.g. "ai-pipeline"). Uses CONTAINS — partial match.

        Returns:
            List of work item dicts with all fields expanded. Empty list if none match.

        Raises:
            ADOClientError: If the WIQL query or the subsequent bulk fetch fails.
        """
        ids = self._run_wiql(state=state, item_type=item_type, tag=tag)
        if not ids:
            return []
        return self._fetch_work_items_by_ids(ids)

    def get_work_item_by_id(self, item_id: int) -> dict[str, Any]:
        """Fetch a single work item with all fields and relations expanded.

        Args:
            item_id: The ADO work item ID.

        Returns:
            Work item dict with all fields populated.

        Raises:
            ADOClientError: If the item cannot be fetched (e.g. not found, auth failure).
        """
        url = self._at_project(_ENDPOINT_WORK_ITEMS, str(item_id))
        response = requests.get(
            url,
            headers=self._auth_headers,
            params=self._params({"$expand": "all"}),
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(response, f"Failed to fetch work item {item_id}")
        return response.json()

    def update_work_item(self, item_id: int, fields: dict[str, Any]) -> dict[str, Any]:
        """Update one or more fields on a work item using JSON Patch.

        Args:
            item_id: The ADO work item ID to update.
            fields: Mapping of ADO field reference names to their new values.
                    Example: {"System.State": "Needs Info", "System.Tags": "ai-pipeline"}

        Returns:
            The updated work item dict.

        Raises:
            ADOClientError: If the update request fails.
        """
        url = self._at_project(_ENDPOINT_WORK_ITEMS, str(item_id))
        response = requests.patch(
            url,
            json=self._fields_to_patch(fields),
            headers=self._patch_headers(),
            params=self._params(),
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(response, f"Failed to update work item {item_id}")
        return response.json()

    def create_work_item(self, item_type: str, fields: dict[str, Any]) -> dict[str, Any]:
        """Create a new work item of the given type under the configured project.

        Args:
            item_type: The ADO work item type to create (e.g. "User Story", "Task").
            fields: Mapping of ADO field reference names to initial values.
                    Example: {
                        "System.Title": "As a user...",
                        "Microsoft.VSTS.Scheduling.StoryPoints": 3,
                        "System.Description": "Acceptance criteria...",
                    }

        Returns:
            The newly created work item dict.

        Raises:
            ADOClientError: If the creation request fails.
        """
        # ADO's create endpoint uses a dollar-prefixed type in the URL path
        url = self._at_project(_ENDPOINT_WORK_ITEMS, f"${item_type}")
        response = requests.post(
            url,
            json=self._fields_to_patch(fields),
            headers=self._patch_headers(),
            params=self._params(),
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(response, f"Failed to create work item of type '{item_type}'")
        return response.json()

    def get_comments(self, item_id: int) -> list[dict[str, Any]]:
        """Return all comments on a work item, ordered oldest-first.

        Args:
            item_id: The ADO work item ID to fetch comments for.

        Returns:
            List of comment dicts. Each dict contains at least ``text`` and
            ``createdDate``. Returns an empty list if the work item has no
            comments.

        Raises:
            ADOClientError: If the request fails.
        """
        url = self._at_project(_ENDPOINT_WORK_ITEMS, str(item_id), _SEGMENT_COMMENTS)
        response = requests.get(
            url,
            headers=self._auth_headers,
            params={"api-version": _API_VERSION_COMMENTS},
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(response, f"Failed to fetch comments for work item {item_id}")
        return response.json().get("comments", [])

    def add_comment(self, item_id: int, comment_text: str) -> dict[str, Any]:
        """Post a comment to a work item.

        Args:
            item_id: The ADO work item ID to comment on.
            comment_text: The comment body (plain text or HTML).

        Returns:
            The created comment dict as returned by ADO.

        Raises:
            ADOClientError: If the comment request fails.
        """
        url = self._at_project(_ENDPOINT_WORK_ITEMS, str(item_id), _SEGMENT_COMMENTS)
        response = requests.post(
            url,
            json={"text": comment_text},
            headers=self._auth_headers,
            params={"api-version": _API_VERSION_COMMENTS},
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(response, f"Failed to add comment to work item {item_id}")
        return response.json()

    def link_work_items(
        self, source_id: int, target_id: int, link_type: str
    ) -> dict[str, Any]:
        """Create a relation link from one work item to another.

        Args:
            source_id: The work item the link originates from.
            target_id: The work item to link to.
            link_type: The ADO relation type reference name.
                       Use the LINK_* module-level constants (e.g. LINK_PARENT_TO_CHILD).

        Returns:
            The updated source work item dict with the new relation included.

        Raises:
            ADOClientError: If the link request fails.
        """
        # ADO relation URLs must be org-scoped API URLs, not web UI URLs
        target_api_url = self._at_org(_ENDPOINT_WORK_ITEMS, str(target_id))
        patch = [
            {
                "op": "add",
                "path": "/relations/-",
                "value": {
                    "rel": link_type,
                    "url": target_api_url,
                    "attributes": {"comment": ""},
                },
            }
        ]
        url = self._at_project(_ENDPOINT_WORK_ITEMS, str(source_id))
        response = requests.patch(
            url,
            json=patch,
            headers=self._patch_headers(),
            params=self._params(),
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(
            response, f"Failed to link work item {source_id} to {target_id}"
        )
        return response.json()

    # -------------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------------

    def _at_project(self, *segments: str) -> str:
        """Build a project-scoped API URL from path segments."""
        return "/".join([self._project_base, *segments])

    def _at_org(self, *segments: str) -> str:
        """Build an org-scoped API URL from path segments."""
        return "/".join([self._org_base, *segments])

    def _params(self, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        """Build a query params dict with the API version pre-filled."""
        params: dict[str, Any] = {"api-version": _API_VERSION}
        if extra:
            params.update(extra)
        return params

    def _patch_headers(self) -> dict[str, str]:
        """Return auth headers merged with the JSON Patch content type."""
        return {**self._auth_headers, "Content-Type": _CONTENT_TYPE_JSON_PATCH}

    def _fields_to_patch(self, fields: dict[str, Any]) -> list[dict[str, Any]]:
        """Convert a field name → value dict to a JSON Patch operations list."""
        return [
            {"op": "add", "path": f"/fields/{key}", "value": val}
            for key, val in fields.items()
        ]

    def _raise_for_error(self, response: requests.Response, context: str) -> None:
        """Raise ADOClientError with full context when a response indicates failure.

        Args:
            response: The requests.Response to inspect.
            context: A human-readable description of the operation that was attempted.

        Raises:
            ADOClientError: Always raised when response.ok is False.
        """
        if response.ok:
            return
        try:
            body = response.json()
            detail = (
                body.get("message")
                or body.get("value", {}).get("Message")
                or response.text
            )
        except ValueError:
            detail = response.text
        raise ADOClientError(f"{context} — HTTP {response.status_code}: {detail}")

    def _run_wiql(
        self,
        state: str | None = None,
        item_type: str | None = None,
        tag: str | None = None,
    ) -> list[int]:
        """Execute a WIQL query and return the matching work item IDs.

        Raises:
            ADOClientError: If the WIQL query request fails.
        """
        conditions = ["[System.TeamProject] = @project"]
        if state:
            conditions.append(f"[System.State] = '{state}'")
        if item_type:
            conditions.append(f"[System.WorkItemType] = '{item_type}'")
        if tag:
            conditions.append(f"[System.Tags] CONTAINS '{tag}'")

        wiql = {
            "query": (
                f"SELECT [System.Id] FROM WorkItems "
                f"WHERE {' AND '.join(conditions)}"
            )
        }
        url = self._at_project(_ENDPOINT_WIQL)
        response = requests.post(
            url,
            json=wiql,
            headers=self._auth_headers,
            params=self._params(),
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(response, "WIQL query failed")
        return [ref["id"] for ref in response.json().get("workItems", [])]

    def _fetch_work_items_by_ids(self, ids: list[int]) -> list[dict[str, Any]]:
        """Bulk-fetch full work item data for a list of IDs.

        Uses the org-scoped endpoint because work item IDs are org-unique.

        Raises:
            ADOClientError: If the bulk fetch request fails.
        """
        ids_param = ",".join(str(i) for i in ids)
        url = self._at_org(_ENDPOINT_WORK_ITEMS)
        response = requests.get(
            url,
            headers=self._auth_headers,
            params=self._params({"ids": ids_param, "$expand": "all"}),
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_error(
            response, f"Bulk fetch failed for work item ids: {ids_param}"
        )
        return response.json().get("value", [])
