const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the example's real lifecycle callbacks with a controlled millisecond clock.
function loadExample(filename) {
  let now = 1000;
  let componentListener;
  const reports = [];
  const react = { createElement: () => null };
  const rum = {
    onCreateView: (name, duration) => reports.push({ name, duration }),
    startView: () => {},
    stopView: () => {},
  };
  const dependencies = {
    'react': react,
    'react-native': { AppState: { addEventListener: () => {} } },
    '@cloudcare/react-native-mobile': { FTReactNativeRUM: rum },
    'react-native-navigation': {
      Navigation: {
        events: () => ({
          registerComponentListener: (listener) => { componentListener = listener; },
        }),
      },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../example/src', filename), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    Date: class extends Date { constructor() { super(now); } },
    console: { log: () => {} },
  }, { filename });
  return {
    exports, react, reports,
    setTime: (time) => { now = time; },
    getComponentListener: () => componentListener,
  };
}

// Expected values follow the API's nanosecond unit: 1 millisecond = 1,000,000 ns.
for (const [elapsedMs, expectedNs] of [[0, 0], [25, 25_000_000], [100, 100_000_000]]) {
  test(`React Navigation reports ${elapsedMs} ms as ${expectedNs} ns`, () => {
    const fixture = loadExample('FTRumReactNavigationTracking.tsx');
    const { StackListener } = fixture.exports.FTRumReactNavigationTracking;
    const route = { key: 'screen-1', name: 'Screen' };
    StackListener.focus({ target: route.key });
    StackListener.state({ data: { state: { index: 0, routes: [route] } } });
    fixture.setTime(1000 + elapsedMs);
    StackListener.transitionEnd({ target: route.key, data: { closing: false } });
    assert.deepEqual(fixture.reports, [{ name: 'Screen', duration: expectedNs }]);
  });

  test(`React Native Navigation reports ${elapsedMs} ms as ${expectedNs} ns`, () => {
    const fixture = loadExample('FTRumReactNativeNavigationTracking.tsx');
    const tracking = fixture.exports.FTRumReactNativeNavigationTracking;
    tracking.startTracking();
    fixture.react.createElement('Screen', { componentId: 'screen-1' });
    const listener = fixture.getComponentListener();
    listener.componentWillAppear();
    fixture.setTime(1000 + elapsedMs);
    listener.componentDidAppear({ componentName: 'Screen' });
    assert.deepEqual(fixture.reports, [{ name: 'Screen', duration: expectedNs }]);
    tracking.stopTracking();
  });
}

test('React Native Navigation preserves zero when the start callback is missing', () => {
  const fixture = loadExample('FTRumReactNativeNavigationTracking.tsx');
  const tracking = fixture.exports.FTRumReactNativeNavigationTracking;
  tracking.startTracking();
  fixture.react.createElement('Screen', { componentId: 'screen-1' });
  fixture.getComponentListener().componentDidAppear({ componentName: 'Screen' });
  assert.deepEqual(fixture.reports, [{ name: 'Screen', duration: 0 }]);
  tracking.stopTracking();
});
