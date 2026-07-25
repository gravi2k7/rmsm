import type { IntentResult } from "../domain/entities/intent-result.entity";

/** No ML/provider dependency in any implementation shipped by this
 * package — `RuleBasedIntentClassifier` is the real, deterministic
 * baseline; a real ML-backed classifier is a future adapter of this
 * interface. */
export interface IntentClassifier {
  classify(text: string): Promise<IntentResult>;
}
