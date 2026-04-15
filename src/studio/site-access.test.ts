import { describe, expect, it, vi } from 'vitest';
import { Strategy, type CliCommand } from '../registry.js';
import { buildSiteAccessEntries } from './site-access.js';

function makeCommand(overrides: Partial<CliCommand>): CliCommand {
  return {
    site: 'studio-test',
    name: 'sample',
    description: 'sample command',
    args: [],
    ...overrides,
  };
}

describe('buildSiteAccessEntries', () => {
  it('treats positive login status messages as signed in', async () => {
    const execute = vi.fn(async (command: CliCommand) => {
      if (command.name === 'status') {
        return 'Login successful for Spotify';
      }
      return { ok: true };
    });

    const result = await buildSiteAccessEntries({
      sites: ['spotify'],
      commands: [
        makeCommand({
          site: 'spotify',
          name: 'auth',
          strategy: Strategy.COOKIE,
          browser: true,
        }),
        makeCommand({
          site: 'spotify',
          name: 'status',
          strategy: Strategy.COOKIE,
          browser: true,
        }),
      ],
      doctor: vi.fn(async () => ({
        daemonRunning: true,
        extensionConnected: true,
        connectivity: { ok: true, durationMs: 18 },
        sessions: [
          {
            workspace: 'F:/Code/Github/OpenCLI',
            windowId: 1,
            tabCount: 2,
            idleMsRemaining: 120000,
          },
        ],
        issues: [],
      })),
      execute,
    });

    expect(result.entries).toEqual([
      expect.objectContaining({
        site: 'spotify',
        state: 'signed_in',
        authCommand: 'spotify/auth',
        checkCommand: 'spotify/status',
      }),
    ]);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ site: 'spotify', name: 'status' }), {});
  });
});
