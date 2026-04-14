import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Strategy, type CliCommand } from '../registry.js';
import { startStudioServer, type StudioServerHandle } from './server.js';

function makeCommand(overrides: Partial<CliCommand>): CliCommand {
  return {
    site: 'studio-test',
    name: 'sample',
    description: 'sample command',
    args: [],
    ...overrides,
  };
}

describe('startStudioServer', () => {
  let tempDir: string;
  let server: StudioServerHandle | null = null;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencli-studio-'));
  });

  afterEach(async () => {
    await server?.close();
    await fs.rm(tempDir, { recursive: true, force: true });
    server = null;
  });

  it('serves registry metadata and command details', async () => {
    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'bilibili',
          name: 'hot',
          strategy: Strategy.COOKIE,
          browser: true,
        }),
      ],
      execute: vi.fn(),
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const registryResponse = await fetch(`${server.url}/api/registry`);
    const registry = await registryResponse.json() as {
      commands: Array<{ command: string; meta: { capability: string } }>;
    };

    expect(registry.commands).toHaveLength(1);
    expect(registry.commands[0]).toMatchObject({
      command: 'bilibili/hot',
      meta: { capability: 'discovery' },
    });

    const detailResponse = await fetch(`${server.url}/api/registry/bilibili/hot`);
    const detail = await detailResponse.json() as { command: string };

    expect(detail.command).toBe('bilibili/hot');
  });

  it('executes commands and persists run history', async () => {
    const execute = vi.fn(async (_command: CliCommand, args: Record<string, unknown>) => ({
      ok: true,
      echoedArgs: args,
      items: [{ title: 'Top trend' }],
    }));

    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'google',
          name: 'trends',
          strategy: Strategy.PUBLIC,
          browser: false,
        }),
      ],
      execute,
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const executeResponse = await fetch(`${server.url}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'google/trends',
        args: { region: 'US', limit: 5 },
      }),
    });
    const execution = await executeResponse.json() as {
      command: string;
      result: { echoedArgs: Record<string, unknown> };
      historyEntry: { status: string };
    };

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execution).toMatchObject({
      command: 'google/trends',
      result: { echoedArgs: { region: 'US', limit: 5 } },
      historyEntry: { status: 'success' },
    });

    const historyResponse = await fetch(`${server.url}/api/history`);
    const history = await historyResponse.json() as {
      entries: Array<{ command: string; status: string }>;
    };

    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      command: 'google/trends',
      status: 'success',
    });
  });

  it('surfaces environment and recipe metadata', async () => {
    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'douyin',
          name: 'hashtag',
          strategy: Strategy.COOKIE,
          browser: true,
        }),
      ],
      execute: vi.fn(),
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const envResponse = await fetch(`${server.url}/api/env`);
    const env = await envResponse.json() as {
      storageDir: string;
      commandCount: number;
      browserCommandCount: number;
    };
    expect(env).toMatchObject({
      storageDir: tempDir,
      commandCount: 1,
      browserCommandCount: 1,
    });

    const recipesResponse = await fetch(`${server.url}/api/recipes`);
    const recipes = await recipesResponse.json() as {
      recipes: Array<{ id: string; command: string }>;
    };
    expect(recipes.recipes.some((item) => item.id === 'douyin-hashtag-hot')).toBe(true);
  });

  it('persists favorites and presets through the local API', async () => {
    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'google',
          name: 'trends',
          strategy: Strategy.PUBLIC,
          browser: false,
        }),
      ],
      execute: vi.fn(),
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const favoriteResponse = await fetch(`${server.url}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'command',
        targetId: 'google/trends',
        favorite: true,
      }),
    });
    const favorite = await favoriteResponse.json() as {
      entry: { kind: string; targetId: string } | null;
      favorite: boolean;
    };

    expect(favorite).toMatchObject({
      favorite: true,
      entry: {
        kind: 'command',
        targetId: 'google/trends',
      },
    });

    const favoritesResponse = await fetch(`${server.url}/api/favorites`);
    const favorites = await favoritesResponse.json() as {
      entries: Array<{ targetId: string }>;
    };
    expect(favorites.entries).toMatchObject([{ targetId: 'google/trends' }]);

    const createPresetResponse = await fetch(`${server.url}/api/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'workbench',
        name: 'US Trends',
        description: 'Track US trends',
        state: {
          command: 'google/trends',
          args: { region: 'US' },
        },
      }),
    });
    const presetCreation = await createPresetResponse.json() as {
      preset: { id: number; name: string; state: Record<string, unknown> };
    };

    expect(presetCreation.preset).toMatchObject({
      name: 'US Trends',
      state: {
        command: 'google/trends',
        args: { region: 'US' },
      },
    });

    const presetsResponse = await fetch(`${server.url}/api/presets`);
    const presets = await presetsResponse.json() as {
      presets: Array<{ id: number; kind: string }>;
    };
    expect(presets.presets).toMatchObject([
      {
        id: presetCreation.preset.id,
        kind: 'workbench',
      },
    ]);

    const deletePresetResponse = await fetch(`${server.url}/api/presets/${presetCreation.preset.id}`, {
      method: 'DELETE',
    });
    expect(deletePresetResponse.status).toBe(200);

    const emptyPresetsResponse = await fetch(`${server.url}/api/presets`);
    const emptyPresets = await emptyPresetsResponse.json() as {
      presets: unknown[];
    };
    expect(emptyPresets.presets).toEqual([]);
  });

  it('stores snapshot jobs and can run them to capture snapshots', async () => {
    const execute = vi.fn(async (_command: CliCommand, args: Record<string, unknown>) => ({
      items: [{ title: `Trend ${String(args.region ?? 'US')}`, score: 92 }],
    }));

    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'google',
          name: 'trends',
          strategy: Strategy.PUBLIC,
          browser: false,
        }),
      ],
      execute,
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const createJobResponse = await fetch(`${server.url}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceKind: 'recipe',
        sourceId: 'google-trends',
        command: 'google/trends',
        name: 'Google Trends Hourly',
        args: { region: 'US', limit: 5 },
        intervalMinutes: 60,
        enabled: true,
      }),
    });
    const createJob = await createJobResponse.json() as {
      job: { id: number; sourceId: string; command: string };
    };

    expect(createJob.job).toMatchObject({
      sourceId: 'google-trends',
      command: 'google/trends',
    });

    const jobsResponse = await fetch(`${server.url}/api/jobs`);
    const jobs = await jobsResponse.json() as {
      jobs: Array<{ id: number; sourceId: string }>;
    };
    expect(jobs.jobs).toMatchObject([
      {
        id: createJob.job.id,
        sourceId: 'google-trends',
      },
    ]);

    const runJobResponse = await fetch(`${server.url}/api/jobs/${createJob.job.id}/run`, {
      method: 'POST',
    });
    const runJob = await runJobResponse.json() as {
      snapshot: { sourceKind: string; sourceId: string; command: string };
      job: { id: number; lastStatus: string };
    };

    expect(runJob.snapshot).toMatchObject({
      sourceKind: 'recipe',
      sourceId: 'google-trends',
      command: 'google/trends',
    });
    expect(runJob.job).toMatchObject({
      id: createJob.job.id,
      lastStatus: 'success',
    });

    const snapshotsResponse = await fetch(`${server.url}/api/snapshots?sourceKind=recipe&sourceId=google-trends`);
    const snapshots = await snapshotsResponse.json() as {
      entries: Array<{ sourceId: string; status: string }>;
    };
    expect(snapshots.entries).toMatchObject([
      {
        sourceId: 'google-trends',
        status: 'success',
      },
    ]);

    const deleteJobResponse = await fetch(`${server.url}/api/jobs/${createJob.job.id}`, {
      method: 'DELETE',
    });
    expect(deleteJobResponse.status).toBe(200);
  });

  it('exposes ops inventory and supports live doctor options', async () => {
    const doctor = vi.fn(async () => ({
      daemonRunning: true,
      extensionConnected: true,
      sessions: [{ workspace: 'C:/repo', windowId: 3, tabCount: 2, idleMsRemaining: 120_000 }],
      issues: [],
    }));

    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'hot-digest',
          name: 'hot',
          strategy: Strategy.PUBLIC,
          browser: false,
        }),
      ],
      plugins: [
        {
          name: 'hot-digest',
          path: path.join(tempDir, 'plugins', 'hot-digest'),
          commands: ['hot'],
          source: 'github:example/opencli-plugin-hot-digest',
          description: 'Digest plugin',
          version: '1.0.0',
          installedAt: '2026-04-14T00:00:00.000Z',
        },
      ],
      externalClis: [
        {
          name: 'gh',
          binary: 'gh',
          description: 'GitHub CLI',
          installed: true,
          installAvailable: true,
          installCommand: null,
          tags: ['git', 'github'],
          homepage: 'https://cli.github.com',
        },
      ],
      execute: vi.fn(),
      doctor,
    });

    const pluginsResponse = await fetch(`${server.url}/api/plugins`);
    const plugins = await pluginsResponse.json() as {
      entries: Array<{ name: string; registeredCommandCount: number; sourceKind: string }>;
    };
    expect(plugins.entries).toMatchObject([
      {
        name: 'hot-digest',
        registeredCommandCount: 1,
        sourceKind: 'git',
      },
    ]);

    const externalResponse = await fetch(`${server.url}/api/external`);
    const external = await externalResponse.json() as {
      entries: Array<{ name: string; installed: boolean; installCommand: string | null }>;
    };
    expect(external.entries).toMatchObject([
      {
        name: 'gh',
        installed: true,
        installCommand: null,
      },
    ]);

    const doctorResponse = await fetch(`${server.url}/api/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ live: true, sessions: true }),
    });
    const doctorResult = await doctorResponse.json() as {
      sessions: Array<{ workspace: string }>;
    };

    expect(doctor).toHaveBeenCalledWith({ live: true, sessions: true });
    expect(doctorResult.sessions).toMatchObject([{ workspace: 'C:/repo' }]);
  });

  it('serves static assets and falls back to index.html for the app shell', async () => {
    const staticDir = path.join(tempDir, 'static');
    await fs.mkdir(path.join(staticDir, 'assets'), { recursive: true });
    await fs.writeFile(path.join(staticDir, 'index.html'), '<html><body>studio-shell</body></html>');
    await fs.writeFile(path.join(staticDir, 'assets', 'app.js'), 'console.log("studio-app");');

    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      staticDir,
      commands: [
        makeCommand({
          site: 'google',
          name: 'trends',
          strategy: Strategy.PUBLIC,
          browser: false,
        }),
      ],
      execute: vi.fn(),
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const indexResponse = await fetch(`${server.url}/`);
    const indexHtml = await indexResponse.text();
    expect(indexHtml).toContain('studio-shell');

    const assetResponse = await fetch(`${server.url}/assets/app.js`);
    const assetText = await assetResponse.text();
    expect(assetText).toContain('studio-app');
  });

  it('returns a fallback HTML shell when frontend assets have not been built yet', async () => {
    server = await startStudioServer({
      port: 0,
      storageDir: tempDir,
      commands: [
        makeCommand({
          site: 'google',
          name: 'trends',
          strategy: Strategy.PUBLIC,
          browser: false,
        }),
      ],
      execute: vi.fn(),
      doctor: vi.fn(async () => ({ ok: true, summary: 'healthy' })),
    });

    const response = await fetch(`${server.url}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('OpenCLI Studio frontend assets are not built yet');
    expect(html).toContain('npm run studio:build');
  });
});
