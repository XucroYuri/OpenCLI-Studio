import type { ExternalCliConfig } from '../external.js';
import type { PluginInfo } from '../plugin.js';
import type { StudioExternalCliEntry, StudioPluginEntry, StudioRegistryPayload } from './types.js';

function inferPluginSourceKind(source: string | undefined): StudioPluginEntry['sourceKind'] {
  if (!source) return 'unknown';
  if (source.startsWith('local:')) return 'local';
  if (source.startsWith('github:') || source.startsWith('http://') || source.startsWith('https://') || source.startsWith('git@')) {
    return 'git';
  }
  return 'unknown';
}

export function buildStudioPluginInventory(
  plugins: PluginInfo[],
  registry: StudioRegistryPayload,
): StudioPluginEntry[] {
  return plugins
    .map((plugin) => ({
      name: plugin.name,
      path: plugin.path,
      commands: plugin.commands,
      declaredCommandCount: plugin.commands.length,
      registeredCommandCount: registry.commands.filter((command) => command.site === plugin.name).length,
      source: plugin.source ?? null,
      sourceKind: inferPluginSourceKind(plugin.source),
      version: plugin.version ?? null,
      installedAt: plugin.installedAt ?? null,
      monorepoName: plugin.monorepoName ?? null,
      description: plugin.description ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildStudioExternalInventory(
  externalClis: ExternalCliConfig[],
  isInstalled: (binary: string) => boolean,
  getInstallCommand: (cli: ExternalCliConfig) => string | null,
): StudioExternalCliEntry[] {
  return externalClis
    .map((entry) => ({
      name: entry.name,
      binary: entry.binary,
      description: entry.description ?? null,
      homepage: entry.homepage ?? null,
      tags: entry.tags ?? [],
      installed: isInstalled(entry.binary),
      installAvailable: !!entry.install,
      installCommand: getInstallCommand(entry),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
