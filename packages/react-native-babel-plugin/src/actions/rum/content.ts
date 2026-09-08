/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import type { TrackedComponentData } from '../../types';
import { getNodeName } from '../../utils/jsx';

const LABEL_PROPS = ['label', 'title', 'text'];

type StaticText = { values: string[]; hasLabel: boolean };
const NO_TEXT: StaticText = { values: [], hasLabel: false };

function collectStaticChildren(
  t: typeof Babel.types,
  children: Babel.types.Node[]
): string[] {
  const values: string[] = [];
  let labeledChildCount = 0;
  for (const child of children) {
    const text = getStaticText(t, child);
    if (text.hasLabel || text.values.length > 0) {
      labeledChildCount += 1;
    }
    for (const value of text.values) {
      values.push(value);
    }
  }
  if (labeledChildCount > 1) {
    return Array.from(new Set(values));
  }
  return values.length > 0 ? [values.join(' ')] : [];
}

function getStaticAttributes(
  t: typeof Babel.types,
  attributes: Babel.types.JSXOpeningElement['attributes'],
  names: string[]
): Map<string, StaticText> {
  const values = new Map<string, StaticText>();
  for (const attribute of attributes) {
    if (t.isJSXSpreadAttribute(attribute)) {
      // A spread may override earlier props. Never evaluate or copy it for naming.
      values.clear();
      continue;
    }
    const name = getNodeName(t, attribute.name);
    if (name && names.includes(name)) {
      values.set(name, getStaticText(t, attribute.value));
    }
  }
  return values;
}

/** Reads literals and JSX structure only; never resolves bindings or evaluates code. */
function getStaticText(
  t: typeof Babel.types,
  node: Babel.types.Node | null | undefined
): StaticText {
  if (!node) {
    return NO_TEXT;
  }
  if (t.isJSXExpressionContainer(node)) {
    return getStaticText(t, node.expression);
  }
  if (
    t.isJSXText(node) ||
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node)
  ) {
    const value = String(node.value).replace(/\s+/g, ' ').trim();
    return { values: value ? [value] : [], hasLabel: false };
  }
  if (t.isJSXFragment(node)) {
    return { values: collectStaticChildren(t, node.children), hasLabel: false };
  }
  if (t.isJSXElement(node)) {
    const attributes = getStaticAttributes(t, node.openingElement.attributes, [
      ...LABEL_PROPS,
      'children',
    ]);
    const hasLabel = LABEL_PROPS.some((name) => attributes.has(name));
    for (const name of LABEL_PROPS) {
      const label = attributes.get(name);
      if (label && label.values.length > 0) {
        return { values: label.values, hasLabel };
      }
    }
    const hasChildren = node.children.some(
      (child) =>
        !(t.isJSXText(child) && !child.value.trim()) &&
        !(
          t.isJSXExpressionContainer(child) &&
          t.isJSXEmptyExpression(child.expression)
        )
    );
    return {
      values: hasChildren
        ? collectStaticChildren(t, node.children)
        : attributes.get('children')?.values || [],
      hasLabel,
    };
  }
  // Calls, member/variable reads, conditions, render props, and other dynamic
  // expressions belong to the application's render flow, never to action naming.
  return NO_TEXT;
}

/** Emits precomputed text, so clicks do not recreate React elements or run user code. */
export function buildContentGetter(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData
): Babel.types.ArrowFunctionExpression | null {
  if (!component.useContent) {
    return null;
  }
  const candidateNames = ['trackingLabel', 'title', 'label', 'text'];
  if (component.contentProp) {
    candidateNames.push(component.contentProp);
  }
  const candidates = getStaticAttributes(
    t,
    path.node.openingElement.attributes,
    candidateNames
  );
  let values: string[] = [];
  for (const candidate of candidates.values()) {
    for (const value of candidate.values) {
      values.push(value);
    }
  }
  // Static preferred props already determine the result; do not scan children.
  if (values.length === 0) {
    values = collectStaticChildren(t, path.node.children);
  }
  return values.length > 0
    ? t.arrowFunctionExpression(
        [],
        t.arrayExpression(values.map((value) => t.stringLiteral(value)))
      )
    : null;
}
