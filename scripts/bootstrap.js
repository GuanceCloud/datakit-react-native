const path = require('path');
const childProcess = require('child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const options = {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  encoding: 'utf-8',
};

let result;

if (process.cwd() !== root || args.length) {
  result = childProcess.spawnSync('yarn', args, options);
} else {
  result = childProcess.spawnSync('yarn', ['bootstrap'], options);
}

process.exitCode = result.status;
