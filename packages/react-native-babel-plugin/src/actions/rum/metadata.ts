/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { ACTION_NAME_ATTRIBUTE } from '../../constants';
import type {
  ActionMetadata,
  NormalizedPluginOptions,
  TrackedComponentData,
} from '../../types';
import { getNodeName } from '../../utils/jsx';
import { buildContentGetter } from './content';

function collectStaticActionNames(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  customAttribute: string | undefined
): Pick<
  ActionMetadata,
  'actionNames' | 'customActionNames' | 'accessibilityLabels'
> {
  const values: Pick<
    ActionMetadata,
    'actionNames' | 'customActionNames' | 'accessibilityLabels'
  > = {
    actionNames: [],
    customActionNames: [],
    accessibilityLabels: [],
  };
  path.traverse({
    JSXAttribute(attributePath) {
      if (!t.isStringLiteral(attributePath.node.value)) {
        return;
      }
      const name = getNodeName(t, attributePath.node.name);
      const field =
        name === ACTION_NAME_ATTRIBUTE
          ? values.actionNames
          : name === 'accessibilityLabel'
          ? values.accessibilityLabels
          : name === customAttribute
          ? values.customActionNames
          : null;
      if (field) {
        field.push(t.cloneNode(attributePath.node.value, true));
      }
    },
  });
  return values;
}

export function buildMetadata(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  componentName: string,
  component: TrackedComponentData,
  options: NormalizedPluginOptions
): ActionMetadata {
  const names = collectStaticActionNames(t, path, options.actionNameAttribute);
  const hasStaticName = Object.values(names).some((values) =>
    values.some((value) => value.value.trim().length > 0)
  );
  return {
    ...names,
    component,
    componentName,
    getContent: hasStaticName ? null : buildContentGetter(t, path, component),
  };
}

export function buildTargetObject(
  t: typeof Babel.types,
  metadata: ActionMetadata,
  handlerArgsIdentifier: Babel.types.Identifier
): Babel.types.ObjectExpression {
  const properties: Babel.types.ObjectProperty[] = [
    t.objectProperty(
      t.identifier('options'),
      t.objectExpression([
        t.objectProperty(
          t.identifier('useContent'),
          t.booleanLiteral(metadata.component.useContent)
        ),
        t.objectProperty(
          t.identifier('useNamePrefix'),
          t.booleanLiteral(metadata.component.useNamePrefix)
        ),
      ])
    ),
    t.objectProperty(
      t.identifier('handlerArgs'),
      t.cloneNode(handlerArgsIdentifier)
    ),
    t.objectProperty(
      t.identifier('componentName'),
      t.stringLiteral(metadata.componentName)
    ),
  ];

  if (metadata.actionNames.length > 0) {
    properties.push(
      t.objectProperty(
        t.stringLiteral(ACTION_NAME_ATTRIBUTE),
        t.arrayExpression(
          metadata.actionNames.map((value) => t.cloneNode(value, true))
        )
      )
    );
  }
  if (metadata.customActionNames.length > 0) {
    properties.push(
      t.objectProperty(
        t.identifier('customActionName'),
        t.arrayExpression(
          metadata.customActionNames.map((value) => t.cloneNode(value, true))
        )
      )
    );
  }
  if (metadata.accessibilityLabels.length > 0) {
    properties.push(
      t.objectProperty(
        t.identifier('accessibilityLabel'),
        t.arrayExpression(
          metadata.accessibilityLabels.map((value) => t.cloneNode(value, true))
        )
      )
    );
  }
  if (metadata.getContent) {
    properties.push(
      t.objectProperty(
        t.identifier('getContent'),
        t.cloneNode(metadata.getContent, true)
      )
    );
  }
  return t.objectExpression(properties);
}
