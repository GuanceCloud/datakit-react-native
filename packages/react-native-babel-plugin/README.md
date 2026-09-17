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
runtime behavior. Both paths call `startAction`; Babel-based handlers use their
configured `actionType` or `click` by default. Both honor `ft-enable-track` and
`ft-extra-property` when the interaction event provides a React Native Fiber
target.

## Action name priority

For a tracked component, the action name is selected in this order:

1. Static `ft-action-name` attribute.
2. Static custom attribute configured through `actionNameAttribute`.
3. Static `accessibilityLabel`.
4. Content from `trackingLabel`, `title`, `label`, `text`, a custom content
   prop, or children.
5. JSX component name.

By default a label is prefixed with the component name, for example
`Button ("Submit")`.

```tsx
<Button ft-action-name="checkout" title="Pay now" onPress={submit} />
```

Content extraction follows Datadog's click-time naming behavior. The generated
`getContent` closure reads variables and member expressions, evaluates content
props and children, and extracts text from the resulting React elements. This
supports dynamic titles, fragments, conditional children, arrays, and zero-argument
render functions. For example, each invocation of this helper uses its own title:

```tsx
const renderButton = (title, onPress) => (
  <Pressable onPress={onPress}>
    <Text>{title}</Text>
  </Pressable>
);

renderButton('Bind User', bindUser); // Pressable ("Bind User")
```

The getter reconstructs content elements with `React.createElement`, preserving
React 16.13.1 compatibility. It reads click-time values, not a snapshot of the last
render. Content expressions, including calls and property getters, can therefore
run again on each tracked interaction. Keep them free of side effects, or provide
a static `ft-action-name` / `accessibilityLabel` to bypass content extraction.
`useContent: false` also disables it. Business handlers still run once per call,
including when content extraction or reporting throws; a content-extraction error
skips that Action.

Render functions with parameters, such as
`{({ pressed }) => <Text>{title}</Text>}`, are not invoked for naming. Without
another label, they fall back to the component name (`Pressable`). A zero-argument
render function can supply text. Spread props are not replayed for naming, and
props before a spread are ignored because the spread may override them. If no
non-empty name or content is available, the JSX component name is used.

Memoized handlers keep their `useCallback` / `useMemo` identity. If dynamic
content depends on a narrower scope than the handler definition, such as an
`item` declared inside `items.map`, the plugin omits that unsafe content getter
and falls back to the component name. Add a static `ft-action-name` or
`accessibilityLabel` when that pattern needs a descriptive action name.

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
        actionType?: string;
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
              handlers: [{ event: 'onPress', actionType: 'submit' }],
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

`actionType` is written to RUM `action_type` through `startAction`; it defaults
to `click` when omitted, empty, or whitespace-only. Keep custom values stable and
low-cardinality. Explicit action-name attributes must be static strings; content
props and children may be expressions. Web builds and files under `node_modules`
are left unchanged. A handler configured with `mode: 'delayed'` is treated as a
factory whose return value is the actual interaction handler. Direct arrow
functions, function expressions, identifiers, member expressions, and conditional
expressions are supported.

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
      content.ts           JSX conversion and click-time content getters
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
