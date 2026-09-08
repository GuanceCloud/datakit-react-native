/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { NATIVE_COMPONENT_HANDLERS } from '../../constants';
import type {
  NormalizedPluginOptions,
  TrackedComponentData,
} from '../../types';
import { getDirectAttributePaths, getNodeName } from '../../utils/jsx';

export function createTrackedComponents(
  t: typeof Babel.types,
  programPath: Babel.NodePath<Babel.types.Program>,
  options: NormalizedPluginOptions
): Record<string, TrackedComponentData> {
  const tracked: Record<string, TrackedComponentData> = {};

  for (const statement of programPath.node.body) {
    if (
      !t.isImportDeclaration(statement) ||
      statement.source.value !== 'react-native'
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (!t.isImportSpecifier(specifier)) {
        continue;
      }
      const importedName = getNodeName(t, specifier.imported);
      const localName = getNodeName(t, specifier.local);
      const events = importedName
        ? NATIVE_COMPONENT_HANDLERS[importedName]
        : undefined;
      if (!events || !importedName || !localName) {
        continue;
      }
      tracked[localName] = {
        handlers: events.map((event) => ({ action: 'TAP', event })),
        importedName,
        isCustom: false,
        useContent: options.components.useContent,
        useNamePrefix: options.components.useNamePrefix,
      };
    }
  }

  for (const component of options.components.tracked) {
    tracked[component.name] = {
      ...(component.contentProp ? { contentProp: component.contentProp } : {}),
      handlers: component.handlers || [],
      isCustom: true,
      useContent:
        component.useContent === undefined
          ? options.components.useContent
          : component.useContent,
      useNamePrefix:
        component.useNamePrefix === undefined
          ? options.components.useNamePrefix
          : component.useNamePrefix,
    };
  }

  return tracked;
}

export function isInsideConfiguredComponent(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  customComponentNames: Set<string>
): boolean {
  let current: Babel.NodePath | null = path.parentPath;
  while (current && !current.isProgram()) {
    if (
      current.isFunctionDeclaration() ||
      current.isClassDeclaration() ||
      current.isVariableDeclarator()
    ) {
      const name = getNodeName(t, current.node.id);
      if (name && customComponentNames.has(name)) {
        return true;
      }
    }
    current = current.parentPath;
  }
  return false;
}

export function addRequiredTextInputHandler(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData,
  componentName: string
): void {
  if (
    component.isCustom ||
    component.importedName !== 'TextInput' ||
    componentName !== 'TextInput'
  ) {
    return;
  }
  const attributes = getDirectAttributePaths(path);
  const hasSpread = attributes.some((attribute) =>
    attribute.isJSXSpreadAttribute()
  );
  const hasOnFocus = attributes.some(
    (attribute) =>
      attribute.isJSXAttribute() &&
      getNodeName(t, attribute.node.name) === 'onFocus'
  );
  if (!hasSpread && !hasOnFocus) {
    const openingElementPath = path.get(
      'openingElement'
    ) as Babel.NodePath<Babel.types.JSXOpeningElement>;
    openingElementPath.pushContainer(
      'attributes',
      t.jsxAttribute(
        t.jsxIdentifier('onFocus'),
        t.jsxExpressionContainer(
          t.arrowFunctionExpression([], t.blockStatement([]))
        )
      )
    );
  }
}
