import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { executeCommand } from '../execution.js';
import { getInstallCmd, isBinaryInstalled, loadExternalClis } from '../external.js';
import { listPlugins, type PluginInfo } from '../plugin.js';
import { getRegistry, type CliCommand } from '../registry.js';
import { PKG_VERSION } from '../version.js';
import { buildStudioRegistry } from './metadata.js';
import { buildStudioExternalInventory, buildStudioPluginInventory } from './ops.js';
import { listStudioRecipes } from './recipes.js';
import { StudioJobScheduler } from './scheduler.js';
import { StudioStore } from './store.js';
import type {
  StudioExternalCliEntry,
  StudioFavoriteKind,
  StudioPluginEntry,
  StudioPresetKind,
  StudioSnapshotSourceKind,
} from './types.js';

export type StudioDoctorResult = Record<string, unknown>;

export interface StartStudioServerOptions {
  port?: number;
  host?: string;
  storageDir?: string;
  staticDir?: string;
  commands?: CliCommand[];
  plugins?: PluginInfo[] | StudioPluginEntry[];
  externalClis?: StudioExternalCliEntry[];
  execute?: (command: CliCommand, args: Record<string, unknown>) => Promise<unknown>;
  doctor?: (options?: { live?: boolean; sessions?: boolean }) => Promise<StudioDoctorResult>;
}

export interface StudioServerHandle {
  url: string;
  close: () => Promise<void>;
}

interface ExecuteRequestBody {
  command: string;
  args?: Record<string, unknown>;
}

interface FavoriteRequestBody {
  kind: StudioFavoriteKind;
  targetId: string;
  favorite: boolean;
}

interface PresetRequestBody {
  id?: number;
  kind: StudioPresetKind;
  name: string;
  description?: string | null;
  state: Record<string, unknown>;
}

interface SnapshotRequestBody {
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  command?: string;
  args?: Record<string, unknown>;
}

interface JobRequestBody {
  id?: number;
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  command: string;
  name: string;
  description?: string | null;
  args: Record<string, unknown>;
  intervalMinutes: number;
  enabled: boolean;
}

interface DoctorRequestBody {
  live?: boolean;
  sessions?: boolean;
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function notFound(res: ServerResponse): void {
  json(res, 404, { ok: false, error: 'Not found' });
}

function renderFallbackShell(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenCLI Studio</title>
    <style>
      :root { color-scheme: dark; font-family: "Segoe UI", sans-serif; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top left, rgba(242,140,40,0.18), transparent 28%),
          radial-gradient(circle at 80% 10%, rgba(46,167,160,0.14), transparent 22%),
          linear-gradient(135deg, #07131f 0%, #0c1724 45%, #08111a 100%);
        color: #eff3ee;
      }
      main {
        width: min(760px, calc(100vw - 32px));
        padding: 32px;
        border-radius: 28px;
        background: rgba(9, 21, 32, 0.9);
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 24px 80px rgba(0,0,0,0.28);
      }
      .eyebrow {
        color: #f4b47a;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 12px;
      }
      h1 { margin: 12px 0 8px; font-size: clamp(28px, 5vw, 42px); }
      p, li { color: #b9c8cf; line-height: 1.6; }
      code {
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(242,140,40,0.12);
        color: #f7d4b2;
      }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">OpenCLI Studio</div>
      <h1>OpenCLI Studio frontend assets are not built yet.</h1>
      <p>The local API server is running, but the web UI bundle was not found under <code>dist/studio</code>.</p>
      <ul>
        <li>Build the frontend with <code>npm run studio:build</code></li>
        <li>Then restart the server with <code>opencli studio</code> or <code>opencli studio serve</code></li>
        <li>API endpoints remain available under <code>/api/*</code></li>
      </ul>
    </main>
  </body>
</html>`;
}

async function readJsonBody<T>(req: IncomingMessage, fallback?: T): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return (fallback ?? {}) as T;
  }
  const body = Buffer.concat(chunks).toString('utf-8').trim();
  if (!body) {
    return (fallback ?? {}) as T;
  }
  return JSON.parse(body) as T;
}

function createCommandMap(commands: CliCommand[]): Map<string, CliCommand> {
  return new Map(commands.map((command) => [`${command.site}/${command.name}`, command]));
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.woff')) return 'font/woff';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  if (filePath.endsWith('.map')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function serveStaticAsset(res: ServerResponse, staticDir: string, pathname: string): Promise<boolean> {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const safeRoot = path.resolve(staticDir);
  const target = path.resolve(safeRoot, requested);
  const indexFile = path.join(safeRoot, 'index.html');

  if (!target.startsWith(safeRoot)) {
    return false;
  }

  try {
    const contents = await fs.readFile(target);
    res.writeHead(200, { 'Content-Type': contentTypeFor(target) });
    res.end(contents);
    return true;
  } catch {
    if (pathname === '/' || !path.extname(pathname)) {
      try {
        const contents = await fs.readFile(indexFile);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(contents);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function startStudioServer(options: StartStudioServerOptions): Promise<StudioServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;
  const storageDir = options.storageDir ?? path.join(os.homedir(), '.opencli', 'studio');
  const staticDir = options.staticDir;
  const commands = options.commands ?? [...new Set(getRegistry().values())];
  const execute = options.execute ?? (async (command: CliCommand, args: Record<string, unknown>) => executeCommand(command, args));
  const doctor = options.doctor ?? (async (doctorOptions?: { live?: boolean; sessions?: boolean }) => {
    const { runBrowserDoctor } = await import('../doctor.js');
    return runBrowserDoctor({
      live: doctorOptions?.live ?? false,
      sessions: doctorOptions?.sessions ?? false,
      cliVersion: PKG_VERSION,
    }) as Promise<StudioDoctorResult>;
  });
  const store = new StudioStore(storageDir);
  const rawPlugins = Array.isArray(options.plugins) && options.plugins.length > 0 && 'declaredCommandCount' in options.plugins[0]
    ? null
    : ((options.plugins as PluginInfo[] | undefined) ?? listPlugins());
  const pluginNames = new Set(
    rawPlugins
      ? rawPlugins.map((plugin) => plugin.name)
      : (options.plugins as StudioPluginEntry[] | undefined ?? []).map((plugin) => plugin.name),
  );
  const registry = buildStudioRegistry(commands, { pluginSites: pluginNames });
  const plugins = rawPlugins
    ? buildStudioPluginInventory(rawPlugins, registry)
    : ((options.plugins as StudioPluginEntry[] | undefined) ?? []);
  const externalClis = (options.externalClis ?? buildStudioExternalInventory(
    loadExternalClis(),
    isBinaryInstalled,
    (entry) => getInstallCmd(entry.install),
  )).map((entry) => ({
    ...entry,
    installCommand: entry.installCommand ?? null,
  }));
  const commandMap = createCommandMap(commands);
  const recipes = listStudioRecipes(commands);
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  function resolveSourceName(sourceKind: StudioSnapshotSourceKind, sourceId: string, fallbackCommand: string): string {
    if (sourceKind === 'recipe') {
      return recipeMap.get(sourceId)?.title ?? fallbackCommand;
    }
    return sourceId;
  }

  async function captureSnapshot(body: SnapshotRequestBody) {
    const commandName = body.command
      ?? (body.sourceKind === 'recipe' ? recipeMap.get(body.sourceId)?.command : body.sourceId);
    if (!commandName) {
      throw new Error(`Unknown snapshot source: ${body.sourceKind}:${body.sourceId}`);
    }

    const command = commandMap.get(commandName);
    if (!command) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    const args = body.sourceKind === 'recipe'
      ? {
          ...(recipeMap.get(body.sourceId)?.defaultArgs ?? {}),
          ...(body.args ?? {}),
        }
      : (body.args ?? {});

    const capturedAt = new Date().toISOString();
    const started = Date.now();

    try {
      const result = await execute(command, args);
      return store.recordSnapshot({
        sourceKind: body.sourceKind,
        sourceId: body.sourceId,
        sourceName: resolveSourceName(body.sourceKind, body.sourceId, commandName),
        command: commandName,
        args,
        status: 'success',
        result,
        error: null,
        capturedAt,
        durationMs: Date.now() - started,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return store.recordSnapshot({
        sourceKind: body.sourceKind,
        sourceId: body.sourceId,
        sourceName: resolveSourceName(body.sourceKind, body.sourceId, commandName),
        command: commandName,
        args,
        status: 'error',
        result: null,
        error: { message },
        capturedAt,
        durationMs: Date.now() - started,
      });
    }
  }

  const scheduler = new StudioJobScheduler({
    store,
    resolveSourceName: (job) => resolveSourceName(job.sourceKind, job.sourceId, job.command),
    execute: async (commandName, args) => {
      const command = commandMap.get(commandName);
      if (!command) {
        throw new Error(`Unknown command: ${commandName}`);
      }
      return execute(command, args);
    },
  });
  scheduler.start();

  const server = createServer((req, res) => {
    void (async () => {
      const method = req.method ?? 'GET';
      const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;

      if (method === 'GET' && pathname === '/api/registry') {
        json(res, 200, registry);
        return;
      }

      if (method === 'GET' && pathname.startsWith('/api/registry/')) {
        const commandName = decodeURIComponent(pathname.replace('/api/registry/', ''));
        const command = registry.commands.find((item) => item.command === commandName);
        if (!command) {
          notFound(res);
          return;
        }
        json(res, 200, command);
        return;
      }

      if (method === 'GET' && pathname === '/api/history') {
        json(res, 200, { entries: store.listHistory() });
        return;
      }

      if (method === 'GET' && pathname === '/api/plugins') {
        json(res, 200, { entries: plugins });
        return;
      }

      if (method === 'GET' && pathname === '/api/external') {
        json(res, 200, { entries: externalClis });
        return;
      }

      if (method === 'GET' && pathname === '/api/snapshots') {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const sourceKind = url.searchParams.get('sourceKind') as StudioSnapshotSourceKind | null;
        const sourceId = url.searchParams.get('sourceId');
        const limit = Number(url.searchParams.get('limit') ?? '50');
        json(res, 200, {
          entries: store.listSnapshots({
            sourceKind: sourceKind ?? undefined,
            sourceId: sourceId ?? undefined,
            limit: Number.isFinite(limit) ? limit : 50,
          }),
        });
        return;
      }

      if (method === 'POST' && pathname === '/api/snapshots') {
        const body = await readJsonBody<SnapshotRequestBody>(req);
        const snapshot = await captureSnapshot(body);
        json(res, 200, { snapshot });
        return;
      }

      if (method === 'GET' && pathname === '/api/favorites') {
        json(res, 200, { entries: store.listFavorites() });
        return;
      }

      if (method === 'POST' && pathname === '/api/favorites') {
        const body = await readJsonBody<FavoriteRequestBody>(req);
        const entry = store.setFavorite(body);
        json(res, 200, { favorite: body.favorite, entry });
        return;
      }

      if (method === 'GET' && pathname === '/api/presets') {
        json(res, 200, { presets: store.listPresets() });
        return;
      }

      if (method === 'POST' && pathname === '/api/presets') {
        const body = await readJsonBody<PresetRequestBody>(req);
        const preset = store.savePreset(body);
        json(res, 200, { preset });
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/api/presets/')) {
        const presetId = Number(pathname.replace('/api/presets/', ''));
        if (!Number.isFinite(presetId)) {
          json(res, 400, { ok: false, error: 'Invalid preset id' });
          return;
        }
        store.deletePreset(presetId);
        json(res, 200, { ok: true });
        return;
      }

      if (method === 'GET' && pathname === '/api/jobs') {
        json(res, 200, { jobs: store.listJobs() });
        return;
      }

      if (method === 'POST' && pathname === '/api/jobs') {
        const body = await readJsonBody<JobRequestBody>(req);
        const job = store.saveJob(body);
        scheduler.sync();
        json(res, 200, { job });
        return;
      }

      if (method === 'POST' && pathname.startsWith('/api/jobs/') && pathname.endsWith('/run')) {
        const jobId = Number(pathname.replace('/api/jobs/', '').replace('/run', ''));
        if (!Number.isFinite(jobId)) {
          json(res, 400, { ok: false, error: 'Invalid job id' });
          return;
        }
        const { job, snapshot } = await scheduler.runNow(jobId);
        scheduler.sync();
        json(res, 200, { job, snapshot });
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/api/jobs/')) {
        const jobId = Number(pathname.replace('/api/jobs/', ''));
        if (!Number.isFinite(jobId)) {
          json(res, 400, { ok: false, error: 'Invalid job id' });
          return;
        }
        store.deleteJob(jobId);
        scheduler.sync();
        json(res, 200, { ok: true });
        return;
      }

      if (method === 'GET' && pathname === '/api/recipes') {
        json(res, 200, { recipes });
        return;
      }

      if (method === 'GET' && pathname === '/api/env') {
        const browserCommandCount = registry.commands.filter((command) => command.meta.mode === 'browser').length;
        json(res, 200, {
          storageDir,
          commandCount: registry.commands.length,
          browserCommandCount,
          pluginCount: plugins.length,
          externalCliCount: externalClis.length,
          platform: process.platform,
          nodeVersion: process.version,
        });
        return;
      }

      if (method === 'POST' && pathname === '/api/doctor') {
        const body = await readJsonBody<DoctorRequestBody>(req, {} as DoctorRequestBody);
        const result = await doctor({ live: body.live ?? false, sessions: body.sessions ?? false });
        json(res, 200, result);
        return;
      }

      if (method === 'POST' && pathname === '/api/execute') {
        const body = await readJsonBody<ExecuteRequestBody>(req);
        const command = commandMap.get(body.command);
        if (!command) {
          json(res, 404, { ok: false, error: `Unknown command: ${body.command}` });
          return;
        }

        const startedAt = new Date().toISOString();
        const started = Date.now();
        try {
          const result = await execute(command, body.args ?? {});
          const finishedAt = new Date().toISOString();
          const historyEntry = store.recordRun({
            command: body.command,
            site: command.site,
            name: command.name,
            status: 'success',
            args: body.args ?? {},
            result,
            error: null,
            startedAt,
            finishedAt,
            durationMs: Date.now() - started,
          });
          json(res, 200, { command: body.command, result, historyEntry });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const finishedAt = new Date().toISOString();
          const historyEntry = store.recordRun({
            command: body.command,
            site: command.site,
            name: command.name,
            status: 'error',
            args: body.args ?? {},
            result: null,
            error: { message },
            startedAt,
            finishedAt,
            durationMs: Date.now() - started,
          });
          json(res, 500, { ok: false, command: body.command, error: { message }, historyEntry });
        }
        return;
      }

      if (method === 'GET' && staticDir) {
        const served = await serveStaticAsset(res, staticDir, pathname);
        if (served) return;
      }

      if (method === 'GET' && !staticDir && (pathname === '/' || !path.extname(pathname))) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderFallbackShell());
        return;
      }

      notFound(res);
    })().catch((error) => {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve Studio server address');
  }

  return {
    url: `http://${host}:${(address as AddressInfo).port}`,
    close: async () => {
      scheduler.close();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      store.close();
    },
  };
}
