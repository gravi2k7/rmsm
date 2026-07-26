export const SignalQualityVerdict = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type SignalQualityVerdict = (typeof SignalQualityVerdict)[keyof typeof SignalQualityVerdict];
export const SIGNAL_QUALITY_VERDICTS = Object.values(SignalQualityVerdict);
