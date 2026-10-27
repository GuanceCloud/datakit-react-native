const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const YAML = require('yaml');

const workflow = YAML.parse(
  fs.readFileSync(
    path.join(__dirname, '../.github/workflows/publish.yml'),
    'utf8'
  )
);
const { check, publish } = workflow.jobs;

function condition(expression, github) {
  return Function(
    'github',
    'startsWith',
    `return (${expression});`
  )(github, (value, prefix) => value.startsWith(prefix));
}

test('release tags, branch pushes and pull requests all enter the same workflow', () => {
  assert.deepEqual(workflow.on.push.tags, ['agent_*']);
  assert.deepEqual(workflow.on.push.branches, ['**']);
  assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
});

test('publication waits for all checks, including every package build', () => {
  assert.equal(publish.needs, 'check');
  assert.ok(!publish.if.includes('always('));
  const commands = check.steps
    .filter((step) => step.run)
    .map((step) => step.run);
  for (const command of [
    'yarn lint',
    'yarn typescript',
    'yarn test --runInBand',
    'yarn test:version',
    'yarn test:publish',
    'node scripts/publish-npm.cjs pack',
    'yarn test:navigation:packages',
  ])
    assert.ok(commands.includes(command), command);
  assert.ok(
    !check.steps.find((step) => step.run === 'yarn test --runInBand').if,
    'Every release channel runs tests'
  );
  assert.ok(
    !commands.some((command) => /publish-npm\.cjs publish/.test(command)),
    'Check jobs never publish'
  );
});

for (const [label, github, expected] of [
  [
    'release tag',
    { ref_type: 'tag', ref: 'refs/tags/agent_0.4.3', event_name: 'push' },
    true,
  ],
  [
    'beta tag',
    {
      ref_type: 'tag',
      ref: 'refs/tags/agent_0.4.3-beta.1',
      event_name: 'push',
    },
    true,
  ],
  [
    'manual tag retry',
    {
      ref_type: 'tag',
      ref: 'refs/tags/agent_v0.4.3',
      event_name: 'workflow_dispatch',
    },
    true,
  ],
  [
    'branch push',
    { ref_type: 'branch', ref: 'refs/heads/dev', event_name: 'push' },
    false,
  ],
  [
    'manual branch run',
    {
      ref_type: 'branch',
      ref: 'refs/heads/dev',
      event_name: 'workflow_dispatch',
    },
    false,
  ],
  [
    'other tag',
    { ref_type: 'tag', ref: 'refs/tags/v0.4.3', event_name: 'push' },
    false,
  ],
  [
    'pull request',
    {
      ref_type: 'branch',
      ref: 'refs/pull/1/merge',
      event_name: 'pull_request',
    },
    false,
  ],
]) {
  test(`publish job: ${label}`, () => {
    assert.equal(
      condition(publish.if, {
        repository: 'GuanceCloud/datakit-react-native',
        ...github,
      }),
      expected
    );
  });
}

test('forks cannot publish even when pushing a matching tag', () => {
  assert.equal(
    condition(publish.if, {
      repository: 'someone/fork',
      ref_type: 'tag',
      ref: 'refs/tags/agent_0.4.3',
      event_name: 'push',
    }),
    false
  );
});

test('only the publishing job receives OIDC and the existing npm environment', () => {
  assert.equal(workflow.permissions['id-token'], undefined);
  assert.equal(check.permissions?.['id-token'], undefined);
  assert.equal(publish.permissions['id-token'], 'write');
  assert.equal(publish.environment, 'npm-publish');
  assert.equal(publish.concurrency.group, 'npm-publish');
  assert.equal(publish.concurrency['cancel-in-progress'], false);
  for (const job of [check, publish]) {
    assert.equal(
      job.steps.find((step) => step.uses === 'actions/checkout@v6').with[
        'fetch-depth'
      ],
      0
    );
    assert.equal(
      job.steps.find((step) => step.uses === 'actions/setup-node@v6').with[
        'node-version'
      ],
      '24'
    );
  }
});

test('ordinary pushes cannot cancel tag validation or in-progress publication', () => {
  assert.match(workflow.concurrency.group, /github\.ref/);
  const expression = workflow.concurrency['cancel-in-progress'].replace(
    /^\$\{\{\s*|\s*\}\}$/g,
    ''
  );
  assert.equal(condition(expression, { ref_type: 'tag' }), false);
  assert.equal(condition(expression, { ref_type: 'branch' }), true);
});
