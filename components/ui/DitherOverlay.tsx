import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { V } from '../../constants/vinlandTheme';

/**
 * Lightweight pixel/dither texture overlay.
 * Uses SVG patterns so it works on iOS/Android/web without image assets.
 */
export function DitherOverlay({
  style,
  opacity = 0.22,
  scale = 2,
}: {
  style?: StyleProp<ViewStyle>;
  opacity?: number;
  scale?: number;
}) {
  const size = Math.max(1, Math.round(scale));
  const patternId = useMemo(
    () => `dither-${size}-${String(V.pixelDitherA)}-${String(V.pixelDitherB)}`,
    [size],
  );

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" style={{ opacity }}>
        <Defs>
          {/* Simple 2x2 checker dither pattern */}
          <Pattern id={patternId} x="0" y="0" width={size * 2} height={size * 2} patternUnits="userSpaceOnUse">
            <Rect x="0" y="0" width={size} height={size} fill={V.pixelDitherA} />
            <Rect x={size} y={size} width={size} height={size} fill={V.pixelDitherA} />
            <Rect x={size} y="0" width={size} height={size} fill={V.pixelDitherB} />
            <Rect x="0" y={size} width={size} height={size} fill={V.pixelDitherB} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}

