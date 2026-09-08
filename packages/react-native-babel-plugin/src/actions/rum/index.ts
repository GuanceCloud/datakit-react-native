/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { RUNTIME_PACKAGE } from '../../constants';
import type {
  ActionMetadata,
  NormalizedPluginOptions,
  PluginState,
} from '../../types';
import { getDirectAttributePaths, getNodeName } from '../../utils/jsx';
import {
  addRequiredTextInputHandler,
  isInsideConfiguredComponent,
} from './components';
import { buildMetadata } from './metadata';
import { wrapMemoizedHandler } from './memoization';
import { buildGuardedHandlerWrapper, buildHandlerWrapper } from './tap';

export function handleJSXElement(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  state: PluginState,
  options: NormalizedPluginOptions
): void {
  const componentName = getNodeName(t, path.node.openingElement.name);
  const component = componentName
    ? state._ftTrackedComponents[componentName]
    : undefined;
  if (
    !componentName ||
    !component ||
    isInsideConfiguredComponent(t, path, state._ftCustomNames)
  ) {
    return;
  }

  addRequiredTextInputHandler(t, path, component, componentName);
  let metadata: ActionMetadata | undefined;

  for (const attributePath of getDirectAttributePaths(path)) {
    if (
      !attributePath.isJSXAttribute() ||
      attributePath.node.extra?.__ftWrappedAction
    ) {
      continue;
    }
    const attributeName = getNodeName(t, attributePath.node.name);
    const handler = component.handlers.find(
      (item) => item.action === 'TAP' && item.event === attributeName
    );
    if (!handler) {
      continue;
    }
    const value = attributePath.node.value;
    if (!t.isJSXExpressionContainer(value)) {
      continue;
    }
    const expression = value.expression;
    if (
      !t.isArrowFunctionExpression(expression) &&
      !t.isFunctionExpression(expression) &&
      !t.isIdentifier(expression) &&
      !t.isMemberExpression(expression) &&
      !t.isConditionalExpression(expression)
    ) {
      continue;
    }

    metadata ||= buildMetadata(t, path, componentName, component, options);

    if (
      !wrapMemoizedHandler(
        t,
        attributePath,
        expression,
        metadata,
        state,
        handler.mode
      )
    ) {
      const wrappedHandler = t.isConditionalExpression(expression)
        ? buildGuardedHandlerWrapper(
            t,
            expression,
            metadata,
            state,
            attributePath.scope,
            handler.mode
          )
        : buildHandlerWrapper(
            t,
            expression,
            metadata,
            state,
            attributePath.scope,
            handler.mode
          );
      attributePath.node.value = t.jsxExpressionContainer(wrappedHandler);
      state._ftHasWrappedAction = true;
    }
    attributePath.node.extra = {
      ...attributePath.node.extra,
      __ftWrappedAction: true,
    };
  }
}

export function insertRuntimeImports(
  t: typeof Babel.types,
  programPath: Babel.NodePath<Babel.types.Program>,
  state: PluginState
): void {
  if (!state._ftHasWrappedAction) {
    return;
  }
  programPath.unshiftContainer(
    'body',
    t.importDeclaration(
      [
        t.importSpecifier(
          t.cloneNode(state._ftTrackingIdentifier),
          t.identifier('FTBabelInteractionTracking')
        ),
      ],
      t.stringLiteral(RUNTIME_PACKAGE)
    )
  );
}
