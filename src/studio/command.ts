import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPackageRoot } from '../package-paths.js';
import { openBrowserUrl } from './open-browser.js';
import { startStudioServer, type StartStudioServerOptions, type StudioServerHandle } from './server.js';

const STUDIO_COMMAND_FILE = fileURLToPath(import.meta.url);

export interface RunStudioCommandOptions {
  mode: 'open' | 'serve';
  port: number;
  host?: string;
  openBrowser: boolean;
}

interface RunStudioCommandDependencies {
  startServer?: (options: StartStudioServerOptions) => Promise<StudioServerHandle>;
  openBrowser?: (url: string) => Promise<void>;
  onReady?: (url: string) => void;
  resolveStaticDir?: () => string | undefined;
}

export function resolveStudioStaticDir(
  fileExists: (candidate: string) => boolean = fs.existsSync,
): string | undefined {
  const packageRoot = findPackageRoot(STUDIO_COMMAND_FILE, fileExists);
  const staticDir = path.join(packageRoot, 'dist', 'studio');

  if (fileExists(path.join(staticDir, 'index.html'))) {
    return staticDir;
  }

  return undefined;
}

export async function runStudioCommand(
  options: RunStudioCommandOptions,
  dependencies: RunStudioCommandDependencies = {},
): Promise<StudioServerHandle> {
  const startServer = dependencies.startServer ?? startStudioServer;
  const openBrowser = dependencies.openBrowser ?? openBrowserUrl;
  const onReady = dependencies.onReady ?? ((url: string) => {
    console.log(`OpenCLI Studio is running at ${url}`);
  });
  const staticDir = dependencies.resolveStaticDir?.() ?? resolveStudioStaticDir();

  const server = await startServer({
    port: options.port,
    host: options.host,
    ...(staticDir ? { staticDir } : {}),
  });

  onReady(server.url);

  if (options.openBrowser) {
    await openBrowser(server.url);
  }

  return server;
}
