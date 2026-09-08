/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';

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

export type NormalizedPluginOptions = {
  actionNameAttribute?: string;
  components: {
    useContent: boolean;
    useNamePrefix: boolean;
    tracked: TrackedComponent[];
  };
};

export type TrackedComponentData = Omit<TrackedComponent, 'name'> & {
  importedName?: string;
  isCustom: boolean;
  useContent: boolean;
  useNamePrefix: boolean;
};

export type ActionMetadata = {
  accessibilityLabels: Babel.types.StringLiteral[];
  actionNames: Babel.types.StringLiteral[];
  component: TrackedComponentData;
  componentName: string;
  customActionNames: Babel.types.StringLiteral[];
  getContent: Babel.types.ArrowFunctionExpression | null;
};

export type PluginState = Babel.PluginPass & {
  _ftCustomNames: Set<string>;
  _ftHasWrappedAction: boolean;
  _ftMemoizedHandlers: Set<Babel.types.Node>;
  _ftSkip: boolean;
  _ftTrackedComponents: Record<string, TrackedComponentData>;
  _ftTrackingIdentifier: Babel.types.Identifier;
};

export type PluginAPI = typeof Babel & Babel.ConfigAPI;

export type JSXAttributePath = Babel.NodePath<
  Babel.types.JSXAttribute | Babel.types.JSXSpreadAttribute
>;
