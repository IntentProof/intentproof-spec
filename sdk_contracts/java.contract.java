package dev.intentproof.contracts;

import java.util.Map;

/**
 * SDK contract for Java implementations. Method names follow Java conventions; field
 * names mirror JSON payloads using Jackson-style mapping (camelCase).
 *
 * <p>MUST stay aligned with {@code schema/execution_event.v1.schema.json} and golden
 * oracles.
 */
public final class IntentProofContractsV1 {
  private IntentProofContractsV1() {}

  public enum ExecutionStatus {
    ok,
    error
  }

  public record ExecutionError(
      String name, String message, String code, String stack, ExecutionError cause) {
    public static ExecutionError of(String name, String message) {
      return new ExecutionError(name, message, null, null, null);
    }
  }

  public record ExecutionEventV1(
      String id,
      String intent,
      String action,
      ExecutionStatus status,
      Map<String, Object> inputs,
      Object output,
      ExecutionError error,
      String startedAt,
      String completedAt,
      double durationMs,
      String correlationId,
      Map<String, Object> attributes) {}

  public record WrapOptionsV1(
      String intent,
      String action,
      Boolean captureInputs,
      Boolean captureOutput,
      Boolean captureError,
      Boolean captureStack,
      Boolean propagateCorrelation,
      Map<String, Object> attributes,
      Double exporterTimeoutMs) {}

  public enum ExporterKind {
    console,
    http,
    otel,
    custom
  }

  public record ExporterConfigV1(
      ExporterKind type, String endpoint, Map<String, String> headers, Boolean failOpen) {}

  @FunctionalInterface
  public interface IntentProofExporter {
    void onEvent(ExecutionEventV1 event) throws Exception;
  }
}
