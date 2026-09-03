'use strict';

const { transformSync } = require('@babel/core');
const transformModulesCommonJs = require('@babel/plugin-transform-modules-commonjs');
const transformReactJsx = require('@babel/plugin-transform-react-jsx');
const plugin = require('../src').default;

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

function execute(code) {
  const transformed = transform(code);
  const commonJs = transformSync(transformed, {
    babelrc: false,
    configFile: false,
    plugins: [transformModulesCommonJs],
  }).code;
  const trackingCalls = [];
  const module = { exports: {} };
  const react = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props, children }),
    useMemo: (factory) => factory(),
  };
  const runtime = {
    FTBabelInteractionTracking: {
      getInstance: () => ({
        wrapRumAction: (handler, action, target) => {
          trackingCalls.push({ action, target });
          return (...args) => handler(...args);
        },
      }),
    },
    __ftExtractText: () => [],
  };
  const requireMock = (request) => {
    if (request === '@cloudcare/react-native-mobile') {
      return runtime;
    }
    if (request === 'react') {
      return react;
    }
    if (request === 'react/jsx-runtime') {
      return {
        Fragment: react.Fragment,
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      };
    }
    if (request === 'react-native') {
      return { Button: 'Button', Pressable: 'Pressable' };
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

  it('turns nested JSX content into plain JavaScript runtime calls', () => {
    const output = transform(
      `
        <Menu.Item onSelect={handler}>
          {visible && <Text aria-hidden="true">Open</Text>}
          {selected ? <Text>Selected</Text> : <Text>Choose</Text>}
        </Menu.Item>;
      `,
      {
        components: {
          tracked: [
            {
              name: 'Menu.Item',
              handlers: [{ event: 'onSelect', action: 'TAP' }],
            },
          ],
        },
      }
    );

    expect(output).toContain('_FTReact.createElement');
    expect(output).toContain('"aria-hidden": "true"');
    expect(output).not.toMatch(/<Text|<Menu/);
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
              handlers: [{ event: 'onPress', action: 'TAP' }],
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
