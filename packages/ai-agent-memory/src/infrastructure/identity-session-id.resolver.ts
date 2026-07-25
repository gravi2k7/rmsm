import type { SessionIdResolver } from "../repositories/session-id-resolver.interface";
import { InvalidAgentSessionError } from "../domain/errors/agent-memory-domain.errors";

/** The real, default `SessionIdResolver` — uses the caller-supplied
 * session id if given, otherwise falls back to the agent id itself
 * (one memory session per agent). The right default for a single-agent
 * run; AI-405's multi-agent orchestration supplies its own resolver
 * when several agents must share one session. */
export class IdentitySessionIdResolver implements SessionIdResolver {
  resolve(agentId: string, requestedSessionId: string | null): string {
    const sessionId = requestedSessionId ?? agentId;
    if (!sessionId.trim()) {
      throw new InvalidAgentSessionError("resolved session id must not be empty");
    }
    return sessionId;
  }
}
