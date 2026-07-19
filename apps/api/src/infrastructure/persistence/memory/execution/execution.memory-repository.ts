import { Injectable } from "@nestjs/common";
import type { ExecutionRepository, Order, OrderStatus, Execution, ExecutionSession } from "@rmsm/execution";

@Injectable()
export class InMemoryExecutionRepository implements ExecutionRepository {
  private readonly orders = new Map<string, Order>();
  private readonly executions = new Map<string, Execution>();
  private readonly executionsByOrderId = new Map<string, string>();
  private readonly sessions = new Map<string, ExecutionSession>();

  async findOrderById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.status === status);
  }

  async findOrdersByDecisionId(decisionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.decisionId === decisionId);
  }

  async saveOrder(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findExecutionById(id: string): Promise<Execution | null> {
    return this.executions.get(id) ?? null;
  }

  async findExecutionByOrderId(orderId: string): Promise<Execution | null> {
    const executionId = this.executionsByOrderId.get(orderId);
    return executionId ? (this.executions.get(executionId) ?? null) : null;
  }

  async saveExecution(execution: Execution): Promise<void> {
    this.executions.set(execution.id, execution);
    this.executionsByOrderId.set(execution.orderId, execution.id);
  }

  async findSessionById(id: string): Promise<ExecutionSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async saveSession(session: ExecutionSession): Promise<void> {
    this.sessions.set(session.id, session);
  }
}
