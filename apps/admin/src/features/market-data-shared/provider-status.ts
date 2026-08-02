import type { ProviderDiagnostics } from "./types";

/** One shared definition of "online," reused everywhere a provider's
 * live status is shown (Dashboard, Providers, Provider Health,
 * Monitoring) rather than four slightly different ad-hoc checks. A
 * provider counts as online only when it's registered in the running
 * process, its adapter is enabled, AND its circuit breaker is closed —
 * `isActive` alone (config-level) is not enough, since a config can be
 * active while the live provider is unregistered or tripped. */
export function isProviderOnline(diagnostics: ProviderDiagnostics): boolean {
  return diagnostics.registered && diagnostics.enabled && diagnostics.circuitState === "closed";
}

export function providerStatusLabel(diagnostics: ProviderDiagnostics): string {
  if (!diagnostics.registered) return "NOT REGISTERED";
  if (!diagnostics.enabled) return "DISABLED";
  if (diagnostics.circuitState === "open") return "CIRCUIT OPEN";
  if (diagnostics.circuitState === "half_open") return "HALF OPEN";
  return "ONLINE";
}
