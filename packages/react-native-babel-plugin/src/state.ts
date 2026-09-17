/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { createTrackedComponents } from './actions/rum/components';
import type { NormalizedPluginOptions, PluginState } from './types';

export function isSkippedFile(state: PluginState): boolean {
  const caller = state.file?.opts?.caller as { platform?: string } | undefined;
  const filename = state.filename || state.file?.opts?.filename;
  return (
    caller?.platform === 'web' ||
    Boolean(filename && filename.includes('node_modules'))
  );
}

/** Initializes per-file state; identifiers and memoization never leak across files. */
export function initializePluginState(
  t: typeof Babel.types,
  programPath: Babel.NodePath<Babel.types.Program>,
  state: PluginState,
  options: NormalizedPluginOptions
): void {
  state._ftTrackedComponents = createTrackedComponents(t, programPath, options);
  state._ftCustomNames = new Set(
    options.components.tracked.map((component) => component.name)
  );
  state._ftMemoizedHandlers = new Set();
  state._ftHasWrappedAction = false;
  state._ftNeedsContentRuntime = false;
  state._ftExtractTextIdentifier =
    programPath.scope.generateUidIdentifier('ftExtractText');
  state._ftReactIdentifier = programPath.scope.generateUidIdentifier('FTReact');
  state._ftTrackingIdentifier = programPath.scope.generateUidIdentifier(
    'FTBabelInteractionTracking'
  );
}
