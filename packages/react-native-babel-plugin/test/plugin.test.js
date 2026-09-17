'use strict';

const { transformSync } = require('@babel/core');
const transformModulesCommonJs = require('@babel/plugin-transform-modules-commonjs');
const transformReactJsx = require('@babel/plugin-transform-react-jsx');
const plugin = require('../src').default;
const {
  __ftExtractText,
} = require('../../react-native-mobile/src/rum/FTBabelUtils');

function transform(
  code,
  options = {},
  caller = { name: 'metro', platform: 'ios' },
  filename = '/app/App.tsx'
) {
  return transformSync(code, {
    babelrc: false,
    caller,
    configFile: false,
    filename,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [
      [plugin, options],
      [transformReactJsx, { runtime: 'automatic' }],
    ],
  }).code;
}

function execute(code, options = {}) {
  const transformed = transform(code, options);
  const commonJs = transformSync(transformed, {
    babelrc: false,
    configFile: false,
    plugins: [transformModulesCommonJs],
  }).code;
  const trackingCalls = [];
  const module = { exports: {} };
  const react = {
    ...require('react'),
    useMemo: (factory) => factory(),
  };
  const runtime = {
    FTBabelInteractionTracking: {
      getInstance: () => ({
        wrapRumAction: (handler, action, target) => {
          trackingCalls.push({
            action,
            target,
            content: target.getContent?.(),
          });
          return (...args) => handler(...args);
        },
      }),
    },
    __ftExtractText,
  };
  const requireMock = (request) => {
    if (request === '@cloudcare/react-native-mobile') {
      return runtime;
    }
    if (request === 'react') {
      return react;
    }
    if (request === 'react/jsx-runtime') {
      return require('react/jsx-runtime');
    }
    if (request === 'react-native') {
      return { Button: 'Button', Pressable: 'Pressable', Text: 'Text' };
    }
    throw new Error(`Unexpected module: ${request}`);
  };

  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', commonJs)(
    requireMock,
    module,
    module.exports
  );
  delete globalThis.__FT_RN_BABEL_PLUGIN_ENABLED__;
  return { exports: module.exports, trackingCalls };
}

describe('CloudCare React Native Babel plugin', () => {
  it('marks native bundles and skips web bundles', () => {
    expect(transform('const value = 1;')).toContain(
      'globalThis.__FT_RN_BABEL_PLUGIN_ENABLED__ = true'
    );
    expect(
      transform('const value = 1;', {}, { name: 'metro', platform: 'web' })
    ).not.toContain('__FT_RN_BABEL_PLUGIN_ENABLED__');
  });

  it('writes the plugin flag through the React Native global fallback', () => {
    const output = transform('const value = 1;');
    const runtimeGlobal = {};

    // eslint-disable-next-line no-new-func
    new Function('globalThis', 'global', output)(undefined, runtimeGlobal);

    expect(runtimeGlobal.__FT_RN_BABEL_PLUGIN_ENABLED__).toBe(true);
  });

  it('skips files under node_modules', () => {
    const output = transform(
      "import { Button } from 'react-native'; <Button onPress={handler} />;",
      {},
      { name: 'metro', platform: 'ios' },
      '/app/node_modules/dependency/index.tsx'
    );
    expect(output).not.toContain('FTBabelInteractionTracking');
    expect(output).not.toContain('__FT_RN_BABEL_PLUGIN_ENABLED__');
  });

  it('wraps supported handlers from aliased named imports', () => {
    const output = transform(`
      import { Pressable as AppPressable } from 'react-native';
      <AppPressable onPress={handler}>Submit</AppPressable>;
    `);

    expect(output).toContain('from "@cloudcare/react-native-mobile"');
    expect(output).toContain('wrapRumAction');
    expect(output).toContain('componentName: "AppPressable"');
    expect(output).toMatch(/handlerArgs: _ftHandlerArgs\d*/);
  });

  it('does not wrap unsupported events', () => {
    const output = transform(`
      import { Button } from 'react-native';
      <Button onClick={handler} />;
    `);

    expect(output).not.toContain('wrapRumAction');
    expect(output).not.toContain('@cloudcare/react-native-mobile"');
  });

  it('leaves handlers supplied through spread props unchanged', () => {
    const output = transform(`
      import { Pressable } from 'react-native';
      const props = { onPress: handler };
      <Pressable {...props} />;
    `);

    expect(output).not.toContain('wrapRumAction');
    expect(output).not.toContain('@cloudcare/react-native-mobile"');
  });

  it('collects action name candidates in priority fields', () => {
    const output = transform(
      `
        import { Button } from 'react-native';
        <Button
          ft-action-name="checkout"
          analytics-name="pay"
          accessibilityLabel="Checkout button"
          title="Pay now"
          onPress={handler}
        />;
      `,
      { actionNameAttribute: 'analytics-name' }
    );

    expect(output).toContain('"ft-action-name": ["checkout"]');
    expect(output).toContain('customActionName: ["pay"]');
    expect(output).toContain('accessibilityLabel: ["Checkout button"]');
    expect(output).toContain('"Pay now"');
  });

  it('converts content JSX into runtime calls including conditions and hyphenated props', () => {
    const output = transform(
      `
        <Menu.Item onSelect={handler}>
          <Text>Open</Text>
          {visible && <Text aria-hidden="true">Open</Text>}
          {selected ? <Text>Selected</Text> : <Text>Choose</Text>}
        </Menu.Item>;
      `,
      {
        components: {
          tracked: [
            {
              name: 'Menu.Item',
              handlers: [{ event: 'onSelect' }],
            },
          ],
        },
      }
    );

    expect(output).toContain('getContent: () =>');
    expect(output).toContain('_FTReact.createElement');
    expect(output).toContain('__ftExtractText');
    expect(output).toContain('"aria-hidden": "true"');
    expect(output).not.toMatch(/<Text|<Menu/);
  });

  it('evaluates content expressions at click time while leaving spread props untouched', () => {
    const { exports, trackingCalls } = execute(`
      import { Pressable, Text } from 'react-native';
      export const calls = { title: 0, label: 0, style: 0, spread: 0, getter: 0, condition: 0, render: 0, handler: 0 };
      const getTitle = () => { calls.title++; return 'Dynamic title'; };
      const getLabel = () => { calls.label++; return 'Dynamic label'; };
      const getStyle = () => { calls.style++; return {}; };
      const getProps = () => { calls.spread++; return { get title() { calls.getter++; return 'Spread title'; } }; };
      const visible = () => { calls.condition++; return true; };
      const render = () => { calls.render++; return 'Render prop'; };
      export const element = (
        <Pressable title={getTitle()} onPress={() => ++calls.handler}>
          <Text style={getStyle()} {...getProps()}>{getLabel()}</Text>
          {visible() && <Text>Conditional</Text>}
          {visible() ? <Text>First</Text> : <Text>Second</Text>}
          {render}
          <Text>Static</Text>
        </Pressable>
      );
    `);
    const atRender = { ...exports.calls };

    expect(atRender).toEqual({
      title: 1,
      label: 1,
      style: 1,
      spread: 1,
      getter: 1,
      condition: 2,
      render: 0,
      handler: 0,
    });
    expect(exports.element.props.onPress()).toBe(1);
    expect(exports.calls).toEqual({
      ...atRender,
      title: 2,
      label: 2,
      condition: 4,
      handler: 1,
    });
    expect(trackingCalls[0].content).toEqual(['Dynamic title']);
  });

  it('omits content getters when explicit static names take priority', () => {
    for (const props of ['ft-action-name="Pay"', 'accessibilityLabel="Pay"']) {
      const output = transform(`
        import { Button } from 'react-native';
        <Button ${props} onPress={handler}>{getLabel()}</Button>;
      `);
      expect(output).toContain('wrapRumAction');
      expect(output).not.toContain('getContent:');
      expect(output).not.toContain('__ftExtractText');
      expect(output).not.toContain('_FTReact');
    }
  });

  it.each([
    ['title="  Pay now  "', '<Text>Ignored</Text>', ['Pay now']],
    [
      '',
      '<Text>Home</Text><Text>Settings</Text><Text>Home</Text>',
      ['Home', 'Settings'],
    ],
    [
      '',
      '<><Text label="Label">Ignored</Text><Text>{123}</Text></>',
      ['Label 123'],
    ],
    ['', '<Text>{" Literal "}</Text>', ['Literal']],
    ['', '<Text children="Prop child" />', ['Prop child']],
    ['title=" "', '<Text>Fallback</Text>', ['Fallback']],
    ['ft-action-name=" "', '<Text>Fallback</Text>', ['Fallback']],
  ])(
    'preserves static content extraction for %s / %s',
    (props, children, expected) => {
      const { exports, trackingCalls } = execute(`
      import { Pressable, Text } from 'react-native';
      export const element = <Pressable ${props} onPress={() => 'handled'}>${children}</Pressable>;
    `);
      expect(exports.element.props.onPress()).toBe('handled');
      expect(trackingCalls[0].content).toEqual(expected);
    }
  );

  it('honors custom static content props and disabled content extraction', () => {
    const code =
      'const CustomButton = "Custom"; export const element = <CustomButton caption="Caption" onTap={() => 1}>Child</CustomButton>;';
    const component = {
      name: 'CustomButton',
      contentProp: 'caption',
      handlers: [{ event: 'onTap' }],
    };
    const enabled = execute(code, { components: { tracked: [component] } });
    enabled.exports.element.props.onTap();
    expect(enabled.trackingCalls[0].content).toEqual(['Caption']);

    const disabled = execute(code, {
      components: { useContent: false, tracked: [component] },
    });
    disabled.exports.element.props.onTap();
    expect(disabled.trackingCalls[0].target.getContent).toBeUndefined();
  });

  it('builds metadata only for supported handlers and shares it across events', () => {
    const metadata = require('../src/actions/rum/metadata');
    const buildMetadata = jest.spyOn(metadata, 'buildMetadata');
    try {
      transform(
        `import { Pressable } from 'react-native'; <Pressable {...props}/>; <Pressable onPress={false}/>;`
      );
      expect(buildMetadata.mock.calls.length).toBe(0);
      transform(
        `import { Pressable } from 'react-native'; <Pressable onPress={handler} onLongPress={handler}>Static</Pressable>;`
      );
      expect(buildMetadata).toHaveBeenCalledTimes(1);
    } finally {
      buildMetadata.mockRestore();
    }
  });

  it('collects all naming attributes in one subtree scan', () => {
    const { NodePath } = require('@babel/traverse');
    const originalTraverse = NodePath.prototype.traverse;
    let scans = 0;
    const traverse = jest
      .spyOn(NodePath.prototype, 'traverse')
      .mockImplementation(function (visitor, state) {
        if (visitor.JSXAttribute) {
          scans++;
        }
        return originalTraverse.call(this, visitor, state);
      });
    let output;
    try {
      output = transform(
        `
        import { Pressable, Text } from 'react-native';
        <Pressable ft-action-name="Action" onPress={handler}>
          <Text analytics-name="Custom" accessibilityLabel="Accessible">Content</Text>
        </Pressable>;
      `,
        { actionNameAttribute: 'analytics-name' }
      );
    } finally {
      traverse.mockRestore();
    }
    expect(scans).toBe(1);
    expect(output).toContain('"ft-action-name": ["Action"]');
    expect(output).toContain('customActionName: ["Custom"]');
    expect(output).toContain('accessibilityLabel: ["Accessible"]');
  });

  it('does not use static content props that a later spread or dynamic prop can override', () => {
    const code = `
      import { Pressable, Text } from 'react-native';
      const props = { title: 'Dynamic' };
      export const element = <Pressable title="Old" {...props} onPress={() => 1}>
        <Text title="Old" {...props}>Fallback</Text>
      </Pressable>;
    `;
    const { exports, trackingCalls } = execute(code);
    exports.element.props.onPress();
    expect(trackingCalls[0].content).toEqual(['Fallback']);
    const afterSpread = execute(
      code.replace('title="Old" {...props}', '{...props} title="Static"')
    );
    afterSpread.exports.element.props.onPress();
    expect(afterSpread.trackingCalls[0].content).toEqual(['Static']);
  });

  it('adds TextInput onFocus only when it is statically safe', () => {
    const output = transform(`
      import { TextInput } from 'react-native';
      <TextInput placeholder="Name" />;
    `);
    const spreadOutput = transform(`
      import { TextInput } from 'react-native';
      <TextInput {...props} />;
    `);
    const aliasOutput = transform(`
      import { TextInput as AppTextInput } from 'react-native';
      <AppTextInput placeholder="Name" />;
    `);

    expect(output).toContain('onFocus:');
    expect(output).toContain('wrapRumAction');
    expect(spreadOutput).not.toContain('onFocus:');
    expect(spreadOutput).not.toContain('wrapRumAction');
    expect(aliasOutput).not.toContain('onFocus:');
    expect(aliasOutput).not.toContain('wrapRumAction');
  });

  it('does not double wrap native handlers inside a configured component', () => {
    const output = transform(
      `
        import { Pressable } from 'react-native';
        function CustomButton(props) {
          return <Pressable onPress={props.onPress}>{props.children}</Pressable>;
        }
        <CustomButton onPress={handler}>Submit</CustomButton>;
      `,
      {
        components: {
          tracked: [
            {
              name: 'CustomButton',
              handlers: [{ event: 'onPress' }],
            },
          ],
        },
      }
    );

    expect(output.match(/wrapRumAction/g)).toHaveLength(1);
    expect(output).toContain('componentName: "CustomButton"');
  });

  it('wraps a shared useCallback once to preserve its stable reference', () => {
    const output = transform(`
      import React, { useCallback } from 'react';
      import { Pressable } from 'react-native';
      function Screen() {
        const handler = useCallback(index => select(index), []);
        return <>
          <Pressable ft-action-name="One" onPress={handler} />
          <Pressable ft-action-name="Two" onPress={handler} />
        </>;
      }
    `);

    expect(output.match(/wrapRumAction/g)).toHaveLength(1);
    expect(output).toMatch(
      /const handler = useCallback\(\(\.\.\._ftHandlerArgs\d*\) =>/
    );
    expect(output.match(/onPress: handler/g)).toHaveLength(2);
  });

  it('wraps the handler returned by useMemo without changing its result', () => {
    const { exports, trackingCalls } = execute(`
      import React, { useMemo } from 'react';
      import { Pressable } from 'react-native';
      export const handler = useMemo(() => value => value.toUpperCase(), []);
      export const element = <Pressable onPress={handler} />;
    `);

    expect(exports.element.props.onPress('submit')).toBe('SUBMIT');
    expect(trackingCalls).toHaveLength(1);
    expect(trackingCalls[0].target.handlerArgs).toEqual(['submit']);
  });

  it('supports member handlers while preserving a direct member invocation', () => {
    const output = transform(`
      import { Button } from 'react-native';
      <Button onPress={controller.submit} />;
    `);

    expect(output).toMatch(
      /controller\.submit\?\.\(\.\.\._ftOriginalArgs\d*\)/
    );
  });

  it('wraps conditional and function expression handlers', () => {
    const { exports, trackingCalls } = execute(`
      import { Pressable } from 'react-native';
      const primary = value => \`primary:\${value}\`;
      const secondary = value => \`secondary:\${value}\`;
      export const conditional = (
        <Pressable onPress={true ? primary : secondary} />
      );
      export const conditionalWithoutHandler = (
        <Pressable onPress={false ? primary : undefined} />
      );
      export const functionExpression = (
        <Pressable onPress={function (value) { return value + 1; }} />
      );
    `);

    expect(exports.conditional.props.onPress('submit')).toBe('primary:submit');
    expect(exports.conditionalWithoutHandler.props.onPress).toBeUndefined();
    expect(exports.functionExpression.props.onPress(2)).toBe(3);
    expect(trackingCalls).toHaveLength(2);
    expect(trackingCalls[0].target.handlerArgs).toEqual(['submit']);
    expect(trackingCalls[1].target.handlerArgs).toEqual([2]);
  });

  it('preserves exceptions thrown by the original business handler', () => {
    const { exports } = execute(`
      import { Pressable } from 'react-native';
      export const element = (
        <Pressable onPress={function () { throw new Error('business failure'); }} />
      );
    `);

    expect(() => exports.element.props.onPress()).toThrow('business failure');
  });

  it('keeps external memoized callbacks unchanged', () => {
    const output = transform(`
      import { useCallback } from 'react';
      import { Pressable } from 'react-native';
      import { submit } from './actions';
      const handler = useCallback(submit, []);
      <Pressable onPress={handler} />;
    `);

    expect(output).not.toContain('wrapRumAction');
    expect(output).toContain('useCallback(submit, [])');
  });

  it('does not auto-discover namespace imports', () => {
    const output = transform(`
      import * as RN from 'react-native';
      <RN.Pressable onPress={handler} />;
    `);

    expect(output).not.toContain('wrapRumAction');
  });

  it('preserves handler parameters, return values, and member receivers', () => {
    const { exports, trackingCalls } = execute(`
      import { Button } from 'react-native';
      export const controller = {
        value: 2,
        submit(delta = 1, ...rest) {
          this.value += delta + rest.length;
          return this.value;
        }
      };
      export const memberElement = <Button onPress={controller.submit} />;
      export const destructuredElement = (
        <Button onPress={({ value } = { value: 4 }, ...rest) => [value, ...rest]} />
      );
    `);

    expect(exports.memberElement.props.onPress(3, 'extra')).toBe(6);
    expect(exports.controller.value).toBe(6);
    expect(exports.destructuredElement.props.onPress()).toEqual([4]);
    expect(exports.destructuredElement.props.onPress({ value: 7 }, 8)).toEqual([
      7, 8,
    ]);
    expect(trackingCalls).toHaveLength(3);
    expect(trackingCalls[0].target.handlerArgs).toEqual([3, 'extra']);
  });
});
