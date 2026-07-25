import type { MessageBus, AgentMessageHandler } from "../repositories/message-bus.interface";
import type { AgentMessage } from "../domain/entities/agent-message.entity";

export class InMemoryMessageBus implements MessageBus {
  private readonly handlersByAgent = new Map<string, AgentMessageHandler[]>();

  subscribe(agentId: string, handler: AgentMessageHandler): () => void {
    const handlers = this.handlersByAgent.get(agentId) ?? [];
    handlers.push(handler);
    this.handlersByAgent.set(agentId, handlers);
    return () => {
      const current = this.handlersByAgent.get(agentId) ?? [];
      const index = current.indexOf(handler);
      if (index !== -1) current.splice(index, 1);
    };
  }

  async send(message: AgentMessage): Promise<void> {
    const handlers = this.handlersByAgent.get(message.toAgentId) ?? [];
    for (const handler of handlers) {
      await handler(message);
    }
  }
}
