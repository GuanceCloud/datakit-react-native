/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type { NormalizedPluginOptions, PluginOptions } from './types';

export function mergeOptions(
  options: PluginOptions = {}
): NormalizedPluginOptions {
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
