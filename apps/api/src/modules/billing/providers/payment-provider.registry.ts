import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { PaymentProviderType } from "@rmsm/database";
import { PaymentProviderAdapter } from "../interfaces/payment-provider.interface";
import { MockProvider } from "./mock.provider";
import { StripeProvider } from "./stripe.provider";
import { RazorpayProvider } from "./razorpay.provider";
import { PayPalProvider } from "./paypal.provider";

/**
 * Registry mapping a provider type to its adapter implementation — the
 * exact same pattern as Module 002's OAuthProviderRegistry. Adding a fifth
 * provider (Paddle/LemonSqueezy, named in the original prompt's "Future"
 * list) means: write a class implementing PaymentProviderAdapter, list it
 * in `providers` below. No service, controller, or DTO change required.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<string, PaymentProviderAdapter>;

  constructor(mock: MockProvider, stripe: StripeProvider, razorpay: RazorpayProvider, paypal: PayPalProvider) {
    this.providers = new Map<string, PaymentProviderAdapter>([
      [mock.provider, mock],
      [stripe.provider, stripe],
      [razorpay.provider, razorpay],
      [paypal.provider, paypal],
    ]);
  }

  get(provider: PaymentProviderType): PaymentProviderAdapter {
    const adapter = this.providers.get(provider);
    if (!adapter) throw new ValidationError(`Unknown payment provider "${provider}".`);
    if (!adapter.enabled) {
      throw new ValidationError(`Payment provider "${provider}" is not configured on this environment.`);
    }
    return adapter;
  }

  listEnabled(): PaymentProviderType[] {
    return [...this.providers.values()].filter((p) => p.enabled).map((p) => p.provider);
  }
}
