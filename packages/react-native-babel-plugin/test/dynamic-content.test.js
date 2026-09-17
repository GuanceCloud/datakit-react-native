'use strict';

const React = require('react');
const { transformSync } = require('@babel/core');
const plugin = require('../src').default;
const {
  FTBabelInteractionTracking,
} = require('../../react-native-mobile/src/rum/FTBabelInteractionTracking');
const {
  __ftExtractText,
} = require('../../react-native-mobile/src/rum/FTBabelUtils');

// Exercise the generated handler together with the SDK's real name resolver.
function execute(
  source,
  options = {},
  platform = 'ios',
  jsxRuntime = 'automatic'
) {
  const transformed = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: '/app/Screen.jsx',
    caller: { name: 'metro', platform },
    plugins: [
      [plugin, options],
      ['@babel/plugin-transform-react-jsx', { runtime: jsxRuntime }],
    ],
  }).code;
  const code = transformSync(transformed, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const reporter = jest.fn().mockResolvedValue(undefined);
  FTBabelInteractionTracking.configure({
    trackInteractions: true,
    actionReporter: reporter,
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === '@cloudcare/react-native-mobile') {
      return { FTBabelInteractionTracking, __ftExtractText };
    }
    if (name === 'react-native') {
      return { Pressable: 'Pressable', Text: 'Text', Button: 'Button' };
    }
    if (name === 'react') {
      return {
        ...React,
        useCallback: (callback) => callback,
        useMemo: (factory) => factory(),
      };
    }
    if (name === 'react/jsx-runtime' && jsxRuntime === 'automatic') {
      return require('react/jsx-runtime');
    }
    throw new Error(`Unexpected module: ${name}`);
  };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', code)(
    requireMock,
    module,
    module.exports
  );
  delete globalThis.__FT_RN_BABEL_PLUGIN_ENABLED__;
  return { exports: module.exports, reporter, transformed };
}

afterEach(() => {
  FTBabelInteractionTracking.configure({ trackInteractions: false });
});

describe('dynamic action names through the Babel plugin and SDK runtime', () => {
  it.each(['ios', 'android'])(
    'names each example renderButton invocation on %s',
    (platform) => {
      const { exports, reporter } = execute(
        `
        import { Pressable, Text } from 'react-native';
        export let calls = 0;
        const renderButton = (title, onPress) => (
          <Pressable onPress={onPress}><Text>{title}</Text></Pressable>
        );
        export const buttons = [
          renderButton('Bind User', () => ++calls),
          renderButton('Unbind User', () => ++calls),
        ];
        `,
        {},
        platform
      );
      expect(exports.buttons.map((button) => button.props.onPress())).toEqual([
        1, 2,
      ]);
      expect(reporter.mock.calls).toEqual([
        ['Pressable ("Bind User")', 'click', undefined],
        ['Pressable ("Unbind User")', 'click', undefined],
      ]);
      expect(exports.calls).toBe(2);
    }
  );

  it('uses click-time values for dynamic props, members, and children', () => {
    const { exports, reporter } = execute(`
      import { Pressable, Text } from 'react-native';
      let title = 'Before';
      const item = { title: 'Before' };
      export const change = () => { title = 'After'; item.title = 'Updated'; };
      export const buttons = [
        <Pressable title={title} onPress={() => title}><Text>Child</Text></Pressable>,
        <Pressable onPress={() => item.title}><Text>{item.title}</Text></Pressable>,
      ];
    `);
    exports.change();
    expect(exports.buttons.map((button) => button.props.onPress())).toEqual([
      'After',
      'Updated',
    ]);
    expect(reporter.mock.calls).toEqual([
      ['Pressable ("After")', 'click', undefined],
      ['Pressable ("Updated")', 'click', undefined],
    ]);
  });

  it('supports zero-argument render props and skips render props requiring state', () => {
    const { exports, reporter, transformed } = execute(`
      import { Pressable, Text } from 'react-native';
      const title = 'Start Action';
      export const calls = { zero: 0, state: 0, handler: 0 };
      export const buttons = [
        <Pressable onPress={() => ++calls.handler}>{() => {
          calls.zero++;
          return <Text>{title}</Text>;
        }}</Pressable>,
        <Pressable onPress={() => ++calls.handler}>{({ pressed }) => {
          calls.state++;
          return <Text>{title}</Text>;
        }}</Pressable>,
        <Pressable title={title} onPress={() => ++calls.handler}>
          {({ pressed }) => <Text>{title}</Text>}
        </Pressable>,
      ];
    `);
    expect(transformed).not.toMatch(/<Text|<Pressable/);
    expect(exports.buttons.map((button) => button.props.onPress())).toEqual([
      1, 2, 3,
    ]);
    expect(reporter.mock.calls).toEqual([
      ['Pressable ("Start Action")', 'click', undefined],
      ['Pressable', 'click', undefined],
      ['Pressable ("Start Action")', 'click', undefined],
    ]);
    expect(exports.calls).toEqual({ zero: 1, state: 0, handler: 3 });
  });

  it('converts nested JSX expressions without requiring the automatic JSX runtime', () => {
    const { exports, reporter, transformed } = execute(
      `
      import React from 'react';
      import { Pressable, Text } from 'react-native';
      const ui = { Text };
      const labels = ['Home', 'Settings'];
      const visible = true;
      export const element = <Pressable onPress={index => index}>
        <>{visible && (visible ? labels.map(label => (
          <ui.Text key={label} aria-hidden="true">{label}</ui.Text>
        )) : <Text>Hidden</Text>)}</>
      </Pressable>;
      `,
      { components: { useNamePrefix: false } },
      'ios',
      'classic'
    );
    expect(transformed).not.toContain('react/jsx-runtime');
    expect(transformed).not.toMatch(/<Text|<ui.Text|<>/);
    expect(exports.element.props.onPress(0)).toBe(0);
    expect(reporter).toHaveBeenCalledWith('Home Settings', 'click', undefined);
  });

  it('selects a dynamic custom content candidate using the numeric handler argument', () => {
    const { exports, reporter } = execute(
      `
      const Menu = 'Menu';
      const labels = [' Home ', ' Settings '];
      export const element = <Menu caption={labels} onSelect={index => index} />;
      `,
      {
        components: {
          useNamePrefix: false,
          tracked: [
            {
              name: 'Menu',
              contentProp: 'caption',
              handlers: [{ event: 'onSelect', actionType: 'selection' }],
            },
          ],
        },
      }
    );
    expect(exports.element.props.onSelect('event', 1)).toBe('event');
    expect(exports.element.props.onSelect(-1)).toBe(-1);
    expect(reporter.mock.calls).toEqual([
      ['Settings', 'selection', undefined],
      ['Home', 'selection', undefined],
    ]);
  });

  it('evaluates dynamic content once per click before invoking the business handler', () => {
    const { exports, reporter } = execute(`
      import { Pressable, Text } from 'react-native';
      export const calls = { text: 0, handler: 0 };
      const title = () => { calls.text++; return 'Save'; };
      export const element = <Pressable onPress={() => ++calls.handler}>
        <Text>{title()}</Text>
      </Pressable>;
    `);
    expect(exports.calls).toEqual({ text: 1, handler: 0 });
    expect(exports.element.props.onPress()).toBe(1);
    expect(exports.calls).toEqual({ text: 2, handler: 1 });
    expect(reporter.mock.calls).toEqual([
      ['Pressable ("Save")', 'click', undefined],
    ]);
  });

  it('does not evaluate a built-in content prop twice when configured explicitly', () => {
    const { exports, reporter } = execute(
      `
      const CustomButton = 'CustomButton';
      export const calls = { title: 0, handler: 0 };
      const title = () => { calls.title++; return 'Save'; };
      export const element = (
        <CustomButton title={title()} onPress={() => ++calls.handler} />
      );
      `,
      {
        components: {
          tracked: [
            {
              name: 'CustomButton',
              contentProp: 'title',
              handlers: [{ event: 'onPress' }],
            },
          ],
        },
      }
    );
    expect(exports.calls).toEqual({ title: 1, handler: 0 });
    expect(exports.element.props.onPress()).toBe(1);
    expect(exports.calls).toEqual({ title: 2, handler: 1 });
    expect(reporter.mock.calls).toEqual([
      ['CustomButton ("Save")', 'click', undefined],
    ]);
  });

  it('keeps the original handler callable when a click-time content expression throws', () => {
    const { exports, reporter } = execute(`
      import { Pressable, Text } from 'react-native';
      let reads = 0;
      export let calls = 0;
      const title = () => {
        if (++reads > 1) throw new Error('name failure');
        return 'Save';
      };
      export const element = <Pressable onPress={() => ++calls}>
        <Text>{title()}</Text>
      </Pressable>;
    `);
    expect(exports.element.props.onPress()).toBe(1);
    expect(exports.calls).toBe(1);
    expect(reporter).not.toHaveBeenCalled();
  });

  it.each([
    ['ft-action-name="Explicit"', {}, 'Pressable ("Explicit")'],
    [
      'analytics-name="Custom"',
      { actionNameAttribute: 'analytics-name' },
      'Pressable ("Custom")',
    ],
    ['accessibilityLabel="Accessible"', {}, 'Pressable ("Accessible")'],
    ['', { components: { useContent: false } }, 'Pressable'],
  ])(
    'avoids content evaluation when %s or options determine the name',
    (attribute, options, name) => {
      const { exports, reporter } = execute(
        `
      import { Pressable, Text } from 'react-native';
      export let reads = 0;
      const title = () => { reads++; return 'Content'; };
      export const element = <Pressable ${attribute} onPress={() => 'handled'}>
        <Text>{title()}</Text>
      </Pressable>;
    `,
        options
      );
      expect(exports.element.props.onPress()).toBe('handled');
      expect(exports.reads).toBe(1);
      expect(reporter.mock.calls).toEqual([[name, 'click', undefined]]);
    }
  );

  it('does not evaluate content when runtime tracking is disabled', () => {
    const { exports, reporter } = execute(`
      import { Pressable, Text } from 'react-native';
      export let reads = 0;
      const title = () => { reads++; return 'Content'; };
      export const element = <Pressable onPress={() => 'handled'}><Text>{title()}</Text></Pressable>;
    `);
    FTBabelInteractionTracking.configure({
      trackInteractions: false,
      actionReporter: reporter,
    });
    expect(exports.element.props.onPress()).toBe('handled');
    expect(exports.reads).toBe(1);
    expect(reporter).not.toHaveBeenCalled();
  });

  it('falls back from empty dynamic props to children and then to the component', () => {
    const { exports, reporter } = execute(`
      import { Pressable, Text } from 'react-native';
      const title = '  ';
      const label = ' Child ';
      export const buttons = [
        <Pressable title={title} onPress={() => 1}><Text>{label}</Text></Pressable>,
        <Pressable title={title} onPress={() => 2}>{null}{false}</Pressable>,
      ];
    `);
    expect(exports.buttons.map((button) => button.props.onPress())).toEqual([
      1, 2,
    ]);
    expect(reporter.mock.calls).toEqual([
      ['Pressable ("Child")', 'click', undefined],
      ['Pressable', 'click', undefined],
    ]);
  });

  it('keeps memoized handlers when list-local content is not visible at their definition', () => {
    const { exports, reporter, transformed } = execute(`
      import { useCallback } from 'react';
      import { Pressable, Text } from 'react-native';
      export let calls = 0;
      export function Screen({ items }) {
        const handler = useCallback(() => ++calls, []);
        return items.map(item => (
          <Pressable onPress={handler}><Text>{item.title}</Text></Pressable>
        ));
      }
    `);
    const button = exports.Screen({ items: [{ title: 'One' }] })[0];

    expect(button.props.onPress()).toBe(1);
    expect(exports.calls).toBe(1);
    expect(reporter.mock.calls).toEqual([['Pressable', 'click', undefined]]);
    expect(transformed).not.toContain('__ftExtractText');
  });

  it('keeps dynamic names visible from a memoized handler definition', () => {
    const { exports, reporter } = execute(`
      import { useCallback } from 'react';
      import { Pressable, Text } from 'react-native';
      export let calls = 0;
      export function Screen({ title }) {
        const handler = useCallback(() => ++calls, []);
        return <Pressable onPress={handler}><Text>{title}</Text></Pressable>;
      }
    `);
    const button = exports.Screen({ title: 'Save' });

    expect(button.props.onPress()).toBe(1);
    expect(reporter.mock.calls).toEqual([
      ['Pressable ("Save")', 'click', undefined],
    ]);
  });

  it('applies the same scope fallback to handlers returned by useMemo', () => {
    const { exports, reporter } = execute(`
      import { useMemo } from 'react';
      import { Pressable, Text } from 'react-native';
      export let calls = 0;
      export function Screen({ items }) {
        const handler = useMemo(() => () => ++calls, []);
        return items.map(item => (
          <Pressable onPress={handler}><Text>{item.title}</Text></Pressable>
        ));
      }
    `);
    const button = exports.Screen({ items: [{ title: 'One' }] })[0];

    expect(button.props.onPress()).toBe(1);
    expect(exports.calls).toBe(1);
    expect(reporter.mock.calls).toEqual([['Pressable', 'click', undefined]]);
  });
});
