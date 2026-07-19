import { AggregateRoot, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";
import { SignalStrength } from "../value-objects/signal-strength";
import { SignalGeneratedEvent } from "../events/signal-generated.event";

export type SignalDirection = "BUY" | "SELL";

export interface SignalProps {
  readonly symbolCode: SymbolCode;
  readonly direction: SignalDirection;
  readonly strength: SignalStrength;
  /** The strategy (or other source) that generated this signal — an id
   * reference, not a live dependency on `@rmsm/strategy`. This domain
   * doesn't depend on the Strategy Domain package; it only records which
   * source produced a given signal. */
  readonly sourceId: string;
  readonly generatedAt: Date;
}

/** A directional trade signal — aggregate root because its generation is
 * itself a real domain event (`SignalGeneratedEvent`) other parts of the
 * system (opportunity creation, alerting) react to. */
export class Signal extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly props: SignalProps,
  ) {
    super(id);
  }

  static generate(id: string, props: SignalProps, occurredAt: Date = new Date()): Signal {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.sourceId, "sourceId");
    const signal = new Signal(id, props);
    signal.addDomainEvent(new SignalGeneratedEvent(id, occurredAt));
    return signal;
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get direction(): SignalDirection {
    return this.props.direction;
  }

  get strength(): SignalStrength {
    return this.props.strength;
  }

  get sourceId(): string {
    return this.props.sourceId;
  }

  get generatedAt(): Date {
    return this.props.generatedAt;
  }
}
