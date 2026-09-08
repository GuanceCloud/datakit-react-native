declare module '@babel/helper-plugin-utils' {
  import type * as Babel from '@babel/core';

  export function declare<TOptions, TState extends Babel.PluginPass>(
    builder: (
      api: typeof Babel & Babel.ConfigAPI,
      options: TOptions,
      dirname: string
    ) => Babel.PluginObj<TState>
  ): (
    api: typeof Babel & Babel.ConfigAPI,
    options: TOptions,
    dirname: string
  ) => Babel.PluginObj<TState>;
}
