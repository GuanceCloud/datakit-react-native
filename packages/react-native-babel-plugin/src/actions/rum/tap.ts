/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import type { ActionMetadata, PluginState, TrackedHandler } from '../../types';
import { buildTargetObject } from './metadata';

const DEFAULT_ACTION_TYPE = 'click';

function normalizeActionType(actionType: TrackedHandler['actionType']): string {
  return typeof actionType === 'string' && actionType.trim()
    ? actionType.trim()
    : DEFAULT_ACTION_TYPE;
}

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
  scope: Babel.NodePath['scope'],
  actionType: TrackedHandler['actionType']
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
      t.stringLiteral(normalizeActionType(actionType)),
      buildTargetObject(t, metadata, handlerArgsIdentifier, state),
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
  mode: TrackedHandler['mode'] = 'default',
  actionType?: TrackedHandler['actionType']
): Babel.types.ArrowFunctionExpression {
  if (mode !== 'delayed') {
    return buildImmediateHandlerWrapper(
      t,
      originalExpression,
      metadata,
      state,
      scope,
      actionType
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
          scope,
          actionType
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
  mode: TrackedHandler['mode'] = 'default',
  actionType?: TrackedHandler['actionType']
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
          mode,
          actionType
        ),
        t.cloneNode(resolvedHandlerIdentifier)
      )
    ),
    [t.cloneNode(originalExpression, true)]
  );
}
