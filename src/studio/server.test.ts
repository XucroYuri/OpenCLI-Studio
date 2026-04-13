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
});
