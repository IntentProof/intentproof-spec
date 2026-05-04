/**
 * Type-level SDK contract for Node.js implementations.
 * MUST stay aligned with `schema/execution_event.v1.schema.json` and golden oracles.
 */

export type ExecutionStatus = "ok" | "error";

export interface ExecutionError {
  name: string;
  message: string;
  code?: string;
  stack?: string | null;
  cause?: ExecutionError;
}

export interface ExecutionEventV1 {
  id: string;
  intent: string;
  action: string;
  status: ExecutionStatus;
  inputs: Record<string, unknown>;
  output?: unknown;
  error?: ExecutionError;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  correlationId?: string;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface WrapOptionsV1 {
  intent?: string;
  action?: string;
  captureInputs?: boolean;
  captureOutput?: boolean;
  captureError?: boolean;
  captureStack?: boolean;
  propagateCorrelation?: boolean;
  attributes?: Record<string, string | number | boolean | null>;
  exporterTimeoutMs?: number;
}

export type ExporterKind = "console" | "http" | "otel" | "custom";

export interface ExporterConfigV1 {
  type: ExporterKind;
  endpoint?: string;
  headers?: Record<string, string>;
  failOpen?: boolean;
}

export interface IntentProofConfigV1 {
  version?: 1;
  defaultWrapOptions?: WrapOptionsV1;
  exporters?: ExporterConfigV1[];
  correlation?: {
    headerName?: string;
    generateOnMissing?: boolean;
  };
  serialization?: {
    maxDepth?: number;
    maxStringLength?: number;
    redactKeys?: string[];
  };
}

export interface IntentProofExporter {
  onEvent(event: ExecutionEventV1): void | Promise<void>;
}
