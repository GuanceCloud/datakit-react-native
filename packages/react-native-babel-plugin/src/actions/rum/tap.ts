/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import type { ActionMetadata, PluginState, TrackedHandler } from '../../types';
import { buildTargetObject } from './metadata';

function buildOriginalInvocation(
  t: typeof Babel.types,
  originalExpression: Babel.types.Expression,
  argsIdentifier: Babel.types.Identifier
): Babel.types.OptionalCallExpression {
  return t.optionalCallExpression(
    t.cloneNode(originalExpression, true),
    [t.spreadElement(t.cloneNode(argsIdentifier))],
    true
  );
}

function buildImmediateHandlerWrapper(
  t: typeof Babel.types,
  originalExpression: Babel.types.Expression,
  metadata: ActionMetadata,
  state: PluginState,
  scope: Babel.NodePath['scope']
): Babel.types.ArrowFunctionExpression {
  const handlerArgsIdentifier = scope.generateUidIdentifier('ftHandlerArgs');
  const originalArgsIdentifier = scope.generateUidIdentifier('ftOriginalArgs');
  const originalInvoker = t.arrowFunctionExpression(
    [t.restElement(originalArgsIdentifier)],
    buildOriginalInvocation(t, originalExpression, originalArgsIdentifier)
  );
  const instanceCall = t.callExpression(
    t.memberExpression(
      t.cloneNode(state._ftTrackingIdentifier),
      t.identifier('getInstance')
    ),
    []
  );
  const wrappedHandler = t.callExpression(
    t.memberExpression(instanceCall, t.identifier('wrapRumAction')),
    [
      originalInvoker,
      t.stringLiteral('TAP'),
      buildTargetObject(t, metadata, handlerArgsIdentifier),
    ]
  );
  return t.arrowFunctionExpression(
    [t.restElement(handlerArgsIdentifier)],
    t.callExpression(wrappedHandler, [
      t.spreadElement(t.cloneNode(handlerArgsIdentifier)),
    ])
  );
}

/** Wraps a handler, or a handler factory when delayed mode is configured. */
export function buildHandlerWrapper(
  t: typeof Babel.types,
  originalExpression: Babel.types.Expression,
  metadata: ActionMetadata,
  state: PluginState,
  scope: Babel.NodePath['scope'],
  mode: TrackedHandler['mode'] = 'default'
): Babel.types.ArrowFunctionExpression {
  if (mode !== 'delayed') {
    return buildImmediateHandlerWrapper(
      t,
      originalExpression,
      metadata,
      state,
      scope
    );
  }

  const factoryArgsIdentifier = scope.generateUidIdentifier('ftFactoryArgs');
  const handlerIdentifier = scope.generateUidIdentifier('ftDelayedHandler');
  return t.arrowFunctionExpression(
    [t.restElement(factoryArgsIdentifier)],
    t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(
          handlerIdentifier,
          buildOriginalInvocation(t, originalExpression, factoryArgsIdentifier)
        ),
      ]),
      t.returnStatement(
        buildImmediateHandlerWrapper(
          t,
          handlerIdentifier,
          metadata,
          state,
          scope
        )
      ),
    ])
  );
}

/** Resolves a conditional handler once at render time, preserving non-functions. */
export function buildGuardedHandlerWrapper(
  t: typeof Babel.types,
  originalExpression: Babel.types.Expression,
  metadata: ActionMetadata,
  state: PluginState,
  scope: Babel.NodePath['scope'],
  mode: TrackedHandler['mode'] = 'default'
): Babel.types.CallExpression {
  const resolvedHandlerIdentifier =
    scope.generateUidIdentifier('ftResolvedHandler');
  return t.callExpression(
    t.arrowFunctionExpression(
      [resolvedHandlerIdentifier],
      t.conditionalExpression(
        t.binaryExpression(
          '===',
          t.unaryExpression('typeof', t.cloneNode(resolvedHandlerIdentifier)),
          t.stringLiteral('function')
        ),
        buildHandlerWrapper(
          t,
          resolvedHandlerIdentifier,
          metadata,
          state,
          scope,
          mode
        ),
        t.cloneNode(resolvedHandlerIdentifier)
      )
    ),
    [t.cloneNode(originalExpression, true)]
  );
}
