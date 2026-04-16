#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const backendPort = process.env.STUDIO_BACKEND_PORT || '3113';
const frontendPort = process.env.STUDIO_FRONTEND_PORT || '4173';
const daemonPort = process.env.OPENCLI_DAEMON_PORT || '19825';

const processes = [];
let isShuttingDown = false;
let shutdownCode = 0;

function createChildEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    OPENCLI_DAEMON_PORT: baseEnv.OPENCLI_DAEMON_PORT || daemonPort,
  };
}

function getStudioDevCommands(options = {}) {
  const resolvedNpmCommand = options.npmCommand || npmCommand;
  const resolvedBackendPort = options.backendPort || backendPort;
  const resolvedFrontendPort = options.frontendPort || frontendPort;

  return {
    backend: `${resolvedNpmCommand} run dev -- studio serve --port ${resolvedBackendPort}`,
    frontend: `${resolvedNpmCommand} run studio:dev -- --host 127.0.0.1 --port ${resolvedFrontendPort}`,
  };
}

function spawnService(name, command) {
  const child = spawn(command, {
    shell: true,
    env: createChildEnv(),
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    const codeMessage = code !== null ? `code ${code}` : `signal ${signal}`;
    console.log(`[studio:${name}] exited (${codeMessage}).`);

    if (!isShuttingDown) {
      if (name === 'backend') {
        shutdownCode = code ?? 1;
        shutdownAll();
      } else if (code !== 0) {
        shutdownCode = code ?? 1;
      }
    }
  });

  child.on('error', (error) => {
    console.error(`[studio:${name}] failed to start:`, error);
    if (!isShuttingDown) {
      shutdownCode = 1;
      shutdownAll();
    }
  });

  processes.push(child);
  return child;
}

function terminateChild(child) {
  if (!child || child.killed) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    } else {
      child.kill('SIGTERM');
    }
  } catch (error) {
    try {
      child.kill('SIGKILL');
    } catch {
      // best effort shutdown
    }
  }
}

function shutdownAll() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  for (const child of processes) {
    terminateChild(child);
  }

  setTimeout(() => {
    process.exit(shutdownCode ?? 0);
  }, 200);
}

function main() {
  const commands = getStudioDevCommands();

  spawnService('backend', commands.backend);
  spawnService('frontend', commands.frontend);

  process.on('SIGINT', () => {
    console.log('\n[studio:all] 收到中断信号，正在关闭服务...');
    shutdownCode = 0;
    shutdownAll();
  });

  process.on('SIGTERM', () => {
    console.log('\n[studio:all] 收到关闭信号，正在关闭服务...');
    shutdownCode = 0;
    shutdownAll();
  });

  process.on('uncaughtException', (error) => {
    console.error('[studio:all] Unexpected error:', error);
    shutdownCode = 1;
    shutdownAll();
  });

  process.on('unhandledRejection', (error) => {
    console.error('[studio:all] Unhandled rejection:', error);
    shutdownCode = 1;
    shutdownAll();
  });

  console.log(
    `[studio:all] 启动 Studio 后端 (${backendPort}) 与前端 (${frontendPort})，守护进程端口 ${daemonPort}，访问地址: http://127.0.0.1:${frontendPort}/registry`,
  );
}

module.exports = {
  createChildEnv,
  getStudioDevCommands,
};

if (require.main === module) {
  main();
}
