/*
 * Portions of this file are adapted from Datadog's dd-sdk-reactnative Babel
 * interaction tracking implementation, licensed under Apache-2.0.
 */

import type * as Babel from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';
import { insertPluginEnabledFlag } from './actions/global';
import { handleJSXElement, insertRuntimeImports } from './actions/rum';
import { mergeOptions } from './options';
import { initializePluginState, isSkippedFile } from './state';
import type { PluginAPI, PluginOptions, PluginState } from './types';

export type { PluginOptions, TrackedComponent, TrackedHandler } from './types';

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
            initializePluginState(t, programPath, state, options);
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
