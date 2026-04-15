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
  market: 'domestic' | 'international' | 'unknown';
  siteCategory: 'social' | 'news' | 'commerce' | 'finance' | 'media' | 'knowledge' | 'video' | 'ai-tool' | 'utility' | 'other';
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
  market?: 'domestic' | 'international' | 'unknown';
  category?: 'social' | 'news' | 'commerce' | 'finance' | 'media' | 'knowledge' | 'video' | 'ai-tool' | 'utility' | 'other';
  popularity?: number;
  commandCountByTag?: Record<string, number>;
}

export interface StudioRegistryPayload {
  commands: StudioRegistryCommand[];
  sites: StudioRegistrySite[];
}

export type StudioSiteAccessState =
  | 'not_required'
  | 'signed_in'
  | 'signed_out'
  | 'check_unavailable'
  | 'browser_blocked'
  | 'error';

export interface StudioSiteAccessEntry {
  site: string;
  browserRequired: boolean;
  state: StudioSiteAccessState;
  authCommand: string | null;
  checkCommand: string | null;
  configCommand: string | null;
  reason: string | null;
  checkedAt: string;
}

export type StudioTemplateObjective =
  | 'hotspots'
  | 'reference'
  | 'tracking'
  | 'monitoring'
  | 'collection'
  | 'workspace';

export interface StudioTemplateInputOption {
  label: string;
  value: string;
}

export interface StudioTemplateInput {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required?: boolean;
  default?: unknown;
  options?: StudioTemplateInputOption[];
}

export interface StudioTemplateStep {
  id?: string;
  command: string;
  args?: Record<string, unknown>;
  runMode?: 'sequential' | 'parallel';
  required?: boolean;
}

export interface StudioTemplatePrerequisite {
  type: 'login' | 'browser' | 'external-cli' | 'config' | 'unknown';
  target?: string;
}

export interface StudioTemplateMerge {
  mode: 'table' | 'timeline' | 'mixed';
  primaryFields?: string[];
  dedupeKey?: string;
  sortBy?: string;
}

export interface StudioTemplateOutput {
  defaultView: 'table' | 'timeline' | 'cards';
  chartPolicy?: 'off' | 'auto' | 'explicit';
}

export interface StudioRecipe {
  id: string;
  kind?: 'builtin' | 'user';
  visibility?: 'primary' | 'legacy';
  objective?: StudioTemplateObjective;
  title: string;
  summary?: string;
  description: string;
  command: string;
  defaultArgs: Record<string, unknown>;
  tags: string[];
  inputs?: StudioTemplateInput[];
  steps?: StudioTemplateStep[];
  prerequisites?: StudioTemplatePrerequisite[];
  merge?: StudioTemplateMerge;
  output?: StudioTemplateOutput;
  schedule?: {
    supported: boolean;
    defaultIntervalMinutes?: number;
  };
  snapshotPolicy?: 'manual' | 'suggested' | 'required';
  i18nKey?: string;
  createdFrom?: 'overview' | 'workbench' | 'manual';
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

export interface StudioDoctorResult {
  cliVersion?: string;
  daemonRunning?: boolean;
  daemonFlaky?: boolean;
  extensionConnected?: boolean;
  extensionFlaky?: boolean;
  extensionVersion?: string;
  latestExtensionVersion?: string;
  connectivity?: {
    ok: boolean;
    error?: string;
    durationMs: number;
  };
  sessions?: Array<{
    workspace: string;
    windowId: number;
    tabCount: number;
    idleMsRemaining: number;
  }>;
  issues?: string[];
  [key: string]: unknown;
}
