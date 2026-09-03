/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';

const RUNTIME_PACKAGE = '@cloudcare/react-native-mobile';
const ACTION_NAME_ATTRIBUTE = 'ft-action-name';
const PLUGIN_ENABLED_FLAG = '__FT_RN_BABEL_PLUGIN_ENABLED__';

const NATIVE_COMPONENT_HANDLERS: Record<string, string[]> = {
  Button: ['onPress'],
  Pressable: ['onPress', 'onLongPress'],
  TouchableOpacity: ['onPress'],
  TouchableHighlight: ['onPress'],
  TouchableWithoutFeedback: ['onPress'],
  TouchableNativeFeedback: ['onPress'],
  Switch: ['onValueChange'],
  TextInput: ['onFocus'],
};

export type TrackedHandler = {
  event: string;
  action: 'TAP';
  mode?: 'default' | 'delayed';
};

export type TrackedComponent = {
  name: string;
  useContent?: boolean;
  useNamePrefix?: boolean;
  contentProp?: string;
  handlers: TrackedHandler[];
};

export type PluginOptions = {
  actionNameAttribute?: string;
  components?: {
    useContent?: boolean;
    useNamePrefix?: boolean;
    tracked?: TrackedComponent[];
  };
};

type NormalizedPluginOptions = {
  actionNameAttribute?: string;
  components: {
    useContent: boolean;
    useNamePrefix: boolean;
    tracked: TrackedComponent[];
  };
};

type TrackedComponentData = Omit<TrackedComponent, 'name'> & {
  importedName?: string;
  isCustom: boolean;
  useContent: boolean;
  useNamePrefix: boolean;
};

type ActionMetadata = {
  accessibilityLabels: Babel.types.StringLiteral[];
  actionNames: Babel.types.StringLiteral[];
  component: TrackedComponentData;
  componentName: string;
  customActionNames: Babel.types.StringLiteral[];
  getContent: Babel.types.ArrowFunctionExpression | null;
};

type PluginState = Babel.PluginPass & {
  _ftCustomNames: Set<string>;
  _ftExtractTextIdentifier: Babel.types.Identifier;
  _ftHasWrappedAction: boolean;
  _ftMemoizedHandlers: Set<Babel.types.Node>;
  _ftNeedsExtractText: boolean;
  _ftNeedsReact: boolean;
  _ftProgramPath: Babel.NodePath<Babel.types.Program>;
  _ftReactIdentifier: Babel.types.Identifier;
  _ftSkip: boolean;
  _ftTrackedComponents: Record<string, TrackedComponentData>;
  _ftTrackingIdentifier: Babel.types.Identifier;
};

type PluginAPI = typeof Babel & Babel.ConfigAPI;
type JSXAttributePath = Babel.NodePath<
  Babel.types.JSXAttribute | Babel.types.JSXSpreadAttribute
>;

function mergeOptions(options: PluginOptions = {}): NormalizedPluginOptions {
  const componentOptions = options.components || {};
  return {
    actionNameAttribute: options.actionNameAttribute,
    components: {
      tracked: componentOptions.tracked || [],
      useContent:
        componentOptions.useContent === undefined
          ? true
          : componentOptions.useContent,
      useNamePrefix:
        componentOptions.useNamePrefix === undefined
          ? true
          : componentOptions.useNamePrefix,
    },
  };
}

function getNodeName(
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
    const objectName = getNodeName(t, node.object);
    return objectName ? `${objectName}.${node.property.name}` : null;
  }
  if ('name' in node && node.name && typeof node.name !== 'string') {
    return getNodeName(t, node.name);
  }
  return null;
}

function isSkippedFile(state: PluginState): boolean {
  const caller = state.file?.opts?.caller as { platform?: string } | undefined;
  const filename = state.filename || state.file?.opts?.filename;
  return (
    caller?.platform === 'web' ||
    Boolean(filename && filename.includes('node_modules'))
  );
}

function createTrackedComponents(
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

function insertPluginEnabledFlag(
  t: typeof Babel.types,
  programPath: Babel.NodePath<Babel.types.Program>
): void {
  programPath.unshiftContainer(
    'body',
    t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(
          t.identifier('globalThis'),
          t.identifier(PLUGIN_ENABLED_FLAG)
        ),
        t.booleanLiteral(true)
      )
    )
  );
}

function isInsideConfiguredComponent(
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

function getDirectAttributePaths(
  path: Babel.NodePath<Babel.types.JSXElement>
): JSXAttributePath[] {
  return path.get('openingElement.attributes') as JSXAttributePath[];
}

function collectStaticAttributeValues(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  attributeName: string | undefined
): Babel.types.StringLiteral[] {
  if (!attributeName) {
    return [];
  }
  const values: Babel.types.StringLiteral[] = [];
  path.traverse({
    JSXAttribute(attributePath) {
      if (
        getNodeName(t, attributePath.node.name) === attributeName &&
        t.isStringLiteral(attributePath.node.value)
      ) {
        values.push(t.cloneNode(attributePath.node.value, true));
      }
    },
  });
  return values;
}

function jsxNameToExpression(
  t: typeof Babel.types,
  nameNode:
    | Babel.types.JSXIdentifier
    | Babel.types.JSXMemberExpression
    | Babel.types.JSXNamespacedName,
  reactIdentifier: Babel.types.Identifier
): Babel.types.Expression {
  if (t.isJSXIdentifier(nameNode)) {
    return /^[a-z]/.test(nameNode.name)
      ? t.stringLiteral(nameNode.name)
      : t.identifier(nameNode.name);
  }
  if (t.isJSXMemberExpression(nameNode)) {
    return t.memberExpression(
      jsxNameToExpression(t, nameNode.object, reactIdentifier),
      t.identifier(nameNode.property.name)
    );
  }
  if (t.isJSXNamespacedName(nameNode)) {
    return t.stringLiteral(`${nameNode.namespace.name}:${nameNode.name.name}`);
  }
  return t.memberExpression(
    t.cloneNode(reactIdentifier),
    t.identifier('Fragment')
  );
}

function convertChildToExpression(
  t: typeof Babel.types,
  child: Babel.types.Node,
  reactIdentifier: Babel.types.Identifier
): Babel.types.Expression | null {
  if (t.isJSXText(child)) {
    const text = child.value.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? t.stringLiteral(text) : null;
  }

  if (t.isJSXExpressionContainer(child)) {
    if (t.isJSXEmptyExpression(child.expression)) {
      return null;
    }
    return (
      convertChildToExpression(t, child.expression, reactIdentifier) ||
      t.cloneNode(child.expression, true)
    );
  }

  if (t.isConditionalExpression(child)) {
    return t.conditionalExpression(
      t.cloneNode(child.test, true),
      convertChildToExpression(t, child.consequent, reactIdentifier) ||
        t.cloneNode(child.consequent, true),
      convertChildToExpression(t, child.alternate, reactIdentifier) ||
        t.cloneNode(child.alternate, true)
    );
  }

  if (t.isLogicalExpression(child)) {
    const right = convertChildToExpression(t, child.right, reactIdentifier);
    return right
      ? t.logicalExpression(
          child.operator,
          t.cloneNode(child.left, true),
          right
        )
      : t.cloneNode(child, true);
  }

  if (t.isJSXFragment(child)) {
    const children = child.children
      .map((item) => convertChildToExpression(t, item, reactIdentifier))
      .filter((item): item is Babel.types.Expression => item !== null);
    return t.callExpression(
      t.memberExpression(
        t.cloneNode(reactIdentifier),
        t.identifier('createElement')
      ),
      [
        t.memberExpression(
          t.cloneNode(reactIdentifier),
          t.identifier('Fragment')
        ),
        t.nullLiteral(),
        ...children,
      ]
    );
  }

  if (t.isJSXElement(child)) {
    const properties: Array<
      Babel.types.ObjectProperty | Babel.types.SpreadElement
    > = [];
    for (const attribute of child.openingElement.attributes) {
      if (t.isJSXSpreadAttribute(attribute)) {
        properties.push(t.spreadElement(t.cloneNode(attribute.argument, true)));
        continue;
      }

      const attributeName = getNodeName(t, attribute.name) || '';
      const key = t.isValidIdentifier(attributeName)
        ? t.identifier(attributeName)
        : t.stringLiteral(attributeName);
      let value: Babel.types.Expression;
      if (!attribute.value) {
        value = t.booleanLiteral(true);
      } else if (t.isStringLiteral(attribute.value)) {
        value = t.cloneNode(attribute.value, true);
      } else if (
        t.isJSXExpressionContainer(attribute.value) &&
        !t.isJSXEmptyExpression(attribute.value.expression)
      ) {
        value =
          convertChildToExpression(
            t,
            attribute.value.expression,
            reactIdentifier
          ) || t.cloneNode(attribute.value.expression, true);
      } else {
        value = t.identifier('undefined');
      }
      properties.push(t.objectProperty(key, value));
    }

    const children = child.children
      .map((item) => convertChildToExpression(t, item, reactIdentifier))
      .filter((item): item is Babel.types.Expression => item !== null);
    return t.callExpression(
      t.memberExpression(
        t.cloneNode(reactIdentifier),
        t.identifier('createElement')
      ),
      [
        jsxNameToExpression(t, child.openingElement.name, reactIdentifier),
        properties.length > 0
          ? t.objectExpression(properties)
          : t.nullLiteral(),
        ...children,
      ]
    );
  }

  return t.isExpression(child) ? t.cloneNode(child, true) : null;
}

function getContentCandidates(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData,
  reactIdentifier: Babel.types.Identifier
): Babel.types.Expression[] {
  const candidateNames = ['trackingLabel', 'title', 'label', 'text'];
  if (component.contentProp) {
    candidateNames.push(component.contentProp);
  }

  const candidates: Babel.types.Expression[] = [];
  for (const attributePath of getDirectAttributePaths(path)) {
    if (!attributePath.isJSXAttribute()) {
      continue;
    }
    const attribute = attributePath.node;
    const name = getNodeName(t, attribute.name);
    if (!name || !candidateNames.includes(name) || !attribute.value) {
      continue;
    }
    if (t.isStringLiteral(attribute.value)) {
      candidates.push(t.cloneNode(attribute.value, true));
    } else if (
      t.isJSXExpressionContainer(attribute.value) &&
      !t.isJSXEmptyExpression(attribute.value.expression)
    ) {
      candidates.push(
        convertChildToExpression(
          t,
          attribute.value.expression,
          reactIdentifier
        ) || t.cloneNode(attribute.value.expression, true)
      );
    }
  }
  return candidates;
}

function buildContentGetter(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  component: TrackedComponentData,
  state: PluginState
): Babel.types.ArrowFunctionExpression | null {
  if (!component.useContent) {
    return null;
  }
  state._ftNeedsReact = true;
  state._ftNeedsExtractText = true;

  const children = path.node.children
    .map((child) =>
      convertChildToExpression(t, child, state._ftReactIdentifier)
    )
    .filter((item): item is Babel.types.Expression => item !== null);
  const fragment = t.callExpression(
    t.memberExpression(
      t.cloneNode(state._ftReactIdentifier),
      t.identifier('createElement')
    ),
    [
      t.memberExpression(
        t.cloneNode(state._ftReactIdentifier),
        t.identifier('Fragment')
      ),
      t.nullLiteral(),
      ...children,
    ]
  );
  const candidates = getContentCandidates(
    t,
    path,
    component,
    state._ftReactIdentifier
  );

  return t.arrowFunctionExpression(
    [],
    t.callExpression(t.cloneNode(state._ftExtractTextIdentifier), [
      fragment,
      t.arrayExpression(candidates),
    ])
  );
}

function buildTargetObject(
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

function buildHandlerWrapper(
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

function wrapMemoizedHandler(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXAttribute>,
  expression: Babel.types.Expression,
  metadata: ActionMetadata,
  state: PluginState,
  mode: TrackedHandler['mode']
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

  callbackPath.replaceWith(
    buildHandlerWrapper(
      t,
      callback,
      metadata,
      state,
      callbackPath.scope,
      memoizationName === 'useMemo' ? 'delayed' : mode
    )
  );
  state._ftMemoizedHandlers.add(declaratorPath.node);
  state._ftHasWrappedAction = true;
  return true;
}

function addRequiredTextInputHandler(
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

function buildMetadata(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  componentName: string,
  component: TrackedComponentData,
  options: NormalizedPluginOptions,
  state: PluginState
): ActionMetadata {
  const customAttribute = options.actionNameAttribute;
  return {
    accessibilityLabels: collectStaticAttributeValues(
      t,
      path,
      'accessibilityLabel'
    ),
    actionNames: collectStaticAttributeValues(t, path, ACTION_NAME_ATTRIBUTE),
    component,
    componentName,
    customActionNames:
      customAttribute &&
      customAttribute !== ACTION_NAME_ATTRIBUTE &&
      customAttribute !== 'accessibilityLabel'
        ? collectStaticAttributeValues(t, path, customAttribute)
        : [],
    getContent: buildContentGetter(t, path, component, state),
  };
}

function handleJSXElement(
  t: typeof Babel.types,
  path: Babel.NodePath<Babel.types.JSXElement>,
  state: PluginState,
  options: NormalizedPluginOptions
): void {
  const componentName = getNodeName(t, path.node.openingElement.name);
  const component = componentName
    ? state._ftTrackedComponents[componentName]
    : undefined;
  if (
    !componentName ||
    !component ||
    isInsideConfiguredComponent(t, path, state._ftCustomNames)
  ) {
    return;
  }

  addRequiredTextInputHandler(t, path, component, componentName);
  const metadata = buildMetadata(
    t,
    path,
    componentName,
    component,
    options,
    state
  );

  for (const attributePath of getDirectAttributePaths(path)) {
    if (
      !attributePath.isJSXAttribute() ||
      attributePath.node.extra?.__ftWrappedAction
    ) {
      continue;
    }
    const attributeName = getNodeName(t, attributePath.node.name);
    const handler = component.handlers.find(
      (item) => item.action === 'TAP' && item.event === attributeName
    );
    if (!handler) {
      continue;
    }
    const value = attributePath.node.value;
    if (!t.isJSXExpressionContainer(value)) {
      continue;
    }
    const expression = value.expression;
    if (
      !t.isArrowFunctionExpression(expression) &&
      !t.isIdentifier(expression) &&
      !t.isMemberExpression(expression)
    ) {
      continue;
    }

    if (
      !wrapMemoizedHandler(
        t,
        attributePath,
        expression,
        metadata,
        state,
        handler.mode
      )
    ) {
      attributePath.node.value = t.jsxExpressionContainer(
        buildHandlerWrapper(
          t,
          expression,
          metadata,
          state,
          attributePath.scope,
          handler.mode
        )
      );
      state._ftHasWrappedAction = true;
    }
    attributePath.node.extra = {
      ...attributePath.node.extra,
      __ftWrappedAction: true,
    };
  }
}

function insertRuntimeImports(
  t: typeof Babel.types,
  programPath: Babel.NodePath<Babel.types.Program>,
  state: PluginState
): void {
  if (!state._ftHasWrappedAction) {
    return;
  }
  const runtimeSpecifiers = [
    t.importSpecifier(
      t.cloneNode(state._ftTrackingIdentifier),
      t.identifier('FTBabelInteractionTracking')
    ),
  ];
  if (state._ftNeedsExtractText) {
    runtimeSpecifiers.push(
      t.importSpecifier(
        t.cloneNode(state._ftExtractTextIdentifier),
        t.identifier('__ftExtractText')
      )
    );
  }
  const imports: Babel.types.ImportDeclaration[] = [
    t.importDeclaration(runtimeSpecifiers, t.stringLiteral(RUNTIME_PACKAGE)),
  ];
  if (state._ftNeedsReact) {
    imports.push(
      t.importDeclaration(
        [t.importNamespaceSpecifier(t.cloneNode(state._ftReactIdentifier))],
        t.stringLiteral('react')
      )
    );
  }
  programPath.unshiftContainer('body', imports);
}

const plugin = declare(
  (api: PluginAPI, rawOptions: PluginOptions): Babel.PluginObj<PluginState> => {
    api.assertVersion(7);
    const t = api.types;
    const options = mergeOptions(rawOptions);

    return {
      name: 'cloudcare-react-native-action-name',
      visitor: {
        Program: {
          enter(programPath, state) {
            state._ftSkip = isSkippedFile(state);
            if (state._ftSkip) {
              return;
            }
            state._ftProgramPath = programPath;
            state._ftTrackedComponents = createTrackedComponents(
              t,
              programPath,
              options
            );
            state._ftCustomNames = new Set(
              options.components.tracked.map((component) => component.name)
            );
            state._ftMemoizedHandlers = new Set();
            state._ftHasWrappedAction = false;
            state._ftNeedsExtractText = false;
            state._ftNeedsReact = false;
            state._ftTrackingIdentifier =
              programPath.scope.generateUidIdentifier(
                'FTBabelInteractionTracking'
              );
            state._ftExtractTextIdentifier =
              programPath.scope.generateUidIdentifier('ftExtractText');
            state._ftReactIdentifier =
              programPath.scope.generateUidIdentifier('FTReact');
            insertPluginEnabledFlag(t, programPath);
          },
          exit(programPath, state) {
            if (!state._ftSkip) {
              insertRuntimeImports(t, programPath, state);
            }
          },
        },
        JSXElement(path, state) {
          if (!state._ftSkip) {
            handleJSXElement(t, path, state, options);
          }
        },
      },
    };
  }
);

export default plugin;
