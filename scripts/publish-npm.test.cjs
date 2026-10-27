const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'publish-npm.cjs'), 'utf8');
const identity = {
  version: '0.4.3-alpha.1',
  sha: 'a'.repeat(40),
  channel: 'alpha',
};
const directories = [
  'react-native-mobile',
  'react-native-session-replay',
  'react-native-babel-plugin',
  'react-navigation',
  'react-native-navigation',
];
const names = directories.map(
  (directory) =>
    JSON.parse(
      fs.readFileSync(
        path.join(root, 'packages', directory, 'package.json'),
        'utf8'
      )
    ).name
);

function publisher(options = {}) {
  const {
    version = identity.version,
    tag = `agent_${version}`,
    refType = 'tag',
    repository = 'GuanceCloud/datakit-react-native',
    tagSha = identity.sha,
    npmVersion = '11.5.1',
    registry = new Map(),
    existing,
    failPublishAt,
    omitFile,
    badPackage,
    packedVersion = version,
    packedSha = identity.sha,
    missingPackage,
  } = options;
  const calls = [];
  const commands = [];
  const packed = [];
  const files = new Map();
  const originals = new Map();
  const archives = new Map();
  let published = 0;
  const filesystem = {
    mkdtempSync: () => '/tmp/npm-publish-fixture',
    readFileSync(file) {
      if (!files.has(file)) {
        const value = JSON.parse(
          fs.readFileSync(path.join(root, file), 'utf8')
        );
        if (file === 'lerna.json' || file.startsWith('packages/'))
          value.version = version;
        if (file === `packages/${badPackage}/package.json`)
          value.version = '0.0.1';
        const contents = JSON.stringify(value);
        files.set(file, contents);
        originals.set(file, contents);
      }
      return files.get(file);
    },
    writeFileSync: (file, contents) => files.set(file, contents),
    rmSync: () => calls.push('cleanup'),
  };
  const context = {
    module: { exports: {} },
    process: {
      env: {
        GITHUB_REF_TYPE: refType,
        GITHUB_REF_NAME: tag,
        GITHUB_REPOSITORY: repository,
      },
      argv: [],
    },
    console: { log() {} },
    AbortSignal,
    fetch: async (url) => {
      assert.equal(
        published,
        0,
        'All registry queries must finish before publishing begins'
      );
      const [name, requestedVersion] = new URL(url).pathname
        .slice(1)
        .split('/')
        .map(decodeURIComponent);
      calls.push(requestedVersion ? 'preflight' : 'package');
      if (!requestedVersion)
        return {
          status: name === missingPackage ? 404 : 200,
          ok: name !== missingPackage,
          json: async () => ({ name }),
        };
      const gitHead = registry.get(name) || existing;
      if (gitHead)
        return {
          status: 200,
          ok: true,
          json: async () => ({ name, version: requestedVersion, gitHead }),
        };
      return { status: 404 };
    },
    require(name) {
      if (name === 'node:fs') return filesystem;
      if (name === 'node:child_process')
        return {
          execFileSync(command, args) {
            if (command === 'git')
              return args[1] === 'HEAD' ? identity.sha : tagSha;
            if (command === 'yarn') {
              calls.push('pack');
              packed.push(args[1]);
              const directory = directories[names.indexOf(args[1])];
              const manifest = JSON.parse(
                filesystem.readFileSync(`packages/${directory}/package.json`)
              );
              archives.set(args[4], {
                ...manifest,
                version: packedVersion,
                gitHead: packedSha,
              });
            }
            if (command === 'tar') {
              const manifest = archives.get(args[1]);
              if (args[0] === '-xOf') return JSON.stringify(manifest);
              const content = [
                'package.json',
                'lib/commonjs/index.js',
                'lib/module/index.js',
                'lib/typescript/index.d.ts',
                'src/index.ts',
                'src/index.tsx',
                'README.md',
              ];
              if (args[1].includes('navigation')) {
                const implementation = args[1].endsWith('/react-navigation.tgz')
                  ? 'FTRumReactNavigationTracking'
                  : 'FTRumReactNativeNavigationTracking';
                content.push(
                  `src/${implementation}.ts`,
                  `lib/commonjs/${implementation}.js`,
                  `lib/module/${implementation}.js`,
                  `lib/typescript/${implementation}.d.ts`
                );
              } else if (!args[1].includes('babel-plugin')) {
                content.push(
                  args[1].includes('session-replay')
                    ? 'FTSessionReplayReactNative.podspec'
                    : 'FTMobileReactNativeSDK.podspec',
                  'android/build.gradle',
                  'ios/Bridge.mm'
                );
              }
              return content
                .filter((file) => file !== omitFile)
                .map((file) => 'package/' + file)
                .join('\n');
            }
            if (command === 'npm') {
              if (args[0] === '--version') return npmVersion;
              published++;
              calls.push('publish');
              commands.push(args);
              if (published === failPublishAt)
                throw new Error('npm publish failed');
              registry.set(archives.get(args[1]).name, identity.sha);
            }
            return '';
          },
        };
      return require(name);
    },
  };
  vm.runInNewContext(
    source +
      `
module.exports.testPublish = publish;
module.exports.testVerify = typeof verifyPackages === 'function' ? verifyPackages : undefined;
`,
    context
  );
  return {
    ...context.module.exports,
    calls,
    commands,
    packed,
    files,
    originals,
    registry,
  };
}

test('builds all five packages in dependency order and checks registry before publishing', async () => {
  const instance = publisher();
  await instance.testPublish(identity);
  assert.deepEqual(instance.packed, names);
  assert.deepEqual(instance.calls, [
    ...Array(5).fill('pack'),
    ...names.flatMap(() => ['preflight', 'package']),
    ...Array(5).fill('publish'),
    'cleanup',
  ]);
  assert.deepEqual(
    instance.commands.map((args) => Array.from(args)),
    directories.map((directory) => [
      'publish',
      `/tmp/npm-publish-fixture/${directory}.tgz`,
      '--access',
      'public',
      '--tag',
      'alpha',
      '--ignore-scripts',
    ])
  );
  for (const directory of directories)
    assert.equal(
      instance.files.get(`packages/${directory}/package.json`),
      instance.originals.get(`packages/${directory}/package.json`),
      'Restore source manifests after packing'
    );
});

test('pack verification builds all packages without registry access or publication', () => {
  const instance = publisher({ npmVersion: '10.0.0' });
  instance.testVerify();
  assert.deepEqual(instance.calls, [...Array(5).fill('pack'), 'cleanup']);
});

test('publication failure prevents publishing later packages', async () => {
  const instance = publisher({ failPublishAt: 1 });
  await assert.rejects(instance.testPublish(identity), /npm publish failed/);
  assert.equal(instance.commands.length, 1);
  assert.equal(instance.calls.at(-1), 'cleanup');
});

test('conflicting registry identity fails before publishing any package', async () => {
  const instance = publisher({ existing: 'different-sha' });
  await assert.rejects(
    instance.testPublish(identity),
    /already belongs to another commit/
  );
  assert.equal(instance.commands.length, 0);
  assert.equal(instance.calls.at(-1), 'cleanup');
});

test('rerunning a partially published release still builds the SDK before the remaining plugins', async () => {
  const registry = new Map();
  const first = publisher({ registry, failPublishAt: 2 });
  await assert.rejects(first.testPublish(identity), /npm publish failed/);
  assert.equal(registry.size, 1);
  const retry = publisher({ registry });
  await retry.testPublish(identity);
  assert.deepEqual(retry.packed, names);
  assert.equal(retry.commands.length, 4);
  assert.ok(
    retry.commands.every(
      (args) => !args[1].endsWith('/react-native-mobile.tgz')
    )
  );
  assert.equal(registry.size, 5);
});

test('already published packages from the same commit are skipped', async () => {
  const instance = publisher({ existing: identity.sha });
  await instance.testPublish(identity);
  assert.equal(instance.commands.length, 0);
});

test('an unregistered navigation package blocks publication of every SDK package', async () => {
  const instance = publisher({
    missingPackage: '@cloudcare/mobile-react-navigation',
  });
  await assert.rejects(instance.testPublish(identity), /does not exist on npm/);
  assert.equal(instance.commands.length, 0);
});

for (const omitFile of [
  'README.md',
  'lib/module/FTRumReactNavigationTracking.js',
  'src/FTRumReactNavigationTracking.ts',
  'lib/typescript/FTRumReactNativeNavigationTracking.d.ts',
  'ios/Bridge.mm',
]) {
  test(`missing ${omitFile} blocks every publication`, async () => {
    const instance = publisher({ omitFile });
    await assert.rejects(instance.testPublish(identity), /Missing/);
    assert.equal(instance.commands.length, 0);
  });
}

for (const override of [
  { packedVersion: '0.4.2' },
  { packedSha: 'different-sha' },
]) {
  test(`packed manifest mismatch ${JSON.stringify(
    override
  )} blocks every publication`, async () => {
    const instance = publisher(override);
    await assert.rejects(
      instance.testPublish(identity),
      /Packed package identity mismatch/
    );
    assert.equal(instance.commands.length, 0);
  });
}

for (const [version, channel] of [
  ['0.4.3', 'latest'],
  ['0.4.3-alpha.2', 'alpha'],
  ['0.4.3-beta.1', 'beta'],
  ['0.4.3-hotfix.1', 'hotfix'],
]) {
  for (const prefix of ['agent_', 'agent_v']) {
    test(`${prefix}${version} selects ${channel}`, () => {
      const result = publisher({
        version,
        tag: prefix + version,
      }).releaseIdentity();
      assert.equal(result.version, version);
      assert.equal(result.channel, channel);
      assert.equal(result.sha, identity.sha);
    });
  }
}

for (const [options, message] of [
  [{ refType: 'branch' }, /Expected an agent/],
  [{ tag: 'v0.4.3' }, /Expected an agent/],
  [{ tag: 'agent_bad-version' }, /Expected an agent/],
  [{ repository: 'someone/fork' }, /Unexpected publishing repository/],
  [{ tagSha: 'different-sha' }, /Release tag does not match checkout/],
  [{ tag: 'agent_0.4.2' }, /Workspace identity or version mismatch/],
  [{ badPackage: 'react-navigation' }, /Package identity mismatch/],
  [{ npmVersion: '11.5.0' }, /npm >= 11.5.1/],
]) {
  test(`release preflight rejects ${JSON.stringify(options)}`, () => {
    assert.throws(() => publisher(options).releaseIdentity(), message);
  });
}
