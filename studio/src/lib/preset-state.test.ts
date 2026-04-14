import { describe, expect, it } from 'vitest';
import type { RegistryFilters } from './registry';
import {
  buildInsightPresetState,
  buildRegistryPresetState,
  buildWorkbenchPresetState,
  readInsightPresetState,
  readRegistryPresetState,
  readWorkbenchPresetState,
} from './preset-state';

describe('registry preset state helpers', () => {
  it('round-trips registry filter state with explicit defaults', () => {
    const filters: RegistryFilters = {
      search: 'trends',
      site: 'google',
      surface: 'plugin',
      mode: 'public',
      capability: 'search',
      risk: 'safe',
      purpose: 'all',
      supportsChartsOnly: true,
      advancedMode: true,
    };

    expect(readRegistryPresetState(buildRegistryPresetState(filters))).toEqual(filters);
  });
});

describe('workbench preset state helpers', () => {
  it('normalizes command, args, and advanced mode for saved presets', () => {
    expect(readWorkbenchPresetState(buildWorkbenchPresetState({
      command: 'google/trends',
      args: { region: 'US', limit: 10 },
      advancedMode: true,
    }))).toEqual({
      command: 'google/trends',
      args: { region: 'US', limit: 10 },
      advancedMode: true,
    });
  });
});

describe('insight preset state helpers', () => {
  it('normalizes recipe id, args, and advanced mode for saved presets', () => {
    expect(readInsightPresetState(buildInsightPresetState({
      recipeId: 'google-trends-daily',
      args: { region: 'US', period: '7d' },
      advancedMode: false,
    }))).toEqual({
      recipeId: 'google-trends-daily',
      args: { region: 'US', period: '7d' },
      advancedMode: false,
    });
  });
});
