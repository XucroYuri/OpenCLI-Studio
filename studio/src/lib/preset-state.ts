import type { RegistryFilters } from './registry';

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function buildRegistryPresetState(filters: RegistryFilters): Record<string, unknown> {
  return {
    search: filters.search,
    site: filters.site,
    market: filters.market,
    siteCategory: filters.siteCategory,
    surface: filters.surface,
    mode: filters.mode,
    capability: filters.capability,
    purpose: filters.purpose,
    risk: filters.risk,
    supportsChartsOnly: filters.supportsChartsOnly,
    advancedMode: filters.advancedMode,
  };
}

export function readRegistryPresetState(state: Record<string, unknown>): RegistryFilters {
  return {
    search: readString(state.search, ''),
    site: readString(state.site, 'all'),
    market: readString(state.market, 'all') as RegistryFilters['market'],
    siteCategory: readString(state.siteCategory, 'all') as RegistryFilters['siteCategory'],
    surface: readString(state.surface, 'all') as RegistryFilters['surface'],
    mode: readString(state.mode, 'all') as RegistryFilters['mode'],
    capability: readString(state.capability, 'all') as RegistryFilters['capability'],
    purpose: readString(state.purpose, 'all') as RegistryFilters['purpose'],
    risk: readString(state.risk, 'all') as RegistryFilters['risk'],
    supportsChartsOnly: readBoolean(state.supportsChartsOnly, false),
    advancedMode: readBoolean(state.advancedMode, false),
  };
}

export function buildWorkbenchPresetState(input: {
  command: string;
  args: Record<string, unknown>;
  advancedMode: boolean;
}): Record<string, unknown> {
  return {
    command: input.command,
    args: input.args,
    advancedMode: input.advancedMode,
  };
}

export function readWorkbenchPresetState(state: Record<string, unknown>): {
  command: string;
  args: Record<string, unknown>;
  advancedMode: boolean;
} {
  return {
    command: readString(state.command, ''),
    args: readRecord(state.args),
    advancedMode: readBoolean(state.advancedMode, false),
  };
}

export function buildInsightPresetState(input: {
  recipeId: string;
  args: Record<string, unknown>;
  advancedMode: boolean;
}): Record<string, unknown> {
  return {
    recipeId: input.recipeId,
    args: input.args,
    advancedMode: input.advancedMode,
  };
}

export function readInsightPresetState(state: Record<string, unknown>): {
  recipeId: string;
  args: Record<string, unknown>;
  advancedMode: boolean;
} {
  return {
    recipeId: readString(state.recipeId, ''),
    args: readRecord(state.args),
    advancedMode: readBoolean(state.advancedMode, false),
  };
}
