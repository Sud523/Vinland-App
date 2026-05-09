/**
 * Navigation chrome shared by native stacks: transition presets and header text styles.
 */
import { Platform } from 'react-native';

import { V } from '../constants/vinlandTheme';

/** iOS: longer, eased push/pop via simple_push (duration is honored). Android: explicit horizontal slide. */
export const smoothStackTransition = Platform.select({
  ios: { animation: 'simple_push' as const, animationDuration: 420 },
  android: { animation: 'slide_from_right' as const },
  default: { animation: 'default' as const },
});

/** Matches compact back control and standard iOS nav title metrics (17pt semibold). */
export const headerTitleBarStyle = {
  color: V.text,
  fontWeight: '400' as const,
  fontFamily: V.fontPixel,
  fontSize: 12,
  lineHeight: 16,
};

export const headerTitleBarContainerStyle = {
  alignItems: 'center' as const,
};
