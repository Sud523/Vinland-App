/**
 * Metro resolves project imports of `react-native` to this file (see metro.config.js).
 * Real `react-native` is loaded only from here so we avoid recursion.
 *
 * React 19 removed defaultProps for function components; RN 0.81 `Text` is a function
 * component, so `Text.defaultProps` no longer applies. We prepend the pixel font to
 * every Text/TextInput from app code.
 */
'use strict';

const React = require('react');
const RN = require('react-native');

const PIXEL_FONT = 'PressStart2P_400Regular';
const pixelStyle = { fontFamily: PIXEL_FONT, fontWeight: '400' };

function mergeStyle(style) {
  if (style == null || style === false) {
    return pixelStyle;
  }
  if (Array.isArray(style)) {
    return [pixelStyle, ...style];
  }
  return [pixelStyle, style];
}

const Text = React.forwardRef(function VinlandText(props, ref) {
  return React.createElement(RN.Text, {
    ...props,
    ref,
    style: mergeStyle(props.style),
  });
});
Text.displayName = 'Text';

const TextInput = React.forwardRef(function VinlandTextInput(props, ref) {
  return React.createElement(RN.TextInput, {
    ...props,
    ref,
    style: mergeStyle(props.style),
  });
});
TextInput.displayName = 'TextInput';

module.exports = {
  ...RN,
  Text,
  TextInput,
};
