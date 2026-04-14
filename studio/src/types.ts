export type StudioMode = 'public' | 'browser' | 'desktop' | 'external';
export type StudioCapability = 'discovery' | 'search' | 'detail' | 'account' | 'action' | 'asset' | 'tooling' | 'other';
export type StudioRisk = 'safe' | 'confirm' | 'dangerous';

export interface StudioCommandArg {
  name: string;
  type?: string;
  default?: unknown;
  required?: boolean;
  help?: string;
  choices?: string[];
}

export interface StudioCommandMeta {
  mode: StudioMode;
  capability: StudioCapability;
  risk: StudioRisk;
  uiHints: {
    supportsLists: boolean;
    supportsDetails: boolean;
    supportsCharts: boolean;
    supportsTimeSeries: boolean;
  };
}

export interface StudioCommandItem {
  command: string;
  site: string;
  name: string;
  description: string;
  args: StudioCommandArg[];
  browser: boolean;
  strategy: string;
  meta: StudioCommandMeta;
}

export interface StudioRegistryPayload {
  commands: StudioCommandItem[];
  sites: Array<{ site: string; commandCount: number }>;
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

export interface StudioJobEntry {
  id: number;
  sourceKind: StudioSnapshotSourceKind;
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

export interface StudioEnv {
  storageDir: string;
  commandCount: number;
  browserCommandCount: number;
  platform: string;
  nodeVersion: string;
}

export type StudioDoctorResult = Record<string, unknown>;

export interface ExecuteResponse {
  command: string;
  result: unknown;
  historyEntry: StudioHistoryEntry;
}
