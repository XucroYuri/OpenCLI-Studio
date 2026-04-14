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

export type StudioFavoriteKind = 'command' | 'recipe';

export interface StudioFavoriteEntry {
  kind: StudioFavoriteKind;
  targetId: string;
  createdAt: string;
}

export type StudioPresetKind = 'registry' | 'workbench' | 'insight';

export interface StudioPresetEntry {
  id: number;
  kind: StudioPresetKind;
  name: string;
  description: string | null;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

export type StudioSnapshotSourceKind = 'command' | 'recipe';

export interface StudioSnapshotEntry {
  id: number;
  sourceKind: StudioSnapshotSourceKind;
  sourceId: string;
  sourceName: string;
  command: string;
  args: Record<string, unknown>;
  status: 'success' | 'error';
  result: unknown;
  error: { message: string } | null;
  capturedAt: string;
  durationMs: number;
}

export interface StudioSnapshotListOptions {
  sourceKind?: StudioSnapshotSourceKind;
  sourceId?: string;
  limit?: number;
}

export interface StudioSnapshotMetricsPoint {
  snapshotId: number;
  capturedAt: string;
  status: 'success' | 'error';
  count: number;
  primaryLabel: string | null;
  primaryValue: number | null;
}

export type StudioJobSourceKind = StudioSnapshotSourceKind;

export interface StudioJobEntry {
  id: number;
  sourceKind: StudioJobSourceKind;
  sourceId: string;
  command: string;
  name: string;
  description: string | null;
  args: Record<string, unknown>;
  intervalMinutes: number;
  enabled: boolean;
  lastStatus: 'idle' | 'success' | 'error';
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudioPluginSourceKind = 'git' | 'local' | 'unknown';

export interface StudioPluginEntry {
  name: string;
  path: string;
  commands: string[];
  declaredCommandCount: number;
  registeredCommandCount: number;
  source: string | null;
  sourceKind: StudioPluginSourceKind;
  version: string | null;
  installedAt: string | null;
  monorepoName: string | null;
  description: string | null;
}

export interface StudioExternalCliEntry {
  name: string;
  binary: string;
  description: string | null;
  homepage: string | null;
  tags: string[];
  installed: boolean;
  installAvailable: boolean;
  installCommand: string | null;
}
