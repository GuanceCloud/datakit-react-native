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
4. Static text from `trackingLabel`, `title`, `label`, `text`, a custom content
   prop, or children.
5. JSX component name.

By default a label is prefixed with the component name, for example
`Button ("Submit")`.

```tsx
<Button ft-action-name="checkout" title="Pay now" onPress={submit} />
```

Content names are computed at build time from JSX text and string/number literals
(including `{"Pay now"}` and `{123}`). The plugin does not evaluate variable or
member reads, function calls, conditions, render props, or spread props for naming.
These expressions still run normally in the application's render flow. Static
content props before a spread are ignored because the spread may override them.

At interaction time, the generated content getter returns only precomputed text;
it does not recreate React elements or re-run application expressions. If no static
name or content is available, the action falls back to the JSX component name.
For dynamic UI content, use a static `ft-action-name` or `accessibilityLabel` to
provide a stable name. `useContent: false` disables content-based names entirely.

Upgrade the Babel plugin and rebuild the application to apply these build-time
changes. Previously transformed bundles keep their existing generated code.

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
must be static strings; only static content is used for naming. Web builds and files
under `node_modules` are left unchanged. A handler configured with
`mode: 'delayed'` is treated as a factory whose return value is the actual
interaction handler. Direct arrow functions, function expressions, identifiers,
member expressions, and conditional expressions are supported.

## Development

The plugin is organized by responsibility:

```text
src/
  index.ts                 Plugin declaration and visitor orchestration
  constants.ts             Runtime names, attributes, and supported native events
  options.ts               Configuration defaults
  types.ts                 Public options and internal transform types
  state.ts                 File filtering and per-file state initialization
  actions/
    global.ts              Compatible plugin-enabled flag injection
    rum/
      index.ts             JSX action processing and runtime imports
      components.ts        Component discovery and required TextInput handlers
      content.ts           Build-time static text extraction and literal getters
      metadata.ts          Action-name attributes and runtime target objects
      tap.ts               Immediate, delayed, and conditional handler wrappers
      memoization.ts       useCallback / useMemo handling
  utils/
    jsx.ts                 JSX name resolution and attribute paths
```

The visitor initializes state for each file, delegates tracked JSX elements to
`actions/rum`, and inserts the required runtime imports on program exit. Runtime
action-name selection and reporting live in `@cloudcare/react-native-mobile`.
The package entry continues to export the plugin and its public option types.

## License

Apache 2.0
