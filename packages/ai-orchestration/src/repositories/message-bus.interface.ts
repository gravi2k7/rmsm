import type { AgentMessage } from "../domain/entities/agent-message.entity";

export type AgentMessageHandler = (message: AgentMessage) => void | Promise<void>;

export interface MessageBus {
  send(message: AgentMessage): Promise<void>;
  subscribe(agentId: string, handler: AgentMessageHandler): () => void;
}
