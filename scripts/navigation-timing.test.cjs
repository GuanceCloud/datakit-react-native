const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise real package exports and the real coordinator, with no native runtime.
// Each plugin must load without resolving the other navigation library.
function fixture(directory) {
  let now = 1000;
  const reports = [];
  const starts = [];
  const callbacks = {};
  const native = {
    onCreateViewWithLoadStart: (name, duration, epoch) => {
      reports.push({ name, duration, epoch });
      return Promise.resolve();
    },
    startViewWithTrackingType: (name, properties, type) => {
      starts.push({ name, properties, type });
      return Promise.resolve();
    },
  };
  const events = Object.fromEntries(
    ['WillAppear', 'DidAppear', 'DidDisappear'].map((event) => [
      `registerComponent${event}Listener`,
      (listener) => {
        callbacks[event] = listener;
        return { remove() {} };
      },
    ])
  );
  const dependencies = {
    'react-native': {
      AppState: {
        currentState: 'active',
        addEventListener: () => ({ remove() {} }),
      },
    },
    '../ft_rum': { FTReactNativeRUM: { stopView: () => Promise.resolve() } },
    '../ft_mobile_agent': {
      bridgeContextManager: { mergeWithLocalPropertiesSync: () => ({}) },
    },
    '../specs/NativeFTReactNativeRUM': { default: native },
  };
  if (directory === 'react-native-navigation')
    dependencies['react-native-navigation'] = {
      Navigation: { events: () => events },
    };

  const modules = new Map();
  function load(relativePath) {
    const filename = path.resolve(__dirname, '..', relativePath);
    if (modules.has(filename)) return modules.get(filename);
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
        fileName: filename,
      }
    );
    const exports = {};
    modules.set(filename, exports);
    vm.runInNewContext(
      outputText,
      {
        exports,
        require(name) {
          if (Object.hasOwn(dependencies, name)) return dependencies[name];
          if (name.startsWith('./'))
            return load(path.resolve(path.dirname(filename), `${name}.ts`));
          assert.ok(
            Object.hasOwn(dependencies, name),
            `Unexpected dependency: ${name}`
          );
          return dependencies[name];
        },
        Date: { now: () => 1700000000001 },
        performance: { now: () => now },
        console,
      },
      { filename }
    );
    return exports;
  }
  dependencies['@cloudcare/react-native-mobile'] = load(
    'packages/react-native-mobile/src/rum/FTRumViewTracking.ts'
  );
  return {
    exports: load(`packages/${directory}/src/index.ts`),
    callbacks,
    reports,
    starts,
    setTime(time) {
      now = time;
    },
  };
}

for (const [elapsedMs, expectedNs] of [
  [0, 0],
  [25.5, 25500000],
  [100, 100000000],
]) {
  for (const directory of ['react-navigation', 'react-native-navigation']) {
    test(`${directory}: ${elapsedMs} ms produces ${expectedNs} ns`, () => {
      const context = fixture(directory);
      if (directory === 'react-navigation') {
        const adapter = context.exports.FTRumReactNavigationTracking;
        const listeners = adapter.StackListener;
        const route = { key: 'screen', name: 'Screen' };
        listeners.focus({ target: route.key });
        listeners.state({ data: { state: { index: 0, routes: [route] } } });
        context.setTime(1000 + elapsedMs);
        listeners.transitionEnd({
          target: route.key,
          data: { closing: false },
        });
        adapter.stopTrackingViews();
      } else {
        const adapter = context.exports.FTRumReactNativeNavigationTracking;
        adapter.startTracking();
        const event = {
          componentId: 'screen',
          componentName: 'Screen',
          componentType: 'Component',
        };
        context.callbacks.WillAppear(event);
        context.setTime(1000 + elapsedMs);
        context.callbacks.DidAppear(event);
        adapter.stopTracking();
      }
      assert.deepEqual(
        context.reports,
        expectedNs > 0
          ? [{ name: 'Screen', duration: expectedNs, epoch: 1700000000001 }]
          : []
      );
      assert.equal(context.starts.length, 1);
      assert.equal(context.starts[0].name, 'Screen');
      assert.equal(context.starts[0].type, 1);
    });
  }
}
