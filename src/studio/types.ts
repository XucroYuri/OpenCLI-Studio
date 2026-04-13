import type { CliCommand } from '../registry.js';

export type StudioSurface = 'builtin' | 'plugin' | 'external';
export type StudioMode = 'public' | 'browser' | 'desktop' | 'external';
export type StudioCapability =
  | 'discovery'
  | 'search'
  | 'detail'
  | 'account'
  | 'action'
  | 'asset'
  | 'tooling'
  | 'other';
export type StudioRisk = 'safe' | 'confirm' | 'dangerous';

export interface StudioUiHints {
  supportsLists: boolean;
  supportsDetails: boolean;
  supportsCharts: boolean;
  supportsTimeSeries: boolean;
}

export interface StudioCommandMeta {
  surface: StudioSurface;
  mode: StudioMode;
  capability: StudioCapability;
  risk: StudioRisk;
  uiHints: StudioUiHints;
}

export interface StudioRegistryCommand {
  command: string;
  site: string;
  name: string;
  description: string;
  args: CliCommand['args'];
  browser: boolean;
  strategy: string;
  meta: StudioCommandMeta;
}

export interface StudioRegistrySite {
  site: string;
  commandCount: number;
}

export interface StudioRegistryPayload {
  commands: StudioRegistryCommand[];
  sites: StudioRegistrySite[];
}

export interface StudioRecipe {
  id: string;
  title: string;
  description: string;
  command: string;
  defaultArgs: Record<string, unknown>;
  tags: string[];
}

export interface StudioHistoryEntry {
  id: number;
  command: string;
  site: string;
  name: string;
  status: 'success' | 'error';
  args: Record<string, unknown>;
  result: unknown;
  error: { message: string } | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}
