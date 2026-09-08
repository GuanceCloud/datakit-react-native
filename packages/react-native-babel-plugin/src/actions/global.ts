/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { PLUGIN_ENABLED_FLAG } from '../constants';

export function insertPluginEnabledFlag(
  t: typeof Babel.types,
  programPath: Babel.NodePath<Babel.types.Program>
): void {
  const createFlagAssignment = (
    globalIdentifier: Babel.types.Identifier
  ): Babel.types.ExpressionStatement =>
    t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(
          t.cloneNode(globalIdentifier),
          t.identifier(PLUGIN_ENABLED_FLAG)
        ),
        t.booleanLiteral(true)
      )
    );
  const globalThisIdentifier = t.identifier('globalThis');
  const reactNativeGlobalIdentifier = t.identifier('global');

  programPath.unshiftContainer(
    'body',
    t.ifStatement(
      t.binaryExpression(
        '!==',
        t.unaryExpression('typeof', t.cloneNode(globalThisIdentifier)),
        t.stringLiteral('undefined')
      ),
      t.blockStatement([createFlagAssignment(globalThisIdentifier)]),
      t.ifStatement(
        t.binaryExpression(
          '!==',
          t.unaryExpression('typeof', t.cloneNode(reactNativeGlobalIdentifier)),
          t.stringLiteral('undefined')
        ),
        t.blockStatement([createFlagAssignment(reactNativeGlobalIdentifier)])
      )
    )
  );
}
