import React from 'react';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';

import { colors } from '../theme/colors';

export type RmsmIconName =
  | 'user'
  | 'briefcase'
  | 'chart'
  | 'sliders'
  | 'bell'
  | 'moon'
  | 'shield'
  | 'help'
  | 'info'
  | 'wallet'
  | 'logout';

type RmsmIconProps = {
  name: RmsmIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function RmsmIcon({
  name,
  size = 20,
  color = colors.accent,
  strokeWidth = 1.8,
}: RmsmIconProps) {
  const common = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityRole="image"
    >
      {name === 'user' ? (
        <>
          <Circle {...common} cx="12" cy="8" r="3.5" />
          <Path {...common} d="M5 20c.8-3.4 3.1-5.2 7-5.2s6.2 1.8 7 5.2" />
        </>
      ) : null}

      {name === 'briefcase' ? (
        <>
          <Rect {...common} x="4" y="7" width="16" height="12" rx="2" />
          <Path
            {...common}
            d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"
          />
          <Line {...common} x1="4" y1="11" x2="20" y2="11" />
          <Line {...common} x1="10" y1="14" x2="14" y2="14" />
        </>
      ) : null}

      {name === 'chart' ? (
        <>
          <Line {...common} x1="5" y1="19" x2="5" y2="5" />
          <Line {...common} x1="5" y1="19" x2="20" y2="19" />
          <Polyline {...common} points="7,15 11,11 14,13 19,7" />
        </>
      ) : null}

      {name === 'sliders' ? (
        <>
          <Line {...common} x1="5" y1="6" x2="19" y2="6" />
          <Circle {...common} cx="9" cy="6" r="1.8" />
          <Line {...common} x1="5" y1="12" x2="19" y2="12" />
          <Circle {...common} cx="15" cy="12" r="1.8" />
          <Line {...common} x1="5" y1="18" x2="19" y2="18" />
          <Circle {...common} cx="11" cy="18" r="1.8" />
        </>
      ) : null}

      {name === 'bell' ? (
        <>
          <Path
            {...common}
            d="M6.5 16.5h11l-1.4-2.1V10a4.1 4.1 0 0 0-8.2 0v4.4z"
          />
          <Path {...common} d="M10 19a2.2 2.2 0 0 0 4 0" />
        </>
      ) : null}

      {name === 'moon' ? (
        <Path
          {...common}
          d="M19 15.5A7.5 7.5 0 0 1 8.5 5 7.5 7.5 0 1 0 19 15.5z"
        />
      ) : null}

      {name === 'shield' ? (
        <>
          <Path
            {...common}
            d="M12 3.5 19 6v5.2c0 4.4-2.6 7.7-7 9.3-4.4-1.6-7-4.9-7-9.3V6z"
          />
          <Polyline {...common} points="8.5,12 11,14.5 15.8,9.8" />
        </>
      ) : null}

      {name === 'help' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="8.5" />
          <Path
            {...common}
            d="M9.7 9.2a2.5 2.5 0 1 1 4.1 2c-.9.7-1.8 1.1-1.8 2.3"
          />
          <Circle fill={color} cx="12" cy="16.8" r="0.9" />
        </>
      ) : null}

      {name === 'info' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="8.5" />
          <Line {...common} x1="12" y1="10.5" x2="12" y2="16.5" />
          <Circle fill={color} cx="12" cy="7.4" r="0.9" />
        </>
      ) : null}

      {name === 'wallet' ? (
        <>
          <Path
            {...common}
            d="M5 6.5h11.5A2.5 2.5 0 0 1 19 9v8.5A2.5 2.5 0 0 1 16.5 20h-11A2.5 2.5 0 0 1 3 17.5v-9A2 2 0 0 1 5 6.5z"
          />
          <Path
            {...common}
            d="M3.5 9.5H17a2 2 0 0 1 2 2v2.5h-5a2 2 0 0 1 0-4h5"
          />
          <Circle fill={color} cx="14" cy="12" r="0.8" />
        </>
      ) : null}

      {name === 'logout' ? (
        <>
          <Path
            {...common}
            d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"
          />
          <Polyline {...common} points="14,8 18,12 14,16" />
          <Line {...common} x1="9" y1="12" x2="18" y2="12" />
        </>
      ) : null}
    </Svg>
  );
}
