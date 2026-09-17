/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import type { PluginState, TrackedComponentData } from '../../types';
import { getDirectAttributePaths, getNodeName } from '../../utils/jsx';

const CONTENT_PROPS = ['trackingLabel', 'title', 'label', 'text'];

function contentCandidateNames(component: TrackedComponentData): string[] {
  return component.contentProp && !CONTENT_PROPS.includes(component.contentProp)
    ? [...CONTENT_PROPS, component.contentProp]
    : CONTENT_PROPS;
}

function elementType(
  t: typeof Babel.types,
  name: Babel.types.JSXOpeningElement['name']
): Babel.types.Expression {
  if (t.isJSXMemberExpression(name)) {
    // Lowercase member receivers (e.g. ui.Text) are variables, not host tags.
    const receiver = t.isJSXIdentifier(name.object)
      ? t.identifier(name.object.name)
      : elementType(t, name.object);
    return t.memberExpression(receiver, t.identifier(name.property.name));
  }
  const value = getNodeName(t, name) || '';
  return t.isJSXIdentifier(name) && !/^[a-z]/.test(value)
    ? t.identifier(value)
    : t.stringLiteral(value);
}

function effectiveAttributes(
  t: typeof Babel.types,
  attributes: Babel.types.JSXOpeningElement['attributes']
): Map<string, Babel.types.JSXAttribute> {
  const result = new Map<string, Babel.types.JSXAttribute>();
  for (const attribute of attributes) {
    if (t.isJSXSpreadAttribute(attribute)) {
      // Do not replay spreads or trust props they may have overridden.
      result.clear();
    } else {
      result.set(getNodeName(t, attribute.name) || '', attribute);
    }
  }
  return result;
}

function contentSourcePaths(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData
): Babel.NodePath[] {
  const candidateNames = contentCandidateNames(component);
  const attributes = new Map<
    string,
    Babel.NodePath<Babel.types.JSXAttribute>
  >();
  for (const attributePath of getDirectAttributePaths(path)) {
    if (!attributePath.isJSXAttribute()) {
      attributes.clear();
      continue;
    }
    attributes.set(
      getNodeName(t, attributePath.node.name) || '',
      attributePath
    );
  }
  const sources: Babel.NodePath[] = [];
  for (const name of candidateNames) {
    const attributePath = attributes.get(name);
    const valuePath = attributePath?.get('value');
    if (valuePath && !Array.isArray(valuePath) && valuePath.node) {
      sources.push(valuePath as Babel.NodePath<Babel.types.Node>);
    }
  }
  return sources.concat(path.get('children') as Babel.NodePath[]);
}

function containsPath(
  root: Babel.NodePath,
  candidate: Babel.NodePath
): boolean {
  let current: Babel.NodePath | null = candidate;
  while (current) {
    if (current === root || current.node === root.node) {
      return true;
    }
    current = current.parentPath;
  }
  return false;
}

/** Checks whether moving content into a memo callback preserves every binding. */
export function isContentVisibleFromScope(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData,
  destinationScope: Babel.NodePath['scope']
): boolean {
  const sources = contentSourcePaths(t, path, component);
  let visible = true;
  const checkReference = (referencePath: Babel.NodePath, name: string) => {
    const sourceBinding = referencePath.scope.getBinding(name);
    if (
      sourceBinding &&
      sources.some((source) => containsPath(source, sourceBinding.path))
    ) {
      return;
    }
    const destinationBinding = destinationScope.getBinding(name);
    if (sourceBinding?.identifier !== destinationBinding?.identifier) {
      visible = false;
    }
  };

  for (const source of sources) {
    source.traverse({
      ReferencedIdentifier(referencePath) {
        checkReference(referencePath, referencePath.node.name);
        if (!visible) {
          referencePath.stop();
        }
      },
      JSXOpeningElement(openingPath) {
        let name = openingPath.node.name;
        let isMember = false;
        while (t.isJSXMemberExpression(name)) {
          isMember = true;
          name = name.object;
        }
        if (
          t.isJSXIdentifier(name) &&
          (isMember || !/^[a-z]/.test(name.name))
        ) {
          checkReference(openingPath, name.name);
        }
        if (!visible) {
          openingPath.stop();
        }
      },
      JSXSpreadAttribute(spreadPath) {
        // Spread attributes are not copied into the content getter.
        spreadPath.skip();
      },
    });
    if (!visible) {
      return false;
    }
  }
  return true;
}

/** Converts JSX anywhere in an expression, including render functions and maps. */
function toRuntimeNode(
  t: typeof Babel.types,
  node: Babel.types.Node,
  react: Babel.types.Identifier
): Babel.types.Node {
  if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    const properties: Babel.types.ObjectProperty[] = [];
    if (t.isJSXElement(node)) {
      for (const [name, attribute] of effectiveAttributes(
        t,
        node.openingElement.attributes
      )) {
        properties.push(
          t.objectProperty(
            t.stringLiteral(name),
            attribute.value
              ? (toRuntimeNode(
                  t,
                  attribute.value,
                  react
                ) as Babel.types.Expression)
              : t.booleanLiteral(true)
          )
        );
      }
    }
    const children = node.children
      .filter(
        (child) =>
          !(t.isJSXText(child) && !child.value.trim()) &&
          !(
            t.isJSXExpressionContainer(child) &&
            t.isJSXEmptyExpression(child.expression)
          )
      )
      .map((child) => toRuntimeNode(t, child, react) as Babel.types.Expression);
    return t.callExpression(
      t.memberExpression(t.cloneNode(react), t.identifier('createElement')),
      [
        t.isJSXElement(node)
          ? elementType(t, node.openingElement.name)
          : t.memberExpression(t.cloneNode(react), t.identifier('Fragment')),
        properties.length ? t.objectExpression(properties) : t.nullLiteral(),
        ...children,
      ]
    );
  }
  if (t.isJSXText(node)) {
    return t.stringLiteral(node.value.replace(/\s+/g, ' ').trim());
  }
  if (t.isJSXExpressionContainer(node)) {
    return toRuntimeNode(t, node.expression, react);
  }
  // Recurse through all expression shapes so cloned JSX cannot survive Babel's
  // JSX visitor or be instrumented a second time inside the content getter.
  const cloned = t.cloneNode(node, false);
  const fields = cloned as unknown as Record<
    string,
    Babel.types.Node | Babel.types.Node[] | null
  >;
  for (const key of t.VISITOR_KEYS[node.type] || []) {
    const value = fields[key];
    if (Array.isArray(value)) {
      fields[key] = value.map((child) =>
        child ? toRuntimeNode(t, child, react) : child
      );
    } else if (value) {
      fields[key] = toRuntimeNode(t, value, react);
    }
  }
  return cloned;
}

/** Matches Datadog's click-time evaluation of content props and JSX children. */
export function buildContentGetter(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData,
  state: PluginState
): Babel.types.ArrowFunctionExpression | null {
  if (!component.useContent) {
    return null;
  }
  const candidateNames = contentCandidateNames(component);
  const attributes = effectiveAttributes(
    t,
    path.node.openingElement.attributes
  );
  const candidates: Babel.types.Expression[] = [];
  for (const name of candidateNames) {
    const attribute = attributes.get(name);
    if (attribute?.value) {
      candidates.push(
        toRuntimeNode(
          t,
          attribute.value,
          state._ftReactIdentifier
        ) as Babel.types.Expression
      );
    }
  }
  const fragment = t.jsxFragment(
    t.jsxOpeningFragment(),
    t.jsxClosingFragment(),
    path.node.children
  );
  return t.arrowFunctionExpression(
    [],
    t.callExpression(t.cloneNode(state._ftExtractTextIdentifier), [
      toRuntimeNode(
        t,
        fragment,
        state._ftReactIdentifier
      ) as Babel.types.Expression,
      t.arrayExpression(candidates),
    ])
  );
}
