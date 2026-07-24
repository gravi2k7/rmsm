/**
 * OpenTelemetry bootstrap — must be imported first, before any other
 * module, since auto-instrumentation patches Node's module loader and
 * only affects modules required *after* it registers. This is a
 * well-known OTel constraint, not a stylistic choice: importing this
 * after `@nestjs/core` or `express` would silently skip instrumenting
 * them.
 *
 * No-op unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set — this sandbox has no
 * running OTel collector to export to, and forcing the SDK to start
 * without a real endpoint would either hang retrying or spam startup
 * logs with connection errors. Wiring the seam and leaving the actual
 * collector/backend (Jaeger, Tempo, Honeycomb, Datadog, etc.) as an
 * operator decision matches this project's established pattern for every
 * other "real infrastructure, deployment-specific config" case (BullMQ's
 * Redis connection, every payment/notification provider's credentials).
 *
 * HONEST LIMITATION: this has not been run against a live collector in
 * this sandbox — there is none to run against. The auto-instrumentation
 * module-load-order correctness (the one thing most likely to silently
 * break) can only be fully verified by actually starting the app with
 * `OTEL_EXPORTER_OTLP_ENDPOINT` set and confirming spans arrive at a real
 * collector. Flagged here rather than presented as verified.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (otlpEndpoint) {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "rmsm-api",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
    }),
    traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Filesystem instrumentation is extremely noisy (every fs.stat
        // call becomes a span) and rarely useful for an API service —
        // disabled explicitly rather than left to default to "on".
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk.shutdown().catch(() => undefined);
  });
} else {
  // eslint-disable-next-line no-console -- startup diagnostic, before winston's logger exists
  console.log("OpenTelemetry: OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing disabled.");
}
