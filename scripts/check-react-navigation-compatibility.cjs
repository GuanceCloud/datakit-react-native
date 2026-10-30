const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'guance-navigation-7-'));
const run = (command, args, env = {}) =>
  execFileSync(command, args, {
    cwd: output,
    stdio: 'inherit',
    env: { ...process.env, GUANCE_REPO_ROOT: root, ...env },
  });

try {
  fs.cpSync(path.join(__dirname, 'fixtures/react-navigation-7'), output, {
    recursive: true,
  });
  // This is an intentionally mixed-major consumer. Preserve its exact versions;
  // bypass the navigator's peer conflict only in this isolated test installation.
  run('npm', [
    'install',
    '--legacy-peer-deps',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--registry=https://registry.npmjs.org',
  ]);
  const stackDirectory = path.join(
    output,
    'node_modules/@react-navigation/native-stack'
  );
  const workspaceStack = path.join(
    root,
    'node_modules/@react-navigation/native-stack'
  );
  const workspaceVersion = require(path.join(
    workspaceStack,
    'package.json'
  )).version;
  // The older release has no opening transitionStart. Both versions must
  // measure first focus through transitionEnd without relying on that event.
  for (const version of ['6.9.26', workspaceVersion]) {
    if (version !== '6.9.26') {
      fs.rmSync(stackDirectory, { recursive: true, force: true });
      fs.cpSync(workspaceStack, stackDirectory, {
        recursive: true,
        dereference: true,
      });
    }
    for (const platform of ['ios', 'android'])
      run(
        process.execPath,
        [
          path.join(root, 'node_modules/jest/bin/jest.js'),
          '--config',
          path.join(output, 'jest.config.cjs'),
          '--runInBand',
        ],
        { GUANCE_TEST_PLATFORM: platform, GUANCE_NATIVE_STACK_VERSION: version }
      );
  }
  execFileSync(
    'yarn',
    ['workspace', '@cloudcare/react-native-mobile', 'prepare'],
    { cwd: root, stdio: 'inherit' }
  );
  execFileSync(
    'yarn',
    ['workspace', '@cloudcare/mobile-react-navigation', 'prepare'],
    { cwd: root, stdio: 'inherit' }
  );
  fs.cpSync(
    path.join(root, 'packages/react-navigation/lib/typescript'),
    path.join(output, 'plugin'),
    { recursive: true }
  );
  run(process.execPath, [
    path.join(output, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    '--esModuleInterop',
    '--jsx',
    'react',
    '--lib',
    'es2020',
    '--moduleResolution',
    'node',
    'public-api.ts',
  ]);
  console.log(
    `React Navigation 7.0.17 / core 7.6.0 / native-stack 6.9.26 and ${workspaceVersion} verified`
  );
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
