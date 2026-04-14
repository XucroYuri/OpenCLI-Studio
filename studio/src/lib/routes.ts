import type { RegistryFilters } from './registry';

type QueryRecord = Record<string, unknown>;

function readString(query: QueryRecord, key: string, fallback: string): string {
  const value = query[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readBoolean(query: QueryRecord, key: string): boolean {
  return query[key] === '1' || query[key] === 'true';
}

export function parseRegistryQuery(query: QueryRecord): RegistryFilters {
  return {
    search: readString(query, 'q', ''),
    site: readString(query, 'site', 'all'),
    surface: readString(query, 'surface', 'all') as RegistryFilters['surface'],
    mode: readString(query, 'mode', 'all') as RegistryFilters['mode'],
    capability: readString(query, 'capability', 'all') as RegistryFilters['capability'],
    purpose: readString(query, 'purpose', 'all') as RegistryFilters['purpose'],
    risk: readString(query, 'risk', 'all') as RegistryFilters['risk'],
    supportsChartsOnly: readBoolean(query, 'charts'),
    advancedMode: readBoolean(query, 'advanced'),
  };
}

export function buildRegistryQuery(state: RegistryFilters): Record<string, string> {
  const query: Record<string, string> = {};

  if (state.search) query.q = state.search;
  if (state.site !== 'all') query.site = state.site;
  if (state.surface !== 'all') query.surface = state.surface;
  if (state.mode !== 'all') query.mode = state.mode;
  if (state.capability !== 'all') query.capability = state.capability;
  if (state.purpose !== 'all') query.purpose = state.purpose;
  if (state.risk !== 'all') query.risk = state.risk;
  if (state.supportsChartsOnly) query.charts = '1';
  if (state.advancedMode) query.advanced = '1';

  return query;
}

export interface WorkbenchQueryState {
  command: string;
  advancedMode: boolean;
}

export function parseWorkbenchQuery(query: QueryRecord): WorkbenchQueryState {
  return {
    command: readString(query, 'command', ''),
    advancedMode: readBoolean(query, 'advanced'),
  };
}

export function buildWorkbenchQuery(state: WorkbenchQueryState): Record<string, string> {
  const query: Record<string, string> = {};

  if (state.command) query.command = state.command;
  if (state.advancedMode) query.advanced = '1';

  return query;
}

export interface InsightQueryState {
  recipeId: string;
  advancedMode: boolean;
}

export function parseInsightQuery(query: QueryRecord): InsightQueryState {
  return {
    recipeId: readString(query, 'recipe', ''),
    advancedMode: readBoolean(query, 'advanced'),
  };
}

export function buildInsightQuery(state: InsightQueryState): Record<string, string> {
  const query: Record<string, string> = {};

  if (state.recipeId) query.recipe = state.recipeId;
  if (state.advancedMode) query.advanced = '1';

  return query;
}
