/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import type { ActionMetadata, PluginState, TrackedHandler } from '../../types';
import { isContentVisibleFromScope } from './content';
import { buildHandlerWrapper } from './tap';

function getMemoizationName(
  t: typeof Babel.types,
  callee: Babel.types.Expression | Babel.types.V8IntrinsicIdentifier
): string | null {
  if (t.isIdentifier(callee)) {
    return callee.name;
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name;
  }
  return null;
}

function getVariableDeclaratorPath(
  bindingPath: Babel.NodePath
): Babel.NodePath<Babel.types.VariableDeclarator> | null {
  if (bindingPath.isVariableDeclarator()) {
    return bindingPath;
  }
  return (
    (bindingPath.findParent((parent) =>
      parent.isVariableDeclarator()
    ) as Babel.NodePath<Babel.types.VariableDeclarator> | null) || null
  );
}

function isLocalFunctionReference(
  path: Babel.NodePath,
  expression: Babel.types.Expression
): boolean {
  if (!expression || expression.type !== 'Identifier') {
    return true;
  }
  const binding = path.scope.getBinding(expression.name);
  if (!binding) {
    return false;
  }
  return !(
    binding.path.isImportSpecifier() ||
    binding.path.isImportDefaultSpecifier() ||
    binding.path.isImportNamespaceSpecifier()
  );
}

/** Wraps the hook callback once so JSX references retain their memoized identity. */
export function wrapMemoizedHandler(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXAttribute>,
  expression: Babel.types.Expression,
  metadata: ActionMetadata,
  state: PluginState,
  mode: TrackedHandler['mode'],
  actionType: TrackedHandler['actionType']
): boolean {
  if (!t.isIdentifier(expression)) {
    return false;
  }
  const binding = path.scope.getBinding(expression.name);
  if (!binding) {
    return false;
  }
  const declaratorPath = getVariableDeclaratorPath(binding.path);
  if (!declaratorPath) {
    return false;
  }
  const initPath = declaratorPath.get('init');
  if (!initPath.isCallExpression()) {
    return false;
  }
  const memoizationName = getMemoizationName(t, initPath.node.callee);
  if (
    !memoizationName ||
    !['useCallback', 'useMemo'].includes(memoizationName)
  ) {
    return false;
  }
  if (state._ftMemoizedHandlers.has(declaratorPath.node)) {
    return true;
  }

  const argumentPaths = initPath.get('arguments');
  const callbackPath = argumentPaths[0];
  if (!callbackPath || callbackPath.isSpreadElement()) {
    return false;
  }
  const callback = callbackPath.node;
  if (
    !t.isArrowFunctionExpression(callback) &&
    !t.isFunctionExpression(callback) &&
    !t.isIdentifier(callback)
  ) {
    return false;
  }
  if (!isLocalFunctionReference(path, callback)) {
    state._ftMemoizedHandlers.add(declaratorPath.node);
    return true;
  }

  const elementPath = path.parentPath?.parentPath;
  const metadataAtMemoDefinition =
    metadata.getContent &&
    elementPath?.isJSXElement() &&
    !isContentVisibleFromScope(
      t,
      elementPath,
      metadata.component,
      initPath.scope
    )
      ? { ...metadata, getContent: null }
      : metadata;

  callbackPath.replaceWith(
    buildHandlerWrapper(
      t,
      callback,
      metadataAtMemoDefinition,
      state,
      callbackPath.scope,
      memoizationName === 'useMemo' ? 'delayed' : mode,
      actionType
    )
  );
  state._ftMemoizedHandlers.add(declaratorPath.node);
  state._ftHasWrappedAction = true;
  return true;
}
