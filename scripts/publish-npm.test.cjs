const test = require('node:test');
const assert = require('node:assert/strict');

const {
  packages,
  publishPreparedPackages,
  verifyPublishedPackages,
} = require('./publish-npm.cjs');

test('publishes every public SDK workspace', () => {
  assert.deepEqual(
    packages.map(({ directory, name }) => [directory, name]),
    [
      ['react-native-mobile', '@cloudcare/react-native-mobile'],
      ['react-native-session-replay', '@cloudcare/react-native-session-replay'],
      [
        'react-native-babel-plugin',
        '@cloudcare/react-native-mobile-babel-plugin',
      ],
    ]
  );
});

test('publishes every prepared package before waiting through slow registry propagation', async () => {
  const events = [];
  const attemptsByPackage = new Map();
  const identity = {
    version: '1.2.3-alpha.1',
    sha: 'release-sha',
    channel: 'alpha',
  };
  const ready = [
    ['@cloudcare/first', '/tmp/first.tgz'],
    ['@cloudcare/second', '/tmp/second.tgz'],
  ];

  await publishPreparedPackages(ready, identity, {
    packageNames: ready.map(([name]) => name),
    runCommand(args) {
      events.push(`publish:${args[2]}`);
    },
    async metadataFn(name, version) {
      events.push(`metadata:${name}`);
      const attempt = (attemptsByPackage.get(name) || 0) + 1;
      attemptsByPackage.set(name, attempt);
      return attempt < 7 ? null : { name, version, gitHead: identity.sha };
    },
    async sleepFn() {},
    verificationDelayMs: 0,
  });

  assert.deepEqual(events.slice(0, 2), [
    'publish:/tmp/first.tgz',
    'publish:/tmp/second.tgz',
  ]);
  assert.equal(attemptsByPackage.get('@cloudcare/first'), 7);
  assert.equal(attemptsByPackage.get('@cloudcare/second'), 7);
});

test('rejects registry metadata belonging to another commit', async () => {
  await assert.rejects(
    verifyPublishedPackages(['@cloudcare/example'], '1.2.3', 'release-sha', {
      async metadataFn(name, version) {
        return { name, version, gitHead: 'different-sha' };
      },
      async sleepFn() {},
      attempts: 1,
      delayMs: 0,
    }),
    /already belongs to another commit/
  );
});
