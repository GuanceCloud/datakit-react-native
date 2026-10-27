const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(__dirname, 'check-version.js'),
  'utf8'
);
const navigationPackages = ['react-navigation', 'react-native-navigation'];

function check({ version = '0.4.3', directory, dependency } = {}) {
  const errors = [];
  const process = { env: {}, exitCode: 0, exit() {} };
  vm.runInNewContext(source, {
    __dirname,
    process,
    console: { log() {}, error: (message) => errors.push(message) },
    require(name) {
      if (name === 'child_process')
        return {
          execFileSync() {
            throw new Error('No tag');
          },
        };
      if (name === 'fs')
        return {
          readFileSync(filename) {
            const relative = path.relative(root, filename);
            if (relative.endsWith('src/version.ts'))
              return `export const version = '${version}';`;
            const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
            value.version = version;
            if (
              navigationPackages.some(
                (folder) => relative === `packages/${folder}/package.json`
              )
            ) {
              value.peerDependencies['@cloudcare/react-native-mobile'] =
                relative === `packages/${directory}/package.json`
                  ? dependency
                  : `^${version}`;
            }
            return JSON.stringify(value);
          },
        };
      return require(name);
    },
  });
  return { code: process.exitCode, errors };
}

for (const version of ['0.4.3', '0.4.4-beta.1']) {
  test(`accepts a compatible SDK range starting at release ${version}`, () => {
    assert.equal(check({ version }).code, 0);
  });
}

for (const directory of navigationPackages) {
  for (const dependency of [
    '^0.4.2',
    '^0.4.3-0',
    '^0.4.4',
    '0.4.3',
    undefined,
  ]) {
    test(`${directory}: rejects SDK dependency ${dependency}`, () => {
      const result = check({ directory, dependency });
      assert.equal(result.code, 1);
      assert.ok(
        result.errors.some((message) =>
          message.includes(
            `packages/${directory}/package.json must declare @cloudcare/react-native-mobile@^0.4.3 as a peer dependency`
          )
        )
      );
    });
  }
  test(`${directory}: rejects a peer range that skips the current prerelease`, () => {
    assert.equal(
      check({ version: '0.4.4-beta.1', directory, dependency: '^0.4.4' }).code,
      1
    );
  });
}
