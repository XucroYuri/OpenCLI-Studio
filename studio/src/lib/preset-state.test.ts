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
      market: 'domestic',
      siteCategory: 'news',
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

  it('normalizes legacy site category aliases from saved presets', () => {
    expect(readRegistryPresetState({
      siteCategory: 'tools',
    }).siteCategory).toBe('utility');
  });
});

describe('workbench preset state helpers', () => {
  it('normalizes command, args, and advanced mode for saved presets', () => {
    expect(readWorkbenchPresetState(buildWorkbenchPresetState({
      command: 'google/trends',
      args: { region: 'US', limit: 10 },
      search: '',
      market: 'all',
      siteCategory: 'all',
      site: '',
      advancedMode: true,
    }))).toEqual({
      command: 'google/trends',
      args: { region: 'US', limit: 10 },
      search: '',
      market: 'all',
      siteCategory: 'all',
      site: '',
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
