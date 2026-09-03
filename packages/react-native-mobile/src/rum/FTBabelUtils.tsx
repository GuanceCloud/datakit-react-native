import React from 'react';

const LABEL_PROPS = ['label', 'title', 'text'] as const;

const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();

function flattenText(values: unknown[]): string[] {
  const output: string[] = [];
  for (const value of values) {
    output.push(...__ftExtractText(value));
  }
  return output.map(normalize).filter(Boolean);
}

export function __ftExtractText(node: any, prefer?: any[]): string[] {
  if (Array.isArray(prefer)) {
    const preferred = flattenText(prefer);
    if (preferred.length > 0) {
      return preferred;
    }
  }

  if (node == null || typeof node === 'boolean') {
    return [];
  }
  if (typeof node === 'string' || typeof node === 'number') {
    const value = normalize(String(node));
    return value ? [value] : [];
  }
  if (Array.isArray(node)) {
    return flattenText(node);
  }
  if (
    typeof node === 'object' &&
    typeof Symbol !== 'undefined' &&
    Symbol.iterator in node
  ) {
    return flattenText(Array.from(node as Iterable<unknown>));
  }
  if (typeof node === 'function' && node.length === 0) {
    try {
      return __ftExtractText(node());
    } catch (_error) {
      return [];
    }
  }
  if (!React.isValidElement(node)) {
    return [];
  }

  const props = (node.props || {}) as Record<string, unknown>;
  for (const propertyName of LABEL_PROPS) {
    if (props[propertyName] != null) {
      const label = __ftExtractText(props[propertyName]);
      if (label.length > 0) {
        return label;
      }
    }
  }

  const rawChildren = Array.isArray(props.children)
    ? props.children
    : [props.children];
  const children = rawChildren.filter(
    (child) => child != null && child !== false
  );
  if (children.length === 0) {
    return [];
  }

  const perChild = children.map((child) => __ftExtractText(child));
  let labeledChildCount = 0;
  children.forEach((child, index) => {
    const childProps = React.isValidElement(child)
      ? ((child.props || {}) as Record<string, unknown>)
      : null;
    const hasLabelProperty =
      childProps !== null &&
      LABEL_PROPS.some((propertyName) => childProps[propertyName] != null);
    if (hasLabelProperty || perChild[index].length > 0) {
      labeledChildCount += 1;
    }
  });

  const flattened = flattenText(perChild);
  if (labeledChildCount > 1) {
    return Array.from(new Set(flattened));
  }
  const joined = normalize(flattened.join(' '));
  return joined ? [joined] : [];
}
