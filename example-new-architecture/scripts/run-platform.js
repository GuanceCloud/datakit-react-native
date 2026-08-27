'use strict';

const {spawn} = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const METRO_PORT = 8081;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COMMANDS = {
  android: 'run-android',
  ios: 'run-ios',
};

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function isMetroRunning() {
  return new Promise(resolve => {
    const request = http.get(
      {
        host: '127.0.0.1',
        path: '/status',
        port: METRO_PORT,
        timeout: 1000,
      },
      response => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('end', () => {
          resolve(
            response.statusCode === 200 &&
              body.trim() === 'packager-status:running',
          );
        });
      },
    );

    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({code, signal}));
  });
}

async function waitForMetro(child) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await isMetroRunning()) {
      return;
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error('Metro exited before becoming ready.');
    }
    await delay(250);
  }

  throw new Error(`Metro did not become ready on port ${METRO_PORT}.`);
}

async function run() {
  const platform = process.argv[2];
  const command = COMMANDS[platform];

  if (!command) {
    throw new Error(`Unsupported platform: ${platform || '<missing>'}`);
  }

  let metroProcess = null;
  let metroExit = null;

  if (await isMetroRunning()) {
    console.log(`info Reusing Metro on port ${METRO_PORT}.`);
  } else {
    console.log(
      `info Metro is not running; starting it on port ${METRO_PORT}.`,
    );
    metroProcess = spawn(
      process.execPath,
      [
        require.resolve('react-native/cli.js'),
        'start',
        '--port',
        String(METRO_PORT),
        '--no-interactive',
      ],
      {
        cwd: PROJECT_ROOT,
        env: process.env,
        stdio: 'inherit',
      },
    );
    metroExit = waitForExit(metroProcess);
    await waitForMetro(metroProcess);
  }

  const args = [
    require.resolve('react-native/cli.js'),
    command,
    '--port',
    String(METRO_PORT),
    '--no-packager',
  ];

  args.push(...process.argv.slice(3));

  const child = spawn(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  const {code, signal} = await waitForExit(child);

  if (signal || code !== 0) {
    metroProcess?.kill('SIGINT');
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
    return;
  }

  if (metroProcess) {
    console.log(
      'info App launched. Metro remains running; press Ctrl+C to stop it.',
    );
    await metroExit;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
