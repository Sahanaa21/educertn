const { spawn } = require('child_process');

const services = [
  {
    name: 'backend',
    command: 'npm',
    args: ['--prefix', 'backend', 'start'],
    portEnvKey: 'PORT',
    defaultPort: '5000',
  },
  {
    name: 'frontend',
    command: 'npm',
    args: ['--prefix', 'frontend', 'start'],
    portEnvKey: 'PORT',
    defaultPort: '3000',
  },
];

const processes = new Map();
let shuttingDown = false;

const stopAll = (signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of processes.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

const resolvePort = (serviceName, portEnvKey, defaultPort) => {
  const configuredPort = String(process.env[portEnvKey] || '').trim();
  if (configuredPort) {
    return configuredPort;
  }

  if (serviceName === 'frontend') {
    const configuredFrontendPort = String(process.env.FRONTEND_PORT || '').trim();
    if (configuredFrontendPort) {
      return configuredFrontendPort;
    }
  }

  return defaultPort;
};

const startService = ({ name, command, args, portEnvKey, defaultPort }) => {
  const childEnv = {
    ...process.env,
    [portEnvKey]: resolvePort(name, portEnvKey, defaultPort),
  };

  const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : command;
  const spawnArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', command, ...args]
    : args;

  const child = spawn(spawnCommand, spawnArgs, {
    stdio: 'inherit',
    shell: false,
    env: childEnv,
  });

  processes.set(name, child);

  child.on('exit', (code, signal) => {
    processes.delete(name);

    if (shuttingDown) {
      return;
    }

    console.error(`[${name}] exited`, { code, signal });
    stopAll('SIGTERM');
    process.exit(code ?? 1);
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start`, error);
    stopAll('SIGTERM');
    process.exit(1);
  });
};

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));

for (const service of services) {
  startService(service);
}
