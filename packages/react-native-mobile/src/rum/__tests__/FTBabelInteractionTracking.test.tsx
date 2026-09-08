import React from 'react';
import {
  FTBabelActionTarget,
  FTBabelInteractionTracking,
} from '../FTBabelInteractionTracking';
import { __ftExtractText } from '../FTBabelUtils';
import {
  resolveActionTrackingContext,
  resolveActionTrackingContextFromTarget,
} from '../FTRumActionTrackingContext';

const createTarget = (
  overrides: Partial<FTBabelActionTarget> = {}
): FTBabelActionTarget => ({
  componentName: 'Button',
  handlerArgs: [],
  options: { useContent: true, useNamePrefix: true },
  ...overrides,
});

describe('FTBabelInteractionTracking', () => {
  beforeEach(() => {
    FTBabelInteractionTracking.configure({ trackInteractions: false });
  });

  it('resolves action names in the documented priority order', () => {
    const getContent = jest.fn(() => ['Content']);
    const target = createTarget({
      'ft-action-name': ['Explicit'],
      'accessibilityLabel': ['Accessible'],
      'customActionName': ['Custom'],
      'getContent': getContent,
    });

    expect(FTBabelInteractionTracking.getTargetName(target)).toBe(
      'Button ("Explicit")'
    );
    expect(getContent).not.toHaveBeenCalled();
    delete target['ft-action-name'];
    expect(FTBabelInteractionTracking.getTargetName(target)).toBe(
      'Button ("Custom")'
    );
    delete target.customActionName;
    expect(FTBabelInteractionTracking.getTargetName(target)).toBe(
      'Button ("Accessible")'
    );
    delete target.accessibilityLabel;
    expect(FTBabelInteractionTracking.getTargetName(target)).toBe(
      'Button ("Content")'
    );
    expect(getContent).toHaveBeenCalledTimes(1);
    delete target.getContent;
    expect(FTBabelInteractionTracking.getTargetName(target)).toBe('Button');
  });

  it('honors prefix options, empty values, and compound indexes', () => {
    expect(
      FTBabelInteractionTracking.getTargetName(
        createTarget({
          'ft-action-name': ['Home', 'Settings'],
          'handlerArgs': [1],
          'options': { useContent: true, useNamePrefix: false },
        })
      )
    ).toBe('Settings');
    expect(
      FTBabelInteractionTracking.getTargetName(
        createTarget({
          'ft-action-name': ['Home', 'Settings'],
          'handlerArgs': [9],
        })
      )
    ).toBe('Button ("Home")');
    expect(
      FTBabelInteractionTracking.getTargetName(
        createTarget({ 'ft-action-name': ['  '] })
      )
    ).toBe('Button');
  });

  it('reports before calling the original handler and preserves its result', () => {
    const order: string[] = [];
    const reporter = jest.fn().mockImplementation(() => {
      order.push('report');
      return Promise.resolve();
    });
    const handler = jest.fn().mockImplementation((value: string) => {
      order.push('handler');
      return value.toUpperCase();
    });
    FTBabelInteractionTracking.configure({
      actionReporter: reporter,
      trackInteractions: true,
    });

    const wrapped = FTBabelInteractionTracking.wrapRumAction(
      handler,
      'TAP',
      createTarget({ 'ft-action-name': ['Submit'] })
    );

    expect(wrapped('value')).toBe('VALUE');
    expect(order).toEqual(['report', 'handler']);
    expect(reporter).toHaveBeenCalledWith(
      'Button ("Submit")',
      'click',
      undefined
    );
    expect(handler).toHaveBeenCalledWith('value');
  });

  it('always calls optional handlers and ignores rejected reporting', async () => {
    const reporter = jest.fn().mockRejectedValue(new Error('report failed'));
    FTBabelInteractionTracking.configure({
      actionReporter: reporter,
      trackInteractions: true,
    });

    const nullHandler = FTBabelInteractionTracking.wrapRumAction(
      null,
      'TAP',
      createTarget()
    );
    expect(nullHandler()).toBeUndefined();

    const handler = jest.fn().mockReturnValue('result');
    const wrapped = FTBabelInteractionTracking.wrapRumAction(
      handler,
      'TAP',
      createTarget()
    );
    expect(wrapped()).toBe('result');
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls the original handler when reporting throws', () => {
    const handler = jest.fn().mockReturnValue('handled');
    FTBabelInteractionTracking.configure({
      actionReporter: () => {
        throw new Error('synchronous report failure');
      },
      trackInteractions: true,
    });
    const wrapped = FTBabelInteractionTracking.wrapRumAction(
      handler,
      'TAP',
      createTarget()
    );

    expect(wrapped()).toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls the original handler when content extraction throws', () => {
    const reporter = jest.fn().mockResolvedValue(undefined);
    const handler = jest.fn().mockReturnValue('handled');
    FTBabelInteractionTracking.configure({
      actionReporter: reporter,
      trackInteractions: true,
    });
    const wrapped = FTBabelInteractionTracking.wrapRumAction(
      handler,
      'TAP',
      createTarget({
        getContent: () => {
          throw new Error('content failure');
        },
      })
    );

    expect(wrapped()).toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(reporter).not.toHaveBeenCalled();
  });

  it('does not report when tracking or the Fiber control disables it', () => {
    const reporter = jest.fn().mockResolvedValue(undefined);
    const handler = jest.fn();
    const target = createTarget();

    FTBabelInteractionTracking.wrapRumAction(handler, 'TAP', target)();
    expect(reporter).not.toHaveBeenCalled();

    FTBabelInteractionTracking.configure({
      actionReporter: reporter,
      trackInteractions: true,
    });
    const wrapped = FTBabelInteractionTracking.wrapRumAction(
      handler,
      'TAP',
      target
    );
    wrapped({
      _targetInst: {
        memoizedProps: { 'ft-enable-track': 'false' },
      },
    });

    expect(reporter).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('forwards parsed ancestor properties to startAction', () => {
    const reporter = jest.fn().mockResolvedValue(undefined);
    FTBabelInteractionTracking.configure({
      actionReporter: reporter,
      trackInteractions: true,
    });
    const wrapped = FTBabelInteractionTracking.wrapRumAction(
      jest.fn(),
      'TAP',
      createTarget()
    );
    wrapped({
      _targetInst: {
        memoizedProps: {},
        return: {
          memoizedProps: {
            'ft-extra-property': '{"source":"button"}',
          },
        },
      },
    });

    expect(reporter).toHaveBeenCalledWith('Button', 'click', {
      source: 'button',
    });
  });
});

describe('FTRumActionTrackingContext', () => {
  it('defaults to enabled when no Fiber target is available', () => {
    expect(resolveActionTrackingContext([true, 'value'])).toEqual({
      enabled: true,
    });
  });

  it('warns and ignores invalid extra-property JSON', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const context = resolveActionTrackingContextFromTarget({
      memoizedProps: { 'ft-extra-property': 'invalid' },
    });

    expect(context).toEqual({ enabled: true });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('__ftExtractText', () => {
  it('normalizes each text leaf once instead of re-extracting intermediate results', () => {
    const labels = Array.from({ length: 100 }, (_, index) => `Label ${index}`);
    const node = React.createElement(
      React.Fragment,
      null,
      ...labels.map((label) =>
        React.createElement('Text', null, `  ${label}\n `)
      )
    );
    const replace = jest.spyOn(String.prototype, 'replace');
    let result: string[] = [];
    let normalizations = 0;
    try {
      result = __ftExtractText(node);
      normalizations = replace.mock.calls.filter(
        ([pattern]) => pattern instanceof RegExp && pattern.source === '\\s+'
      ).length;
    } finally {
      replace.mockRestore();
    }
    expect(result).toEqual(labels);
    expect(normalizations).toBe(labels.length);
  });

  it('preserves joining, deduplication, and empty filtering for nested text results', () => {
    expect(__ftExtractText([' ', null, [' A\n B ', false, 0]])).toEqual([
      'A B',
      '0',
    ]);
    const nested = React.createElement(
      React.Fragment,
      null,
      React.createElement(
        React.Fragment,
        null,
        React.createElement('Text', null, ' A '),
        React.createElement('Text', null, ' B '),
        React.createElement('Text', null, ' A ')
      )
    );
    expect(__ftExtractText(nested)).toEqual(['A B']);
  });

  it('prefers props and normalizes primitive, array, and iterable values', () => {
    const node = React.createElement('Text', null, 'ignored');
    expect(__ftExtractText(node, ['  Pay\n now  ', 2])).toEqual([
      'Pay now',
      '2',
    ]);
    expect(__ftExtractText(new Set(['One', 'Two']))).toEqual(['One', 'Two']);
  });

  it('supports zero-argument render functions and ignores unsafe functions', () => {
    expect(__ftExtractText(() => 'Rendered')).toEqual(['Rendered']);
    expect(__ftExtractText((_value: string) => 'Unsafe')).toEqual([]);
    expect(
      __ftExtractText(() => {
        throw new Error('render failed');
      })
    ).toEqual([]);
  });

  it('uses direct element labels and de-duplicates compound children', () => {
    expect(
      __ftExtractText(React.createElement('Text', { title: 'Title' }, 'Body'))
    ).toEqual(['Title']);
    const compound = React.createElement(
      React.Fragment,
      null,
      React.createElement('Text', null, 'Home'),
      React.createElement('Text', null, 'Settings'),
      React.createElement('Text', null, 'Home')
    );
    expect(__ftExtractText(compound)).toEqual(['Home', 'Settings']);
  });
});
