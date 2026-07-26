import type { LucideIcon } from "lucide-react";
import { IconWrapper, type IconVariant } from "@/components/public/icons";

interface FeatureIconProps {
  icon: LucideIcon;
  variant?: IconVariant;
}

/** Thin, feature-scoped default over the shared `IconWrapper` — every
 * feature component below renders its icon through this so their icon
 * treatment stays consistent without each repeating the same props. */
export function FeatureIcon({ icon, variant = "muted" }: FeatureIconProps) {
  return <IconWrapper icon={icon} variant={variant} size="lg" />;
}
