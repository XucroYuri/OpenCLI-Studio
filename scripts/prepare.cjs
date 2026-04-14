const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

if (!fs.existsSync('src')) {
  process.exit(0);
}

const npmExecPath = process.env.npm_execpath;
const result = npmExecPath
  ? spawnSync(process.execPath, [npmExecPath, 'run', 'build'], { stdio: 'inherit' })
  : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
