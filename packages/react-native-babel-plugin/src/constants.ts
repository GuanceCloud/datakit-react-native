/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

export const RUNTIME_PACKAGE = '@cloudcare/react-native-mobile';

export const ACTION_NAME_ATTRIBUTE = 'ft-action-name';

export const PLUGIN_ENABLED_FLAG = '__FT_RN_BABEL_PLUGIN_ENABLED__';

export const NATIVE_COMPONENT_HANDLERS: Record<string, string[]> = {
  Button: ['onPress'],
  Pressable: ['onPress', 'onLongPress'],
  TouchableOpacity: ['onPress'],
  TouchableHighlight: ['onPress'],
  TouchableWithoutFeedback: ['onPress'],
  TouchableNativeFeedback: ['onPress'],
  Switch: ['onValueChange'],
  TextInput: ['onFocus'],
};
