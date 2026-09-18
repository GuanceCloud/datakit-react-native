const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'publish-npm.cjs'), 'utf8');
const identity = {
  version: '0.4.3-alpha.1',
  sha: 'a'.repeat(40),
  channel: 'alpha',
};

function publisher({
  failFirstPublish = false,
  existing,
  omitPluginReadme = false,
} = {}) {
  const calls = [];
  const commands = [];
  let published = 0;
  const filesystem = {
    mkdtempSync: () => '/tmp/npm-publish-fixture',
    readFileSync: () => '{}',
    writeFileSync: () => {},
    rmSync: () => calls.push('cleanup'),
  };
  const context = {
    module: { exports: {} },
    process: { env: {}, argv: [] },
    console: { log: () => {} },
    AbortSignal,
    fetch: async (url) => {
      assert.equal(
        published,
        0,
        'Registry queries must finish before publishing begins'
      );
      calls.push('preflight');
      const [name, version] = new URL(url).pathname
        .slice(1)
        .split('/')
        .map(decodeURIComponent);
      if (existing)
        return {
          status: 200,
          ok: true,
          json: async () => ({ name, version, gitHead: existing }),
        };
      return { status: 404 };
    },
    require: (name) => {
      if (name === 'node:fs') return filesystem;
      if (name === 'node:child_process')
        return {
          execFileSync(command, args) {
            if (command === 'yarn') calls.push('pack');
            if (command === 'tar') {
              const files = [
                'package.json',
                'lib/commonjs/index.js',
                'lib/module/index.js',
                'lib/typescript/index.d.ts',
              ];
              if (args[1].includes('babel-plugin')) {
                if (!omitPluginReadme) files.push('README.md');
              } else {
                files.push(
                  args[1].includes('session-replay')
                    ? 'FTSessionReplayReactNative.podspec'
                    : 'FTMobileReactNativeSDK.podspec',
                  'android/build.gradle',
                  'ios/Bridge.mm'
                );
              }
              return files.map((file) => 'package/' + file).join('\n');
            }
            if (command === 'npm') {
              published++;
              calls.push('publish');
              commands.push(args);
              if (failFirstPublish) throw new Error('npm publish failed');
            }
            return '';
          },
        };
      return require(name);
    },
  };
  vm.runInNewContext(
    source + '\nmodule.exports.testPublish = publish;',
    context
  );
  return {
    publish: context.module.exports.testPublish,
    packages: context.module.exports.packages,
    calls,
    commands,
  };
}

test('publishes all three SDK packages without post-publish registry reads', async () => {
  const instance = publisher();
  assert.deepEqual(
    Array.from(instance.packages, ({ name }) => name),
    [
      '@cloudcare/react-native-mobile',
      '@cloudcare/react-native-session-replay',
      '@cloudcare/react-native-mobile-babel-plugin',
    ]
  );
  await instance.publish(identity);
  assert.deepEqual(instance.calls, [
    'preflight',
    'pack',
    'preflight',
    'pack',
    'preflight',
    'pack',
    'publish',
    'publish',
    'publish',
    'cleanup',
  ]);
  assert.deepEqual(
    instance.commands.map((args) => Array.from(args)),
    [
      'react-native-mobile',
      'react-native-session-replay',
      'react-native-babel-plugin',
    ].map((directory) => [
      'publish',
      `/tmp/npm-publish-fixture/${directory}.tgz`,
      '--access',
      'public',
      '--tag',
      'alpha',
      '--ignore-scripts',
    ])
  );
});

test('npm publication failure propagates and prevents publishing the next package', async () => {
  const instance = publisher({ failFirstPublish: true });
  await assert.rejects(instance.publish(identity), /npm publish failed/);
  assert.equal(instance.calls.filter((call) => call === 'publish').length, 1);
  assert.equal(instance.calls.at(-1), 'cleanup');
});

test('conflicting registry identity fails before publishing', async () => {
  const instance = publisher({ existing: 'different-sha' });
  await assert.rejects(
    instance.publish(identity),
    /already belongs to another commit/
  );
  assert.deepEqual(instance.calls, ['preflight', 'cleanup']);
});

test('existing versions from the same commit are skipped before publishing', async () => {
  const instance = publisher({ existing: identity.sha });
  await instance.publish(identity);
  assert.deepEqual(instance.calls, [
    'preflight',
    'preflight',
    'preflight',
    'cleanup',
  ]);
});

test('missing plugin README prevents publishing any package', async () => {
  const instance = publisher({ omitPluginReadme: true });
  await assert.rejects(instance.publish(identity), /Missing README.md/);
  assert.equal(instance.calls.includes('publish'), false);
  assert.equal(instance.calls.at(-1), 'cleanup');
});
