import { TransitionPresets } from '@react-navigation/stack';

import { V } from '../constants/vinlandTheme';

/**
 * JS stack: horizontal slide + iOS-style spring. Used for Main → Settings and Workouts list → form
 * so transitions run on web (native-stack web uses instant show/hide).
 */
export const rootStackCardTransition = {
  ...TransitionPresets.SlideFromRightIOS,
  cardStyle: { backgroundColor: V.bg },
  cardOverlayEnabled: true,
};

/** Matches compact back control and standard iOS nav title metrics (17pt semibold). */
export const headerTitleBarStyle = {
  color: V.text,
  fontWeight: '600' as const,
  fontSize: 17,
  lineHeight: 22,
};

export const headerTitleBarContainerStyle = {
  alignItems: 'center' as const,
};
