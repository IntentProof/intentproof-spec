"""
Type-level SDK contract for Python implementations (typing.Protocol / TypedDict).
MUST stay aligned with `schema/execution_event.v1.schema.json` and golden oracles.
"""

from __future__ import annotations

from typing import Any, Literal, Protocol, TypedDict


ExecutionStatus = Literal["ok", "error"]


class ExecutionError(TypedDict, total=False):
    name: str
    message: str
    code: str
    stack: str | None
    cause: ExecutionError


class ExecutionEventV1(TypedDict, total=False):
    id: str
    intent: str
    action: str
    status: ExecutionStatus
    inputs: dict[str, Any]
    output: Any
    error: ExecutionError
    startedAt: str
    completedAt: str
    durationMs: float
    correlationId: str
    attributes: dict[str, str | int | float | bool | None]


class WrapOptionsV1(TypedDict, total=False):
    intent: str
    action: str
    captureInputs: bool
    captureOutput: bool
    captureError: bool
    captureStack: bool
    propagateCorrelation: bool
    attributes: dict[str, str | int | float | bool | None]
    exporterTimeoutMs: float


ExporterKind = Literal["console", "http", "otel", "custom"]


class ExporterConfigV1(TypedDict, total=False):
    type: ExporterKind
    endpoint: str
    headers: dict[str, str]
    failOpen: bool


class IntentProofConfigV1(TypedDict, total=False):
    version: Literal[1]
    defaultWrapOptions: WrapOptionsV1
    exporters: list[ExporterConfigV1]
    correlation: dict[str, Any]
    serialization: dict[str, Any]


class IntentProofExporter(Protocol):
    def on_event(self, event: ExecutionEventV1) -> None: ...
