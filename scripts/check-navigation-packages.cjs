const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(
  path.join(os.tmpdir(), 'guance-navigation-packages-')
);
const plugins = [
  [
    'react-navigation',
    '@cloudcare/mobile-react-navigation',
    'FTRumReactNavigationTracking',
  ],
  [
    'react-native-navigation',
    '@cloudcare/mobile-react-native-navigation',
    'FTRumReactNativeNavigationTracking',
  ],
];
const run = (command, args, capture = false) =>
  execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });

try {
  // Build the actual peer declarations first, without workspace source path aliases.
  run('yarn', ['workspace', '@cloudcare/react-native-mobile', 'prepare']);
  fs.symlinkSync(
    path.join(root, 'node_modules'),
    path.join(output, 'node_modules'),
    'dir'
  );
  for (const [directory, name, exportName] of plugins) {
    const archive = path.join(output, `${directory}.tgz`);
    run('yarn', ['workspace', name, 'pack', '--out', archive]);
    const files = run('tar', ['-tzf', archive], true).trim().split('\n');
    for (const file of [
      'package.json',
      'README.md',
      'src/index.ts',
      'lib/commonjs/index.js',
      'lib/module/index.js',
      'lib/typescript/index.d.ts',
      `src/${exportName}.ts`,
      `lib/commonjs/${exportName}.js`,
      `lib/module/${exportName}.js`,
      `lib/typescript/${exportName}.d.ts`,
    ])
      assert.ok(
        files.includes(`package/${file}`),
        `${name} is missing ${file}`
      );
    assert.ok(
      !files.some((file) => /\/(?:__tests__|tests|android|ios)\//.test(file)),
      `${name} contains test or native files`
    );
    const destination = path.join(output, directory);
    fs.mkdirSync(destination);
    run('tar', ['-xzf', archive, '-C', destination]);
    const packageRoot = path.join(destination, 'package');
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
    );
    assert.equal(pkg.name, name);
    assert.equal(
      pkg.peerDependencies['@cloudcare/react-native-mobile'],
      `^${pkg.version}`,
      `${name} must require the current mobile SDK release as its minimum compatible version`
    );
    for (const format of ['commonjs', 'module']) {
      const modules = new Map();
      const load = (filename) => {
        if (modules.has(filename)) return modules.get(filename);
        const source = fs.readFileSync(filename, 'utf8');
        const exports = {};
        modules.set(filename, exports);
        vm.runInNewContext(
          ts.transpileModule(source, {
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2020,
              allowJs: true,
            },
            fileName: filename,
          }).outputText,
          {
            exports,
            require(dependency) {
              if (dependency.startsWith('./'))
                return load(
                  path.resolve(path.dirname(filename), `${dependency}.js`)
                );
              if (dependency === '@cloudcare/react-native-mobile')
                return { FTRumViewTracking: class {} };
              if (
                directory === 'react-native-navigation' &&
                dependency === 'react-native-navigation'
              )
                return { Navigation: {} };
              throw new Error(`${name} unexpectedly requires ${dependency}`);
            },
          },
          { filename }
        );
        return exports;
      };
      const exports = load(path.join(packageRoot, `lib/${format}/index.js`));
      assert.equal(typeof exports[exportName], 'function');
    }
    console.log(`Packed entry points and dependency isolation passed: ${name}`);
  }
  const consumer = path.join(output, 'consumer.ts');
  fs.writeFileSync(
    consumer,
    `
import { createNavigationContainerRef } from '@react-navigation/native';
import { FTRumReactNavigationTracking } from './react-navigation/package';
import { FTRumReactNativeNavigationTracking } from './react-native-navigation/package';
FTRumReactNavigationTracking.startTrackingViews(createNavigationContainerRef<{ Home: undefined }>());
FTRumReactNavigationTracking.stopTrackingViews();
FTRumReactNativeNavigationTracking.startTracking();
FTRumReactNativeNavigationTracking.stopTracking();
`
  );
  run(process.execPath, [
    path.join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    '--target',
    'ES2020',
    '--moduleResolution',
    'node',
    '--types',
    'react',
    consumer,
  ]);
  console.log('Packed declaration consumer check passed');
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
