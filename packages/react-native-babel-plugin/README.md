# CloudCare React Native Babel plugin

This plugin wraps supported React Native interaction handlers at build time so
the CloudCare SDK can write a stable, readable value to RUM `action_name`. Use
the same release version as `@cloudcare/react-native-mobile`.

## Installation

```sh
yarn add -D @cloudcare/react-native-mobile-babel-plugin
```

Add the plugin after the React Native preset:

```js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['@cloudcare/react-native-mobile-babel-plugin'],
};
```

Keep `enableAutoTrackUserAction: true` in `FTRUMConfig`. When the Babel plugin
is present, the SDK uses Babel-based interaction tracking instead of patching
React at runtime. Applications that do not install the plugin keep the legacy
runtime behavior. Both paths call `startAction(name, 'click', property)` and
honor `ft-enable-track` and `ft-extra-property` when the interaction event
provides a React Native Fiber target.

## Action name priority

For a tracked component, the action name is selected in this order:

1. Static `ft-action-name` attribute.
2. Static custom attribute configured through `actionNameAttribute`.
3. Static `accessibilityLabel`.
4. Text from `trackingLabel`, `title`, `label`, `text`, a custom content prop,
   or children.
5. JSX component name.

By default a label is prefixed with the component name, for example
`Button ("Submit")`.

```tsx
<Button ft-action-name="checkout" title="Pay now" onPress={submit} />
```

## Custom components

All configuration is optional. `useContent` and `useNamePrefix` default to
`true`; component-level values override the shared defaults.

```ts
interface PluginOptions {
  actionNameAttribute?: string;
  components?: {
    useContent?: boolean;
    useNamePrefix?: boolean;
    tracked?: Array<{
      name: string;
      useContent?: boolean;
      useNamePrefix?: boolean;
      contentProp?: string;
      handlers: Array<{
        event: string;
        action: 'TAP';
        mode?: 'default' | 'delayed';
      }>;
    }>;
  };
}
```

```js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      '@cloudcare/react-native-mobile-babel-plugin',
      {
        actionNameAttribute: 'analytics-name',
        components: {
          useContent: true,
          useNamePrefix: true,
          tracked: [
            {
              name: 'CustomButton',
              contentProp: 'caption',
              handlers: [{ event: 'onPress', action: 'TAP' }],
            },
          ],
        },
      },
    ],
  ],
};
```

The plugin automatically tracks named imports of `Button`, `Pressable`, the
Touchable components, `Switch`, and `TextInput` from `react-native`. Import
aliases are supported. Namespace imports are not auto-discovered, but their
full JSX names can be configured through `components.tracked`.

Only `TAP` / `click` actions are supported. Explicit action-name attributes
must be static strings; content props may be expressions. Web builds and files
under `node_modules` are left unchanged. A handler configured with
`mode: 'delayed'` is treated as a factory whose return value is the actual
interaction handler.

## License

Apache 2.0
