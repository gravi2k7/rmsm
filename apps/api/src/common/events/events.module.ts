import { Global, Module } from "@nestjs/common";
import { DomainEventPublisher } from "./domain-event-publisher.service";

/**
 * `@Global()` so every feature module can inject `DomainEventPublisher`
 * without each one separately importing `EventsModule` — appropriate
 * here because this is pure cross-cutting infrastructure (like
 * `LoggingInterceptor`/`GlobalExceptionFilter`), not a domain module with
 * its own business rules. Imported once, in `AppModule`.
 */
@Global()
@Module({
  providers: [DomainEventPublisher],
  exports: [DomainEventPublisher],
})
export class EventsModule {}
