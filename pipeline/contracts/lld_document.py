"""Output contract of the Spec Agent.

Defines the Low Level Design (LLD) document the Spec Agent produces after reading
the StructuredSpec and User Stories. The LLDDocument is the primary implementation
blueprint consumed by both the Frontend Agent and the Backend Agent.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EndpointDefinition(BaseModel):
    model_config = ConfigDict(frozen=True)

    method: str = Field(
        description="HTTP method in uppercase (GET, POST, PUT, PATCH, DELETE)."
    )
    path: str = Field(
        description="Versioned API path including route parameters, e.g. /api/v1/users/{id}."
    )
    request_body: dict[str, Any] = Field(
        default_factory=dict,
        description="Expected request body shape as a JSON-compatible dict. Empty for GET/DELETE.",
    )
    response_body: dict[str, Any] = Field(
        default_factory=dict,
        description="Expected response body shape as a JSON-compatible dict.",
    )


class FrontendChanges(BaseModel):
    model_config = ConfigDict(frozen=True)

    components_to_create: list[str] = Field(
        description="New React component files to create (relative paths from demo-app/frontend/src/)."
    )
    components_to_modify: list[str] = Field(
        description="Existing React component files to modify (relative paths from demo-app/frontend/src/)."
    )
    hooks: list[str] = Field(
        description="Custom React hooks to create or modify (relative paths from demo-app/frontend/src/hooks/)."
    )
    state_changes: list[str] = Field(
        description="State management additions or changes — Context slices, Zustand stores, etc."
    )
    props_interfaces: list[str] = Field(
        description="New or updated TypeScript props interface names."
    )


class BackendChanges(BaseModel):
    model_config = ConfigDict(frozen=True)

    endpoints: list[EndpointDefinition] = Field(
        description="API endpoints to create or modify, with full method/path/body definitions."
    )
    services: list[str] = Field(
        description="Service class files to create or modify (relative paths from demo-app/backend/src/)."
    )
    data_models: list[str] = Field(
        description="Entity or domain model class files to create or modify."
    )
    dto_changes: list[str] = Field(
        description="Data Transfer Object class files to create or modify."
    )


class NewDependencies(BaseModel):
    model_config = ConfigDict(frozen=True)

    frontend: list[str] = Field(
        description="npm package names to add to the frontend (e.g. 'zustand', 'react-query')."
    )
    backend: list[str] = Field(
        description="NuGet package names to add to the backend (e.g. 'Serilog', 'FluentValidation')."
    )


class LLDDocument(BaseModel):
    model_config = ConfigDict(frozen=True)

    work_item_id: str = Field(
        description="ADO work item ID this LLD was produced for."
    )
    frontend_changes: FrontendChanges = Field(
        description="All planned frontend file, component, hook, and state changes."
    )
    backend_changes: BackendChanges = Field(
        description="All planned backend endpoint, service, model, and DTO changes."
    )
    files_to_create: list[str] = Field(
        description="All new files to be created, across both frontend and backend (repo-relative paths)."
    )
    files_to_modify: list[str] = Field(
        description="All existing files to be modified, across both frontend and backend (repo-relative paths)."
    )
    new_dependencies: NewDependencies = Field(
        description="New package dependencies required to implement this feature."
    )


__all__: list[Any] = [
    "EndpointDefinition",
    "FrontendChanges",
    "BackendChanges",
    "NewDependencies",
    "LLDDocument",
]
