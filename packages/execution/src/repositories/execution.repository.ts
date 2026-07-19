import type { Order, OrderStatus } from "../entities/order";
import type { Execution } from "../entities/execution";
import type { ExecutionSession } from "../entities/execution-session";

export interface ExecutionRepository {
  findOrderById(id: string): Promise<Order | null>;
  findOrdersByStatus(status: OrderStatus): Promise<Order[]>;
  findOrdersByDecisionId(decisionId: string): Promise<Order[]>;
  saveOrder(order: Order): Promise<void>;

  findExecutionById(id: string): Promise<Execution | null>;
  findExecutionByOrderId(orderId: string): Promise<Execution | null>;
  saveExecution(execution: Execution): Promise<void>;

  findSessionById(id: string): Promise<ExecutionSession | null>;
  saveSession(session: ExecutionSession): Promise<void>;
}
