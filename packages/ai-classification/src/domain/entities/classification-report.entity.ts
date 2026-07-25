import type { IntentResult } from "./intent-result.entity";
import type { TopicResult } from "./topic-result.entity";
import type { SentimentResult } from "./sentiment-result.entity";
import type { ModerationResult } from "./moderation-result.entity";
import type { RuleMatch } from "./classification-rule.entity";

/** The combined output of `ClassificationPipeline.classify()` — every
 * classifier's result for one input, in one shape, plus whichever rule
 * (if any) short-circuited intent detection. */
export interface ClassificationReport {
  readonly text: string;
  readonly ruleMatch: RuleMatch | null;
  readonly intent: IntentResult;
  readonly topics: TopicResult;
  readonly sentiment: SentimentResult;
  readonly moderation: ModerationResult;
}
