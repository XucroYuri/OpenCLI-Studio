import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createChildEnv, getStudioDevCommands } = require('../../scripts/studio-dev-all.cjs') as {
  createChildEnv: (baseEnv?: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  getStudioDevCommands: (options?: {
    npmCommand?: string;
    backendPort?: string;
    frontendPort?: string;
  }) => { backend: string; frontend: string };
};

describe('studio-dev-all script helpers', () => {
  it('keeps the daemon port independent from the Studio backend port', () => {
    const env = createChildEnv({ STUDIO_BACKEND_PORT: '3113' });

    expect(env.OPENCLI_DAEMON_PORT).toBe('19825');
  });

  it('preserves an explicit daemon port override', () => {
    const env = createChildEnv({ OPENCLI_DAEMON_PORT: '29999' });

    expect(env.OPENCLI_DAEMON_PORT).toBe('29999');
  });

  it('builds separate backend and frontend commands', () => {
    expect(getStudioDevCommands({
      npmCommand: 'npm',
      backendPort: '3113',
      frontendPort: '4173',
    })).toEqual({
      backend: 'npm run dev -- studio serve --port 3113',
      frontend: 'npm run studio:dev -- --host 127.0.0.1 --port 4173',
    });
  });
});
