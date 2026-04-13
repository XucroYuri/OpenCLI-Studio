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

export interface StudioRecipe {
  id: string;
  title: string;
  description: string;
  command: string;
  defaultArgs: Record<string, unknown>;
  tags: string[];
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
