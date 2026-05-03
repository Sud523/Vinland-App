/** Opens http(s) links in in-app browser on native with safe fallback to Linking. */
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ReactNode } from 'react';
import {
  Linking,
  Platform,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

type Props = Omit<TextProps, 'onPress'> & {
  href: string;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
};

export function ExternalLink({ href, style, children, ...rest }: Props) {
  const onPress = (event: GestureResponderEvent) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        void Linking.openURL(href);
      }
      return;
    }
    event.preventDefault();
    void openBrowserAsync(href, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  };

  return (
    <Text accessibilityRole="link" {...rest} style={style} onPress={onPress}>
      {children}
    </Text>
  );
}
