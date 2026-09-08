/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import type { JSXAttributePath } from '../types';

export function getNodeName(
  t: typeof Babel.types,
  node: Babel.types.Node | null | undefined
): string | null {
  if (!node) {
    return null;
  }
  if (t.isIdentifier(node) || t.isJSXIdentifier(node)) {
    return node.name;
  }
  if (t.isStringLiteral(node)) {
    return node.value;
  }
  if (t.isJSXNamespacedName(node)) {
    return `${node.namespace.name}:${node.name.name}`;
  }
  if (t.isJSXMemberExpression(node)) {
    let nodeName = node.property.name;
    let nodeTracker:
      | Babel.types.JSXIdentifier
      | Babel.types.JSXMemberExpression = node.object;

    while (t.isJSXMemberExpression(nodeTracker)) {
      nodeName = `${nodeTracker.property.name}.${nodeName}`;
      nodeTracker = nodeTracker.object;
    }

    return t.isJSXIdentifier(nodeTracker)
      ? `${nodeTracker.name}.${nodeName}`
      : null;
  }
  if ('name' in node && node.name && typeof node.name !== 'string') {
    return getNodeName(t, node.name);
  }
  return null;
}

export function getDirectAttributePaths(
  path: Babel.NodePath<Babel.types.JSXElement>
): JSXAttributePath[] {
  return path.get('openingElement.attributes') as JSXAttributePath[];
}
