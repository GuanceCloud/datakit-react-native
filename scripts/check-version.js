const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function getExactGitTag() {
  const envTag =
    process.env.GITHUB_REF_TYPE === 'tag'
      ? process.env.GITHUB_REF_NAME
      : process.env.CIRCLE_TAG || process.env.CI_COMMIT_TAG || '';

  if (envTag) {
    return envTag;
  }

  try {
    return execFileSync('git', ['describe', '--tags', '--exact-match'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_) {
    return '';
  }
}

function fail(message) {
  console.error(`Version check failed: ${message}`);
  process.exitCode = 1;
}

const lernaVersion = readJson('lerna.json').version;
const packagePaths = [
  'packages/react-native-mobile/package.json',
  'packages/react-native-session-replay/package.json',
];

for (const packagePath of packagePaths) {
  const pkg = readJson(packagePath);
  if (pkg.version !== lernaVersion) {
    fail(`${packagePath} version ${pkg.version} does not match lerna.json ${lernaVersion}`);
  }
}

const versionSource = readText('packages/react-native-mobile/src/version.ts');
const versionMatch = versionSource.match(/version\s*=\s*['"]([^'"]+)['"]/);

if (!versionMatch) {
  fail('packages/react-native-mobile/src/version.ts does not export a version string');
} else if (versionMatch[1] !== lernaVersion) {
  fail(
    `packages/react-native-mobile/src/version.ts version ${versionMatch[1]} does not match lerna.json ${lernaVersion}`
  );
}

const tag = getExactGitTag();
const expectedTags = new Set([`agent_${lernaVersion}`, `agent_v${lernaVersion}`]);

if (tag && !expectedTags.has(tag)) {
  fail(
    `current git tag ${tag} does not match package version ${lernaVersion}; expected agent_${lernaVersion}`
  );
}

if (process.exitCode) {
  console.error('Run `yarn update-version <version>` before packing or publishing.');
  process.exit(process.exitCode);
}

console.log(`Version check passed: ${lernaVersion}`);
